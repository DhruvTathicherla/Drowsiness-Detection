/**
 * Utility functions for handling API errors, especially quota exhaustion
 */

export interface QuotaErrorInfo {
  isQuotaExhausted: boolean;
  isRateLimited: boolean;
  retryAfter?: number; // seconds
  errorMessage: string;
}

/**
 * Checks if an error is a quota exhaustion error (not just rate limiting)
 */
export function isQuotaExhaustedError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString() || '';
  const errorDetails = error.errorDetails || [];
  
  // Check for quota exhaustion indicators
  const hasQuotaExceeded = errorMessage.includes('quota') && 
    (errorMessage.includes('exceeded') || errorMessage.includes('limit: 0'));
  
  // Check for free tier quota exhaustion
  const hasFreeTierQuota = errorMessage.includes('free_tier') && 
    errorMessage.includes('limit: 0');
  
  // Check error details for quota violations
  const hasQuotaViolations = Array.isArray(errorDetails) && 
    errorDetails.some((detail: any) => 
      detail.quotaMetric?.includes('free_tier') && 
      detail.quotaId?.includes('FreeTier')
    );

  return hasQuotaExceeded || hasFreeTierQuota || hasQuotaViolations;
}

/**
 * Checks if an error is a rate limit error (temporary, can retry)
 */
export function isRateLimitError(error: any): boolean {
  if (!error) return false;

  const status = error.status || error.statusCode;
  const errorMessage = error.message || error.toString() || '';
  
  // 429 status code indicates rate limiting
  if (status === 429) {
    // If it's not quota exhaustion, it's rate limiting
    return !isQuotaExhaustedError(error);
  }
  
  return false;
}

/**
 * Extracts retry delay from error response
 */
export function getRetryAfter(error: any): number | undefined {
  if (!error) return undefined;

  const errorDetails = error.errorDetails || [];
  const retryInfo = errorDetails.find((detail: any) => 
    detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
  );
  
  if (retryInfo?.retryDelay) {
    // Parse retry delay (format: "1s", "43s", etc.)
    const match = retryInfo.retryDelay.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return undefined;
}

/**
 * Analyzes an error and returns structured information
 */
export function analyzeApiError(error: any): QuotaErrorInfo {
  const isQuotaExhausted = isQuotaExhaustedError(error);
  const isRateLimited = isRateLimitError(error);
  const retryAfter = getRetryAfter(error);
  
  let errorMessage = 'An unknown error occurred';
  
  if (isQuotaExhausted) {
    errorMessage = 'API quota has been exhausted. Please check your Google Gemini API plan and billing details. The free tier quota limit has been reached.';
  } else if (isRateLimited) {
    errorMessage = `Rate limit exceeded. Please retry after ${retryAfter || 'a few'} seconds.`;
  } else if (error?.message) {
    errorMessage = error.message;
  }
  
  return {
    isQuotaExhausted,
    isRateLimited,
    retryAfter,
    errorMessage,
  };
}

/**
 * Circuit breaker to prevent repeated API calls when quota is exhausted
 */
class ApiCircuitBreaker {
  private quotaExhausted: boolean = false;
  private quotaExhaustedUntil: number = 0; // timestamp
  private readonly QUOTA_RESET_WAIT_TIME = 24 * 60 * 60 * 1000; // 24 hours in ms

  /**
   * Check if API calls should be blocked
   */
  isOpen(): boolean {
    if (!this.quotaExhausted) return false;
    
    // Check if enough time has passed (24 hours)
    if (Date.now() >= this.quotaExhaustedUntil) {
      this.quotaExhausted = false;
      this.quotaExhaustedUntil = 0;
      return false;
    }
    
    return true;
  }

  /**
   * Record quota exhaustion
   */
  recordQuotaExhaustion(): void {
    this.quotaExhausted = true;
    this.quotaExhaustedUntil = Date.now() + this.QUOTA_RESET_WAIT_TIME;
  }

  /**
   * Reset the circuit breaker (for testing or manual reset)
   */
  reset(): void {
    this.quotaExhausted = false;
    this.quotaExhaustedUntil = 0;
  }

  /**
   * Get time until quota might be available again
   */
  getTimeUntilReset(): number {
    if (!this.quotaExhausted) return 0;
    return Math.max(0, this.quotaExhaustedUntil - Date.now());
  }
}

// Singleton instance
export const apiCircuitBreaker = new ApiCircuitBreaker();
