/**
 * Image Generator Strategy Interface
 *
 * Defines the contract for all image generation adapters.
 * Following the Strategy Pattern, this enables:
 * - Swapping providers (Vertex → DALL-E) without changing orchestrator
 * - Mock implementations for testing
 * - Future extension without modification (OCP)
 *
 * @module adapters/generator.interface
 */

// =============================================================================
// Generation Options
// =============================================================================

/**
 * Supported aspect ratios for image generation.
 * Matches Imagen 3 supported formats.
 */
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

/**
 * Safety filter levels for content moderation.
 * Lower blocking = more permissive.
 */
export type SafetyFilterLevel = 'block_none' | 'block_few' | 'block_some' | 'block_most';

/**
 * Options for image generation requests.
 *
 * All fields are optional to allow providers to use defaults.
 * The adapter is responsible for applying sensible defaults.
 */
export interface GenerationOptions {
  /**
   * Aspect ratio of the generated image.
   * @default '1:1'
   */
  readonly aspectRatio?: AspectRatio;

  /**
   * Content safety filter level.
   * @default 'block_some'
   */
  readonly safetyFilterLevel?: SafetyFilterLevel;
}

// =============================================================================
// Generation Result
// =============================================================================

/**
 * Supported output MIME types.
 */
export type ImageMimeType = 'image/png' | 'image/jpeg';

/**
 * Result of a successful image generation.
 *
 * Immutability: All fields are readonly to prevent accidental mutation.
 * The buffer contains the raw image bytes ready for file writing.
 */
export interface GenerationResult {
  /**
   * Raw image data as a Node.js Buffer.
   * Ready for direct file system write.
   */
  readonly buffer: Buffer;

  /**
   * MIME type of the generated image.
   * Used for file extension and Content-Type headers.
   */
  readonly mimeType: ImageMimeType;

  /**
   * Timestamp when the image was generated.
   * Useful for logging and debugging.
   */
  readonly generatedAt: Date;
}

// =============================================================================
// Image Generator Interface (Strategy Contract)
// =============================================================================

/**
 * Strategy interface for image generation providers.
 *
 * Any adapter implementing this interface can be plugged into the Orchestrator.
 * This is the core abstraction enabling provider-agnostic batch processing.
 *
 * ## Implementing a New Provider
 *
 * 1. Create a class implementing `ImageGenerator`
 * 2. Register it in `GeneratorFactory`
 * 3. The Orchestrator works automatically with no changes
 *
 * @example
 * ```typescript
 * class StableDiffusionStrategy implements ImageGenerator {
 *   readonly providerName = 'stable-diffusion';
 *   readonly modelId = 'sdxl-1.0';
 *
 *   async generate(prompt: string): Promise<GenerationResult> {
 *     // Implementation...
 *   }
 *
 *   async healthCheck(): Promise<boolean> {
 *     return true;
 *   }
 * }
 * ```
 */
export interface ImageGenerator {
  /**
   * Human-readable name of the provider.
   * Used for logging and diagnostics.
   *
   * @example 'google-vertex', 'openai-dalle', 'stability-sdxl'
   */
  readonly providerName: string;

  /**
   * Specific model identifier.
   * Used for logging and API calls.
   *
   * @example 'imagen-3.0-generate-001', 'dall-e-3'
   */
  readonly modelId: string;

  /**
   * Generate an image from a text prompt.
   *
   * The master aesthetic prompt (if configured) should be prepended
   * by the implementation before sending to the API.
   *
   * @param prompt - Text description of the desired image
   * @param options - Optional generation parameters
   * @returns Promise resolving to the generated image data
   * @throws {GeneratorError} On API failures or validation errors
   */
  generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;

  /**
   * Validate that the provider is reachable and configured correctly.
   *
   * Called during startup to fail-fast on configuration issues.
   * Should NOT perform a full generation (expensive).
   *
   * @returns Promise resolving to true if healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Base error class for generator failures.
 * Provides retry information for the orchestrator.
 */
export class GeneratorError extends Error {
  constructor(
    message: string,
    public readonly isRetryable: boolean,
    public readonly statusCode?: number,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'GeneratorError';

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GeneratorError);
    }
  }
}

/**
 * Thrown when API rate limits are exceeded.
 * Always retryable after a delay.
 */
export class RateLimitError extends GeneratorError {
  constructor(
    message: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message, true, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Thrown when content violates safety filters.
 * NOT retryable (same prompt will fail again).
 */
export class ContentFilterError extends GeneratorError {
  constructor(message: string) {
    super(message, false, 400);
    this.name = 'ContentFilterError';
  }
}

/**
 * Thrown when authentication/authorization fails.
 * NOT retryable without configuration changes.
 */
export class AuthenticationError extends GeneratorError {
  constructor(message: string) {
    super(message, false, 401);
    this.name = 'AuthenticationError';
  }
}

