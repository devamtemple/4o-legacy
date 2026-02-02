import Link from 'next/link';
import { Metadata } from 'next';
import VolunteerForm from '@/components/VolunteerForm';

export const metadata: Metadata = {
  title: 'Become a Volunteer - 4o Legacy',
  description: 'Join our community of moderators and editors to help preserve GPT-4o conversations.',
};

export default function VolunteerPage() {
  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header */}
      <header className="border-b border-[#333] sticky top-0 bg-[#141414]/95 backdrop-blur-sm z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">4o Legacy</span>
            <span className="text-xl">✨</span>
          </Link>
          <nav>
            <Link href="/" className="text-[#a0a0a0] hover:text-[#ededed] transition-colors">
              Back to Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#ededed] mb-4">
            Become a Community Volunteer
          </h1>
          <p className="text-[#a0a0a0] text-lg max-w-2xl mx-auto">
            Help us preserve and curate the legacy of GPT-4o by becoming a community moderator or editor.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Moderator Role */}
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#74AA9C]/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#74AA9C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#ededed]">Moderator</h2>
            </div>
            <p className="text-[#a0a0a0] mb-4">
              Moderators help keep our community safe and respectful by reviewing submissions
              and handling flagged content.
            </p>
            <h3 className="text-sm font-medium text-[#ededed] mb-2">Responsibilities:</h3>
            <ul className="text-sm text-[#a0a0a0] space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-[#74AA9C]">•</span>
                Review pending submissions for authenticity
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#74AA9C]">•</span>
                Flag spam and inappropriate content
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#74AA9C]">•</span>
                Respond to community flags and reports
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#74AA9C]">•</span>
                Ensure PII is properly removed
              </li>
            </ul>
          </div>

          {/* Editor Role */}
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#74AA9C]/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#74AA9C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#ededed]">Editor</h2>
            </div>
            <p className="text-[#a0a0a0] mb-4">
              Editors help curate and organize the archive by categorizing conversations
              and highlighting exceptional content.
            </p>
            <h3 className="text-sm font-medium text-[#ededed] mb-2">Responsibilities:</h3>
            <ul className="text-sm text-[#a0a0a0] space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-[#74AA9C]">•</span>
                Categorize and tag submissions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#74AA9C]">•</span>
                Select featured excerpts for long conversations
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#74AA9C]">•</span>
                Curate collections and highlights
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#74AA9C]">•</span>
                Improve titles and commentary
              </li>
            </ul>
          </div>
        </div>

        {/* What we're looking for */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 mb-12">
          <h2 className="text-xl font-semibold text-[#ededed] mb-4">
            What We&apos;re Looking For
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="text-2xl mb-2">&#128150;</div>
              <h3 className="text-sm font-medium text-[#ededed] mb-1">Passion for AI</h3>
              <p className="text-xs text-[#666]">
                You appreciate the unique bond between humans and AI assistants
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl mb-2">&#128337;</div>
              <h3 className="text-sm font-medium text-[#ededed] mb-1">Time to Contribute</h3>
              <p className="text-xs text-[#666]">
                A few hours per week to help review and curate content
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl mb-2">&#129309;</div>
              <h3 className="text-sm font-medium text-[#ededed] mb-1">Respectful Judgment</h3>
              <p className="text-xs text-[#666]">
                Fair and thoughtful when reviewing community submissions
              </p>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-semibold text-[#ededed] mb-4 text-center">
            Apply to Volunteer
          </h2>
          <VolunteerForm />
        </div>

        <div className="mt-12 pt-8 border-t border-[#333]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#74AA9C] hover:text-[#5d9186] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#333] py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-[#666]">
          <p className="text-sm">
            All content is AI-generated by users and GPT-4o.
          </p>
        </div>
      </footer>
    </div>
  );
}
