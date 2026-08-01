import { debugStats } from './debugStats';
import { logger } from './secureLogger';

interface InterceptorConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  excludeUrls?: RegExp[];
}

const defaultConfig: InterceptorConfig = {
  enableLogging: true,
  enableMetrics: true,
  excludeUrls: [
    /healthz/,
    /ping/,
  ],
};

function shouldIntercept(url: string, config: InterceptorConfig): boolean {
  if (!config.excludeUrls) return true;
  return !config.excludeUrls.some(pattern => pattern.test(url));
}

function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

export async function interceptedFetch(
  input: string | Request,
  init?: RequestInit,
  config: InterceptorConfig = defaultConfig
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.url;
  const method = (typeof input === 'string' ? init?.method : input.method) || 'GET';

  if (!shouldIntercept(url, config)) {
    return fetch(input, init);
  }

  const startTime = performance.now();
  const path = extractPath(url);

  try {
    const response = await fetch(input, init);

    const duration = Math.round(performance.now() - startTime);

    if (config.enableMetrics) {
      debugStats.recordApiCall(method, path, duration, response.status);
    }

    if (config.enableLogging) {
      logger.debug(`API ${method} ${path}`, {
        status: response.status,
        duration: `${duration}ms`,
      });
    }

    return response;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    if (config.enableMetrics) {
      debugStats.recordApiCall(method, path, duration, 0);
    }

    if (config.enableLogging) {
      logger.error(`API ${method} ${path} failed`, error as Error, {
        duration: `${duration}ms`,
      });
    }

    throw error;
  }
}

export function setupApiInterceptor(config: InterceptorConfig = defaultConfig) {
  const originalFetch = window.fetch;

  window.fetch = function(
    input: string | Request,
    init?: RequestInit
  ): Promise<Response> {
    return interceptedFetch(input, init, config);
  };

  return () => {
    window.fetch = originalFetch;
  };
}
