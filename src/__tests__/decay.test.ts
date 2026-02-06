import { calculateDecayScore, sortByDecayScore } from '@/lib/decay';

describe('calculateDecayScore', () => {
  const NOW = new Date('2026-02-06T12:00:00Z').getTime();

  it('returns 0 for zero upvotes', () => {
    const createdAt = new Date('2026-02-06T11:00:00Z');
    expect(calculateDecayScore(0, createdAt, NOW)).toBe(0);
  });

  it('returns 0 for negative upvotes', () => {
    const createdAt = new Date('2026-02-06T11:00:00Z');
    expect(calculateDecayScore(-5, createdAt, NOW)).toBe(0);
  });

  it('calculates score for a post with positive upvotes', () => {
    const createdAt = new Date('2026-02-06T11:00:00Z'); // 1 hour ago
    const score = calculateDecayScore(10, createdAt, NOW);
    // score = 10 / (1 + 2)^1.5 = 10 / 3^1.5 = 10 / 5.196... ≈ 1.924
    expect(score).toBeCloseTo(10 / Math.pow(3, 1.5), 5);
  });

  it('score decreases as age increases', () => {
    const oneHourAgo = new Date(NOW - 1 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(NOW - 6 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(NOW - 24 * 60 * 60 * 1000);

    const score1h = calculateDecayScore(10, oneHourAgo, NOW);
    const score6h = calculateDecayScore(10, sixHoursAgo, NOW);
    const score24h = calculateDecayScore(10, twentyFourHoursAgo, NOW);

    expect(score1h).toBeGreaterThan(score6h);
    expect(score6h).toBeGreaterThan(score24h);
    expect(score24h).toBeGreaterThan(0);
  });

  it('higher upvotes produce higher scores at same age', () => {
    const createdAt = new Date(NOW - 3 * 60 * 60 * 1000); // 3 hours ago

    const score5 = calculateDecayScore(5, createdAt, NOW);
    const score50 = calculateDecayScore(50, createdAt, NOW);

    expect(score50).toBeGreaterThan(score5);
  });

  it('brand new post (age 0) uses baseline denominator', () => {
    const createdAt = new Date(NOW); // just now
    const score = calculateDecayScore(10, createdAt, NOW);
    // score = 10 / (0 + 2)^1.5 = 10 / 2^1.5 = 10 / 2.828... ≈ 3.535
    expect(score).toBeCloseTo(10 / Math.pow(2, 1.5), 5);
  });

  it('handles future createdAt gracefully (negative age clamped to 0)', () => {
    const future = new Date(NOW + 60 * 60 * 1000); // 1 hour in the future
    const score = calculateDecayScore(10, future, NOW);
    // age is clamped to 0 via Math.max(0, ...)
    // score = 10 / (0 + 2)^1.5 = same as brand new
    expect(score).toBeCloseTo(10 / Math.pow(2, 1.5), 5);
  });
});

describe('sortByDecayScore', () => {
  const NOW = new Date('2026-02-06T12:00:00Z').getTime();

  interface TestPost {
    id: string;
    upvotes: number;
    createdAt: Date;
  }

  const getUpvotes = (p: TestPost) => p.upvotes;
  const getCreatedAt = (p: TestPost) => p.createdAt;

  it('returns items sorted by decay score (highest first)', () => {
    const posts: TestPost[] = [
      { id: 'old-low', upvotes: 2, createdAt: new Date(NOW - 24 * 60 * 60 * 1000) },
      { id: 'new-high', upvotes: 20, createdAt: new Date(NOW - 1 * 60 * 60 * 1000) },
      { id: 'medium', upvotes: 10, createdAt: new Date(NOW - 6 * 60 * 60 * 1000) },
    ];

    const sorted = sortByDecayScore(posts, getUpvotes, getCreatedAt, NOW);

    expect(sorted[0].id).toBe('new-high');
    expect(sorted[sorted.length - 1].id).toBe('old-low');
  });

  it('does not mutate the original array', () => {
    const posts: TestPost[] = [
      { id: 'a', upvotes: 1, createdAt: new Date(NOW - 10 * 60 * 60 * 1000) },
      { id: 'b', upvotes: 100, createdAt: new Date(NOW - 1 * 60 * 60 * 1000) },
    ];

    const originalOrder = posts.map((p) => p.id);
    sortByDecayScore(posts, getUpvotes, getCreatedAt, NOW);

    expect(posts.map((p) => p.id)).toEqual(originalOrder);
  });

  it('returns empty array for empty input', () => {
    const sorted = sortByDecayScore([], getUpvotes, getCreatedAt, NOW);
    expect(sorted).toEqual([]);
  });

  it('handles single item', () => {
    const posts: TestPost[] = [
      { id: 'only', upvotes: 5, createdAt: new Date(NOW - 2 * 60 * 60 * 1000) },
    ];
    const sorted = sortByDecayScore(posts, getUpvotes, getCreatedAt, NOW);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('only');
  });

  it('items with zero upvotes sort to the end', () => {
    const posts: TestPost[] = [
      { id: 'zero', upvotes: 0, createdAt: new Date(NOW - 1 * 60 * 60 * 1000) },
      { id: 'has-votes', upvotes: 5, createdAt: new Date(NOW - 12 * 60 * 60 * 1000) },
    ];

    const sorted = sortByDecayScore(posts, getUpvotes, getCreatedAt, NOW);
    expect(sorted[0].id).toBe('has-votes');
    expect(sorted[1].id).toBe('zero');
  });
});
