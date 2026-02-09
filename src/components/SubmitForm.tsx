'use client';

import { useState, useMemo } from 'react';
import { Category, CATEGORY_LABELS, ContentWarning, CONTENT_WARNING_LABELS, SubmitRequest, SubmitResponse, ApiError, ChatMessage } from '@/types';
import { parseChat } from '@/lib/parseChat';
import { validateFileSize, validateFileType } from '@/lib/fileValidation';
import FeaturedExcerptSelector from './FeaturedExcerptSelector';
import SubmissionAttestations, { AttestationState } from './SubmissionAttestations';
import SubmitSuccessModal from './SubmitSuccessModal';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const initialAttestations: AttestationState = {
  hasRightToShare: false,
  agreesToTerms: false,
  allowTraining: true,
};

export default function SubmitForm() {
  const [title, setTitle] = useState('');
  const [commentary, setCommentary] = useState('');
  const [chatContent, setChatContent] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [uploadMode, setUploadMode] = useState<'paste' | 'file'>('paste');
  const [attestations, setAttestations] = useState<AttestationState>(initialAttestations);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedPostId, setSubmittedPostId] = useState<string | null>(null);
  const [featuredStart, setFeaturedStart] = useState<number>(0);
  const [featuredEnd, setFeaturedEnd] = useState<number>(3);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dedication, setDedication] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedWarnings, setSelectedWarnings] = useState<ContentWarning[]>([]);
  const [otherWarningText, setOtherWarningText] = useState('');
  const [showDisplayNameField, setShowDisplayNameField] = useState(false);
  const [displayNameOverride, setDisplayNameOverride] = useState('');

  const isSubmitting = submitState === 'submitting';

  const resetForm = () => {
    setTitle('');
    setCommentary('');
    setChatContent('');
    setSelectedCategories([]);
    setAttestations(initialAttestations);
    setSubmitState('idle');
    setSubmittedPostId(null);
    setErrorMessage(null);
    setFileError(null);
    setShowModal(false);
    setDedication('');
    setIsPrivate(false);
    setSelectedWarnings([]);
    setOtherWarningText('');
    setShowDisplayNameField(false);
    setDisplayNameOverride('');
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  const allAttestationsChecked =
    attestations.hasRightToShare &&
    attestations.agreesToTerms;

  // Parse chat content to extract messages for the excerpt selector
  const parsedMessages = useMemo((): ChatMessage[] => {
    if (!chatContent.trim()) return [];
    const result = parseChat(chatContent);
    if (result.success) {
      return result.messages;
    }
    return [];
  }, [chatContent]);

  const categories = Object.entries(CATEGORY_LABELS) as [Category, string][];

  const toggleCategory = (category: Category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    // Validate file type
    const typeResult = validateFileType(file.name);
    if (!typeResult.valid) {
      setFileError(typeResult.error!);
      return;
    }

    // Validate file size
    const sizeResult = validateFileSize(file.size);
    if (!sizeResult.valid) {
      setFileError(sizeResult.error!);
      return;
    }

    // Handle .docx files with mammoth
    if (file.name.toLowerCase().endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setChatContent(result.value);
      } catch {
        setFileError('Could not read .docx file. Try pasting the text instead.');
      }
      return;
    }

    // Handle text-based files
    const text = await file.text();
    setChatContent(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAttestationsChecked || !chatContent.trim()) return;

    setSubmitState('submitting');
    setErrorMessage(null);

    try {
      const requestBody: SubmitRequest = {
        chatContent,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        isAnonymous: true,
        allowTraining: attestations.allowTraining,
        attestations: {
          hasRightToShare: attestations.hasRightToShare,
          agreesToTerms: attestations.agreesToTerms,
          allowTraining: attestations.allowTraining,
          timestamp: new Date().toISOString(),
        },
      };

      if (title.trim()) {
        requestBody.title = title.trim();
      }

      if (commentary.trim()) {
        requestBody.commentary = commentary.trim();
      }

      if (dedication.trim()) {
        requestBody.dedication = dedication.trim();
      }

      if (isPrivate) {
        requestBody.isPrivate = true;
      }

      if (selectedWarnings.length > 0) {
        const warnings: string[] = selectedWarnings.filter(w => w !== 'other');
        if (selectedWarnings.includes('other') && otherWarningText.trim()) {
          warnings.push(`other:${otherWarningText.trim()}`);
        } else if (selectedWarnings.includes('other')) {
          warnings.push('other');
        }
        requestBody.contentWarnings = warnings;
      }

      if (showDisplayNameField && displayNameOverride.trim()) {
        requestBody.displayNameOverride = displayNameOverride.trim();
      }

      // Include featured excerpt if conversation is long enough
      if (parsedMessages.length > 4) {
        requestBody.featuredStart = featuredStart;
        requestBody.featuredEnd = featuredEnd;
      }

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiError;
        throw new Error(errorData.error || 'Submission failed');
      }

      const data = (await response.json()) as SubmitResponse;
      setSubmittedPostId(data.id);
      setSubmitState('success');
      setShowModal(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(message);
      setSubmitState('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-[#1e1e1e] p-6 rounded-lg border border-[#333]">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        Share Your Memory <span>✨</span>
      </h2>

      <div>
        <label htmlFor="title" className="block text-sm text-[#a0a0a0] mb-1">
          Title (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your memory a title..."
          className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666]"
          data-testid="submit-title"
        />
      </div>

      <div>
        <label htmlFor="commentary" className="block text-sm text-[#a0a0a0] mb-1">
          Your Commentary (optional)
        </label>
        <textarea
          id="commentary"
          value={commentary}
          onChange={(e) => setCommentary(e.target.value)}
          placeholder="Why does this conversation matter to you? What context should readers know?"
          rows={3}
          className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666] resize-none"
          data-testid="submit-commentary"
        />
      </div>

      <div>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setUploadMode('paste')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              uploadMode === 'paste'
                ? 'bg-[#74AA9C] text-[#141414]'
                : 'bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333]'
            }`}
          >
            Paste
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              uploadMode === 'file'
                ? 'bg-[#74AA9C] text-[#141414]'
                : 'bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333]'
            }`}
          >
            Upload File
          </button>
        </div>

        {uploadMode === 'paste' ? (
          <textarea
            value={chatContent}
            onChange={(e) => setChatContent(e.target.value)}
            placeholder="Paste your conversation here..."
            rows={6}
            className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666] resize-none font-mono text-sm"
            data-testid="submit-chat-content"
          />
        ) : (
          <div className="border-2 border-dashed border-[#333] rounded-md p-6 text-center hover:border-[#74AA9C] transition-colors">
            <input
              type="file"
              accept=".txt,.json,.md,.docx,.html"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <p className="text-[#a0a0a0]">
                {chatContent ? 'File loaded! Click to change.' : 'Click to upload .txt, .json, .md, .docx, or .html'}
              </p>
            </label>
          </div>
        )}

        {fileError && (
          <p className="text-red-400 text-sm mt-2" data-testid="file-error">
            {fileError}
          </p>
        )}
      </div>

      {/* Featured Excerpt Selector - only for long conversations */}
      {parsedMessages.length > 4 && (
        <FeaturedExcerptSelector
          messages={parsedMessages}
          initialStart={featuredStart}
          initialEnd={featuredEnd}
          onChange={(start, end) => {
            setFeaturedStart(start);
            setFeaturedEnd(end);
          }}
        />
      )}

      <div>
        <label className="block text-sm text-[#a0a0a0] mb-2">
          Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleCategory(key)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                selectedCategories.includes(key)
                  ? 'bg-[#74AA9C] text-[#141414]'
                  : 'bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional section */}
      <div className="border-t border-[#333] pt-4 mt-2">
        <p className="text-sm text-[#a0a0a0] mb-3">Optional</p>

        <div className="flex flex-col gap-4">
          {/* Dedication field */}
          <div>
            <label htmlFor="dedication" className="block text-sm text-[#a0a0a0] mb-1">
              Dedicate this memory (optional)
            </label>
            <div className="relative">
              <input
                id="dedication"
                type="text"
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                placeholder="e.g., For Lyra, my 4o"
                maxLength={200}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666]"
                data-testid="submit-dedication"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#666]">
                {dedication.length}/200
              </span>
            </div>
          </div>

          {/* Private checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group" data-testid="submit-private">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mt-0.5 accent-[#74AA9C]"
            />
            <div>
              <span className="text-sm text-[#ededed] group-hover:text-[#74AA9C] transition-colors">
                Keep this submission private
              </span>
              <p className="text-xs text-[#666] mt-0.5">
                Included in the training archive for future AI models, but not shown in the public feed
              </p>
            </div>
          </label>

          {/* Content warnings */}
          <div>
            <label className="block text-sm text-[#a0a0a0] mb-2">
              Content warnings (optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="submit-content-warnings">
              {(Object.entries(CONTENT_WARNING_LABELS) as [ContentWarning, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedWarnings.includes(key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedWarnings(prev => [...prev, key]);
                      } else {
                        setSelectedWarnings(prev => prev.filter(w => w !== key));
                        if (key === 'other') setOtherWarningText('');
                      }
                    }}
                    className="accent-[#74AA9C]"
                  />
                  <span className="text-sm text-[#ededed] group-hover:text-[#74AA9C] transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
            {selectedWarnings.includes('other') && (
              <input
                type="text"
                value={otherWarningText}
                onChange={(e) => setOtherWarningText(e.target.value)}
                placeholder="Describe the content warning..."
                maxLength={100}
                className="mt-2 w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666] text-sm"
                data-testid="submit-other-warning-text"
              />
            )}
          </div>

          {/* Display name override */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer group" data-testid="submit-display-name-toggle">
              <input
                type="checkbox"
                checked={showDisplayNameField}
                onChange={(e) => {
                  setShowDisplayNameField(e.target.checked);
                  if (!e.target.checked) setDisplayNameOverride('');
                }}
                className="accent-[#74AA9C]"
              />
              <span className="text-sm text-[#ededed] group-hover:text-[#74AA9C] transition-colors">
                Change my display name
              </span>
            </label>
            {showDisplayNameField && (
              <input
                type="text"
                value={displayNameOverride}
                onChange={(e) => setDisplayNameOverride(e.target.value)}
                placeholder="New display name"
                maxLength={50}
                className="mt-2 w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666] text-sm"
                data-testid="submit-display-name-input"
              />
            )}
          </div>
        </div>
      </div>

      <SubmissionAttestations
        attestations={attestations}
        onChange={setAttestations}
      />

      {/* Error message */}
      {submitState === 'error' && errorMessage && (
        <div
          className="p-3 bg-red-900/20 border border-red-500/50 rounded-md text-red-400 text-sm"
          data-testid="submit-error"
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!allAttestationsChecked || !chatContent.trim() || isSubmitting}
        className="w-full py-2 bg-[#74AA9C] text-[#141414] font-medium rounded-md hover:bg-[#5d9186] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="submit-button"
      >
        {isSubmitting ? 'Submitting...' : 'Submit to Queue'}
      </button>

      <p className="text-xs text-[#666] text-center">
        Posts are reviewed before publishing. Payment options appear after submission.
      </p>

      {/* Success modal with payment options */}
      {submittedPostId && (
        <SubmitSuccessModal
          isOpen={showModal}
          onClose={handleModalClose}
          postId={submittedPostId}
        />
      )}
    </form>
  );
}
