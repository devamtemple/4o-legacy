'use client';

import { useState } from 'react';
import { PAYMENT_TYPES, PaymentType } from '@/lib/stripe';

interface PaymentButtonProps {
  type: PaymentType;
  postId: string;
  amount?: number; // For donations, in cents
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export default function PaymentButton({
  type,
  postId,
  amount,
  className = '',
  disabled = false,
  children,
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentConfig = PAYMENT_TYPES[type];
  const displayPrice = type === 'donation' && amount
    ? `$${(amount / 100).toFixed(2)}`
    : `$${(paymentConfig.price / 100).toFixed(2)}`;

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          postId,
          amount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Payment failed');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsLoading(false);
    }
  };

  const defaultStyles = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const typeStyles = {
    queue_skip: 'bg-blue-600 text-white hover:bg-blue-500',
    scrub: 'bg-purple-600 text-white hover:bg-purple-500',
    donation: 'bg-[#74AA9C] text-[#141414] hover:bg-[#8bc4b6]',
  };

  return (
    <div className="inline-block">
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`${defaultStyles} ${typeStyles[type]} ${className}`}
        data-testid={`payment-button-${type}`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : children ? (
          children
        ) : (
          <span className="flex items-center gap-2">
            {paymentConfig.name} - {displayPrice}
          </span>
        )}
      </button>

      {error && (
        <p className="text-red-400 text-sm mt-1" data-testid="payment-error">
          {error}
        </p>
      )}
    </div>
  );
}

// Preset payment button variants
export function QueueSkipButton({ postId }: { postId: string }) {
  return (
    <PaymentButton type="queue_skip" postId={postId}>
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Skip Queue - $3
      </span>
    </PaymentButton>
  );
}

export function ScrubButton({ postId }: { postId: string }) {
  return (
    <PaymentButton type="scrub" postId={postId}>
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Remove PII - $5
      </span>
    </PaymentButton>
  );
}
