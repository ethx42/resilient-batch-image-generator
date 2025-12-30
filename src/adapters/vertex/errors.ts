/**
 * Vertex AI Error Types
 *
 * Custom error classes for Vertex AI operations.
 * Provides retry hints and structured error information.
 *
 * @module adapters/vertex/errors
 */

import { GeneratorError } from '../generator.interface.js';

// =============================================================================
// Vertex API Error
// =============================================================================

/**
 * Error thrown by Vertex AI API operations.
 *
 * Extends GeneratorError with Vertex-specific context.
 */
export class VertexApiError extends GeneratorError {
  constructor(
    message: string,
    statusCode: number,
    isRetryable: boolean,
    public readonly grpcCode?: number,
    cause?: Error,
  ) {
    super(message, isRetryable, statusCode, cause);
    this.name = 'VertexApiError';
  }
}

// =============================================================================
// Error Classification
// =============================================================================

/**
 * gRPC status codes that indicate retryable errors.
 *
 * @see https://grpc.io/docs/guides/status-codes/
 */
const RETRYABLE_GRPC_CODES = new Set([
  1,  // CANCELLED
  4,  // DEADLINE_EXCEEDED
  8,  // RESOURCE_EXHAUSTED (rate limiting)
  10, // ABORTED
  13, // INTERNAL
  14, // UNAVAILABLE
]);

/**
 * HTTP status codes that indicate retryable errors.
 */
const RETRYABLE_HTTP_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

/**
 * Determine if an error is retryable based on status codes.
 *
 * @param statusCode - HTTP status code
 * @param grpcCode - gRPC status code (optional)
 * @returns true if the error is retryable
 */
export function isRetryableError(statusCode: number, grpcCode?: number): boolean {
  if (grpcCode !== undefined && RETRYABLE_GRPC_CODES.has(grpcCode)) {
    return true;
  }
  return RETRYABLE_HTTP_CODES.has(statusCode);
}

// =============================================================================
// Error Wrapping
// =============================================================================

/**
 * Type guard for Google API errors.
 */
interface GoogleApiError extends Error {
  code?: number;
  details?: string;
  metadata?: unknown;
}

function isGoogleApiError(error: unknown): error is GoogleApiError {
  return error instanceof Error && 'code' in error;
}

/**
 * Wrap a Google API error into a VertexApiError.
 *
 * Extracts status codes and determines retry eligibility.
 *
 * @param error - The original error
 * @param context - Additional context for the error message
 * @returns Wrapped VertexApiError
 */
export function wrapApiError(error: unknown, context: string): VertexApiError {
  if (error instanceof VertexApiError) {
    return error;
  }

  if (isGoogleApiError(error)) {
    const grpcCode = error.code;
    const statusCode = grpcCodeToHttpStatus(grpcCode);
    const isRetryable = isRetryableError(statusCode, grpcCode);

    return new VertexApiError(
      `${context}: ${error.message}`,
      statusCode,
      isRetryable,
      grpcCode,
      error,
    );
  }

  // Unknown error - assume not retryable
  const message = error instanceof Error ? error.message : String(error);
  return new VertexApiError(
    `${context}: ${message}`,
    500,
    false,
    undefined,
    error instanceof Error ? error : undefined,
  );
}

/**
 * Map gRPC status codes to HTTP status codes.
 *
 * @param grpcCode - gRPC status code
 * @returns Approximate HTTP status code
 */
function grpcCodeToHttpStatus(grpcCode?: number): number {
  if (grpcCode === undefined) {
    return 500;
  }

  const mapping: Record<number, number> = {
    0: 200,   // OK
    1: 499,   // CANCELLED
    2: 500,   // UNKNOWN
    3: 400,   // INVALID_ARGUMENT
    4: 504,   // DEADLINE_EXCEEDED
    5: 404,   // NOT_FOUND
    6: 409,   // ALREADY_EXISTS
    7: 403,   // PERMISSION_DENIED
    8: 429,   // RESOURCE_EXHAUSTED
    9: 400,   // FAILED_PRECONDITION
    10: 409,  // ABORTED
    11: 400,  // OUT_OF_RANGE
    12: 501,  // UNIMPLEMENTED
    13: 500,  // INTERNAL
    14: 503,  // UNAVAILABLE
    15: 500,  // DATA_LOSS
    16: 401,  // UNAUTHENTICATED
  };

  return mapping[grpcCode] ?? 500;
}




