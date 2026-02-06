import { NextResponse } from 'next/server';

export interface APIErrorResponse {
  error: string;
  code: string;
  timestamp: string;
}

/**
 * Standardized API error handler
 *
 * @param error - The error object (unknown type)
 * @param context - Context string for logging (e.g., 'API:ChatMessages')
 * @returns NextResponse with structured error response
 */
export function handleAPIError(error: unknown, context: string): Response {
  // Log full error details for debugging
  console.error(`[${context}]`, error);

  const timestamp = new Date().toISOString();

  // Handle TimeoutError from AbortSignal.timeout
  if (error instanceof Error && error.name === 'TimeoutError') {
    return NextResponse.json<APIErrorResponse>(
      {
        error: 'Request timed out',
        code: 'TIMEOUT',
        timestamp,
      },
      { status: 504 }
    );
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json<APIErrorResponse>(
      {
        error: isDevelopment ? error.message : 'An error occurred',
        code: 'INTERNAL_ERROR',
        timestamp,
      },
      { status: 500 }
    );
  }

  // Handle unknown error types (string, number, null, etc.)
  return NextResponse.json<APIErrorResponse>(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      timestamp,
    },
    { status: 500 }
  );
}
