interface RequestOptions {
  timeout?: number;
  maxRetries?: number;
  backoffMultiplier?: number;
}

export class RequestError extends Error {
  constructor(
    public code: 'timeout' | 'network' | 'unknown',
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number, multiplier: number): number {
  return Math.min(1000 * Math.pow(multiplier, attempt), 30000);
}

/**
 * Runs fn with a real AbortController-backed timeout: fn receives the signal
 * and must pass it through to the underlying request (fetch, Supabase, etc.)
 * so the in-flight request is actually cancelled, not just abandoned.
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new RequestError('timeout', `Request timeout after ${timeoutMs}ms`, error instanceof Error ? error : undefined);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeout = 30000,
    maxRetries = 3,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn, timeout);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      const delay = getBackoffDelay(attempt, backoffMultiplier);
      await sleep(delay);
    }
  }

  throw lastError || new RequestError('unknown', 'Request failed after retries');
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit & RequestOptions = {}
): Promise<Response> {
  const {
    timeout,
    maxRetries,
    backoffMultiplier,
    ...fetchOptions
  } = options;

  return withRetry(
    (signal) => fetch(url, { ...fetchOptions, signal }),
    { timeout, maxRetries, backoffMultiplier }
  );
}
