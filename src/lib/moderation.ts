import { ChatMessage } from '@/types';

export interface ModerationResult {
  shouldApprove: boolean;
  confidence: number;
  flags: ModerationFlag[];
  reasoning: string;
}

export interface ModerationFlag {
  type: 'spam' | 'abuse' | 'pii' | 'harmful' | 'low_quality' | 'not_4o';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ModerationOptions {
  checkSpam?: boolean;
  checkAbuse?: boolean;
  checkPii?: boolean;
  checkHarmful?: boolean;
  checkQuality?: boolean;
}

const DEFAULT_OPTIONS: ModerationOptions = {
  checkSpam: true,
  checkAbuse: true,
  checkPii: true,
  checkHarmful: true,
  checkQuality: true,
};

/**
 * AI-powered moderation using Claude API.
 * This is a stub implementation that will be expanded when Anthropic SDK is added.
 */
export async function moderateContent(
  chat: ChatMessage[],
  options: ModerationOptions = DEFAULT_OPTIONS
): Promise<ModerationResult> {
  // Check if Anthropic API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Return a conservative result when AI moderation is not available
    return {
      shouldApprove: false,
      confidence: 0,
      flags: [
        {
          type: 'low_quality',
          severity: 'low',
          description: 'AI moderation not configured - manual review required',
        },
      ],
      reasoning: 'AI moderation is not configured. Please review manually.',
    };
  }

  // TODO: Implement actual Claude API call when @anthropic-ai/sdk is added
  // For now, return a stub result that requires manual review
  return await stubModeration(chat, options);
}

/**
 * Stub moderation that performs basic checks without AI.
 * This will be replaced with actual AI moderation.
 */
async function stubModeration(
  chat: ChatMessage[],
  options: ModerationOptions
): Promise<ModerationResult> {
  const flags: ModerationFlag[] = [];
  const chatContent = chat.map((m) => m.content).join(' ');

  // Basic spam detection (very simple heuristics)
  if (options.checkSpam) {
    // Check for repeated content
    const uniqueMessages = new Set(chat.map((m) => m.content.toLowerCase().trim()));
    if (uniqueMessages.size < chat.length * 0.5 && chat.length > 4) {
      flags.push({
        type: 'spam',
        severity: 'medium',
        description: 'High percentage of duplicate messages detected',
      });
    }

    // Check for excessive links
    const linkCount = (chatContent.match(/https?:\/\//g) || []).length;
    if (linkCount > 5) {
      flags.push({
        type: 'spam',
        severity: 'low',
        description: `Contains ${linkCount} URLs`,
      });
    }
  }

  // Basic quality checks
  if (options.checkQuality) {
    // Very short conversations
    if (chat.length < 2) {
      flags.push({
        type: 'low_quality',
        severity: 'medium',
        description: 'Conversation has fewer than 2 messages',
      });
    }

    // Check if messages are very short
    const avgLength = chatContent.length / chat.length;
    if (avgLength < 20 && chat.length > 2) {
      flags.push({
        type: 'low_quality',
        severity: 'low',
        description: 'Messages are very short on average',
      });
    }
  }

  // Check for non-4o content (heuristic)
  const has4oMarkers = chat.some(
    (m) =>
      m.role === 'assistant' &&
      (m.content.includes('✨') ||
        m.content.includes('As an AI') ||
        m.content.includes('I understand') ||
        m.content.length > 100)
  );

  if (!has4oMarkers && chat.length > 3) {
    flags.push({
      type: 'not_4o',
      severity: 'low',
      description: 'Content may not be from GPT-4o (no typical markers found)',
    });
  }

  // Calculate confidence and decision
  const highSeverityFlags = flags.filter((f) => f.severity === 'high').length;
  const mediumSeverityFlags = flags.filter((f) => f.severity === 'medium').length;

  // Simple scoring: high severity = -30, medium = -10, low = -5
  const score = 100 - highSeverityFlags * 30 - mediumSeverityFlags * 10 - (flags.length - highSeverityFlags - mediumSeverityFlags) * 5;
  const normalizedScore = Math.max(0, Math.min(100, score));

  return {
    shouldApprove: normalizedScore >= 70 && highSeverityFlags === 0,
    confidence: normalizedScore / 100,
    flags,
    reasoning:
      flags.length === 0
        ? 'No issues detected. Content appears suitable for approval.'
        : `Found ${flags.length} potential issue(s). ${
            normalizedScore >= 70
              ? 'Recommend approval with manual review.'
              : 'Manual review strongly recommended.'
          }`,
  };
}

/**
 * Quick check for obvious spam/abuse patterns.
 * Use this for rate-limited pre-screening before full moderation.
 */
export function quickSpamCheck(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Obvious spam patterns
  const spamPatterns = [
    /buy now/i,
    /click here/i,
    /limited time offer/i,
    /act now/i,
    /congratulations.*winner/i,
    /casino|poker|betting/i,
  ];

  return spamPatterns.some((pattern) => pattern.test(lowerContent));
}
