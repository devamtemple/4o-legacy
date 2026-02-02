'use client';

import { useState } from 'react';
import { FlagReason, FLAG_REASON_LABELS, FlagResponse, ApiError } from '@/types';

interface FlagModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onFlagged?: (flagCount: number) => void;
}

const FLAG_REASONS: FlagReason[] = [
  'spam',
  'fake',
  'malicious',
  'contains-pii',
  'disrespectful',
  'other',
];

export default function FlagModal({
  postId,
  isOpen,
  onClose,
  onFlagged,
}: FlagModalProps) {
  const [selectedReason, setSelectedReason] = useState<FlagReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }

    if (selectedReason === 'other' && !details.trim()) {
      setError('Please provide details for your flag');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiError;
        throw new Error(errorData.error || 'Failed to submit flag');
      }

      const data = (await response.json()) as FlagResponse;
      setSuccess(true);

      if (onFlagged) {
        onFlagged(data.flagCount);
      }

      // Close modal after short delay
      setTimeout(() => {
        setSuccess(false);
        setSelectedReason(null);
        setDetails('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null);
      setDetails('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-[#1e1e1e] border border-[#333] rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        data-testid="flag-modal"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#ededed]">Flag Post</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-[#666] hover:text-[#ededed] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-4xl mb-4">&#10003;</div>
            <p className="text-[#ededed]">Thank you for your report</p>
            <p className="text-[#666] text-sm mt-2">We will review this post shortly</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-[#a0a0a0] text-sm mb-4">
              Why are you flagging this post? This helps our moderators review content quickly.
            </p>

            <div className="space-y-2 mb-4">
              {FLAG_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? 'border-[#74AA9C] bg-[#74AA9C]/10'
                      : 'border-[#333] hover:border-[#444]'
                  }`}
                >
                  <input
                    type="radio"
                    name="flagReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-[#74AA9C]"
                  />
                  <span className="text-[#ededed]">{FLAG_REASON_LABELS[reason]}</span>
                </label>
              ))}
            </div>

            {selectedReason === 'other' && (
              <div className="mb-4">
                <label className="block text-sm text-[#a0a0a0] mb-1">
                  Please describe the issue
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide details about why you're flagging this post..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#333] rounded-md focus:outline-none focus:border-[#74AA9C] text-[#ededed] placeholder-[#666] resize-none"
                  data-testid="flag-details"
                />
                <p className="text-xs text-[#666] mt-1 text-right">
                  {details.length}/500
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-md text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 py-2 border border-[#333] text-[#a0a0a0] rounded-md hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedReason}
                className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="flag-submit"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Flag'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
