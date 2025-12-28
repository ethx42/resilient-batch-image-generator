/**
 * Reference Loader Service
 *
 * Loads reference images from disk and converts them to the
 * GenerationReferences format for controlled generation.
 *
 * @module core/services/reference-loader
 */

import { readFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type {
  ExtendedPrompt,
  SingleReference,
  GenerationReferences,
  SubjectReference,
  ControlReference,
  StyleReference,
  ControlType,
} from '../../types/index.js';
import { getAllReferences, hasReferences } from '../../types/index.js';

// =============================================================================
// Constants
// =============================================================================

/** Default directory for reference images */
const REFERENCES_DIR = './config/references';

const logger = createChildLogger(defaultLogger, { component: 'ReferenceLoader' });

// =============================================================================
// Types
// =============================================================================

export interface ReferenceLoaderConfig {
  /** Directory containing reference images */
  readonly referencesDir?: string;
}

export interface LoadedReference {
  /** The prompt text */
  readonly promptText: string;
  /** Loaded reference configuration, or undefined if no reference */
  readonly references?: GenerationReferences;
}

// =============================================================================
// Reference Loader Service
// =============================================================================

/**
 * Service for loading reference images from disk.
 *
 * Handles:
 * - Reading image files and encoding as base64
 * - Converting ExtendedPrompt to GenerationReferences
 * - Validating that reference files exist
 *
 * @example
 * ```typescript
 * const loader = new ReferenceLoaderService();
 *
 * const prompt: ExtendedPrompt = {
 *   text: "Reinterpret in Caribbean style",
 *   reference: "original.png",
 *   referenceType: "style",
 * };
 *
 * const loaded = await loader.loadFromPrompt(prompt);
 * // loaded.references contains the base64-encoded image
 * ```
 */
export class ReferenceLoaderService {
  private readonly referencesDir: string;

  constructor(config?: ReferenceLoaderConfig) {
    this.referencesDir = resolve(config?.referencesDir ?? REFERENCES_DIR);
  }

  /**
   * Load reference images from an extended prompt.
   * Supports both legacy single reference and new multi-reference format.
   *
   * @param prompt - Extended prompt with reference file path(s)
   * @returns Loaded reference with base64-encoded image data
   */
  async loadFromPrompt(prompt: ExtendedPrompt): Promise<LoadedReference> {
    // Check if prompt has any references
    if (!hasReferences(prompt)) {
      // Return without references property (not undefined, just absent)
      const result: LoadedReference = {
        promptText: prompt.text,
      };
      return result;
    }

    // Get all references (unified format)
    const allRefs = getAllReferences(prompt);

    // Load all reference images
    const loadedImages: Array<{ ref: SingleReference; imageBase64: string }> = [];

    for (const ref of allRefs) {
      const imagePath = join(this.referencesDir, ref.path);

      // Verify file exists
      try {
        await access(imagePath);
      } catch {
        logger.error(
          { imagePath, reference: ref.path },
          'Reference image file not found',
        );
        throw new Error(`Reference image not found: ${ref.path}`);
      }

      // Read and encode image
      const imageBuffer = await readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      logger.debug(
        {
          reference: ref.path,
          type: ref.type,
          sizeKB: Math.round(imageBuffer.length / 1024),
        },
        'Loaded reference image',
      );

      loadedImages.push({ ref, imageBase64 });
    }

    // Build GenerationReferences from all loaded images
    const references = this.buildReferencesFromMultiple(loadedImages);

    logger.info(
      { 
        promptText: prompt.text.slice(0, 50) + '...', 
        referenceCount: loadedImages.length,
        types: loadedImages.map(r => r.ref.type),
      },
      'Loaded all references for prompt',
    );

    return {
      promptText: prompt.text,
      references,
    };
  }

  /**
   * Load references for multiple prompts.
   *
   * @param prompts - Array of extended prompts
   * @returns Array of loaded references (parallel with input)
   */
  async loadFromPrompts(prompts: ExtendedPrompt[]): Promise<LoadedReference[]> {
    const results: LoadedReference[] = [];

    for (const prompt of prompts) {
      const loaded = await this.loadFromPrompt(prompt);
      results.push(loaded);
    }

    logger.info(
      { count: results.length },
      'Loaded all reference images',
    );

    return results;
  }

  /**
   * Check if a reference file exists.
   */
  async referenceExists(filename: string): Promise<boolean> {
    const imagePath = join(this.referencesDir, filename);
    try {
      await access(imagePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the full path to a reference file.
   */
  getReferencePath(filename: string): string {
    return join(this.referencesDir, filename);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Build GenerationReferences from multiple loaded reference images.
   * Groups references by type (subject, control, style).
   */
  private buildReferencesFromMultiple(
    loadedImages: Array<{ ref: SingleReference; imageBase64: string }>,
  ): GenerationReferences {
    const subjects: SubjectReference[] = [];
    let control: ControlReference | undefined;
    let style: StyleReference | undefined;

    let referenceId = 1;

    for (const { ref, imageBase64 } of loadedImages) {
      switch (ref.type) {
        case 'subject':
          subjects.push({
            type: 'REFERENCE_TYPE_SUBJECT',
            referenceId: referenceId++,
            imageBase64,
            subjectType: ref.subjectType ?? 'object',
            subjectDescription: ref.description,
          });
          break;

        case 'control':
          // Only one control reference is supported
          if (!control) {
            control = {
              type: 'REFERENCE_TYPE_CONTROL',
              referenceId: referenceId++,
              imageBase64,
              controlType: (ref.controlType ?? 'CONTROL_TYPE_CANNY') as ControlType,
              enableControlImageComputation: ref.computeControl ?? true,
            };
          } else {
            logger.warn(
              { path: ref.path },
              'Multiple control references provided, using first one only',
            );
          }
          break;

        case 'style':
          // Only one style reference is supported
          if (!style) {
            style = {
              type: 'REFERENCE_TYPE_STYLE',
              referenceId: referenceId++,
              imageBase64,
              styleDescription: ref.description,
            };
          } else {
            logger.warn(
              { path: ref.path },
              'Multiple style references provided, using first one only',
            );
          }
          break;
      }
    }

    const result: GenerationReferences = {};

    if (subjects.length > 0) {
      result.subject = subjects;
    }
    if (control) {
      result.control = control;
    }
    if (style) {
      result.style = style;
    }

    return result;
  }
}


