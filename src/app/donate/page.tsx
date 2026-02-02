'use client';

import { useState } from 'react';
import Link from 'next/link';

const PRESET_AMOUNTS = [500, 2000, 5000, 10000]; // in cents

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(2000);
  const [customAmount, setCustomAmount] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null;
  const wasCancelled = searchParams?.get('cancelled') === 'true';

  const getAmountInCents = (): number => {
    if (selectedAmount !== null) {
      return selectedAmount;
    }
    const parsed = parseFloat(customAmount);
    if (isNaN(parsed) || parsed < 1) {
      return 0;
    }
    return Math.round(parsed * 100);
  };

  const formatAmount = (cents: number): string => {
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  };

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountInCents = getAmountInCents();
    if (amountInCents < 100) {
      setError('Minimum donation is $1.00');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'donation',
          amount: amountInCents,
          displayName: displayName.trim() || undefined,
          isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  const currentAmount = getAmountInCents();
  const isValidAmount = currentAmount >= 100;

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#141414]/95 backdrop-blur border-b border-[#333]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-[#74AA9C] hover:text-[#8bc4b6] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-[#ededed]">
            Support 4o.Remembered
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {wasCancelled && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400">
            Your donation was cancelled. Feel free to try again when you&apos;re ready.
          </div>
        )}

        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6" data-testid="donate-form">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-[#ededed] mb-2">
              Make a Donation
            </h2>
            <p className="text-[#a0a0a0]">
              Your donation helps keep this archive running and supports the preservation
              of GPT-4o conversations for future generations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preset amounts */}
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-3">
                Select an amount
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handlePresetClick(amount)}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      selectedAmount === amount
                        ? 'bg-[#74AA9C] text-white'
                        : 'bg-[#2a2a2a] text-[#ededed] hover:bg-[#333]'
                    }`}
                    data-testid={`preset-${amount}`}
                  >
                    {formatAmount(amount)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <label htmlFor="customAmount" className="block text-sm font-medium text-[#ededed] mb-2">
                Or enter a custom amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]">$</span>
                <input
                  type="number"
                  id="customAmount"
                  min="1"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-4 py-3 bg-[#141414] border border-[#333] rounded-lg text-[#ededed] placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#74AA9C] focus:border-transparent"
                  data-testid="custom-amount"
                />
              </div>
              <p className="mt-1 text-xs text-[#666]">Minimum donation: $1.00</p>
            </div>

            {/* Display name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-[#ededed] mb-2">
                Display name (optional)
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How would you like to be recognized?"
                maxLength={50}
                className="w-full px-4 py-3 bg-[#141414] border border-[#333] rounded-lg text-[#ededed] placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#74AA9C] focus:border-transparent"
                data-testid="display-name"
              />
            </div>

            {/* Public checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#333] bg-[#141414] text-[#74AA9C] focus:ring-[#74AA9C]"
                data-testid="is-public"
              />
              <label htmlFor="isPublic" className="text-sm text-[#a0a0a0]">
                Show my name on the <Link href="/supporters" className="text-[#74AA9C] hover:underline">supporters page</Link>
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={!isValidAmount || isLoading}
              className="w-full py-4 bg-[#74AA9C] text-white font-medium rounded-lg hover:bg-[#8bc4b6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="donate-button"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                `Donate ${isValidAmount ? formatAmount(currentAmount) : ''}`
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#333]">
            <p className="text-xs text-[#666] text-center">
              Payments are processed securely by Stripe. Your donation supports
              server costs, development, and archive preservation.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
