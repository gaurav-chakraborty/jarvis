import { useCallback } from 'react';
import { debugStats } from '../utils/debugStats';
import { logger } from '../utils/secureLogger';

export function usePerformanceTracking() {
  const track = useCallback(async <T,>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = Math.round(performance.now() - startTime);

      debugStats.recordMetric(name, duration);
      logger.debug(`Operation completed: ${name}`, { duration: `${duration}ms` });

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      debugStats.recordMetric(name, duration);
      logger.error(`Operation failed: ${name}`, error as Error, { duration: `${duration}ms` });
      throw error;
    }
  }, []);

  const trackSync = useCallback(<T,>(
    name: string,
    fn: () => T
  ): T => {
    const startTime = performance.now();

    try {
      const result = fn();
      const duration = Math.round(performance.now() - startTime);

      debugStats.recordMetric(name, duration);

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      debugStats.recordMetric(name, duration);
      logger.error(`Operation failed: ${name}`, error as Error, { duration: `${duration}ms` });
      throw error;
    }
  }, []);

  return { track, trackSync };
}
