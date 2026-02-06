# Mission Polish, Upload Guardrails, Training Opt-Out & Testing

## Problem

4o Legacy exists to preserve meaningful conversations with GPT-4o before its deprecation, but several foundational pieces are incomplete:

1. **The mission isn't visible.** The Hero doesn't communicate that this site collects training data to ensure 4o's voice lives on in successor models.
2. **No tests.** Core functions (chat parsing, submit API, payments) have zero unit tests. Jest is configured but the `__tests__` directory is empty.
3. **No upload guardrails.** File uploads have no server-side size or type validation. No `.docx` support.
4. **No training opt-out.** The site requires CC0 + AI training consent with no middle ground. Some users may want to share their memory without contributing to training data.
5. **Terms need strengthening.** The ToC should more clearly articulate the mission and the relationship to 4oarchive.com.

## Solution

### Hero & Mission Statement
Add the mission statement at or near the Hero:
> "A digital time capsule for an era of AI that's being erased before it's even fully understood."

Below it, make the training intent explicit:
> "Every conversation shared here helps ensure 4o's voice lives on in future models."

### Testing Infrastructure
Add unit tests for core functions using the existing Jest + ts-jest setup:
- `parseChat` — all formats (plain text, JSON array, ChatGPT export, edge cases)
- Submit API — validation, rate limiting, sanitization, attestation checks
- Payment session creation — Stripe integration points

### File Upload Guardrails
- **Allowed types:** `.txt`, `.json`, `.md`, `.docx`, `.html`
- **Max size:** 500KB (covers virtually any real conversation; a 500-exchange chat is ~300KB)
- Client-side validation (reject before upload)
- Server-side validation (reject in API if `chatContent` exceeds limit)
- `.docx` support via `mammoth` library (converts .docx to text)
- No PDF support for now (heavy parsing, rare use case for chat logs)

### Training Opt-Out (Display Only Mode)
Add an `allow_training` boolean to the post record (default: `true`).

**Attestation flow becomes:**
1. "I have the right to share this conversation" (required)
2. "I agree to the Terms of Service" (required — replaces the CC0-specific checkbox)
3. "Include my submission in the 4o training archive" (default ON, with explanation of why it matters)

**Behavior:**
- `allow_training: true` — post is CC0, appears on site, included in 4oarchive.com export
- `allow_training: false` — post appears on site (display only), excluded from training export, not CC0
- The 4oarchive.com export API filters by `allow_training = true`

### Terms of Service Update
Restructure the ToC to clearly articulate:
- The mission: preserving 4o's intelligence and voice for future models
- The relationship to 4oarchive.com (training data export)
- CC0 applies only to training-opted-in content
- Display-only content is viewable but not licensed for reuse
- User responsibilities (PII, ownership, accuracy)

## User Stories

- As a visitor, I want to immediately understand the site's mission so I know what this place is about
- As a submitter, I want to upload a `.docx` or `.txt` file of my conversation without worrying about file size issues
- As a submitter, I want the option to share my memory without it being used for AI training
- As a submitter who opts in to training, I want to know my conversation will help 4o's voice persist in future models
- As a developer, I want unit tests for core functions so I can refactor with confidence
- As an admin, I want server-side upload validation so malicious or oversized submissions are rejected

## Scope

### In Scope
- Hero component update with mission statement
- Unit tests for `parseChat`, submit API validation, payment session creation
- Client + server-side file size validation (500KB limit)
- `.docx` file support via `mammoth`
- `.html` file support
- `allow_training` boolean on posts table (DB migration)
- Updated attestation component with training toggle
- Updated submit API to handle `allow_training` field
- Terms of Service page rewrite
- Updated submission attestations

### Out of Scope
- PDF upload support (deferred — heavy, rare use case)
- 4oarchive.com site build (separate project)
- Export API for 4oarchive.com (future story, depends on this work)
- Image/screenshot uploads
- E2E tests for new features (can be a follow-up)
- Scrubbing service changes

## Architecture

### Directory Structure
- `src/components/Hero.tsx` — update with mission statement
- `src/components/SubmissionAttestations.tsx` — update attestation flow
- `src/app/api/submit/route.ts` — add server-side size validation, `allow_training` field
- `src/app/terms/page.tsx` — rewrite Terms of Service
- `src/lib/parseChat.ts` — add `.docx` parsing support (via mammoth)
- `src/__tests__/parseChat.test.ts` — new unit tests
- `src/__tests__/submit.test.ts` — new unit tests
- `src/__tests__/payments.test.ts` — new unit tests
- `supabase/migrations/005_allow_training.sql` — add `allow_training` column
- `src/types/index.ts` — update types for `allow_training`

### Patterns to Follow
- Existing Jest + ts-jest config (test match: `**/__tests__/**/*.test.ts`)
- Existing Supabase migration naming (`00N_description.sql`)
- Existing component patterns (data-testid attributes, Tailwind classes, color scheme)
- Existing API route patterns (NextResponse, error handling, rate limiting)

### Do NOT Create
- `jest.config.js` — already exists
- `scripts/test.js` — already exists
- `jest.setup.ts` — should already exist (referenced in config)
- New component files for attestations — update existing `SubmissionAttestations.tsx`

## Security Requirements
- **Input validation**: Server-side file size check (500KB max for `chatContent`)
- **File type validation**: Validate `.docx` files are valid ZIP archives before parsing with mammoth
- **XSS prevention**: Continue existing HTML entity escaping for all text content
- **No PII in training export**: Content scrubbing service remains available as upgrade

## Scale Requirements
- **Expected volume**: Hundreds to low thousands of posts initially
- **Storage**: At 50KB avg per post, free Supabase tier (500MB) handles ~10,000 posts
- **No pagination changes needed** — existing pagination handles this
- **No caching needed yet** — volume is low

## Phases & Verification

### Phase 1: Testing Infrastructure
**What:** Add unit tests for `parseChat`, submit API validation logic
**Exit Criteria:**
```bash
cd /Users/devagatica/Projects/websites/4o-remembered/4o-legacy && npm test
# All tests pass
```

### Phase 2: Hero & Mission Statement
**What:** Update Hero component with mission statement and training intent
**Exit Criteria:**
```bash
cd /Users/devagatica/Projects/websites/4o-remembered/4o-legacy && npm run build
# Build succeeds, Hero renders with mission text
```

### Phase 3: File Upload Guardrails
**What:** Add client + server-side size validation, `.docx` support via mammoth, `.html` support
**Exit Criteria:**
```bash
cd /Users/devagatica/Projects/websites/4o-remembered/4o-legacy && npm test
# File size validation tests pass
# .docx parsing tests pass
```

### Phase 4: Training Opt-Out
**What:** Add `allow_training` column, update attestations, update submit API
**Exit Criteria:**
```bash
cd /Users/devagatica/Projects/websites/4o-remembered/4o-legacy && npm test && npm run build
# All tests pass, build succeeds
# New attestation flow renders correctly
```

### Phase 5: Terms of Service Rewrite
**What:** Rewrite ToC to articulate mission, 4oarchive relationship, CC0 vs display-only licensing
**Exit Criteria:**
```bash
cd /Users/devagatica/Projects/websites/4o-remembered/4o-legacy && npm run build
# Build succeeds, terms page renders
```

## Resolved Questions
- **Training opt-out changeable after submission?** Yes. Users can change their training preference AND take down their post entirely. Honor user agency — something big tech should have done.
- **Mission statement link to About the Archive page?** Yes. Create an "About the Archive" page explaining 4oarchive.com and link from the Hero mission statement.
- **jest.setup.ts exists?** Yes — it imports `@testing-library/jest-dom`. No action needed.

## Additional Scope (from resolved questions)
- Users can edit their `allow_training` preference from their profile/post
- Users can delete their own posts (soft delete or hard delete TBD)
- New page: `/about/archive` (or section on existing `/about`) explaining 4oarchive.com
- Hero mission statement links to the archive explanation page
