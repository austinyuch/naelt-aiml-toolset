/**
 * Rate Limiter for API request throttling
 * 
 * Implements rate limiting for content refinement requests:
 * - Maximum 5 refinement requests per content ID per hour
 * - Uses sliding window algorithm
 * - Memory-based tracking (suitable for single instance deployment)
 * 
 * Requirements: 4.4, 4.5
 */

/**
 * Rate limiter for controlling request frequency
 */
export class RateLimiter {
  private refineCounts: Map<string, Date[]>;
  private readonly maxRefinePerHour = 5;
  private readonly windowMs = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Creates a new RateLimiter
   */
  constructor() {
    this.refineCounts = new Map();
  }

  /**
   * Checks if a refine request is allowed for the given content ID
   * 
   * Uses a sliding window algorithm to track requests within the last hour.
   * 
   * @param contentId - Content identifier
   * @returns true if request is allowed, false if rate limit exceeded
   */
  checkRefineLimit(contentId: string): boolean {
    const now = new Date(Date.now());
    const oneHourAgo = new Date(Date.now() - this.windowMs);

    // Get existing timestamps for this content ID
    const timestamps = this.refineCounts.get(contentId) || [];

    // Filter out timestamps older than one hour (sliding window)
    const validTimestamps = timestamps.filter(ts => ts > oneHourAgo);

    // Check if limit is exceeded
    if (validTimestamps.length >= this.maxRefinePerHour) {
      return false;
    }

    // Add current timestamp and update the map
    validTimestamps.push(now);
    this.refineCounts.set(contentId, validTimestamps);

    return true;
  }

  /**
   * Gets the number of remaining requests for a content ID
   * 
   * @param contentId - Content identifier
   * @returns Number of remaining requests (0-5)
   */
  getRemainingRequests(contentId: string): number {
    const oneHourAgo = new Date(Date.now() - this.windowMs);

    // Get existing timestamps for this content ID
    const timestamps = this.refineCounts.get(contentId) || [];

    // Filter out timestamps older than one hour
    const validTimestamps = timestamps.filter(ts => ts > oneHourAgo);

    return Math.max(0, this.maxRefinePerHour - validTimestamps.length);
  }

  /**
   * Cleans up expired entries from the rate limiter
   * 
   * Should be called periodically to prevent memory leaks.
   * Removes all timestamps older than one hour.
   */
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - this.windowMs);

    for (const [contentId, timestamps] of this.refineCounts.entries()) {
      // Filter out expired timestamps
      const validTimestamps = timestamps.filter(ts => ts > oneHourAgo);

      if (validTimestamps.length === 0) {
        // Remove entry if no valid timestamps remain
        this.refineCounts.delete(contentId);
      } else {
        // Update with only valid timestamps
        this.refineCounts.set(contentId, validTimestamps);
      }
    }
  }

  /**
   * Resets the rate limit for a specific content ID
   * 
   * Useful for testing or administrative purposes.
   * 
   * @param contentId - Content identifier
   */
  reset(contentId: string): void {
    this.refineCounts.delete(contentId);
  }

  /**
   * Resets all rate limits
   * 
   * Useful for testing or administrative purposes.
   */
  resetAll(): void {
    this.refineCounts.clear();
  }

  /**
   * Gets the total number of tracked content IDs
   * 
   * @returns Number of content IDs being tracked
   */
  getTrackedCount(): number {
    return this.refineCounts.size;
  }
}
