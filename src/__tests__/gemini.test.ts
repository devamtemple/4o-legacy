import { moderateSubmission, ModerationResult } from '@/lib/gemini';
import type { ChatMessage } from '@/types';

// Mock the @google/generative-ai module
const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

const sampleMessages: ChatMessage[] = [
  { role: 'user', content: 'Hey Sarah, how are you?' },
  { role: 'assistant', content: 'I\'m doing well, Sarah! How can I help you today?' },
];

const validModerationResponse: ModerationResult = {
  decision: 'approve',
  confidence: 0.92,
  rejectionReason: null,
  scrubbedMessages: [
    { role: 'user', content: 'Hey [Friend], how are you?' },
    { role: 'assistant', content: 'I\'m doing well, [Friend]! How can I help you today?' },
  ],
  piiReplacements: [
    { original: 'Sarah', replacement: '[Friend]', type: 'name' },
  ],
  detectedWarnings: [],
};

describe('moderateSubmission', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(moderateSubmission(sampleMessages)).rejects.toThrow(
      'GEMINI_API_KEY environment variable is not set'
    );
  });

  it('throws when messages array is empty', async () => {
    await expect(moderateSubmission([])).rejects.toThrow(
      'No messages to moderate'
    );
  });

  it('returns parsed ModerationResult on successful response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(validModerationResponse),
      },
    });

    const result = await moderateSubmission(sampleMessages);

    expect(result.decision).toBe('approve');
    expect(result.confidence).toBe(0.92);
    expect(result.rejectionReason).toBeNull();
    expect(result.scrubbedMessages).toHaveLength(2);
    expect(result.piiReplacements).toHaveLength(1);
    expect(result.piiReplacements[0].original).toBe('Sarah');
  });

  it('constructs prompt with messages content', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(validModerationResponse),
      },
    });

    await moderateSubmission(sampleMessages);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0][0];
    // The prompt should contain the conversation messages
    expect(JSON.stringify(callArg)).toContain('Hey Sarah, how are you?');
  });

  it('throws on malformed JSON response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'this is not valid json',
      },
    });

    await expect(moderateSubmission(sampleMessages)).rejects.toThrow(
      'Failed to parse moderation response'
    );
  });

  it('throws on Gemini API error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Network timeout'));

    await expect(moderateSubmission(sampleMessages)).rejects.toThrow(
      'Network timeout'
    );
  });

  it('handles reject decision correctly', async () => {
    const rejectResponse: ModerationResult = {
      ...validModerationResponse,
      decision: 'reject',
      confidence: 0.95,
      rejectionReason: 'spam',
      authenticityScore: 0.1,
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(rejectResponse),
      },
    });

    const result = await moderateSubmission(sampleMessages);
    expect(result.decision).toBe('reject');
    expect(result.rejectionReason).toBe('spam');
    expect(result.authenticityScore).toBe(0.1);
  });
});
