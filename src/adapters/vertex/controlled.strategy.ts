/**
 * Vertex AI Imagen 3 Controlled Generation Strategy
 *
 * Implementation of ImageGenerator for Google Vertex AI Imagen 3 with
 * Controlled Generation capabilities (Subject, Control, Style references).
 *
 * This strategy uses the `imagen-3.0-capability-001` model which supports:
 * - Subject Reference: Maintain product/person identity across contexts
 * - Control Reference: Structure-conditioned generation (Canny, Scribble)
 * - Style Reference: Extract and apply visual style from reference image
 *
 * @module adapters/vertex/controlled.strategy
 */

import { helpers } from '@google-cloud/aiplatform';
import type { VertexConfig } from '../../types/index.js';
import { VERTEX_MODELS, DEFAULTS } from '../../types/index.js';
import type {
  GenerationReferences,
  SubjectReference,
  ControlReference,
  StyleReference,
} from '../../types/reference.types.js';
import type {
  ImageGenerator,
  GenerationOptions,
  GenerationResult,
} from '../generator.interface.js';
import { getVertexClient, buildEndpoint } from './client.js';
import { wrapApiError, VertexApiError } from './errors.js';
import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type pino from 'pino';

// =============================================================================
// Constants
// =============================================================================

/** Model ID for controlled generation capabilities */
const CAPABILITY_MODEL_ID = VERTEX_MODELS.IMAGEN_3_CAPABILITY.id;

// =============================================================================
// Types
// =============================================================================

/**
 * Vertex AI reference image structure for the API request.
 */
interface VertexReferenceImage {
  referenceType: string;
  referenceId: number;
  referenceImage: {
    bytesBase64Encoded: string;
  };
  subjectImageConfig?: {
    subjectType?: string;
    subjectDescription?: string;
  };
  controlImageConfig?: {
    controlType: string;
    enableControlImageComputation: boolean;
  };
  styleImageConfig?: {
    styleDescription?: string;
  };
}

// =============================================================================
// Strategy Implementation
// =============================================================================

/**
 * Options for creating a Vertex Controlled Generation strategy.
 */
export interface VertexControlledStrategyOptions {
  /** Configuration for Vertex AI connection */
  readonly config: VertexConfig;
}

/**
 * Vertex AI Imagen 3 Controlled Generation strategy.
 *
 * Extends the standard Imagen 3 generation with support for reference images
 * that enable Structure-Conditioned Style Transfer.
 *
 * ## When to Use
 *
 * Use this strategy when you need:
 * - Product consistency across different backgrounds/contexts
 * - Structure-based generation from sketches or edge maps
 * - Style transfer while maintaining content structure
 *
 * ## API Differences
 *
 * Unlike standard text-to-image, controlled generation uses:
 * - `imagen-3.0-capability-001` model
 * - `referenceImages` array in the request instance
 * - Reference IDs in the prompt (e.g., "Generate subject [1] in style [2]")
 *
 * @example
 * ```typescript
 * const generator = new VertexControlledStrategy({
 *   config: { projectId: 'my-project', location: 'us-central1', masterAesthetic: '' },
 * });
 *
 * const result = await generator.generate('A sneaker on a beach', {
 *   references: {
 *     subject: [{ type: 'REFERENCE_TYPE_SUBJECT', referenceId: 1, imageBase64: '...' }],
 *     style: { type: 'REFERENCE_TYPE_STYLE', referenceId: 2, imageBase64: '...' },
 *   },
 * });
 * ```
 */
export class VertexControlledStrategy implements ImageGenerator {
  readonly providerName = 'google-vertex-controlled';
  readonly modelId = CAPABILITY_MODEL_ID;

  private readonly config: VertexConfig;
  private readonly endpoint: string;
  private readonly logger: pino.Logger;

  constructor(options: VertexControlledStrategyOptions) {
    this.config = options.config;
    this.endpoint = buildEndpoint(this.config, CAPABILITY_MODEL_ID);
    this.logger = createChildLogger(defaultLogger, {
      component: 'VertexControlledStrategy',
      model: CAPABILITY_MODEL_ID,
    });
  }

  /**
   * Get a human-readable name for the model.
   */
  get modelName(): string {
    return VERTEX_MODELS.IMAGEN_3_CAPABILITY.name;
  }

  /**
   * Generate an image with optional reference images.
   *
   * When references are provided, they are included in the API request
   * and the prompt is augmented with reference placeholders.
   *
   * @param prompt - Text description of the desired image
   * @param options - Generation options including optional references
   * @returns Generated image data
   * @throws {VertexApiError} On API failures
   */
  async generate(
    prompt: string,
    options?: GenerationOptions,
  ): Promise<GenerationResult> {
    const startTime = performance.now();
    const refs = options?.references;

    // Get current master aesthetic (dynamic getter)
    const masterAesthetic = this.config.getMasterAesthetic();

    // Build the full prompt with aesthetic and reference placeholders
    const fullPrompt = this.buildFullPrompt(prompt, refs);

    // Build detailed log of what's being sent
    const logDetails: Record<string, unknown> = {
      model: CAPABILITY_MODEL_ID,
      originalPrompt: prompt,
      masterAestheticActive: !!masterAesthetic,
      masterAesthetic: masterAesthetic || '(none)',
      fullPrompt: fullPrompt,
      aspectRatio: options?.aspectRatio ?? DEFAULTS.ASPECT_RATIO,
      safetyFilterLevel: options?.safetyFilterLevel ?? DEFAULTS.SAFETY_FILTER,
      hasReferences: !!refs,
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
    this.logger.info(logDetails, '🎨 VERTEX AI CONTROLLED API REQUEST - FULL PROMPT WITH REFERENCES');

    try {
      const client = getVertexClient(this.config);

      // Build the instance with optional reference images
      const instanceData = this.buildInstance(fullPrompt, refs);
      const instance = helpers.toValue(instanceData);

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
          hadReferences: !!refs,
        },
        'Controlled image generated successfully',
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
        'Controlled image generation failed',
      );

      throw wrapApiError(error, 'Controlled image generation failed');
    }
  }

  /**
   * Validate that the Vertex AI service is accessible.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Verify endpoint can be constructed
      const endpoint = buildEndpoint(this.config, CAPABILITY_MODEL_ID);

      if (!endpoint.includes(this.config.projectId) || !endpoint.includes(this.config.location)) {
        return false;
      }

      // Get the client to ensure it can be initialized
      getVertexClient(this.config);

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
   * Build the full prompt with master aesthetic and reference placeholders.
   */
  private buildFullPrompt(prompt: string, refs?: GenerationReferences): string {
    const aesthetic = this.config.getMasterAesthetic().trim();

    // Start with base prompt
    let fullPrompt = prompt;

    // Prepend aesthetic if configured
    if (aesthetic) {
      const separator = aesthetic.endsWith('.') || aesthetic.endsWith(',') ? ' ' : '. ';
      fullPrompt = `${aesthetic}${separator}${fullPrompt}`;
    }

    // Add reference context to prompt if references are provided
    if (refs) {
      fullPrompt = this.augmentPromptWithReferences(fullPrompt, refs);
    }

    return fullPrompt;
  }

  /**
   * Augment prompt with reference placeholders.
   *
   * The Vertex AI API expects prompts to reference images using [id] syntax.
   */
  private augmentPromptWithReferences(prompt: string, refs: GenerationReferences): string {
    const parts: string[] = [];

    // Subject references
    if (refs.subject?.length) {
      const subjectIds = refs.subject.map((s) => `[${s.referenceId}]`).join(', ');
      parts.push(`Generate an image featuring the subject shown in ${subjectIds}`);
    }

    // Control reference
    if (refs.control) {
      parts.push(`following the structure in [${refs.control.referenceId}]`);
    }

    // Style reference
    if (refs.style) {
      const styleDesc = refs.style.styleDescription
        ? ` (${refs.style.styleDescription})`
        : '';
      parts.push(`in the visual style of [${refs.style.referenceId}]${styleDesc}`);
    }

    if (parts.length === 0) {
      return prompt;
    }

    // Combine reference instructions with the original prompt
    // Include watermark removal instructions when using references
    const watermarkInstruction = 'IMPORTANT: Ignore and do not reproduce any watermarks, logos, or text overlays from the reference images. The generated image must be clean and free of any watermarks.';
    return `${parts.join(' ')}: ${prompt}. ${watermarkInstruction}`;
  }

  /**
   * Build the API request instance with reference images.
   */
  private buildInstance(
    prompt: string,
    refs?: GenerationReferences,
  ): Record<string, unknown> {
    const instance: Record<string, unknown> = { prompt };

    if (!refs) {
      return instance;
    }

    const referenceImages: VertexReferenceImage[] = [];

    // Add subject references
    if (refs.subject?.length) {
      for (const subjectRef of refs.subject) {
        referenceImages.push(this.buildSubjectReference(subjectRef));
      }
    }

    // Add control reference
    if (refs.control) {
      referenceImages.push(this.buildControlReference(refs.control));
    }

    // Add style reference
    if (refs.style) {
      referenceImages.push(this.buildStyleReference(refs.style));
    }

    if (referenceImages.length > 0) {
      instance['referenceImages'] = referenceImages;
    }

    return instance;
  }

  /**
   * Build a subject reference for the API request.
   */
  private buildSubjectReference(ref: SubjectReference): VertexReferenceImage {
    const vertexRef: VertexReferenceImage = {
      referenceType: 'REFERENCE_TYPE_SUBJECT',
      referenceId: ref.referenceId,
      referenceImage: {
        bytesBase64Encoded: ref.imageBase64,
      },
    };

    // Add optional subject configuration
    if (ref.subjectType || ref.subjectDescription) {
      vertexRef.subjectImageConfig = {};
      if (ref.subjectType) {
        vertexRef.subjectImageConfig.subjectType = ref.subjectType.toUpperCase();
      }
      if (ref.subjectDescription) {
        vertexRef.subjectImageConfig.subjectDescription = ref.subjectDescription;
      }
    }

    return vertexRef;
  }

  /**
   * Build a control reference for the API request.
   */
  private buildControlReference(ref: ControlReference): VertexReferenceImage {
    return {
      referenceType: 'REFERENCE_TYPE_CONTROL',
      referenceId: ref.referenceId,
      referenceImage: {
        bytesBase64Encoded: ref.imageBase64,
      },
      controlImageConfig: {
        controlType: ref.controlType,
        enableControlImageComputation: ref.enableControlImageComputation ?? false,
      },
    };
  }

  /**
   * Build a style reference for the API request.
   */
  private buildStyleReference(ref: StyleReference): VertexReferenceImage {
    const vertexRef: VertexReferenceImage = {
      referenceType: 'REFERENCE_TYPE_STYLE',
      referenceId: ref.referenceId,
      referenceImage: {
        bytesBase64Encoded: ref.imageBase64,
      },
    };

    if (ref.styleDescription) {
      vertexRef.styleImageConfig = {
        styleDescription: ref.styleDescription,
      };
    }

    return vertexRef;
  }

  /**
   * Extract the image buffer from the API response.
   */
  private extractImageBuffer(response: { predictions?: unknown[] | null }): Buffer {
    const predictions = response.predictions;

    if (!predictions || predictions.length === 0) {
      throw new VertexApiError(
        'No predictions returned from Vertex AI',
        500,
        true,
      );
    }

    const prediction = predictions[0];
    const base64 = this.extractBase64FromPrediction(prediction);

    if (!base64) {
      throw new VertexApiError(
        'Invalid response structure: missing bytesBase64Encoded field',
        500,
        false,
      );
    }

    return Buffer.from(base64, 'base64');
  }

  /**
   * Extract base64 string from prediction value.
   */
  private extractBase64FromPrediction(prediction: unknown): string | null {
    if (!prediction || typeof prediction !== 'object') {
      return null;
    }

    const pred = prediction as Record<string, unknown>;

    // Try direct access
    if ('bytesBase64Encoded' in pred && typeof pred['bytesBase64Encoded'] === 'string') {
      return pred['bytesBase64Encoded'];
    }

    // Try structValue path
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


