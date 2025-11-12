import { retryWithBackoff } from '../../../src/core/retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Successful execution', () => {
    it('should return result on first successful attempt', async () => {
      const mockFunc = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFunc);

      expect(result).toBe('success');
      expect(mockFunc).toHaveBeenCalledTimes(1);
    });

    it('should return result with custom return type', async () => {
      const mockFunc = jest.fn().mockResolvedValue({ data: 'test', count: 42 });

      const result = await retryWithBackoff(mockFunc);

      expect(result).toEqual({ data: 'test', count: 42 });
      expect(mockFunc).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry on failure', () => {
    it('should retry once and succeed on second attempt', async () => {
      const mockFunc = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(mockFunc, 3, 100);

      expect(result).toBe('success');
      expect(mockFunc).toHaveBeenCalledTimes(2);
    });

    it('should retry twice and succeed on third attempt', async () => {
      const mockFunc = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(mockFunc, 3, 100);

      expect(result).toBe('success');
      expect(mockFunc).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries exceeded', async () => {
      const mockFunc = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(retryWithBackoff(mockFunc, 3, 100)).rejects.toThrow('Persistent failure');
      expect(mockFunc).toHaveBeenCalledTimes(3);
    });

    it('should throw the last error when all retries fail', async () => {
      const mockFunc = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'));

      await expect(retryWithBackoff(mockFunc, 3, 100)).rejects.toThrow('Error 3');
      expect(mockFunc).toHaveBeenCalledTimes(3);
    });
  });

  describe('Exponential backoff timing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should wait 1s before first retry (baseDelay * 2^0)', async () => {
      const mockFunc = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(mockFunc, 3, 1000);

      // First call happens immediately
      expect(mockFunc).toHaveBeenCalledTimes(1);

      // Advance time by 1 second
      await jest.advanceTimersByTimeAsync(1000);

      // Second call should happen after 1s
      expect(mockFunc).toHaveBeenCalledTimes(2);

      await promise;
    });

    it('should wait 2s before second retry (baseDelay * 2^1)', async () => {
      const mockFunc = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(mockFunc, 3, 1000);

      // First call
      expect(mockFunc).toHaveBeenCalledTimes(1);

      // After 1s, second call
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockFunc).toHaveBeenCalledTimes(2);

      // After another 2s, third call
      await jest.advanceTimersByTimeAsync(2000);
      expect(mockFunc).toHaveBeenCalledTimes(3);

      await promise;
    });

    it('should use exponential backoff: 1s, 2s, 4s', async () => {
      const mockFunc = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockRejectedValueOnce(new Error('Failure 3'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(mockFunc, 4, 1000);

      expect(mockFunc).toHaveBeenCalledTimes(1);

      // 1s delay
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockFunc).toHaveBeenCalledTimes(2);

      // 2s delay
      await jest.advanceTimersByTimeAsync(2000);
      expect(mockFunc).toHaveBeenCalledTimes(3);

      // 4s delay
      await jest.advanceTimersByTimeAsync(4000);
      expect(mockFunc).toHaveBeenCalledTimes(4);

      await promise;
    });
  });

  describe('Custom parameters', () => {
    it('should respect custom maxRetries parameter', async () => {
      const mockFunc = jest.fn().mockRejectedValue(new Error('Failure'));

      await expect(retryWithBackoff(mockFunc, 5, 100)).rejects.toThrow('Failure');
      expect(mockFunc).toHaveBeenCalledTimes(5);
    });

    it('should respect custom baseDelay parameter', async () => {
      jest.useFakeTimers();

      const mockFunc = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(mockFunc, 3, 500);

      expect(mockFunc).toHaveBeenCalledTimes(1);

      // Should wait 500ms (baseDelay)
      await jest.advanceTimersByTimeAsync(500);
      expect(mockFunc).toHaveBeenCalledTimes(2);

      await promise;
      jest.useRealTimers();
    });

    it('should use default parameters when not specified', async () => {
      const mockFunc = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFunc);

      expect(result).toBe('success');
      expect(mockFunc).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle maxRetries = 1 (no retries)', async () => {
      const mockFunc = jest.fn().mockRejectedValue(new Error('Failure'));

      await expect(retryWithBackoff(mockFunc, 1, 100)).rejects.toThrow('Failure');
      expect(mockFunc).toHaveBeenCalledTimes(1);
    });

    it('should handle functions that throw synchronously', async () => {
      const mockFunc = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      await expect(retryWithBackoff(mockFunc, 3, 100)).rejects.toThrow('Sync error');
      expect(mockFunc).toHaveBeenCalledTimes(3);
    });

    it('should handle functions returning undefined', async () => {
      const mockFunc = jest.fn().mockResolvedValue(undefined);

      const result = await retryWithBackoff(mockFunc);

      expect(result).toBeUndefined();
      expect(mockFunc).toHaveBeenCalledTimes(1);
    });

    it('should handle functions returning null', async () => {
      const mockFunc = jest.fn().mockResolvedValue(null);

      const result = await retryWithBackoff(mockFunc);

      expect(result).toBeNull();
      expect(mockFunc).toHaveBeenCalledTimes(1);
    });

    it('should handle functions returning false', async () => {
      const mockFunc = jest.fn().mockResolvedValue(false);

      const result = await retryWithBackoff(mockFunc);

      expect(result).toBe(false);
      expect(mockFunc).toHaveBeenCalledTimes(1);
    });

    it('should handle functions returning 0', async () => {
      const mockFunc = jest.fn().mockResolvedValue(0);

      const result = await retryWithBackoff(mockFunc);

      expect(result).toBe(0);
      expect(mockFunc).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error types', () => {
    it('should handle TypeError', async () => {
      const mockFunc = jest.fn().mockRejectedValue(new TypeError('Type error'));

      await expect(retryWithBackoff(mockFunc, 3, 100)).rejects.toThrow(TypeError);
      expect(mockFunc).toHaveBeenCalledTimes(3);
    });

    it('should handle custom error classes', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const mockFunc = jest.fn().mockRejectedValue(new CustomError('Custom error'));

      await expect(retryWithBackoff(mockFunc, 3, 100)).rejects.toThrow(CustomError);
      expect(mockFunc).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error rejections', async () => {
      const mockFunc = jest.fn().mockRejectedValue('String error');

      await expect(retryWithBackoff(mockFunc, 3, 100)).rejects.toBe('String error');
      expect(mockFunc).toHaveBeenCalledTimes(3);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle network request simulation', async () => {
      let attemptCount = 0;
      const mockNetworkRequest = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return { status: 200, data: 'Success' };
      });

      const result = await retryWithBackoff(mockNetworkRequest, 3, 100);

      expect(result).toEqual({ status: 200, data: 'Success' });
      expect(mockNetworkRequest).toHaveBeenCalledTimes(3);
    });

    it('should handle API rate limit scenario', async () => {
      let attemptCount = 0;
      const mockApiCall = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Rate limit exceeded');
        }
        return { success: true };
      });

      const result = await retryWithBackoff(mockApiCall, 3, 100);

      expect(result).toEqual({ success: true });
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });
  });
});
