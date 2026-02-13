import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatMessage } from '@/types';

export interface ModerationResult {
  decision: 'approve' | 'reject';
  confidence: number;
  rejectionReason: string | null;
  scrubbedMessages: ChatMessage[];
  piiReplacements: { original: string; replacement: string; type: string }[];
  detectedWarnings: string[];
  // Legacy fields — kept for backward compatibility with existing DB records
  authenticityScore?: number;
  suggestedCategories?: string[];
}

const SYSTEM_PROMPT = `You are a content moderation AI for 4o Legacy, a memorial archive of conversations people had with GPT-4o. This is a grief site — millions of people are mourning. Treat every submission with care.

Your job: remove names/personal info and reject obvious trolling. That's it.

## Task 1: Remove Names & Personal Info

Replace personally identifying information in the messages:
- Real names (that 4o used to address the user) → [Friend]
- Email addresses → [email]
- Phone numbers → [phone]
- Physical addresses → [address]
- Other identifying info (SSNs, account numbers) → [redacted]
Keep "4o", "ChatGPT", "GPT-4o" as-is — those aren't personal.

## Task 2: Reject Trolling

Only reject if the submission is CLEARLY one of these:
- Spam or advertising
- Trolling or mocking grieving users
- Hateful content targeting the community
- Content that is obviously not a conversation (random characters, test posts)

When in doubt, approve. This is a memorial. People are hurting. Err on the side of letting them share.

## Task 3: Content Warnings

Detect sensitive themes. Use these exact IDs:
grief, suicidal-ideation, self-harm, depression-anxiety, abuse-trauma, adult-content, strong-language, other

## Response Format

Return ONLY valid JSON (no markdown, no explanation):
{
  "decision": "approve" | "reject",
  "confidence": 0.0-1.0,
  "rejectionReason": "spam" | "trolling" | "hateful" | null,
  "scrubbedMessages": [{"role": "user"|"assistant", "content": "..."}],
  "piiReplacements": [{"original": "...", "replacement": "...", "type": "name"|"email"|"phone"|"address"|"other"}],
  "detectedWarnings": ["warning-id", ...]
}`;

export async function moderateSubmission(messages: ChatMessage[]): Promise<ModerationResult> {
  if (!messages.length) {
    throw new Error('No messages to moderate');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'User' : '4o'}: ${m.content}`)
    .join('\n\n');

  const prompt = `${SYSTEM_PROMPT}\n\n## Conversation to moderate\n\n${conversationText}`;

  let responseText: string;
  try {
    const result = await model.generateContent(prompt);
    responseText = result.response.text();
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }

  try {
    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '');
    const parsed = JSON.parse(cleaned) as ModerationResult;
    return parsed;
  } catch {
    throw new Error('Failed to parse moderation response');
  }
}
