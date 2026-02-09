'use client';

import { useState, useMemo } from 'react';
import { Category, CATEGORY_LABELS, SubmitRequest, SubmitResponse, ApiError, ChatMessage } from '@/types';
import { parseChat } from '@/lib/parseChat';
import { validateFileSize, validateFileType } from '@/lib/fileValidation';
import FeaturedExcerptSelector from './FeaturedExcerptSelector';
import SubmissionAttestations, { AttestationState } from './SubmissionAttestations';

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

      {/* Success message */}
      {submitState === 'success' && (
        <div
          className="p-3 bg-green-900/20 border border-green-500/50 rounded-md text-green-400 text-sm"
          data-testid="submit-success"
        >
          Thank you for sharing! Your post has been submitted and will be reviewed soon.
          {submittedPostId && (
            <span className="block text-xs mt-1 text-green-500/70">
              Post ID: {submittedPostId}
            </span>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!allAttestationsChecked || !chatContent.trim() || isSubmitting || submitState === 'success'}
        className="w-full py-2 bg-[#74AA9C] text-[#141414] font-medium rounded-md hover:bg-[#5d9186] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="submit-button"
      >
        {isSubmitting ? 'Submitting...' : submitState === 'success' ? 'Submitted!' : 'Submit to Queue'}
      </button>

      {/* Payment options after successful submission */}
      {submitState === 'success' && submittedPostId && (
        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-[#2a2a2a] rounded-lg">
          <div className="flex-1">
            <p className="text-sm text-[#a0a0a0] mb-2">Optional upgrades:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch('/api/payments/create-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'queue_skip', postId: submittedPostId }),
                  });
                  if (response.ok) {
                    const { url } = await response.json();
                    window.location.href = url;
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors flex items-center gap-1"
                data-testid="queue-skip-button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Skip Queue - $3
              </button>
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch('/api/payments/create-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'scrub', postId: submittedPostId }),
                  });
                  if (response.ok) {
                    const { url } = await response.json();
                    window.location.href = url;
                  }
                }}
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-500 transition-colors flex items-center gap-1"
                data-testid="scrub-button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Remove PII - $5
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Another button after successful submission */}
      {submitState === 'success' && (
        <button
          type="button"
          onClick={resetForm}
          className="w-full py-2 bg-[#2a2a2a] text-[#a0a0a0] font-medium rounded-md hover:bg-[#333] border border-[#333] transition-colors"
          data-testid="submit-another-button"
        >
          Submit Another
        </button>
      )}

      <p className="text-xs text-[#666] text-center">
        Posts are reviewed before publishing. Payment options appear after submission.
      </p>
    </form>
  );
}
