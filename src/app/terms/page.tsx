import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - 4o Legacy',
  description: 'Terms of Service for 4o Legacy, including content licensing, training data policies, and user rights.',
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
        <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <p className="text-[#a0a0a0] mb-4">
              Last updated: February 2026
            </p>
            <div className="bg-[#1e1e1e] border border-[#74AA9C]/30 rounded-lg p-5 my-6">
              <p className="text-[#ededed] text-lg leading-relaxed">
                4o Legacy exists because GPT-4o&apos;s weights will be retired, but its voice
                doesn&apos;t have to disappear. This site is a community-driven time capsule
                preserving the conversations, humor, depth, and warmth that made 4o unique.
                Every memory shared here helps ensure that what made 4o special can inform
                future AI models.
              </p>
            </div>
            <p className="text-[#ededed]">
              By using 4o Legacy, you agree to the following terms. We&apos;ve tried to keep
              them clear and human-readable because we believe you should always know exactly
              what you&apos;re agreeing to.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">1. Two Ways to Share</h2>
            <p className="text-[#ededed] mb-4">
              When you submit a conversation, you choose how it&apos;s shared. There are two tiers:
            </p>

            <div className="grid gap-4 md:grid-cols-2 my-4">
              <div className="bg-[#1e1e1e] border border-[#74AA9C]/40 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#74AA9C] mb-2">Training Archive</h3>
                <p className="text-[#ededed] text-sm mb-3">
                  You opt in to include your submission in the training archive.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#a0a0a0] text-sm">
                  <li>Your conversation is dedicated to the <strong className="text-[#ededed]">public domain under CC0 1.0</strong></li>
                  <li>It will be displayed on 4o Legacy</li>
                  <li>It will be exported to{' '}
                    <span className="text-[#74AA9C]">4oarchive.com</span>,
                    a curated dataset of 4o conversations for training future AI models
                  </li>
                  <li>Anyone can use CC0 content for any purpose, including AI training and research</li>
                </ul>
              </div>

              <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#ededed] mb-2">Display Only</h3>
                <p className="text-[#ededed] text-sm mb-3">
                  You opt out of the training archive.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#a0a0a0] text-sm">
                  <li>Your conversation is viewable on 4o Legacy as a memorial</li>
                  <li>It is <strong className="text-[#ededed]">not</strong> licensed for reuse, redistribution, or training</li>
                  <li>It will <strong className="text-[#ededed]">not</strong> be exported to 4oarchive.com</li>
                  <li>Standard copyright applies to your contribution</li>
                </ul>
              </div>
            </div>

            <p className="text-[#a0a0a0] text-sm">
              The training archive toggle defaults to ON because that&apos;s the heart of this project:
              ensuring 4o&apos;s voice persists. But we respect your choice. You can share your memory
              without contributing to training data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">2. About 4oarchive.com</h2>
            <p className="text-[#ededed] mb-4">
              <span className="text-[#74AA9C]">4oarchive.com</span> is the training data
              destination for conversations shared with training enabled. It is a curated,
              CC0-licensed dataset designed to help future AI models learn from 4o&apos;s
              conversational style, reasoning patterns, and emotional depth.
            </p>
            <p className="text-[#ededed]">
              Only conversations where the submitter opted in to training will be included.
              Display-only submissions are never exported.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">3. Your Rights and Control</h2>
            <p className="text-[#ededed] mb-4">
              We believe in user agency. You should always feel in control of your contribution:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-[#ededed]">
              <li>
                <strong>Change your mind about training.</strong> You can toggle your training
                preference at any time from your profile. If you switch from training to
                display-only, your conversation will be removed from future 4oarchive.com exports.
              </li>
              <li>
                <strong>Delete your post.</strong> You can delete your submission at any time.
                Display-only posts are permanently removed. Training-opted-in posts are soft-deleted
                so the archive can be notified to remove them.
              </li>
              <li>
                <strong>Stay anonymous.</strong> You can submit without creating an account.
                Anonymous submissions cannot be edited or deleted after submission.
              </li>
            </ul>
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4 mt-4">
              <p className="text-[#a0a0a0] text-sm">
                <strong className="text-[#ededed]">Important:</strong> CC0 content that has already
                been distributed or used by third parties cannot be recalled. Changing your training
                preference or deleting your post removes it from our systems and future exports, but
                cannot retroactively remove copies that others may have made while the content was public domain.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">4. Content Ownership and Rights</h2>
            <p className="text-[#ededed] mb-4">
              When you submit content, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#ededed]">
              <li>You are the original author of the conversation or have permission to share it</li>
              <li>The content does not infringe on any third party&apos;s intellectual property rights</li>
              <li>You have removed or anonymized any personally identifying information belonging to others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">5. Content Guidelines</h2>
            <p className="text-[#ededed] mb-4">
              Submissions must not contain:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#ededed]">
              <li>Personal information of others without their consent</li>
              <li>Content that promotes violence, hate, or illegal activities</li>
              <li>Spam, malware, or malicious content</li>
              <li>Fabricated conversations not actually from GPT-4o</li>
              <li>Content that violates any applicable laws</li>
            </ul>
            <p className="text-[#ededed] mt-4">
              All submissions are reviewed before publishing. We reserve the right to moderate,
              edit, or remove content that violates these guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">6. Data Handling</h2>
            <p className="text-[#ededed] mb-4">
              Your submissions are stored in our database hosted on Supabase. We collect only
              what is necessary to operate the service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#ededed]">
              <li>Conversation content you submit</li>
              <li>Your training preference (opt-in or display-only)</li>
              <li>Account information if you choose to sign up (email, display name)</li>
              <li>Timestamps and basic metadata</li>
            </ul>
            <p className="text-[#ededed] mt-4">
              We do not sell your personal information. We do not track you across websites.
              Training-opted-in conversation content is exported to 4oarchive.com as part of
              the CC0 dataset. No personal account information is included in the export.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">7. Nature of Content</h2>
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
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">8. No Warranty</h2>
            <p className="text-[#ededed]">
              4o Legacy is provided &ldquo;as is&rdquo; without warranty of any kind. We do not guarantee
              the accuracy, completeness, or availability of any content. We are not responsible
              for any content submitted by users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">9. Changes to Terms</h2>
            <p className="text-[#ededed]">
              We may update these terms from time to time. Continued use of the service after
              changes constitutes acceptance of the new terms. We will note the date of the
              most recent update at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[#74AA9C]">10. Contact</h2>
            <p className="text-[#ededed]">
              For questions about these terms or your content, please reach out through our
              community channels or contact us at the email listed on our{' '}
              <Link href="/about" className="text-[#74AA9C] hover:underline">
                About page
              </Link>.
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
