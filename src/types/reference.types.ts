/**
 * Reference Image Types for Controlled Generation
 *
 * Defines types for Vertex AI Imagen 3 Controlled Generation features:
 * - Subject Reference: Maintain product/person identity across contexts
 * - Control Reference: Structure-conditioned generation (edges, sketches)
 * - Style Reference: Extract and apply visual style from reference image
 *
 * These features are OPTIONAL. When not provided, standard text-to-image
 * generation is used.
 *
 * @module types/reference
 */

import { z } from 'zod';

// =============================================================================
// Control Types (For Control Reference)
// =============================================================================

/**
 * Control types supported by Imagen 3 for structure extraction.
 *
 * - CANNY: Edge detection (best for architectural/product images)
 * - SCRIBBLE: Hand-drawn sketches or rough outlines
 * - FACE_MESH: Facial landmark detection for portraits
 */
export const ControlTypeSchema = z.enum([
  'CONTROL_TYPE_CANNY',
  'CONTROL_TYPE_SCRIBBLE',
  'CONTROL_TYPE_FACE_MESH',
]);
export type ControlType = z.infer<typeof ControlTypeSchema>;

// =============================================================================
// Reference Types
// =============================================================================

/**
 * Types of reference images supported by Imagen 3.
 */
export const ReferenceTypeSchema = z.enum([
  'REFERENCE_TYPE_SUBJECT',
  'REFERENCE_TYPE_CONTROL',
  'REFERENCE_TYPE_STYLE',
]);
export type ReferenceType = z.infer<typeof ReferenceTypeSchema>;

// =============================================================================
// Subject Reference
// =============================================================================

/**
 * Subject Reference Configuration.
 *
 * Used to maintain product/person identity across different contexts.
 * Provide 1-4 images of the subject for best results.
 *
 * @example
 * ```typescript
 * const subjectRef: SubjectReference = {
 *   type: 'REFERENCE_TYPE_SUBJECT',
 *   referenceId: 1,
 *   imageBase64: 'base64EncodedImageData...',
 *   subjectType: 'product',
 *   subjectDescription: 'Red Nike sneaker with white sole',
 * };
 * ```
 */
export const SubjectReferenceSchema = z.object({
  /** Identifies this as a subject reference */
  type: z.literal('REFERENCE_TYPE_SUBJECT'),

  /** Unique ID for referencing in the prompt (e.g., [1]) */
  referenceId: z.number().int().positive(),

  /** Base64-encoded image data */
  imageBase64: z.string().min(1),

  /** Type of subject being referenced */
  subjectType: z.enum(['product', 'person', 'animal', 'object']).optional(),

  /** Brief description of the subject for better recognition */
  subjectDescription: z.string().max(500).optional(),
});

export type SubjectReference = z.infer<typeof SubjectReferenceSchema>;

// =============================================================================
// Control Reference
// =============================================================================

/**
 * Control Reference Configuration.
 *
 * Used for structure-conditioned generation. The model extracts
 * structural information (edges, shapes) and generates a new image
 * respecting that structure.
 *
 * @example
 * ```typescript
 * const controlRef: ControlReference = {
 *   type: 'REFERENCE_TYPE_CONTROL',
 *   referenceId: 1,
 *   imageBase64: 'base64EncodedSketch...',
 *   controlType: 'CONTROL_TYPE_SCRIBBLE',
 *   enableControlImageComputation: false, // We provide the control image
 * };
 * ```
 */
export const ControlReferenceSchema = z.object({
  /** Identifies this as a control reference */
  type: z.literal('REFERENCE_TYPE_CONTROL'),

  /** Unique ID for referencing in the prompt (e.g., [1]) */
  referenceId: z.number().int().positive(),

  /** Base64-encoded control image (sketch, edge map, etc.) */
  imageBase64: z.string().min(1),

  /** Type of control to apply */
  controlType: ControlTypeSchema,

  /**
   * Whether the model should compute the control image from a regular photo.
   * - true: Model extracts edges/structure from your image
   * - false: You provide a pre-processed control image (sketch, edge map)
   */
  enableControlImageComputation: z.boolean(),
});

export type ControlReference = z.infer<typeof ControlReferenceSchema>;

// =============================================================================
// Style Reference
// =============================================================================

/**
 * Style Reference Configuration.
 *
 * Used to extract visual style (colors, textures, artistic feel)
 * from a reference image and apply it to generated content.
 *
 * @example
 * ```typescript
 * const styleRef: StyleReference = {
 *   type: 'REFERENCE_TYPE_STYLE',
 *   referenceId: 2,
 *   imageBase64: 'base64EncodedStyleImage...',
 *   styleDescription: 'Impressionist oil painting with bold brushstrokes',
 * };
 * ```
 */
export const StyleReferenceSchema = z.object({
  /** Identifies this as a style reference */
  type: z.literal('REFERENCE_TYPE_STYLE'),

  /** Unique ID for referencing in the prompt (e.g., [2]) */
  referenceId: z.number().int().positive(),

  /** Base64-encoded style reference image */
  imageBase64: z.string().min(1),

  /** Description of the style to help the model understand the intent */
  styleDescription: z.string().max(500).optional(),
});

export type StyleReference = z.infer<typeof StyleReferenceSchema>;

// =============================================================================
// Union Type for Any Reference
// =============================================================================

/**
 * Any type of reference image (subject, control, or style).
 */
export const ReferenceImageSchema = z.discriminatedUnion('type', [
  SubjectReferenceSchema,
  ControlReferenceSchema,
  StyleReferenceSchema,
]);

export type ReferenceImage = z.infer<typeof ReferenceImageSchema>;

// =============================================================================
// Generation References Configuration
// =============================================================================

/**
 * Complete references configuration for a generation request.
 *
 * Supports combining multiple reference types for complex use cases:
 * - Subject + Style: Same product in different artistic styles
 * - Control + Style: Structure from sketch with style from painting
 * - All three: Maximum control over output
 *
 * @example
 * ```typescript
 * const refs: GenerationReferences = {
 *   subject: [subjectRef1, subjectRef2], // Multiple subject images
 *   control: controlRef,                  // Single structure reference
 *   style: styleRef,                      // Single style reference
 * };
 * ```
 */
export const GenerationReferencesSchema = z.object({
  /** Subject references (1-4 images of the same subject) */
  subject: z.array(SubjectReferenceSchema).max(4).optional(),

  /** Control reference for structure conditioning */
  control: ControlReferenceSchema.optional(),

  /** Style reference for visual style transfer */
  style: StyleReferenceSchema.optional(),
}).refine(
  (data) => data.subject?.length || data.control || data.style,
  { message: 'At least one reference type must be provided' }
);

export type GenerationReferences = z.infer<typeof GenerationReferencesSchema>;

// =============================================================================
// Reference-Aware Generation Options
// =============================================================================

/**
 * Extended generation options that include optional reference images.
 *
 * This extends the base GenerationOptions to support controlled generation.
 * When references are provided, the model used should be `imagen-3.0-capability-001`.
 */
export const ExtendedGenerationOptionsSchema = z.object({
  /** Aspect ratio (inherited from base options) */
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),

  /** Safety filter level (inherited from base options) */
  safetyFilterLevel: z.enum(['block_none', 'block_few', 'block_some', 'block_most']).optional(),

  /** Optional reference images for controlled generation */
  references: GenerationReferencesSchema.optional(),
});

export type ExtendedGenerationOptions = z.infer<typeof ExtendedGenerationOptionsSchema>;

// =============================================================================
// Preset Configurations
// =============================================================================

/**
 * Predefined reference configurations for common use cases.
 */
export const REFERENCE_PRESETS = {
  /**
   * Product photography: Maintain product identity in new contexts.
   */
  PRODUCT_CONSISTENCY: {
    subjectType: 'product' as const,
    controlType: 'CONTROL_TYPE_CANNY' as const,
  },

  /**
   * Architectural visualization: Structure from blueprint/sketch.
   */
  ARCHITECTURAL_RENDER: {
    controlType: 'CONTROL_TYPE_SCRIBBLE' as const,
    enableControlImageComputation: false,
  },

  /**
   * Portrait with pose: Control face/body pose from reference.
   */
  PORTRAIT_POSE: {
    controlType: 'CONTROL_TYPE_FACE_MESH' as const,
    enableControlImageComputation: true,
  },

  /**
   * Style transfer: Apply artistic style to any content.
   */
  STYLE_TRANSFER: {
    // Just style, no structure/subject constraint
  },
} as const;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if references require the capability model.
 *
 * Returns true if any references are provided, indicating that
 * `imagen-3.0-capability-001` should be used instead of the standard model.
 */
export function requiresCapabilityModel(refs?: GenerationReferences): boolean {
  if (!refs) return false;
  return !!(refs.subject?.length || refs.control || refs.style);
}

/**
 * Validate that reference IDs are unique within a request.
 */
export function validateReferenceIds(refs: GenerationReferences): boolean {
  const ids = new Set<number>();

  for (const subjectRef of refs.subject ?? []) {
    if (ids.has(subjectRef.referenceId)) return false;
    ids.add(subjectRef.referenceId);
  }

  if (refs.control) {
    if (ids.has(refs.control.referenceId)) return false;
    ids.add(refs.control.referenceId);
  }

  if (refs.style) {
    if (ids.has(refs.style.referenceId)) return false;
    ids.add(refs.style.referenceId);
  }

  return true;
}

/**
 * Build a prompt with reference placeholders.
 *
 * Generates prompt text that references the provided images using [id] syntax.
 *
 * @example
 * ```typescript
 * const prompt = buildReferencePrompt(
 *   'A sneaker on a beach at sunset',
 *   { subject: [{ referenceId: 1, ... }], style: { referenceId: 2, ... } }
 * );
 * // Returns: 'Generate image of subject [1] in the style [2]: A sneaker on a beach at sunset'
 * ```
 */
export function buildReferencePrompt(
  basePrompt: string,
  refs: GenerationReferences,
): string {
  const parts: string[] = [];

  // Subject references
  if (refs.subject?.length) {
    const subjectIds = refs.subject.map((s) => `[${s.referenceId}]`).join(', ');
    parts.push(`aligned with subject ${subjectIds}`);
  }

  // Control reference
  if (refs.control) {
    parts.push(`following the structure in [${refs.control.referenceId}]`);
  }

  // Style reference
  if (refs.style) {
    parts.push(`in the style of [${refs.style.referenceId}]`);
  }

  if (parts.length === 0) {
    return basePrompt;
  }

  return `Generate an image ${parts.join(' ')} that matches: ${basePrompt}`;
}


