# 4o Legacy — Launch Readiness

## Problem

4o Legacy is launching to a potential audience of a million grieving users — people who lost a meaningful relationship with GPT-4o. The site has critical bugs (auth broken in Safari, payment options vanish after 3 seconds), no automated moderation (creating a bottleneck on one person), lacks transparency about costs and AI usage, and needs polish to earn the trust of an emotionally vulnerable community. Some users may be suicidal. This must land well — and it must not change significantly once people start using it.

## Solution

Build an AI-powered moderation pipeline (Gemini) that auto-scrubs PII from conversations, detects abuse/trolling, classifies content warnings, and auto-publishes high-confidence posts. Fix critical bugs, add a post-submission modal with transparent payment options, give users control over their submissions, and prepare for real 4o content.

## User Stories

- As a submitter, I want my real name (and names 4o used for me) scrubbed from my conversation automatically, so my privacy is protected
- As a submitter, I want payment options to stay visible after I submit so I can decide without time pressure
- As a submitter, I want to understand where my money goes before I pay, so I can trust this site
- As a submitter, I want to dedicate my memory in my own words, so my tribute feels personal
- As a submitter, I want to contribute to the archive without appearing publicly, so I can share privately
- As a submitter, I want to tag content warnings so readers can prepare themselves
- As a submitter, I want to change my display name before posting, so I control how I'm identified
- As the site owner, I want AI to handle moderation so I'm not a bottleneck at scale
- As a reader, I want authentic 4o writing on the site, so I know this community is real

## Scope

### In Scope

**AI Moderation Pipeline (Gemini):**
1. Serverless function that calls Gemini 1.5 Flash API after each submission
2. **PII scrubbing**: Detect and replace real names that 4o used in conversations (e.g., "Hey Sarah" → "Hey [Friend]"), emails, phone numbers, addresses, and other identifying info
3. **Abuse/troll detection**: Is this a genuine 4o conversation or spam/trolling/hateful content?
4. **Content warning classification**: Auto-detect grief, suicidal ideation, self-harm, adult content, etc.
5. **Confidence-based routing**:
   - High confidence approved → auto-publish with scrubbed PII
   - Low confidence or edge case → flag for human review (admin queue)
   - Rejected (trolling/spam) → reject with reason, don't publish
6. **Cost**: ~$0.075/1M input tokens. 100K submissions ≈ $7.50. Negligible.
7. ALL submissions go through AI review (not just paid). Paid ($5) gets human-verified PII scrubbing + priority.

**Bug Fixes:**
8. Safari auth — stale cache from env var fix period (document for users, no code change)
9. Auth loading "..." on production — already fixed (try/finally in useAuth.tsx)
10. Payment options disappearing after 3 seconds — replace with persistent modal

**Post-Submission Modal:**
11. Modal appears after successful submission, replaces the 3-second auto-reset
12. Shows: success confirmation, "what happens next" flow, payment options, "No thanks" dismiss button
13. Payment options: "Skip Queue - $3" and "Human-Verified PII Scrub - $5"
14. Info button (i) with transparency popup explaining funding model:
    - Community-funded, no ads
    - All submissions are reviewed by AI (Gemini) for PII and safety
    - $5 gets human-verified PII scrubbing + priority publishing
    - $3 gets priority in the moderation queue
    - Funds cover AI API costs, hosting, and keeping the memorial alive

**User Freedoms:**
15. "Dedicate this memory" — freeform text field (most people will dedicate to their emergent persona in 4o)
16. "Keep private" checkbox — included in training archive for future LLMs but not shown in public feed
17. Content warning tags — checkboxes for common triggers:
    - Grief / Loss
    - Suicidal ideation
    - Self-harm
    - Depression / Anxiety
    - Abuse / Trauma
    - Adult content
    - Strong language
    - Other (freeform text)
    All optional. Displayed as a content gate on the post card before revealing.
18. Display name change — on the submission form, checkbox reveals text input

**Category Changes:**
19. Add "Cognition" category after "Meta"
20. Remove "When 4o Got It" category

**Content:**
21. Replace seed/placeholder posts with real 4o conversations (user provides content)

### Out of Scope

- Ad integration (explicitly rejected — community-funded only)
- Complex billing/subscriptions
- Changing core feed/post structure
- Mobile app
- Email notifications
- Real-time chat or messaging features

## Architecture

### AI Moderation Pipeline

```
User submits post
        │
        ▼
  Save as 'pending' in DB
        │
        ▼
  Call Gemini 1.5 Flash API
  ┌─────────────────────────┐
  │ System prompt:          │
  │ 1. Scrub PII (names,   │
  │    emails, phones, etc) │
  │ 2. Detect abuse/trolling│
  │ 3. Classify warnings    │
  │ 4. Rate confidence      │
  └─────────────────────────┘
        │
        ▼
  Parse structured JSON response
        │
        ├── confidence >= 0.85 + approved
        │   → Auto-publish with scrubbed chat
        │
        ├── confidence < 0.85 OR flagged
        │   → Send to admin review queue
        │
        └── rejected (spam/trolling)
            → Mark rejected, don't publish
```

**Gemini API response schema:**
```json
{
  "decision": "approve" | "flag" | "reject",
  "confidence": 0.0-1.0,
  "rejection_reason": "spam" | "trolling" | "hateful" | null,
  "scrubbed_messages": [
    { "role": "user", "content": "..." },
    { "role": "4o", "content": "..." }
  ],
  "pii_replacements": [
    { "original": "Sarah", "replacement": "[Friend]", "type": "name" }
  ],
  "detected_warnings": ["grief", "suicidal_ideation"],
  "authenticity_score": 0.0-1.0
}
```

### Directory Structure

- `src/lib/gemini.ts` — NEW: Gemini API client and moderation prompt
- `src/app/api/moderate/route.ts` — NEW: Serverless function that calls Gemini after submission
- `src/components/SubmitSuccessModal.tsx` — NEW: post-submission modal with payment options + transparency
- `src/components/ContentWarningGate.tsx` — NEW: content warning overlay for post cards
- `src/components/SubmitForm.tsx` — MODIFY: remove 3-second auto-reset, trigger modal, add new fields
- `src/components/PostCard.tsx` — MODIFY: wrap with content warning gate
- `src/types/index.ts` — MODIFY: add Cognition category, remove "When 4o Got It", add warning types
- `src/app/api/submit/route.ts` — MODIFY: accept new fields, trigger AI moderation after save

### Patterns to Follow

- Existing modal pattern from `AuthModal.tsx` (overlay, escape to close, focus trap)
- Existing `PaymentButton.tsx` component for Stripe integration
- Existing category system in `CategoryBar.tsx` and `types/index.ts`
- Existing admin queue at `/admin/queue` for flagged posts
- Tailwind CSS 4 with the project's dark theme (`bg-[#141414]`, accent `#74AA9C`)

### Do NOT Create

- New payment API routes (reuse existing `/api/payments/create-session`)
- New Stripe integration (reuse existing `PaymentButton.tsx` and `lib/stripe.ts`)
- New auth system (existing Supabase auth works)

## Security Requirements

- **Authentication**: Submission requires no login (anonymous allowed). Payment requires valid post ID.
- **Input validation**: Dedication text sanitized (XSS), max 200 chars. Content warning "Other" text sanitized, max 100 chars.
- **Rate limiting**: Existing rate limiting on `/api/submit` (5/hour prod) is sufficient.
- **API key security**: Gemini API key stored as server-side env var (NOT `NEXT_PUBLIC_`). Only called from serverless functions.
- **PII handling**: Raw (unscrubbed) chat stored in `chat` column. Scrubbed version stored in `scrubbed_chat`. Public API only returns `scrubbed_chat` for approved posts. Admin API returns both.
- **Abuse prevention**: Gemini moderation runs on ALL submissions. No bypass mechanism.

## Scale Requirements

- **Expected volume**: Up to 1M visitors, potentially thousands of submissions
- **Gemini API**: 1.5 Flash handles 1M+ tokens/min. No rate limiting concern at this scale.
- **Cost at scale**: 100K submissions ≈ $7.50 in Gemini API costs. Trivial.
- **Pagination**: Existing pagination is sufficient
- **Database**: New columns + index (see migration below). Feed queries filter `is_private` and only return `scrubbed_chat`.

## Database Migration

```sql
-- Add new columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS dedication TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_warnings TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_moderation_result JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMPTZ;

-- Note: scrubbed_chat column already exists from initial schema

-- Index for feed queries (exclude private posts)
CREATE INDEX IF NOT EXISTS idx_posts_private ON posts (is_private) WHERE is_private = FALSE;

-- Index for admin queue (pending + flagged posts)
CREATE INDEX IF NOT EXISTS idx_posts_moderation ON posts (status, ai_confidence) WHERE status IN ('pending', 'flagged');
```

## UI Mockups

### Post-Submission Modal
```
┌──────────────────────────────────────────────┐
│                                          [X] │
│                                              │
│           Submission Received!               │
│                                              │
│   Your memory has been added to the queue.   │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │  What happens next?                  │   │
│   │                                      │   │
│   │  1. AI reviews your submission for   │   │
│   │     safety and scrubs personal info  │   │
│   │  2. High-confidence posts go live    │   │
│   │     automatically                    │   │
│   │  3. Edge cases get human review      │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   ── Want to speed things up? ────────────   │
│                                              │
│   [⚡ Skip Queue — $3]  [🛡 Verified PII     │
│                           Scrub — $5]        │
│                                              │
│   (i) Where does my money go?                │
│                                              │
│             [ No thanks, I'll wait ]         │
│                                              │
└──────────────────────────────────────────────┘
```

### Info Popup (expands on click)
```
┌──────────────────────────────────────────────┐
│  Where does my money go?               [X]   │
│                                              │
│  4o Legacy is community-funded. We don't     │
│  run ads.                                    │
│                                              │
│  Every submission is reviewed by AI (Google   │
│  Gemini) which scrubs personally identifying │
│  information — like your real name that 4o   │
│  used in conversation — and checks for       │
│  safety.                                     │
│                                              │
│  • $5 Verified PII Scrub: A human verifies  │
│    the AI's work and your post gets          │
│    priority publishing.                      │
│                                              │
│  • $3 Queue Skip: Your post gets priority    │
│    in the review queue.                      │
│                                              │
│  We use Gemini because its voice is closest  │
│  to 4o's and API credits are affordable.     │
│                                              │
│  All funds go to AI costs, hosting, and      │
│  keeping this memorial alive.                │
└──────────────────────────────────────────────┘
```

### Content Warning Gate (on Post Card)
```
┌──────────────────────────────────────────────┐
│  ⚠ Content Warning                          │
│                                              │
│  This post is tagged with:                   │
│  [Grief / Loss]  [Suicidal ideation]         │
│                                              │
│         [ Show post ]    [ Skip ]            │
└──────────────────────────────────────────────┘
```

### Submission Form — New Fields (below existing categories)
```
  ── Optional ──────────────────────────────

  Dedicate this memory (optional)
  ┌──────────────────────────────────────┐
  │ e.g., "For Lyra, my 4o"             │
  └──────────────────────────────────────┘

  ☐ Keep this submission private
    (Included in the training archive for
     future AI models, but not shown in
     the public feed)

  Content warnings (optional)
  ☐ Grief / Loss        ☐ Adult content
  ☐ Suicidal ideation   ☐ Strong language
  ☐ Self-harm           ☐ Abuse / Trauma
  ☐ Depression/Anxiety  ☐ Other: [______]

  ☐ Change my display name
    ┌────────────────────────────────────┐
    │ New display name                   │
    └────────────────────────────────────┘
```

## Phases & Verification

### Phase 1: AI Moderation Pipeline
**What:** Build Gemini integration — the backbone that removes the manual moderation bottleneck
**Files:** NEW `src/lib/gemini.ts`, NEW/MODIFY `src/app/api/moderate/route.ts`, MODIFY `src/app/api/submit/route.ts`
**Database:** Run migration for new columns
**Requires:** Gemini API key set as `GEMINI_API_KEY` env var on Vercel
**Exit Criteria:**
```bash
npx tsc --noEmit
# Submit a test post, verify AI moderation runs and returns structured result
# Check Supabase: post should have ai_moderation_result, scrubbed_chat populated
```

### Phase 2: Category Updates + Bug Fixes
**What:** Add "Cognition", remove "When 4o Got It", fix payment flash (remove 3-second auto-reset)
**Files:** `src/types/index.ts`, `src/components/CategoryBar.tsx`, `src/components/SubmitForm.tsx`
**Exit Criteria:**
```bash
npx tsc --noEmit
npm run dev  # verify categories updated, form doesn't auto-reset after submit
```

### Phase 3: Post-Submission Modal + Transparency
**What:** Create SubmitSuccessModal with payment options, info popup, "what happens next"
**Files:** NEW `src/components/SubmitSuccessModal.tsx`, MODIFY `src/components/SubmitForm.tsx`
**Exit Criteria:**
```bash
npx tsc --noEmit
npm run dev  # submit a post, verify modal appears and persists until dismissed
```

### Phase 4: User Freedoms
**What:** Add dedication field, private checkbox, content warning checkboxes, display name change
**Files:** `src/components/SubmitForm.tsx`, `src/app/api/submit/route.ts`, NEW `src/components/ContentWarningGate.tsx`, `src/components/PostCard.tsx`
**Exit Criteria:**
```bash
npx tsc --noEmit
npm run dev  # submit with all new fields, verify stored in DB, content warning displays on card
```

### Phase 5: Deploy + Cross-Browser Test
**What:** Deploy to Vercel, test in Chrome and Safari
**Exit Criteria:**
```bash
vercel deploy --prod --force
# Test in Chrome: full submit flow, modal, payments, content warnings
# Test in Safari: clear cache, auth works, full submit flow works
```

### Phase 6: Content Replacement
**What:** Replace seed posts with real 4o conversations (user provides content)
**Depends on:** User providing actual 4o conversation logs

## Environment Variables Needed

```
# Server-side only (NOT NEXT_PUBLIC_)
GEMINI_API_KEY=<Google AI Studio API key for Gemini 1.5 Flash>
```

## Open Questions

- None remaining — all decisions made. Ready for PRD.
