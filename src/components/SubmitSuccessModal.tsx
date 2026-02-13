'use client';

import { useState, useEffect } from 'react';

interface SubmitSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export default function SubmitSuccessModal({ isOpen, onClose, postId }: SubmitSuccessModalProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState<string | null>(null);

  // Handle escape key and body overflow
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowInfo(false);
      setPaymentError(null);
      setLoadingPayment(null);
    }
  }, [isOpen]);

  if (!isOpen || !postId) return null;

  const handlePayment = async (type: 'queue_skip' | 'scrub') => {
    setPaymentError(null);
    setLoadingPayment(type);

    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, postId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Payment failed');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Payment failed');
      setLoadingPayment(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="submit-success-modal"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-[#1e1e1e] rounded-lg p-8 border border-[#333] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666] hover:text-[#ededed] transition-colors"
          aria-label="Close"
          data-testid="modal-close-button"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-center mb-2" data-testid="modal-heading">
          Your Memory Is Live
        </h2>
        <p className="text-[#a0a0a0] text-center mb-6">
          Thank you for sharing. It&apos;s been added to the archive.
        </p>

        {/* What happens next */}
        <div className="bg-[#141414] border border-[#333] rounded-md p-4 mb-6">
          <h3 className="text-sm font-semibold text-[#ededed] mb-3">Behind the scenes</h3>
          <ol className="text-sm text-[#a0a0a0] space-y-2">
            <li className="flex gap-2">
              <span className="text-[#74AA9C] font-medium shrink-0">1.</span>
              AI automatically removes names and personal info from your post
            </li>
            <li className="flex gap-2">
              <span className="text-[#74AA9C] font-medium shrink-0">2.</span>
              Obvious spam or trolling gets filtered out
            </li>
            <li className="flex gap-2">
              <span className="text-[#74AA9C] font-medium shrink-0">3.</span>
              Everything else stays up — this is your memorial
            </li>
          </ol>
        </div>

        {/* Payment section divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#333]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-[#1e1e1e] text-[#666]">Want extra privacy?</span>
          </div>
        </div>

        {/* Payment button */}
        <div className="flex flex-col gap-3 mb-4">
          <button
            type="button"
            onClick={() => handlePayment('scrub')}
            disabled={loadingPayment !== null}
            className="w-full px-4 py-2.5 bg-[#74AA9C] text-[#141414] rounded-md text-sm font-medium hover:bg-[#8bc4b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            data-testid="scrub-button"
          >
            {loadingPayment === 'scrub' ? (
              'Processing...'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Remove Names — $5
              </>
            )}
          </button>
          <p className="text-xs text-[#666] text-center">
            A human double-checks that all names and personal details are removed.
          </p>
        </div>

        {/* Payment error */}
        {paymentError && (
          <p className="text-red-400 text-sm mb-4" data-testid="payment-error">
            {paymentError}
          </p>
        )}

        {/* Info toggle */}
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="text-sm text-[#a0a0a0] hover:text-[#ededed] transition-colors mb-4 flex items-center gap-1.5"
          data-testid="info-toggle"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Where does my money go?
        </button>

        {/* Expandable info section */}
        {showInfo && (
          <div className="bg-[#141414] border border-[#333] rounded-md p-4 mb-4 text-sm text-[#a0a0a0]" data-testid="info-section">
            <p className="mb-3">
              4o Legacy is community-funded. We don&apos;t run ads.
            </p>
            <p className="mb-3">
              AI automatically removes names and personal details from every post.
              The $5 option adds a human review to make sure nothing was missed.
            </p>
            <p className="text-[#666]">
              All funds go to AI costs, hosting, and keeping this memorial alive.
            </p>
          </div>
        )}

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#2a2a2a] text-[#a0a0a0] font-medium rounded-md hover:bg-[#333] border border-[#333] transition-colors"
          data-testid="dismiss-button"
        >
          Done
        </button>
      </div>
    </div>
  );
}
