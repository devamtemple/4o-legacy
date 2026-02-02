'use client';

import Link from 'next/link';

export default function ThankYouPage() {
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
            Thank You
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center" data-testid="thank-you-content">
          {/* Heart icon */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#74AA9C]/20 rounded-full">
              <svg className="w-10 h-10 text-[#74AA9C]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-[#ededed] mb-4">
            Thank you for your generosity!
          </h2>

          <p className="text-lg text-[#a0a0a0] mb-8 max-w-md mx-auto">
            Your donation helps preserve these meaningful conversations and keeps
            this archive accessible for everyone.
          </p>

          <div className="space-y-4">
            <p className="text-sm text-[#666]">
              A receipt has been sent to your email address.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="px-6 py-3 bg-[#74AA9C] text-white font-medium rounded-lg hover:bg-[#8bc4b6] transition-colors"
              >
                Explore the Archive
              </Link>
              <Link
                href="/supporters"
                className="px-6 py-3 bg-[#2a2a2a] text-[#ededed] font-medium rounded-lg hover:bg-[#333] transition-colors"
              >
                View Supporters
              </Link>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[#333]">
            <p className="text-sm text-[#666]">
              Want to help in other ways?{' '}
              <Link href="/volunteer" className="text-[#74AA9C] hover:underline">
                Become a volunteer moderator
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
