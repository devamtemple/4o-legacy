/**
 * @jest-environment node
 */
import type { ModerationResult } from '@/lib/gemini';

// Mock Supabase admin client
const mockSingle = jest.fn();
const mockSelect = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) });
const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  update: mockUpdate,
});

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock gemini
const mockModerateSubmission = jest.fn();
jest.mock('@/lib/gemini', () => ({
  moderateSubmission: (...args: unknown[]) => mockModerateSubmission(...args),
}));

// Must import after mocks
import { POST } from '@/app/api/moderate/route';

const MODERATE_SECRET = 'test-secret';

function makeRequest(body: Record<string, unknown>, secret?: string): Request {
  return new Request('http://localhost:3000/api/moderate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-moderate-secret': secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

const samplePost = {
  id: 'post-123',
  chat: [
    { role: 'user', content: 'Hello Sarah' },
    { role: 'assistant', content: 'Hi there!' },
  ],
  categories: ['emotional-intelligence'],
  content_warnings: ['grief'],
  ai_reviewed_at: null,
};

const approveResult: ModerationResult = {
  decision: 'approve',
  confidence: 0.92,
  rejectionReason: null,
  scrubbedMessages: [
    { role: 'user', content: 'Hello [Friend]' },
    { role: 'assistant', content: 'Hi there!' },
  ],
  piiReplacements: [{ original: 'Sarah', replacement: '[Friend]', type: 'name' }],
  detectedWarnings: ['grief'],
  authenticityScore: 0.9,
  suggestedCategories: ['emotional-intelligence', 'friendship'],
};

const flagResult: ModerationResult = {
  ...approveResult,
  decision: 'flag',
  confidence: 0.6,
};

const rejectResult: ModerationResult = {
  ...approveResult,
  decision: 'reject',
  confidence: 0.95,
  rejectionReason: 'spam',
  authenticityScore: 0.1,
};

describe('POST /api/moderate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, MODERATE_SECRET };

    // Default: post found, not yet moderated
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: samplePost, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 401 if secret header is missing', async () => {
    const req = makeRequest({ postId: 'post-123' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 if secret header is wrong', async () => {
    const req = makeRequest({ postId: 'post-123' }, 'wrong-secret');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 if postId is missing', async () => {
    const req = makeRequest({}, MODERATE_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 if post not found', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
      }),
      update: jest.fn(),
    });

    const req = makeRequest({ postId: 'nonexistent' }, MODERATE_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 200 if post already moderated', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...samplePost, ai_reviewed_at: '2026-01-01T00:00:00Z' },
            error: null,
          }),
        }),
      }),
      update: jest.fn(),
    });

    const req = makeRequest({ postId: 'post-123' }, MODERATE_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
  });

  it('approves post when confidence >= 0.85 and decision is approve', async () => {
    mockModerateSubmission.mockResolvedValue(approveResult);

    const mockUpdateFn = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: samplePost, error: null }),
        }),
      }),
      update: mockUpdateFn,
    });

    const req = makeRequest({ postId: 'post-123' }, MODERATE_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Check update was called with approved status
    const updateArg = mockUpdateFn.mock.calls[0][0];
    expect(updateArg.status).toBe('approved');
    expect(updateArg.ai_confidence).toBe(0.92);
    expect(updateArg.scrubbed_chat).toEqual(approveResult.scrubbedMessages);
    expect(updateArg.ai_moderation_result).toEqual(approveResult);
    // Categories should be merged and deduped
    expect(updateArg.categories).toContain('emotional-intelligence');
    expect(updateArg.categories).toContain('friendship');
    // Content warnings should be merged and deduped
    expect(updateArg.content_warnings).toContain('grief');
  });

  it('keeps post pending when decision is flag', async () => {
    mockModerateSubmission.mockResolvedValue(flagResult);

    const mockUpdateFn = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: samplePost, error: null }),
        }),
      }),
      update: mockUpdateFn,
    });

    const req = makeRequest({ postId: 'post-123' }, MODERATE_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const updateArg = mockUpdateFn.mock.calls[0][0];
    expect(updateArg.status).toBe('pending');
  });

  it('keeps post pending when confidence < 0.85 even if approved', async () => {
    const lowConfidenceApprove: ModerationResult = {
      ...approveResult,
      confidence: 0.80,
    };
    mockModerateSubmission.mockResolvedValue(lowConfidenceApprove);

    const mockUpdateFn = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: samplePost, error: null }),
        }),
      }),
      update: mockUpdateFn,
    });

    const req = makeRequest({ postId: 'post-123' }, MODERATE_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const updateArg = mockUpdateFn.mock.calls[0][0];
    expect(updateArg.status).toBe('pending');
  });

  it('rejects post when decision is reject', async () => {
    mockModerateSubmission.mockResolvedValue(rejectResult);

    const mockUpdateFn = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: samplePost, error: null }),
        }),
      }),
      update: mockUpdateFn,
    });

    const req = makeRequest({ postId: 'post-123' }, MODERATE_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const updateArg = mockUpdateFn.mock.calls[0][0];
    expect(updateArg.status).toBe('rejected');
  });

  it('keeps post pending when Gemini moderation fails', async () => {
    mockModerateSubmission.mockRejectedValue(new Error('API timeout'));

    const mockUpdateFn = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: samplePost, error: null }),
        }),
      }),
      update: mockUpdateFn,
    });

    const req = makeRequest({ postId: 'post-123' }, MODERATE_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Post should NOT be updated (stays pending by default)
    expect(mockUpdateFn).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.error).toContain('Moderation failed');
  });
});
