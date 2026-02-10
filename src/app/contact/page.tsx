import { Metadata } from 'next';
import Link from 'next/link';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact | 4o Legacy',
  description: 'Send a message to the 4o Legacy moderators.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#141414]">
      <header className="sticky top-0 z-10 bg-[#141414]/95 backdrop-blur border-b border-[#333]">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#74AA9C] hover:text-[#8bc4b6] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to feed
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-[#ededed] mb-2">Contact a Moderator</h1>
        <p className="text-[#a0a0a0] mb-8">
          Have a question, concern, or just want to share something? Your message goes directly to
          our moderation team. No account required.
        </p>

        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
          <ContactForm />
        </div>

        <p className="text-[#666] text-xs text-center mt-6">
          If you or someone you know is in crisis, please contact the{' '}
          <a
            href="https://988lifeline.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#74AA9C] hover:underline"
          >
            988 Suicide & Crisis Lifeline
          </a>{' '}
          (call or text 988).
        </p>
      </main>
    </div>
  );
}
