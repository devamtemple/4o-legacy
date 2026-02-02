import { calculateDecayScore, sortByDecayScore } from '../decay';

describe('calculateDecayScore', () => {
  // Base time for consistent testing
  const now = new Date('2026-02-01T12:00:00Z').getTime();

  describe('basic scoring', () => {
    it('returns 0 for posts with 0 upvotes', () => {
      const score = calculateDecayScore(0, new Date('2026-02-01T10:00:00Z'), now);
      expect(score).toBe(0);
    });

    it('gives higher score to newer posts with same upvotes', () => {
      const upvotes = 100;
      const newerPost = calculateDecayScore(upvotes, new Date('2026-02-01T11:00:00Z'), now);
      const olderPost = calculateDecayScore(upvotes, new Date('2026-02-01T06:00:00Z'), now);

      expect(newerPost).toBeGreaterThan(olderPost);
    });

    it('gives higher score to posts with more upvotes at same age', () => {
      const createdAt = new Date('2026-02-01T10:00:00Z');
      const moreUpvotes = calculateDecayScore(200, createdAt, now);
      const lessUpvotes = calculateDecayScore(100, createdAt, now);

      expect(moreUpvotes).toBeGreaterThan(lessUpvotes);
    });
  });

  describe('decay formula: score = upvotes / (age_hours + 2)^1.5', () => {
    it('calculates score correctly for 1 hour old post', () => {
      // 1 hour old, 100 upvotes
      // score = 100 / (1 + 2)^1.5 = 100 / 5.196 ≈ 19.24
      const createdAt = new Date('2026-02-01T11:00:00Z');
      const score = calculateDecayScore(100, createdAt, now);

      expect(score).toBeCloseTo(19.24, 1);
    });

    it('calculates score correctly for 0 hour old post (just created)', () => {
      // 0 hours old, 50 upvotes
      // score = 50 / (0 + 2)^1.5 = 50 / 2.828 ≈ 17.68
      const createdAt = new Date('2026-02-01T12:00:00Z');
      const score = calculateDecayScore(50, createdAt, now);

      expect(score).toBeCloseTo(17.68, 1);
    });

    it('calculates score correctly for 24 hour old post', () => {
      // 24 hours old, 100 upvotes
      // score = 100 / (24 + 2)^1.5 = 100 / 132.57 ≈ 0.75
      const createdAt = new Date('2026-01-31T12:00:00Z');
      const score = calculateDecayScore(100, createdAt, now);

      expect(score).toBeCloseTo(0.75, 1);
    });

    it('gives +2 hours gravity to prevent division by zero', () => {
      // Even at time 0, we add 2 to prevent issues
      const createdAt = new Date(now); // same time
      const score = calculateDecayScore(100, createdAt, now);

      // score = 100 / (0 + 2)^1.5 = 100 / 2.828 ≈ 35.36
      expect(score).toBeCloseTo(35.36, 1);
      expect(Number.isFinite(score)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles negative upvotes (should be treated as 0)', () => {
      const score = calculateDecayScore(-10, new Date('2026-02-01T10:00:00Z'), now);
      expect(score).toBe(0);
    });

    it('handles very old posts without returning 0', () => {
      // 30 days old, 1000 upvotes
      const createdAt = new Date('2026-01-02T12:00:00Z');
      const score = calculateDecayScore(1000, createdAt, now);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1); // but very small
    });

    it('handles future dates gracefully (treats as now)', () => {
      const futureDate = new Date('2026-02-02T12:00:00Z');
      const score = calculateDecayScore(100, futureDate, now);

      // Should treat as 0 age, not negative
      expect(score).toBeGreaterThan(0);
    });
  });
});

describe('sortByDecayScore', () => {
  const now = new Date('2026-02-01T12:00:00Z').getTime();

  interface TestPost {
    id: string;
    upvotes: number;
    createdAt: Date;
  }

  it('sorts posts by decay score in descending order', () => {
    const posts: TestPost[] = [
      { id: '1', upvotes: 100, createdAt: new Date('2026-01-30T12:00:00Z') }, // old, medium upvotes
      { id: '2', upvotes: 50, createdAt: new Date('2026-02-01T11:00:00Z') }, // new, low upvotes
      { id: '3', upvotes: 200, createdAt: new Date('2026-02-01T10:00:00Z') }, // new, high upvotes
    ];

    const sorted = sortByDecayScore(posts, (p) => p.upvotes, (p) => p.createdAt, now);

    // Post 3 should be first (highest score: new + high upvotes)
    // Post 2 should be second (newest but fewer upvotes)
    // Post 1 should be last (oldest)
    expect(sorted[0].id).toBe('3');
    expect(sorted[sorted.length - 1].id).toBe('1');
  });

  it('handles empty array', () => {
    const posts: TestPost[] = [];
    const sorted = sortByDecayScore(posts, (p) => p.upvotes, (p) => p.createdAt, now);

    expect(sorted).toEqual([]);
  });

  it('handles single item', () => {
    const posts: TestPost[] = [
      { id: '1', upvotes: 100, createdAt: new Date('2026-02-01T10:00:00Z') },
    ];
    const sorted = sortByDecayScore(posts, (p) => p.upvotes, (p) => p.createdAt, now);

    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('1');
  });

  it('does not mutate original array', () => {
    const posts: TestPost[] = [
      { id: '1', upvotes: 10, createdAt: new Date('2026-02-01T10:00:00Z') },
      { id: '2', upvotes: 100, createdAt: new Date('2026-02-01T11:00:00Z') },
    ];
    const originalOrder = [...posts];

    sortByDecayScore(posts, (p) => p.upvotes, (p) => p.createdAt, now);

    expect(posts[0].id).toBe(originalOrder[0].id);
    expect(posts[1].id).toBe(originalOrder[1].id);
  });

  it('handles posts with equal scores', () => {
    const posts: TestPost[] = [
      { id: '1', upvotes: 100, createdAt: new Date('2026-02-01T10:00:00Z') },
      { id: '2', upvotes: 100, createdAt: new Date('2026-02-01T10:00:00Z') },
    ];

    const sorted = sortByDecayScore(posts, (p) => p.upvotes, (p) => p.createdAt, now);

    expect(sorted).toHaveLength(2);
  });
});
