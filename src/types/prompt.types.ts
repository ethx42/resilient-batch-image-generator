/**
 * Prompt Input Types
 *
 * Defines the format for prompts with optional reference images.
 * Supports both simple string prompts and extended prompts with references.
 *
 * @module types/prompt
 */

import { z } from 'zod';

// =============================================================================
// Simple Prompt (Backward Compatible)
// =============================================================================

/**
 * Simple string prompt - backward compatible with existing format.
 */
export const SimplePromptSchema = z.string().min(1).max(2000);
export type SimplePrompt = z.infer<typeof SimplePromptSchema>;

// =============================================================================
// Single Reference (Backward Compatible)
// =============================================================================

/**
 * A single reference image configuration.
 * Used for backward compatibility with single-reference prompts.
 */
export const SingleReferenceSchema = z.object({
  /**
   * Path to reference image file (relative to config/references/).
   */
  path: z.string().min(1),

  /**
   * How to use the reference image:
   * - "style": Extract visual style (colors, textures, artistic feel)
   * - "control": Extract structure (edges, shapes) and apply new style
   * - "subject": Maintain identity of the subject in new context
   */
  type: z.enum(['style', 'control', 'subject']),

  /**
   * For control references: the type of structure extraction.
   */
  controlType: z.enum([
    'CONTROL_TYPE_CANNY',
    'CONTROL_TYPE_SCRIBBLE',
    'CONTROL_TYPE_FACE_MESH',
  ]).optional(),

  /**
   * Whether the model should compute control features from the image.
   * - true: Model extracts edges/structure from a regular photo
   * - false: You provide a pre-processed control image (sketch, edge map)
   */
  computeControl: z.boolean().optional(),

  /**
   * Description to help the model understand the reference.
   */
  description: z.string().max(500).optional(),

  /**
   * Subject type for subject references.
   */
  subjectType: z.enum(['product', 'person', 'animal', 'object']).optional(),
});

export type SingleReference = z.infer<typeof SingleReferenceSchema>;

// =============================================================================
// Extended Prompt with Reference(s)
// =============================================================================

/**
 * Extended prompt with optional reference image for reinterpretation.
 * Supports both single reference (backward compatible) and multiple references.
 *
 * @example Single reference (backward compatible)
 * ```json
 * {
 *   "text": "Reinterpret in Caribbean folk art style with bold colors",
 *   "reference": "original_photo.png",
 *   "referenceType": "style"
 * }
 * ```
 *
 * @example Multiple references (new format)
 * ```json
 * {
 *   "text": "Create a product shot with this sneaker on a beach",
 *   "references": [
 *     { "path": "sneaker.png", "type": "subject", "description": "Red Nike sneaker" },
 *     { "path": "beach_style.png", "type": "style", "description": "Sunset beach photography" }
 *   ]
 * }
 * ```
 */
export const ExtendedPromptSchema = z.object({
  /** The prompt text describing the desired output */
  text: z.string().min(1).max(2000),

  // ---------------------------------------------------------------------------
  // Single Reference (Backward Compatible)
  // ---------------------------------------------------------------------------

  /**
   * Path to reference image file (relative to config/references/).
   * The image will be loaded and attached to the job.
   * @deprecated Use `references` array for new prompts
   */
  reference: z.string().min(1).optional(),

  /**
   * How to use the reference image:
   * - "style": Extract visual style (colors, textures, artistic feel)
   * - "control": Extract structure (edges, shapes) and apply new style
   * - "subject": Maintain identity of the subject in new context
   *
   * @default "style"
   * @deprecated Use `references` array for new prompts
   */
  referenceType: z.enum(['style', 'control', 'subject']).optional(),

  /**
   * For control references: the type of structure extraction.
   * Only used when referenceType is "control".
   *
   * @default "CONTROL_TYPE_CANNY"
   * @deprecated Use `references` array for new prompts
   */
  controlType: z.enum([
    'CONTROL_TYPE_CANNY',
    'CONTROL_TYPE_SCRIBBLE',
    'CONTROL_TYPE_FACE_MESH',
  ]).optional(),

  /**
   * Whether the model should compute control features from the image.
   * - true: Model extracts edges/structure from a regular photo
   * - false: You provide a pre-processed control image (sketch, edge map)
   *
   * Only used when referenceType is "control".
   * @default true
   * @deprecated Use `references` array for new prompts
   */
  computeControl: z.boolean().optional(),

  /**
   * Optional description to help the model understand the style.
   * Used for "style" reference type.
   * @deprecated Use `references` array for new prompts
   */
  styleDescription: z.string().max(500).optional(),

  /**
   * Optional description of the subject for better recognition.
   * Used for "subject" reference type.
   * @deprecated Use `references` array for new prompts
   */
  subjectDescription: z.string().max(500).optional(),

  /**
   * Subject type for subject references.
   * @default "object"
   * @deprecated Use `references` array for new prompts
   */
  subjectType: z.enum(['product', 'person', 'animal', 'object']).optional(),

  // ---------------------------------------------------------------------------
  // Multiple References (New Format)
  // ---------------------------------------------------------------------------

  /**
   * Array of reference images for multi-reference generation.
   * Supports up to 8 reference images.
   * 
   * This is the preferred format for new prompts, especially when using
   * Gemini (Nano Banana) which has strong multi-reference capabilities.
   */
  references: z.array(SingleReferenceSchema).max(8).optional(),
});

export type ExtendedPrompt = z.infer<typeof ExtendedPromptSchema>;

// =============================================================================
// Union Type (Accepts Both Formats)
// =============================================================================

/**
 * A prompt can be either a simple string or an extended object with reference.
 * This enables backward compatibility with existing prompts.json files.
 */
export const PromptInputSchema = z.union([
  SimplePromptSchema,
  ExtendedPromptSchema,
]);

export type PromptInput = z.infer<typeof PromptInputSchema>;

/**
 * Array of prompts (mixed simple and extended).
 */
export const PromptsConfigSchema = z.array(PromptInputSchema).min(1);
export type PromptsConfig = z.infer<typeof PromptsConfigSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a prompt input is an extended prompt with reference(s).
 */
export function isExtendedPrompt(prompt: PromptInput): prompt is ExtendedPrompt {
  if (typeof prompt !== 'object' || !('text' in prompt)) {
    return false;
  }
  // Has either legacy 'reference' or new 'references' array
  return 'reference' in prompt || 'references' in prompt;
}

/**
 * Check if an extended prompt has any references (legacy or new format).
 */
export function hasReferences(prompt: ExtendedPrompt): boolean {
  return !!(prompt.reference || (prompt.references && prompt.references.length > 0));
}

/**
 * Get total number of references in a prompt.
 */
export function getReferenceCount(prompt: PromptInput): number {
  if (!isExtendedPrompt(prompt)) return 0;
  
  let count = 0;
  if (prompt.reference) count += 1;
  if (prompt.references) count += prompt.references.length;
  return count;
}

/**
 * Get the prompt text from any prompt input.
 */
export function getPromptText(prompt: PromptInput): string {
  return isExtendedPrompt(prompt) ? prompt.text : prompt;
}

/**
 * Convert legacy single reference to new array format.
 * Returns all references as a unified array.
 */
export function getAllReferences(prompt: ExtendedPrompt): SingleReference[] {
  const refs: SingleReference[] = [];

  // Handle legacy single reference format
  if (prompt.reference) {
    refs.push({
      path: prompt.reference,
      type: prompt.referenceType ?? 'style',
      controlType: prompt.controlType,
      computeControl: prompt.computeControl,
      description: prompt.styleDescription ?? prompt.subjectDescription,
      subjectType: prompt.subjectType,
    });
  }

  // Handle new multiple references format
  if (prompt.references) {
    refs.push(...prompt.references);
  }

  return refs;
}

/**
 * Normalize prompts to extended format for consistent processing.
 */
export function normalizePrompt(prompt: PromptInput): ExtendedPrompt | null {
  if (isExtendedPrompt(prompt)) {
    return prompt;
  }
  // Simple string prompts don't have references
  return null;
}

/**
 * Build a detailed log-friendly representation of a prompt with its references.
 */
export function buildPromptLogSummary(prompt: PromptInput): {
  text: string;
  referenceCount: number;
  references: Array<{ path: string; type: string; description?: string }>;
} {
  const text = getPromptText(prompt);
  
  if (!isExtendedPrompt(prompt)) {
    return { text, referenceCount: 0, references: [] };
  }

  const allRefs = getAllReferences(prompt);
  
  return {
    text,
    referenceCount: allRefs.length,
    references: allRefs.map(ref => {
      const result: { path: string; type: string; description?: string } = {
        path: ref.path,
        type: ref.type,
      };
      if (ref.description) {
        result.description = ref.description;
      }
      return result;
    }),
  };
}


