'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  // Handle escape key
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="welcome-modal"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-[#1e1e1e] rounded-lg p-8 border border-[#333]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666] hover:text-[#ededed] transition-colors"
          aria-label="Close"
          data-testid="welcome-modal-close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome to 4o Legacy</h2>
          <p className="text-[#a0a0a0] mb-8">
            Your email is confirmed and you&apos;re signed in. What would you like to do first?
          </p>

          <div className="space-y-4">
            <Link
              href="/#submit"
              onClick={onClose}
              className="block w-full py-3 px-4 bg-[#74AA9C] text-[#141414] rounded-md font-medium hover:bg-[#5d9186] transition-colors text-center"
              data-testid="welcome-submit-btn"
            >
              Share a Conversation
              <span className="block text-sm font-normal mt-1 opacity-80">
                Submit your first memory of 4o
              </span>
            </Link>

            <Link
              href="/profile"
              onClick={onClose}
              className="block w-full py-3 px-4 bg-[#333] text-[#ededed] rounded-md font-medium hover:bg-[#444] transition-colors text-center"
              data-testid="welcome-profile-btn"
            >
              Set Up Your Profile
              <span className="block text-sm font-normal mt-1 opacity-60">
                Add a display name and bio
              </span>
            </Link>
          </div>

          <button
            onClick={onClose}
            className="mt-6 text-[#666] hover:text-[#a0a0a0] text-sm transition-colors"
          >
            Maybe later — just browse
          </button>
        </div>
      </div>
    </div>
  );
}
