/**
 * OpenAI DALL-E Strategy
 *
 * Implementation of ImageGenerator for OpenAI DALL-E models.
 * Supports DALL-E 3 and DALL-E 2.
 *
 * @module adapters/openai/dalle.strategy
 */

import OpenAI from 'openai';
import type { OpenAIConfig, OpenAIModelId } from '../../types/index.js';
import { DEFAULTS, OPENAI_MODELS } from '../../types/index.js';
import type {
  ImageGenerator,
  GenerationOptions,
  GenerationResult,
  AspectRatio,
} from '../generator.interface.js';
import { GeneratorError, RateLimitError } from '../generator.interface.js';
import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type pino from 'pino';

// =============================================================================
// Types
// =============================================================================

/**
 * DALL-E supported sizes.
 * DALL-E 3: 1024x1024, 1792x1024, 1024x1792
 * DALL-E 2: 256x256, 512x512, 1024x1024
 */
type DalleSize = '1024x1024' | '1792x1024' | '1024x1792' | '256x256' | '512x512';

/**
 * Options for creating a DALL-E strategy.
 */
export interface DalleStrategyOptions {
  readonly config: OpenAIConfig;
  readonly modelId?: OpenAIModelId;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Map aspect ratio to DALL-E size.
 */
function mapAspectRatioToSize(
  aspectRatio: AspectRatio,
  modelId: string,
): DalleSize {
  const isDalle3 = modelId === 'dall-e-3';

  switch (aspectRatio) {
    case '16:9':
      return isDalle3 ? '1792x1024' : '1024x1024';
    case '9:16':
      return isDalle3 ? '1024x1792' : '1024x1024';
    case '4:3':
    case '3:4':
    case '1:1':
    default:
      return '1024x1024';
  }
}

/**
 * Fetch image from URL and return as Buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// =============================================================================
// Strategy Implementation
// =============================================================================

export class DalleStrategy implements ImageGenerator {
  readonly providerName = 'openai';
  readonly modelId: string;

  private readonly client: OpenAI;
  private readonly config: OpenAIConfig;
  private readonly logger: pino.Logger;

  constructor(options: DalleStrategyOptions) {
    this.config = options.config;
    this.modelId = options.modelId ?? OPENAI_MODELS.DALLE_3.id;

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });

    this.logger = createChildLogger(defaultLogger, {
      component: 'DalleStrategy',
      model: this.modelId,
    });
  }

  /**
   * Get a human-readable name for the current model.
   */
  get modelName(): string {
    for (const model of Object.values(OPENAI_MODELS)) {
      if (model.id === this.modelId) {
        return model.name;
      }
    }
    return this.modelId;
  }

  /**
   * Generate an image from a text prompt.
   */
  async generate(
    prompt: string,
    options?: GenerationOptions,
  ): Promise<GenerationResult> {
    const startTime = performance.now();

    // Get current master aesthetic (dynamic getter)
    const masterAesthetic = this.config.getMasterAesthetic();

    // Inject master aesthetic prompt if configured
    const fullPrompt = this.buildFullPrompt(prompt);
    const size = mapAspectRatioToSize(
      options?.aspectRatio ?? DEFAULTS.ASPECT_RATIO,
      this.modelId,
    );

    // Log the FULL prompt being sent to API for debugging
    this.logger.info(
      {
        originalPrompt: prompt.slice(0, 150) + (prompt.length > 150 ? '...' : ''),
        masterAestheticActive: !!masterAesthetic,
        masterAestheticLength: masterAesthetic.length,
        masterAestheticPreview: masterAesthetic.slice(0, 100) + (masterAesthetic.length > 100 ? '...' : ''),
        fullPromptLength: fullPrompt.length,
        fullPromptPreview: fullPrompt.slice(0, 300) + (fullPrompt.length > 300 ? '...' : ''),
        size,
      },
      '🎨 PROMPT SENT TO OPENAI API',
    );

    try {
      const response = await this.client.images.generate({
        model: this.modelId,
        prompt: fullPrompt,
        n: 1,
        size: size as '1024x1024' | '1792x1024' | '1024x1792',
        response_format: 'url',
      });

      const imageData = response.data;
      if (!imageData || imageData.length === 0) {
        throw new GeneratorError('No image data returned from OpenAI', false);
      }

      const imageUrl = imageData[0]?.url;
      if (!imageUrl) {
        throw new GeneratorError('No image URL returned from OpenAI', false);
      }

      // Fetch the image
      const buffer = await fetchImageBuffer(imageUrl);

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

      throw this.wrapError(error);
    }
  }

  /**
   * Validate that the OpenAI service is accessible.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple API call to verify credentials
      await this.client.models.list();
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
   */
  private buildFullPrompt(prompt: string): string {
    const aesthetic = this.config.getMasterAesthetic().trim();

    if (!aesthetic) {
      return prompt;
    }

    const separator = aesthetic.endsWith('.') || aesthetic.endsWith(',')
      ? ' '
      : '. ';

    return `${aesthetic}${separator}${prompt}`;
  }

  /**
   * Wrap OpenAI errors into our error types.
   */
  private wrapError(error: unknown): GeneratorError {
    if (error instanceof GeneratorError) {
      return error;
    }

    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 500;

      // Rate limit
      if (status === 429) {
        return new RateLimitError(
          `OpenAI rate limit exceeded: ${error.message}`,
        );
      }

      // Auth errors
      if (status === 401 || status === 403) {
        return new GeneratorError(
          `OpenAI authentication failed: ${error.message}`,
          false,
          status,
        );
      }

      // Content policy
      if (status === 400 && error.message.includes('safety')) {
        return new GeneratorError(
          `Content policy violation: ${error.message}`,
          false,
          400,
        );
      }

      // Server errors are retryable
      const isRetryable = status >= 500;
      return new GeneratorError(
        `OpenAI API error: ${error.message}`,
        isRetryable,
        status,
      );
    }

    // Unknown error
    const message = error instanceof Error ? error.message : String(error);
    return new GeneratorError(`OpenAI error: ${message}`, false);
  }
}

