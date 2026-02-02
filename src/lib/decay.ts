/**
 * Decay-based ranking algorithm for posts.
 *
 * Uses a Hacker News-style decay function:
 * score = upvotes / (age_hours + 2)^1.5
 *
 * The +2 ensures:
 * - New posts start with a fair baseline (not infinite score at 0 hours)
 * - Prevents division by zero
 * - Creates a smooth decay curve
 *
 * The 1.5 exponent (gravity) means:
 * - Posts decay relatively quickly
 * - Fresh content rises to the top
 * - High-upvote posts still persist longer
 */

const GRAVITY = 1.5;
const BASELINE_HOURS = 2;

/**
 * Calculate the decay score for a single post.
 *
 * @param upvotes - Number of upvotes (negative treated as 0)
 * @param createdAt - When the post was created
 * @param now - Current timestamp in ms (defaults to Date.now())
 * @returns The decay-adjusted score (higher = ranks higher)
 */
export function calculateDecayScore(
  upvotes: number,
  createdAt: Date,
  now: number = Date.now()
): number {
  // Treat negative upvotes as 0
  if (upvotes <= 0) {
    return 0;
  }

  // Calculate age in hours
  const ageMs = now - createdAt.getTime();
  const ageHours = Math.max(0, ageMs / (1000 * 60 * 60)); // Don't allow negative age

  // Apply decay formula: score = upvotes / (age_hours + baseline)^gravity
  const denominator = Math.pow(ageHours + BASELINE_HOURS, GRAVITY);
  const score = upvotes / denominator;

  return score;
}

/**
 * Sort an array of items by their decay score.
 *
 * This is a generic function that works with any object type.
 * You provide accessors to get the upvotes and createdAt from each item.
 *
 * @param items - Array of items to sort
 * @param getUpvotes - Function to extract upvotes from an item
 * @param getCreatedAt - Function to extract createdAt from an item
 * @param now - Current timestamp in ms (defaults to Date.now())
 * @returns New array sorted by decay score (highest first)
 */
export function sortByDecayScore<T>(
  items: T[],
  getUpvotes: (item: T) => number,
  getCreatedAt: (item: T) => Date,
  now: number = Date.now()
): T[] {
  // Don't mutate original array
  return [...items].sort((a, b) => {
    const scoreA = calculateDecayScore(getUpvotes(a), getCreatedAt(a), now);
    const scoreB = calculateDecayScore(getUpvotes(b), getCreatedAt(b), now);
    return scoreB - scoreA; // Descending order (highest first)
  });
}
