import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage } from '@/types';

// Maximum content length for scrubbing (in characters)
const MAX_CONTENT_LENGTH = 100000;

// Scrubbing options
export interface ScrubbingOptions {
  removeProfanity?: boolean;
  removeSexual?: boolean;
  preserveNames?: boolean; // Keep names but replace with pseudonyms
}

export interface ScrubbingResult {
  success: boolean;
  scrubbedContent: ChatMessage[];
  replacements: Replacement[];
  error?: string;
}

export interface Replacement {
  original: string;
  replacement: string;
  type: 'name' | 'location' | 'phone' | 'email' | 'address' | 'profanity' | 'sexual' | 'other';
}

// Check if Anthropic API is configured
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Get Anthropic client
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropicClient) {
    return anthropicClient;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

// Build the scrubbing prompt
function buildScrubbingPrompt(options: ScrubbingOptions): string {
  let instructions = `You are a PII (Personally Identifiable Information) scrubbing assistant. Your task is to identify and replace personal information in conversation logs while preserving the meaning and flow of the conversation.

Replace the following types of PII:
1. **Names**: Replace with pseudonyms like [Name1], [Name2], etc. Use consistent replacements (same name always gets same pseudonym).
2. **Locations**: Replace specific locations with [City], [Country], [Location], [Address]
3. **Phone numbers**: Replace with [Phone]
4. **Email addresses**: Replace with [Email]
5. **Physical addresses**: Replace with [Address]
6. **Social Security Numbers, IDs**: Replace with [ID]
7. **Financial information** (credit cards, bank accounts): Replace with [Financial]
8. **Usernames/handles**: Replace with [Username]`;

  if (options.removeProfanity) {
    instructions += `
9. **Profanity**: Replace with [Profanity] or censor with asterisks (e.g., f*** or s***)`;
  }

  if (options.removeSexual) {
    instructions += `
10. **Sexual content**: Replace explicit descriptions with [Content removed] or summarize neutrally`;
  }

  instructions += `

IMPORTANT RULES:
- Preserve the conversation structure (role: user/assistant, content)
- Keep the conversation natural and readable
- Be consistent with replacements throughout the text
- Do NOT replace common words that happen to be names (e.g., "Mark my words" should stay)
- Preserve the emotional tone and meaning
- Return ONLY valid JSON with no additional text

Return the result as a JSON object with this structure:
{
  "messages": [
    {"role": "user", "content": "scrubbed message"},
    {"role": "assistant", "content": "scrubbed message"}
  ],
  "replacements": [
    {"original": "John Smith", "replacement": "[Name1]", "type": "name"},
    {"original": "john@email.com", "replacement": "[Email]", "type": "email"}
  ]
}`;

  return instructions;
}

// Scrub content using Claude
export async function scrubContent(
  messages: ChatMessage[],
  options: ScrubbingOptions = {}
): Promise<ScrubbingResult> {
  // Check content length
  const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalLength > MAX_CONTENT_LENGTH) {
    return {
      success: false,
      scrubbedContent: messages,
      replacements: [],
      error: `Content too long. Maximum length is ${MAX_CONTENT_LENGTH} characters.`,
    };
  }

  // Check if API is configured
  if (!isAnthropicConfigured()) {
    return {
      success: false,
      scrubbedContent: messages,
      replacements: [],
      error: 'AI scrubbing service is not configured',
    };
  }

  const client = getAnthropicClient();
  const systemPrompt = buildScrubbingPrompt(options);

  // Format messages for the prompt
  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please scrub the following conversation and return the result as JSON:\n\n${conversationText}`,
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and transform the response
    const scrubbedMessages: ChatMessage[] = result.messages.map((m: { role: string; content: string }) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));

    const replacements: Replacement[] = (result.replacements || []).map((r: Replacement) => ({
      original: r.original,
      replacement: r.replacement,
      type: r.type || 'other',
    }));

    return {
      success: true,
      scrubbedContent: scrubbedMessages,
      replacements,
    };
  } catch (error) {
    console.error('Scrubbing error:', error);

    // Check for rate limiting
    if (error instanceof Anthropic.RateLimitError) {
      return {
        success: false,
        scrubbedContent: messages,
        replacements: [],
        error: 'Rate limit exceeded. Please try again later.',
      };
    }

    return {
      success: false,
      scrubbedContent: messages,
      replacements: [],
      error: 'Scrubbing failed, please try again',
    };
  }
}

// Quick regex-based scrubbing fallback (no AI)
export function quickScrub(messages: ChatMessage[]): ScrubbingResult {
  const replacements: Replacement[] = [];
  const nameMap = new Map<string, string>();
  let nameCounter = 1;

  const scrubbedMessages = messages.map((message) => {
    let content = message.content;

    // Email pattern
    content = content.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      (match) => {
        replacements.push({ original: match, replacement: '[Email]', type: 'email' });
        return '[Email]';
      }
    );

    // Phone pattern (various formats)
    content = content.replace(
      /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
      (match) => {
        replacements.push({ original: match, replacement: '[Phone]', type: 'phone' });
        return '[Phone]';
      }
    );

    // SSN pattern
    content = content.replace(
      /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
      (match) => {
        if (!match.match(/^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/)) { // Not a phone number
          replacements.push({ original: match, replacement: '[ID]', type: 'other' });
          return '[ID]';
        }
        return match;
      }
    );

    // Credit card pattern
    content = content.replace(
      /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
      (match) => {
        replacements.push({ original: match, replacement: '[Financial]', type: 'other' });
        return '[Financial]';
      }
    );

    return { ...message, content };
  });

  return {
    success: true,
    scrubbedContent: scrubbedMessages,
    replacements,
  };
}
