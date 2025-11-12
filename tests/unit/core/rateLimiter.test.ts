import { RateLimiter } from '../../../src/core/rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  describe('Refine Limit (5 per hour)', () => {
    it('should allow first refine request', () => {
      const contentId = 'content_123';
      const allowed = rateLimiter.checkRefineLimit(contentId);

      expect(allowed).toBe(true);
    });

    it('should allow up to 5 refine requests within an hour', () => {
      const contentId = 'content_456';

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const allowed = rateLimiter.checkRefineLimit(contentId);
        expect(allowed).toBe(true);
      }
    });

    it('should block 6th refine request within an hour', () => {
      const contentId = 'content_789';

      // First 5 requests allowed
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRefineLimit(contentId);
      }

      // 6th request should be blocked
      const allowed = rateLimiter.checkRefineLimit(contentId);
      expect(allowed).toBe(false);
    });

    it('should block all requests after limit is reached', () => {
      const contentId = 'content_abc';

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRefineLimit(contentId);
      }

      // Multiple subsequent requests should all be blocked
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(false);
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(false);
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(false);
    });

    it('should track limits independently for different content IDs', () => {
      const contentId1 = 'content_001';
      const contentId2 = 'content_002';

      // Exhaust limit for content 1
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRefineLimit(contentId1);
      }

      // Content 1 should be blocked
      expect(rateLimiter.checkRefineLimit(contentId1)).toBe(false);

      // Content 2 should still be allowed
      expect(rateLimiter.checkRefineLimit(contentId2)).toBe(true);
    });

    it('should handle multiple content IDs simultaneously', () => {
      const contentIds = ['c1', 'c2', 'c3', 'c4', 'c5'];

      // Each content ID should have its own limit
      for (const contentId of contentIds) {
        for (let i = 0; i < 5; i++) {
          expect(rateLimiter.checkRefineLimit(contentId)).toBe(true);
        }
        expect(rateLimiter.checkRefineLimit(contentId)).toBe(false);
      }
    });
  });

  describe('Time-based Expiration', () => {
    it('should allow requests after one hour has passed', async () => {
      const contentId = 'content_time_test';

      // Mock Date.now() to control time
      const originalNow = Date.now;
      let currentTime = new Date('2025-11-12T10:00:00Z').getTime();
      
      Date.now = jest.fn(() => currentTime);

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRefineLimit(contentId);
      }

      // Should be blocked
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(false);

      // Advance time by 1 hour and 1 second
      currentTime += (60 * 60 * 1000) + 1000;

      // Should be allowed again
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(true);

      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should only count requests within the last hour', async () => {
      const contentId = 'content_sliding_window';

      const originalNow = Date.now;
      let currentTime = new Date('2025-11-12T10:00:00Z').getTime();
      
      Date.now = jest.fn(() => currentTime);

      // Make 3 requests at 10:00
      for (let i = 0; i < 3; i++) {
        rateLimiter.checkRefineLimit(contentId);
      }

      // Advance time by 30 minutes
      currentTime += 30 * 60 * 1000;

      // Make 2 more requests at 10:30 (total 5)
      for (let i = 0; i < 2; i++) {
        expect(rateLimiter.checkRefineLimit(contentId)).toBe(true);
      }

      // Should be blocked (5 requests in last hour)
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(false);

      // Advance time by 31 more minutes (now 11:01, first 3 requests expired)
      currentTime += 31 * 60 * 1000;

      // Should be allowed (only 2 requests in last hour)
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(true);

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Cleanup', () => {
    it('should remove expired entries during cleanup', () => {
      const contentId = 'content_cleanup';

      const originalNow = Date.now;
      let currentTime = new Date('2025-11-12T10:00:00Z').getTime();
      
      Date.now = jest.fn(() => currentTime);

      // Make some requests
      for (let i = 0; i < 3; i++) {
        rateLimiter.checkRefineLimit(contentId);
      }

      // Advance time by 2 hours
      currentTime += 2 * 60 * 60 * 1000;

      // Run cleanup
      rateLimiter.cleanup();

      // Should be allowed (old entries cleaned up)
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(true);

      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should handle cleanup with no entries', () => {
      // Should not throw
      expect(() => rateLimiter.cleanup()).not.toThrow();
    });

    it('should handle cleanup with multiple content IDs', () => {
      const originalNow = Date.now;
      let currentTime = new Date('2025-11-12T10:00:00Z').getTime();
      
      Date.now = jest.fn(() => currentTime);

      // Create entries for multiple content IDs
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkRefineLimit(`content_${i}`);
      }

      // Advance time by 2 hours
      currentTime += 2 * 60 * 60 * 1000;

      // Run cleanup
      rateLimiter.cleanup();

      // All should be allowed again
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkRefineLimit(`content_${i}`)).toBe(true);
      }

      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should keep valid entries during cleanup', () => {
      const contentId = 'content_keep_valid';

      const originalNow = Date.now;
      let currentTime = new Date('2025-11-12T10:00:00Z').getTime();
      
      Date.now = jest.fn(() => currentTime);

      // Make 4 requests
      for (let i = 0; i < 4; i++) {
        rateLimiter.checkRefineLimit(contentId);
      }

      // Advance time by 30 minutes (still within window)
      currentTime += 30 * 60 * 1000;

      // Run cleanup
      rateLimiter.cleanup();

      // Should still have 4 requests counted
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(true); // 5th allowed
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(false); // 6th blocked

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content ID', () => {
      const allowed = rateLimiter.checkRefineLimit('');
      expect(allowed).toBe(true);
    });

    it('should handle very long content ID', () => {
      const longId = 'a'.repeat(1000);
      const allowed = rateLimiter.checkRefineLimit(longId);
      expect(allowed).toBe(true);
    });

    it('should handle special characters in content ID', () => {
      const specialId = 'content-with_special.chars@123!';
      
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkRefineLimit(specialId)).toBe(true);
      }
      
      expect(rateLimiter.checkRefineLimit(specialId)).toBe(false);
    });

    it('should handle rapid successive requests', () => {
      const contentId = 'content_rapid';

      // Make 5 requests in rapid succession
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(rateLimiter.checkRefineLimit(contentId));
      }

      // All 5 should be allowed
      expect(results.every(r => r === true)).toBe(true);

      // 6th should be blocked
      expect(rateLimiter.checkRefineLimit(contentId)).toBe(false);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return remaining requests for a content ID', () => {
      const contentId = 'content_remaining';

      expect(rateLimiter.getRemainingRequests(contentId)).toBe(5);

      rateLimiter.checkRefineLimit(contentId);
      expect(rateLimiter.getRemainingRequests(contentId)).toBe(4);

      rateLimiter.checkRefineLimit(contentId);
      rateLimiter.checkRefineLimit(contentId);
      expect(rateLimiter.getRemainingRequests(contentId)).toBe(2);

      rateLimiter.checkRefineLimit(contentId);
      rateLimiter.checkRefineLimit(contentId);
      expect(rateLimiter.getRemainingRequests(contentId)).toBe(0);
    });

    it('should return 5 for new content ID', () => {
      expect(rateLimiter.getRemainingRequests('new_content')).toBe(5);
    });

    it('should account for expired requests', () => {
      const contentId = 'content_expired_remaining';

      const originalNow = Date.now;
      let currentTime = new Date('2025-11-12T10:00:00Z').getTime();
      
      Date.now = jest.fn(() => currentTime);

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        rateLimiter.checkRefineLimit(contentId);
      }

      expect(rateLimiter.getRemainingRequests(contentId)).toBe(2);

      // Advance time by 2 hours
      currentTime += 2 * 60 * 60 * 1000;

      // Should be back to 5 (all expired)
      expect(rateLimiter.getRemainingRequests(contentId)).toBe(5);

      // Restore original Date.now
      Date.now = originalNow;
    });
  });
});
