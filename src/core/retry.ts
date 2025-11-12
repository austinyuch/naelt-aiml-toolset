/**
 * Retry mechanism with exponential backoff
 * 
 * Implements retry logic for handling transient failures:
 * - Exponential backoff: delays increase exponentially (1s, 2s, 4s, ...)
 * - Configurable max retries and base delay
 * - Suitable for external API calls (News API, LLM providers)
 * 
 * Requirements: 2.5, 9.3
 */

/**
 * Retries a function with exponential backoff
 * 
 * The delay between retries follows the formula: baseDelay * 2^attempt
 * - Attempt 0 (first retry): baseDelay * 2^0 = baseDelay
 * - Attempt 1 (second retry): baseDelay * 2^1 = baseDelay * 2
 * - Attempt 2 (third retry): baseDelay * 2^2 = baseDelay * 4
 * 
 * @template T - Return type of the function
 * @param func - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Promise resolving to the function's return value
 * @throws The last error if all retries fail
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetchData(),
 *   3,  // max 3 attempts
 *   1000  // 1s base delay
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  func: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Try to execute the function
      return await func();
    } catch (error) {
      lastError = error;

      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError;
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
