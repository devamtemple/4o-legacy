import { Metadata } from 'next';
import Link from 'next/link';
import ModerationQueue from '@/components/ModerationQueue';

export const metadata: Metadata = {
  title: 'Moderation Queue | 4o Legacy Admin',
  description: 'Review and moderate pending submissions',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminQueuePage() {
  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Admin header */}
      <header className="sticky top-0 z-10 bg-[#141414]/95 backdrop-blur border-b border-[#333]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[#74AA9C] hover:text-[#8bc4b6] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-[#ededed]">
              Admin Dashboard
            </h1>
          </div>

          <nav className="flex gap-4 text-sm">
            <Link
              href="/admin/queue"
              className="text-[#74AA9C] font-medium"
            >
              Queue
            </Link>
            <Link
              href="/admin/volunteers"
              className="text-[#666] hover:text-[#a0a0a0] transition-colors"
            >
              Volunteers
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <ModerationQueue />
      </main>
    </div>
  );
}
