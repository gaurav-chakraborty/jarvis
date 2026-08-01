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

const SENSITIVE_PARAM_PATTERN = /key|token|secret|password|auth|credential/i;

function redactSensitiveParams(urlObj: URL): string {
  const params = new URLSearchParams(urlObj.search);
  let redactedAny = false;

  for (const paramName of params.keys()) {
    if (SENSITIVE_PARAM_PATTERN.test(paramName)) {
      params.set(paramName, '[REDACTED]');
      redactedAny = true;
    }
  }

  const search = redactedAny ? `?${params.toString()}` : urlObj.search;
  return urlObj.pathname + search;
}

function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return redactSensitiveParams(urlObj);
  } catch {
    return url;
  }
}

export async function interceptedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  config: InterceptorConfig = defaultConfig
): Promise<Response> {
  const url = input instanceof Request ? input.url : input.toString();
  const method = (input instanceof Request ? input.method : init?.method) || 'GET';

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
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return interceptedFetch(input, init, config);
  };

  return () => {
    window.fetch = originalFetch;
  };
}
