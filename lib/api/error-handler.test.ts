import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleAPIError, APIErrorResponse } from './error-handler';

describe('handleAPIError', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return 504 with TIMEOUT code for TimeoutError', async () => {
    const timeoutError = new Error('Operation timed out');
    timeoutError.name = 'TimeoutError';

    const response = handleAPIError(timeoutError, 'API:Test');

    expect(response.status).toBe(504);

    const body = (await response.json()) as APIErrorResponse;
    expect(body.error).toBe('Request timed out');
    expect(body.code).toBe('TIMEOUT');
    expect(body.timestamp).toBeDefined();
  });

  it('should include error.message in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const error = new Error('Detailed error message');
    const response = handleAPIError(error, 'API:Test');

    expect(response.status).toBe(500);

    const body = (await response.json()) as APIErrorResponse;
    expect(body.error).toBe('Detailed error message');
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.timestamp).toBeDefined();
  });

  it('should return generic message in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const error = new Error('Sensitive internal details');
    const response = handleAPIError(error, 'API:Test');

    expect(response.status).toBe(500);

    const body = (await response.json()) as APIErrorResponse;
    expect(body.error).toBe('An error occurred');
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.timestamp).toBeDefined();
  });

  it('should handle unknown error types (string)', async () => {
    const response = handleAPIError('string error', 'API:Test');

    expect(response.status).toBe(500);

    const body = (await response.json()) as APIErrorResponse;
    expect(body.error).toBe('An unexpected error occurred');
    expect(body.code).toBe('UNKNOWN_ERROR');
    expect(body.timestamp).toBeDefined();
  });

  it('should handle unknown error types (number)', async () => {
    const response = handleAPIError(12345, 'API:Test');

    expect(response.status).toBe(500);

    const body = (await response.json()) as APIErrorResponse;
    expect(body.error).toBe('An unexpected error occurred');
    expect(body.code).toBe('UNKNOWN_ERROR');
    expect(body.timestamp).toBeDefined();
  });

  it('should handle unknown error types (null)', async () => {
    const response = handleAPIError(null, 'API:Test');

    expect(response.status).toBe(500);

    const body = (await response.json()) as APIErrorResponse;
    expect(body.error).toBe('An unexpected error occurred');
    expect(body.code).toBe('UNKNOWN_ERROR');
    expect(body.timestamp).toBeDefined();
  });

  it('should include timestamp in all responses', async () => {
    const beforeTime = Date.now();
    const response = handleAPIError(new Error('test'), 'API:Test');
    const afterTime = Date.now();

    const body = (await response.json()) as APIErrorResponse;
    expect(body.timestamp).toBeDefined();

    const timestampMs = new Date(body.timestamp).getTime();
    expect(timestampMs).toBeGreaterThanOrEqual(beforeTime);
    expect(timestampMs).toBeLessThanOrEqual(afterTime);
  });

  it('should log error with context prefix to console.error', () => {
    const error = new Error('test error');
    handleAPIError(error, 'API:ChatMessages');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[API:ChatMessages]', error);
  });

  it('should log context for non-Error types', () => {
    const unknownError = { some: 'object' };
    handleAPIError(unknownError, 'API:CustomContext');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[API:CustomContext]', unknownError);
  });
});
