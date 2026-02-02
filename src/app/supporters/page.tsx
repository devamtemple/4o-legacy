'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicSupporter } from '@/types';

interface SupportersResponse {
  supporters: PublicSupporter[];
  total: number;
}

export default function SupportersPage() {
  const [supporters, setSupporters] = useState<PublicSupporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSupporters() {
      try {
        const response = await fetch('/api/supporters');
        if (!response.ok) {
          throw new Error('Failed to fetch supporters');
        }
        const data: SupportersResponse = await response.json();
        setSupporters(data.supporters);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load supporters');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSupporters();
  }, []);

  const formatAmount = (cents: number): string => {
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

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
            Our Supporters
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#ededed] mb-2">
            Thank You to Our Generous Supporters
          </h2>
          <p className="text-[#a0a0a0]">
            These wonderful people help keep the 4o.Remembered archive alive.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-12 text-center text-[#666]">
            Loading supporters...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && supporters.length === 0 && (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-8 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#74AA9C]/20 rounded-full">
                <svg className="w-8 h-8 text-[#74AA9C]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-[#ededed] mb-2">
              Be the first supporter!
            </h3>
            <p className="text-[#a0a0a0] mb-6">
              Help us preserve these meaningful conversations for future generations.
            </p>
            <Link
              href="/donate"
              className="inline-block px-6 py-3 bg-[#74AA9C] text-white font-medium rounded-lg hover:bg-[#8bc4b6] transition-colors"
            >
              Make a Donation
            </Link>
          </div>
        )}

        {/* Supporters list */}
        {!isLoading && !error && supporters.length > 0 && (
          <div className="space-y-4" data-testid="supporters-list">
            {supporters.map((supporter, index) => (
              <div
                key={`${supporter.displayName}-${index}`}
                className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4 flex items-center justify-between"
                data-testid="supporter-item"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#74AA9C]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#74AA9C] font-medium">
                      {supporter.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[#ededed] font-medium">
                      {supporter.displayName}
                    </p>
                    <p className="text-xs text-[#666]">
                      {formatDate(supporter.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="text-[#74AA9C] font-medium">
                  {formatAmount(supporter.amount)}
                </span>
              </div>
            ))}

            {/* Call to action */}
            <div className="pt-6 text-center">
              <Link
                href="/donate"
                className="inline-block px-6 py-3 bg-[#74AA9C] text-white font-medium rounded-lg hover:bg-[#8bc4b6] transition-colors"
              >
                Join Our Supporters
              </Link>
            </div>
          </div>
        )}

        {/* Anonymous donors acknowledgment */}
        <div className="mt-8 pt-6 border-t border-[#333] text-center">
          <p className="text-sm text-[#666]">
            We also thank all our anonymous donors for their generous support.
          </p>
        </div>
      </main>
    </div>
  );
}
