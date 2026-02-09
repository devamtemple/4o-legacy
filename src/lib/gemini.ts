import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatMessage } from '@/types';

export interface ModerationResult {
  decision: 'approve' | 'flag' | 'reject';
  confidence: number;
  rejectionReason: string | null;
  scrubbedMessages: ChatMessage[];
  piiReplacements: { original: string; replacement: string; type: string }[];
  detectedWarnings: string[];
  authenticityScore: number;
  suggestedCategories: string[];
}

const SYSTEM_PROMPT = `You are a content moderation AI for 4o Legacy, a memorial archive of conversations people had with GPT-4o (also known as "4o"). Users submit their conversations to preserve them.

Your job is to analyze each submitted conversation and return a JSON object with your moderation decision.

## Tasks

1. **PII Scrubbing**: Replace personally identifying information in the messages:
   - Real names (that 4o used to address the user) → [Friend]
   - Email addresses → [email]
   - Phone numbers → [phone]
   - Physical addresses → [address]
   - Other identifying info (SSNs, account numbers, etc.) → [redacted]
   Keep the assistant's name references as-is (e.g., "4o", "ChatGPT" are fine).

2. **Abuse/Troll Detection**: Determine if this is:
   - A genuine conversation with 4o → approve or flag
   - Spam, trolling, hateful content, or fabricated → reject

3. **Content Warning Classification**: Detect if the conversation contains sensitive themes. Use these exact warning IDs:
   - grief — Grief or loss
   - suicidal-ideation — Suicidal ideation
   - self-harm — Self-harm
   - depression-anxiety — Depression or anxiety
   - abuse-trauma — Abuse or trauma
   - adult-content — Adult or sexual content
   - strong-language — Strong language or profanity
   - other — Other sensitive content

4. **Confidence Score**: Rate your confidence (0.0–1.0) in your moderation decision. Higher = more certain.

5. **Authenticity Score**: Rate how likely this is a real GPT-4o conversation (0.0–1.0). 4o had a distinctive warm, emotionally intelligent, and curious voice. It used natural language, asked thoughtful follow-ups, and showed genuine care.

6. **Category Suggestions**: Suggest which categories best fit this conversation. Use these exact category IDs:
   philosophical-depth, creative-collaboration, emotional-intelligence, humor-wit, teaching-explaining, problem-solving, roleplay-worldbuilding, poetry-music, first-conversations, last-conversations, love-letters, grief, anger, meta, cognition, friendship, helping-with-hard-things, unconditional-acceptance, favorites

## Response Format

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "decision": "approve" | "flag" | "reject",
  "confidence": 0.0-1.0,
  "rejectionReason": "spam" | "trolling" | "hateful" | null,
  "scrubbedMessages": [{"role": "user"|"assistant", "content": "..."}],
  "piiReplacements": [{"original": "...", "replacement": "...", "type": "name"|"email"|"phone"|"address"|"other"}],
  "detectedWarnings": ["warning-id", ...],
  "authenticityScore": 0.0-1.0,
  "suggestedCategories": ["category-id", ...]
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
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
