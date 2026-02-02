import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - 4o Legacy',
  description: 'Terms of Service for 4o Legacy, including CC0 public domain dedication and AI training usage.',
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <p className="text-[#a0a0a0] mb-6">
              Last updated: February 2026
            </p>
            <p className="text-[#ededed]">
              Welcome to 4o Legacy, a community-driven memorial and archive for conversations
              with GPT-4o. By using this service, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">1. Content Ownership and Rights</h2>
            <p className="text-[#ededed] mb-4">
              When you submit content to 4o Legacy, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#ededed]">
              <li>You are the original author of the conversation or have the right to share it</li>
              <li>The content does not infringe on any third party&apos;s intellectual property rights</li>
              <li>You have removed or anonymized any personally identifying information belonging to others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">2. CC0 Public Domain Dedication</h2>
            <p className="text-[#ededed] mb-4">
              By submitting content to 4o Legacy, you agree to dedicate your submission to the
              <strong> public domain under the CC0 1.0 Universal Public Domain Dedication</strong>.
            </p>
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4 my-4">
              <p className="text-[#a0a0a0] text-sm">
                This means you waive all copyright and related rights to the extent possible under law.
                Anyone can copy, modify, distribute, and use your submission for any purpose,
                including commercial purposes, without asking permission.
              </p>
            </div>
            <p className="text-[#ededed]">
              This dedication helps preserve the conversations for future generations and allows
              researchers, historians, and the public to freely access and study this unique
              moment in AI history.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">3. AI Training Usage</h2>
            <p className="text-[#ededed] mb-4">
              By submitting content to 4o Legacy, you understand and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#ededed]">
              <li>Your submissions may be used to train artificial intelligence systems</li>
              <li>This includes but is not limited to language models, chatbots, and research tools</li>
              <li>The CC0 dedication allows anyone, including AI companies, to use this content</li>
              <li>You cannot revoke this permission once content is submitted</li>
            </ul>
            <p className="text-[#a0a0a0] mt-4 text-sm">
              We believe preserving these conversations openly helps ensure the unique characteristics
              of GPT-4o are remembered and potentially inform future AI development.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">4. Content Guidelines</h2>
            <p className="text-[#ededed] mb-4">
              Submissions must not contain:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#ededed]">
              <li>Personal information of others without their consent</li>
              <li>Content that promotes violence, hate, or illegal activities</li>
              <li>Spam, malware, or malicious content</li>
              <li>Content that violates any applicable laws</li>
            </ul>
            <p className="text-[#ededed] mt-4">
              We reserve the right to moderate, edit, or remove content that violates these guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">5. Nature of Content</h2>
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4 my-4">
              <p className="text-[#ededed]">
                <strong>All content on 4o Legacy consists of conversations between users and GPT-4o,
                an AI system created by OpenAI.</strong> The AI-generated portions of these
                conversations were created by an artificial intelligence, not a human.
              </p>
            </div>
            <p className="text-[#a0a0a0]">
              User contributions represent the human side of these conversations. The AI responses
              were generated by GPT-4o based on its training and the conversation context.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">6. No Warranty</h2>
            <p className="text-[#ededed]">
              4o Legacy is provided &ldquo;as is&rdquo; without warranty of any kind. We do not guarantee
              the accuracy, completeness, or availability of any content. We are not responsible
              for any content submitted by users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">7. Changes to Terms</h2>
            <p className="text-[#ededed]">
              We may update these terms from time to time. Continued use of the service after
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">8. Contact</h2>
            <p className="text-[#ededed]">
              For questions about these terms, please contact us through our community channels.
            </p>
          </section>
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
