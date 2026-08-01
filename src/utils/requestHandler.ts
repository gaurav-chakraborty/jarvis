interface RequestOptions {
  timeout?: number;
  maxRetries?: number;
  backoffMultiplier?: number;
}

interface RetryConfig {
  attempt: number;
  maxRetries: number;
  backoffMultiplier: number;
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

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new RequestError('timeout', `Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
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
      return await withTimeout(fn(), timeout);
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
    () => fetch(url, fetchOptions),
    { timeout, maxRetries, backoffMultiplier }
  );
}
