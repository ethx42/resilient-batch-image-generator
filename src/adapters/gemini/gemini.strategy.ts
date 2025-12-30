/**
 * Gemini Image Generation Strategy
 *
 * Implementation of ImageGenerator for Google Gemini models (Nano Banana / Nano Banana Pro).
 * Uses the Google Generative AI SDK (@google/genai) for multimodal image generation.
 *
 * Key Features:
 * - Supports multiple reference images as multimodal input
 * - Text-to-image and image-to-image generation
 * - Compatible with Gemini 2.5 Flash and Gemini 2.5 Pro models
 *
 * @module adapters/gemini/gemini.strategy
 */

import { GoogleGenAI, type GenerateContentResponse, type Part } from '@google/genai';
import type { GeminiConfig, GeminiModelId } from '../../types/index.js';
import { GEMINI_MODELS, DEFAULTS } from '../../types/index.js';
import type { GenerationReferences } from '../../types/reference.types.js';
import type {
  ImageGenerator,
  GenerationOptions,
  GenerationResult,
} from '../generator.interface.js';
import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type pino from 'pino';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating a Gemini Image strategy.
 */
export interface GeminiImageStrategyOptions {
  /** Configuration for Gemini AI connection */
  readonly config: GeminiConfig;
  /** Model ID to use */
  readonly modelId: GeminiModelId;
}

/**
 * Gemini-specific error for API failures.
 */
export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly isRetryable: boolean = false,
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

// =============================================================================
// Strategy Implementation
// =============================================================================

/**
 * Gemini Image Generation strategy.
 *
 * Implements the ImageGenerator interface for Gemini models with support
 * for multimodal input including multiple reference images.
 *
 * ## When to Use
 *
 * Use this strategy when you need:
 * - Multiple reference images for style/subject consistency
 * - Multimodal generation with text + images
 * - Access to latest Google AI image generation capabilities
 *
 * ## Multi-Reference Support
 *
 * Unlike Imagen 3 which uses structured references (Subject, Control, Style),
 * Gemini uses multimodal input where images are passed as content parts.
 * This allows for more flexible reference handling but with less structure.
 *
 * @example
 * ```typescript
 * const generator = new GeminiImageStrategy({
 *   config: { apiKey: 'your-api-key', getMasterAesthetic: () => '' },
 *   modelId: 'gemini-2.5-flash-preview-05-20',
 * });
 *
 * const result = await generator.generate('A cat in space', {
 *   references: {
 *     subject: [{ type: 'REFERENCE_TYPE_SUBJECT', referenceId: 1, imageBase64: '...' }],
 *   },
 * });
 * ```
 */
export class GeminiImageStrategy implements ImageGenerator {
  readonly providerName = 'google-gemini';
  readonly modelId: GeminiModelId;

  private readonly config: GeminiConfig;
  private readonly client: GoogleGenAI;
  private readonly logger: pino.Logger;

  constructor(options: GeminiImageStrategyOptions) {
    this.config = options.config;
    this.modelId = options.modelId;

    // Initialize the Gemini client
    this.client = new GoogleGenAI({
      apiKey: this.config.apiKey,
    });

    this.logger = createChildLogger(defaultLogger, {
      component: 'GeminiImageStrategy',
      model: this.modelId,
    });
  }

  /**
   * Get a human-readable name for the current model.
   */
  get modelName(): string {
    for (const model of Object.values(GEMINI_MODELS)) {
      if (model.id === this.modelId) {
        return model.name;
      }
    }
    return this.modelId;
  }

  /**
   * Generate an image from a text prompt with optional reference images.
   *
   * @param prompt - Text description of the desired image
   * @param options - Optional generation parameters including references
   * @returns Generated image data
   * @throws {GeminiApiError} On API failures
   */
  async generate(
    prompt: string,
    options?: GenerationOptions,
  ): Promise<GenerationResult> {
    const startTime = performance.now();
    const refs = options?.references;
    const aspectRatio = options?.aspectRatio ?? DEFAULTS.ASPECT_RATIO;

    // Get current master aesthetic (dynamic getter)
    const masterAesthetic = this.config.getMasterAesthetic();

    // Build the full prompt with aesthetic and aspect ratio instruction
    const fullPrompt = this.buildFullPrompt(prompt, aspectRatio);

    // Build content parts for multimodal request
    const contentParts = this.buildContentParts(fullPrompt, refs);

    // Build detailed log of what's being sent
    const logDetails: Record<string, unknown> = {
      model: this.modelId,
      originalPrompt: prompt,
      masterAestheticActive: !!masterAesthetic,
      fullPrompt: fullPrompt,
      aspectRatio: options?.aspectRatio ?? DEFAULTS.ASPECT_RATIO,
      hasReferences: !!refs,
      referenceCount: this.countReferences(refs),
    };

    // Add detailed reference info for debugging
    if (refs) {
      if (refs.subject?.length) {
        logDetails['subjectRefs'] = refs.subject.map((s, i) => ({
          index: i,
          id: s.referenceId,
          type: s.subjectType,
          description: s.subjectDescription?.slice(0, 100),
          imageSizeKB: Math.round(s.imageBase64.length * 0.75 / 1024),
        }));
      }
      if (refs.control) {
        logDetails['controlRef'] = {
          id: refs.control.referenceId,
          controlType: refs.control.controlType,
          computeEnabled: refs.control.enableControlImageComputation,
          imageSizeKB: Math.round(refs.control.imageBase64.length * 0.75 / 1024),
        };
      }
      if (refs.style) {
        logDetails['styleRef'] = {
          id: refs.style.referenceId,
          description: refs.style.styleDescription?.slice(0, 100),
          imageSizeKB: Math.round(refs.style.imageBase64.length * 0.75 / 1024),
        };
      }
    }

    // Log the complete request details
    this.logger.info(logDetails, '🎨 GEMINI API REQUEST - FULL PROMPT WITH REFERENCES');

    try {
      // Make API call with multimodal content
      const response = await this.client.models.generateContent({
        model: this.modelId,
        contents: [{ role: 'user', parts: contentParts }],
        config: {
          responseModalities: ['image', 'text'],
          // Note: Gemini handles aspect ratio differently - we include it in the prompt
        },
      });

      // Extract image from response
      const buffer = await this.extractImageBuffer(response);

      const duration = performance.now() - startTime;
      this.logger.info(
        {
          durationMs: Math.round(duration),
          bufferSize: buffer.length,
          hadReferences: !!refs,
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
          hadReferences: !!refs,
        },
        'Image generation failed',
      );

      throw this.wrapApiError(error);
    }
  }

  /**
   * Validate that the Gemini AI service is accessible.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Perform a simple API check by listing models
      // This validates the API key without generating content
      const models = await this.client.models.list();
      
      // Check if our model is available
      const modelList = [];
      for await (const model of models) {
        modelList.push(model.name);
      }

      const isAvailable = modelList.some(name => 
        name?.includes(this.modelId.replace('gemini-', ''))
      );

      this.logger.debug({ modelsFound: modelList.length, isAvailable }, 'Health check completed');
      return true; // If we got here, the API key works
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
   * Build the full prompt with master aesthetic injection and aspect ratio.
   */
  private buildFullPrompt(prompt: string, aspectRatio: string): string {
    const aesthetic = this.config.getMasterAesthetic().trim();
    
    // Build aspect ratio instruction for Gemini
    const aspectInstruction = this.buildAspectRatioInstruction(aspectRatio);

    if (!aesthetic) {
      return `${aspectInstruction}\n\n${prompt}`;
    }

    const separator = aesthetic.endsWith('.') || aesthetic.endsWith(',') ? ' ' : '. ';
    return `${aspectInstruction}\n\n${aesthetic}${separator}${prompt}`;
  }

  /**
   * Build aspect ratio instruction for Gemini.
   * Gemini doesn't have a native aspect ratio parameter, so we instruct via prompt.
   */
  private buildAspectRatioInstruction(aspectRatio: string): string {
    const aspectMap: Record<string, { orientation: string; description: string }> = {
      '1:1': { orientation: 'square', description: 'equal width and height' },
      '16:9': { orientation: 'landscape (wide)', description: 'widescreen horizontal format' },
      '9:16': { orientation: 'portrait (tall)', description: 'vertical mobile/story format' },
      '4:3': { orientation: 'landscape', description: 'classic horizontal format' },
      '3:4': { orientation: 'portrait', description: 'vertical format, taller than wide' },
    };

    const info = aspectMap[aspectRatio] ?? aspectMap['1:1']!;
    
    return `[IMAGE FORMAT: Generate this image in ${aspectRatio} aspect ratio (${info!.orientation}). The output must be ${info!.description}. This is a strict requirement.]`;
  }

  /**
   * Build content parts for the multimodal request.
   * 
   * Includes the text prompt and any reference images as inline data.
   */
  private buildContentParts(prompt: string, refs?: GenerationReferences): Part[] {
    const parts: Part[] = [];

    // Add reference images first (if any)
    if (refs) {
      const referenceContext = this.buildReferenceContext(refs);
      
      // Add each reference image as an inline data part
      if (refs.subject?.length) {
        for (const subjectRef of refs.subject) {
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: subjectRef.imageBase64,
            },
          });
        }
      }

      if (refs.control) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: refs.control.imageBase64,
          },
        });
      }

      if (refs.style) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: refs.style.imageBase64,
          },
        });
      }

      // Add text prompt with reference context
      parts.push({ text: `${referenceContext}\n\n${prompt}` });
    } else {
      // Text-only generation
      parts.push({ text: prompt });
    }

    return parts;
  }

  /**
   * Build contextual text that explains the reference images to Gemini.
   * 
   * For SUBJECT references, we provide explicit instructions to preserve the
   * physical identity of the object/person/product, not just use it as style inspiration.
   */
  private buildReferenceContext(refs: GenerationReferences): string {
    const contextParts: string[] = [];

    if (refs.subject?.length) {
      const count = refs.subject.length;
      
      // Build detailed subject descriptions including type and description
      const subjectDetails = refs.subject.map((s, i) => {
        const parts: string[] = [];
        if (s.subjectType) {
          parts.push(`${s.subjectType.toUpperCase()}`);
        }
        if (s.subjectDescription) {
          parts.push(`"${s.subjectDescription}"`);
        }
        return parts.length > 0 
          ? `[Reference ${i + 1}]: ${parts.join(' - ')}`
          : `[Reference ${i + 1}]: Subject`;
      }).join('; ');

      // Build explicit subject preservation instructions
      contextParts.push(
        `SUBJECT REFERENCE IMAGES (${count} provided):\n` +
        `${subjectDetails}\n\n` +
        `CRITICAL INSTRUCTIONS FOR SUBJECT REFERENCES:\n` +
        `- These are the EXACT objects/subjects that MUST appear in the generated image.\n` +
        `- Preserve the PHYSICAL IDENTITY: exact shape, texture, color, proportions, and distinguishing features.\n` +
        `- This is NOT a style reference. The subject must be recognizably THE SAME object, not a similar one.\n` +
        `- Place the subject in the new context described in the prompt while keeping its identity intact.\n` +
        `- Think of this as product photography where the product must be exactly as shown.\n\n` +
        `WATERMARK REMOVAL INSTRUCTIONS:\n` +
        `- IGNORE and DO NOT reproduce any watermarks, logos, text overlays, or stock photo markings visible in the reference images.\n` +
        `- The generated image must be CLEAN and FREE of any watermarks or branding from the reference.\n` +
        `- Focus only on the actual subject/object, not on any superimposed text or logos.`
      );
    }

    if (refs.control) {
      contextParts.push(
        `CONTROL/STRUCTURE REFERENCE:\n` +
        `I'm providing a structure/control reference image. ` +
        `Please follow the composition and layout from this reference.`
      );
    }

    if (refs.style) {
      const styleDesc = refs.style.styleDescription 
        ? ` (${refs.style.styleDescription})`
        : '';
      contextParts.push(
        `STYLE REFERENCE:\n` +
        `I'm providing a style reference image${styleDesc}. ` +
        `Please apply the visual style, colors, and artistic feel from this image.`
      );
    }

    return contextParts.join('\n\n---\n\n');
  }

  /**
   * Count total number of reference images.
   */
  private countReferences(refs?: GenerationReferences): number {
    if (!refs) return 0;
    
    let count = 0;
    if (refs.subject?.length) count += refs.subject.length;
    if (refs.control) count += 1;
    if (refs.style) count += 1;
    return count;
  }

  /**
   * Extract the image buffer from the Gemini API response.
   */
  private async extractImageBuffer(response: GenerateContentResponse): Promise<Buffer> {
    // Navigate through the response structure
    const candidates = response.candidates;
    
    if (!candidates || candidates.length === 0) {
      throw new GeminiApiError(
        'No candidates returned from Gemini API',
        500,
        true, // Retryable
      );
    }

    const content = candidates[0]?.content;
    if (!content?.parts) {
      throw new GeminiApiError(
        'Invalid response structure: missing content parts',
        500,
        false,
      );
    }

    // Find the image part in the response
    for (const part of content.parts) {
      if (part.inlineData?.data) {
        // Found image data
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }

    // If no image found, check if there's text (might be a refusal or error)
    const textPart = content.parts.find(p => p.text);
    if (textPart?.text) {
      throw new GeminiApiError(
        `Gemini returned text instead of image: ${textPart.text.slice(0, 200)}`,
        400,
        false,
      );
    }

    throw new GeminiApiError(
      'No image data found in Gemini response',
      500,
      false,
    );
  }

  /**
   * Wrap API errors with appropriate metadata.
   */
  private wrapApiError(error: unknown): GeminiApiError {
    if (error instanceof GeminiApiError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    
    // Check for common error patterns
    if (message.includes('API key')) {
      return new GeminiApiError(`Authentication failed: ${message}`, 401, false);
    }
    
    if (message.includes('rate limit') || message.includes('quota')) {
      return new GeminiApiError(`Rate limited: ${message}`, 429, true);
    }

    if (message.includes('safety') || message.includes('blocked')) {
      return new GeminiApiError(`Content blocked by safety filter: ${message}`, 400, false);
    }

    // Generic error
    return new GeminiApiError(message, 500, true);
  }
}

