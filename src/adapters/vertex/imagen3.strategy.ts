/**
 * Vertex AI Imagen 3 Strategy
 *
 * Implementation of ImageGenerator for Google Vertex AI Imagen 3 model.
 * Handles prompt injection, API calls, and response parsing.
 *
 * @module adapters/vertex/imagen3.strategy
 */

import { helpers } from '@google-cloud/aiplatform';
import type { VertexConfig } from '../../types/index.js';
import { DEFAULTS } from '../../types/index.js';
import type {
  ImageGenerator,
  GenerationOptions,
  GenerationResult,
} from '../generator.interface.js';
import { getVertexClient, buildEndpoint, testConnection } from './client.js';
import { wrapApiError, VertexApiError } from './errors.js';
import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type pino from 'pino';

// =============================================================================
// Strategy Implementation
// =============================================================================

/**
 * Vertex AI Imagen 3 image generator.
 *
 * Implements the ImageGenerator interface for the Imagen 3 model.
 * Handles:
 * - Master aesthetic prompt injection
 * - API request formatting
 * - Response parsing and validation
 * - Error wrapping with retry hints
 *
 * @example
 * ```typescript
 * const generator = new VertexImagen3Strategy({
 *   projectId: 'my-project',
 *   location: 'us-central1',
 *   masterAesthetic: 'Photorealistic, 8K quality',
 * });
 *
 * const result = await generator.generate('A sunset over mountains');
 * await fs.writeFile('sunset.png', result.buffer);
 * ```
 */
export class VertexImagen3Strategy implements ImageGenerator {
  readonly providerName = 'google-vertex';
  readonly modelId = DEFAULTS.MODEL_ID;

  private readonly endpoint: string;
  private readonly logger: pino.Logger;

  constructor(private readonly config: VertexConfig) {
    this.endpoint = buildEndpoint(config, this.modelId);
    this.logger = createChildLogger(defaultLogger, {
      component: 'VertexImagen3Strategy',
      model: this.modelId,
    });
  }

  /**
   * Generate an image from a text prompt.
   *
   * @param prompt - Text description of the desired image
   * @param options - Optional generation parameters
   * @returns Generated image data
   * @throws {VertexApiError} On API failures
   */
  async generate(
    prompt: string,
    options?: GenerationOptions,
  ): Promise<GenerationResult> {
    const startTime = performance.now();

    // Inject master aesthetic prompt if configured
    const fullPrompt = this.buildFullPrompt(prompt);

    this.logger.debug(
      {
        promptLength: fullPrompt.length,
        promptPreview: fullPrompt.slice(0, 100) + (fullPrompt.length > 100 ? '...' : ''),
        aspectRatio: options?.aspectRatio ?? DEFAULTS.ASPECT_RATIO,
      },
      'Starting image generation',
    );

    try {
      const client = getVertexClient(this.config);

      // Build request payload
      const instance = helpers.toValue({ prompt: fullPrompt });
      const parameters = helpers.toValue({
        sampleCount: 1,
        aspectRatio: options?.aspectRatio ?? DEFAULTS.ASPECT_RATIO,
        safetyFilterLevel: options?.safetyFilterLevel ?? DEFAULTS.SAFETY_FILTER,
      });

      // Make API call
      const predictResponse = await client.predict({
        endpoint: this.endpoint,
        instances: instance ? [instance] : [],
        parameters: parameters ?? null,
      });

      const response = predictResponse[0];

      // Extract image from response
      const buffer = this.extractImageBuffer(response);

      const duration = performance.now() - startTime;
      this.logger.info(
        {
          durationMs: Math.round(duration),
          bufferSize: buffer.length,
        },
        'Image generated successfully',
      );

      return {
        buffer,
        mimeType: 'image/png',
        generatedAt: new Date(),
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        {
          durationMs: Math.round(duration),
          error: error instanceof Error ? error.message : String(error),
        },
        'Image generation failed',
      );

      throw wrapApiError(error, 'Image generation failed');
    }
  }

  /**
   * Validate that the Vertex AI service is accessible.
   *
   * Performs a lightweight check without generating an image.
   *
   * @returns true if the service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await testConnection(this.config);
      this.logger.debug('Health check passed');
      return true;
    } catch (error) {
      this.logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'Health check failed',
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Build the full prompt with master aesthetic injection.
   *
   * Format: "{masterAesthetic}. {prompt}" or just "{prompt}" if no aesthetic.
   */
  private buildFullPrompt(prompt: string): string {
    const aesthetic = this.config.masterAesthetic.trim();

    if (!aesthetic) {
      return prompt;
    }

    // Ensure aesthetic ends with proper punctuation
    const separator = aesthetic.endsWith('.') || aesthetic.endsWith(',')
      ? ' '
      : '. ';

    return `${aesthetic}${separator}${prompt}`;
  }

  /**
   * Extract the image buffer from the API response.
   *
   * Handles the nested structure of Vertex AI prediction responses.
   *
   * @throws {VertexApiError} If response structure is invalid
   */
  private extractImageBuffer(response: { predictions?: unknown[] | null }): Buffer {
    const predictions = response.predictions;

    if (!predictions || predictions.length === 0) {
      throw new VertexApiError(
        'No predictions returned from Vertex AI',
        500,
        true, // Retryable - might be a transient issue
      );
    }

    const prediction = predictions[0];

    // Navigate the protobuf Value structure
    // The response structure is: prediction.structValue.fields.bytesBase64Encoded.stringValue
    const base64 = this.extractBase64FromPrediction(prediction);

    if (!base64) {
      throw new VertexApiError(
        'Invalid response structure: missing bytesBase64Encoded field',
        500,
        false, // Not retryable - structural issue
      );
    }

    return Buffer.from(base64, 'base64');
  }

  /**
   * Extract base64 string from prediction value.
   *
   * Handles the protobuf Value wrapper structure.
   */
  private extractBase64FromPrediction(prediction: unknown): string | null {
    // Type guard for the prediction structure
    if (!prediction || typeof prediction !== 'object') {
      return null;
    }

    const pred = prediction as Record<string, unknown>;

    // Try direct access (for typed responses)
    if ('bytesBase64Encoded' in pred && typeof pred['bytesBase64Encoded'] === 'string') {
      return pred['bytesBase64Encoded'];
    }

    // Try structValue path (for raw protobuf responses)
    const structValue = pred['structValue'] as Record<string, unknown> | undefined;
    if (!structValue) {
      return null;
    }

    const fields = structValue['fields'] as Record<string, unknown> | undefined;
    if (!fields) {
      return null;
    }

    const bytesField = fields['bytesBase64Encoded'] as Record<string, unknown> | undefined;
    if (!bytesField) {
      return null;
    }

    const stringValue = bytesField['stringValue'];
    if (typeof stringValue === 'string') {
      return stringValue;
    }

    return null;
  }
}

