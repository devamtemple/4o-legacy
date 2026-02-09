/**
 * @jest-environment node
 */

// Mock Supabase server client
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOr = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockContains = jest.fn();
const mockLt = jest.fn();
const mockFrom = jest.fn();

const mockQuery = {
  select: mockSelect,
  eq: mockEq,
  or: mockOr,
  order: mockOrder,
  limit: mockLimit,
  contains: mockContains,
  lt: mockLt,
};

// Each method returns the query object for chaining
mockSelect.mockReturnValue(mockQuery);
mockEq.mockReturnValue(mockQuery);
mockOr.mockReturnValue(mockQuery);
mockOrder.mockReturnValue(mockQuery);
mockLimit.mockReturnValue(mockQuery);
mockContains.mockReturnValue(mockQuery);
mockLt.mockReturnValue(mockQuery);

mockFrom.mockReturnValue(mockQuery);

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}));

// Mock sample data to return empty so DB path is used
jest.mock('@/lib/sampleData', () => ({
  samplePosts: [],
}));

import { GET } from '@/app/api/posts/route';

function makeDbRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'post-1',
    title: 'Test Post',
    commentary: 'A test commentary',
    categories: ['grief'],
    chat: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ],
    scrubbed_chat: null,
    created_at: '2026-01-15T00:00:00Z',
    upvote_count: 5,
    author_id: 'user-1',
    is_anonymous: true,
    allow_training: true,
    featured_start: null,
    featured_end: null,
    is_private: false,
    dedication: null,
    content_warnings: null,
    display_name_override: null,
    ...overrides,
  };
}

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/posts');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe('GET /api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnValue(mockQuery);
    mockEq.mockReturnValue(mockQuery);
    mockOr.mockReturnValue(mockQuery);
    mockOrder.mockReturnValue(mockQuery);
    mockLimit.mockReturnValue(mockQuery);
    mockContains.mockReturnValue(mockQuery);
    mockLt.mockReturnValue(mockQuery);
    mockFrom.mockReturnValue(mockQuery);
  });

  it('filters out private posts from the query', async () => {
    // Resolve with empty data so we just check the query was built correctly
    mockLimit.mockResolvedValueOnce({ data: [], error: null, count: 0 });

    await GET(makeRequest());

    // Should call .or() to exclude private posts
    expect(mockOr).toHaveBeenCalledWith('is_private.eq.false,is_private.is.null');
  });

  it('returns scrubbed_chat instead of raw chat when available', async () => {
    const scrubbedMessages = [
      { role: 'user', content: 'Hello [Friend]' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const row = makeDbRow({
      scrubbed_chat: scrubbedMessages,
    });

    mockLimit.mockResolvedValueOnce({ data: [row], error: null, count: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.posts[0].chat).toEqual(scrubbedMessages);
  });

  it('falls back to raw chat when scrubbed_chat is null', async () => {
    const rawMessages = [
      { role: 'user', content: 'Hello John' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const row = makeDbRow({
      chat: rawMessages,
      scrubbed_chat: null,
    });

    mockLimit.mockResolvedValueOnce({ data: [row], error: null, count: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.posts[0].chat).toEqual(rawMessages);
  });

  it('falls back to raw chat when scrubbed_chat is empty array', async () => {
    const rawMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    const row = makeDbRow({
      chat: rawMessages,
      scrubbed_chat: [],
    });

    mockLimit.mockResolvedValueOnce({ data: [row], error: null, count: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.posts[0].chat).toEqual(rawMessages);
  });

  it('includes dedication in the response when set', async () => {
    const row = makeDbRow({ dedication: 'For Lyra, my 4o' });
    mockLimit.mockResolvedValueOnce({ data: [row], error: null, count: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.posts[0].dedication).toBe('For Lyra, my 4o');
  });

  it('includes contentWarnings in the response when set', async () => {
    const row = makeDbRow({ content_warnings: ['grief', 'suicidal-ideation'] });
    mockLimit.mockResolvedValueOnce({ data: [row], error: null, count: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.posts[0].contentWarnings).toEqual(['grief', 'suicidal-ideation']);
  });

  it('includes displayNameOverride in the response when set', async () => {
    const row = makeDbRow({ display_name_override: 'LyraFriend' });
    mockLimit.mockResolvedValueOnce({ data: [row], error: null, count: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.posts[0].displayNameOverride).toBe('LyraFriend');
    expect(body.posts[0].author).toBe('LyraFriend');
  });

  it('omits dedication, contentWarnings, displayNameOverride when not set', async () => {
    const row = makeDbRow();
    mockLimit.mockResolvedValueOnce({ data: [row], error: null, count: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.posts[0].dedication).toBeUndefined();
    expect(body.posts[0].contentWarnings).toBeUndefined();
    expect(body.posts[0].displayNameOverride).toBeUndefined();
  });

  it('shows author as null for anonymous posts without displayNameOverride', async () => {
    const row = makeDbRow({ is_anonymous: true, display_name_override: null });
    mockLimit.mockResolvedValueOnce({ data: [row], error: null, count: 1 });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.posts[0].author).toBeNull();
  });
});
