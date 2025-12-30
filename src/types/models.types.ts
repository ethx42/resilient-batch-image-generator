/**
 * Model Registry - Single Source of Truth
 *
 * ALL model definitions live here. No other file should hardcode
 * model IDs, names, or descriptions.
 *
 * @module types/models
 */

// =============================================================================
// Types
// =============================================================================

/**
 * AI Provider identifiers.
 */
export type AIProvider = 'vertex' | 'openai' | 'gemini';

/**
 * Complete model definition with all metadata.
 */
export interface ModelDefinition {
  /** Unique key for internal use (e.g., 'vertex-imagen3') */
  readonly key: string;
  /** API model ID (e.g., 'imagen-3.0-generate-001') */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Short description */
  readonly description: string;
  /** Provider this model belongs to */
  readonly provider: AIProvider;
  /** Environment variable required for this model */
  readonly requiredEnvVar: string;
}

// =============================================================================
// Model Registry (Single Source of Truth)
// =============================================================================

/**
 * All available AI image generation models.
 *
 * This is the ONLY place model definitions should exist.
 * All other parts of the codebase derive from this registry.
 */
export const MODEL_REGISTRY = {
  'vertex-imagen3': {
    key: 'vertex-imagen3',
    id: 'imagen-3.0-generate-001',
    name: 'Imagen 3',
    description: 'High quality, slower generation',
    provider: 'vertex',
    requiredEnvVar: 'GOOGLE_CLOUD_PROJECT',
  },
  'vertex-imagen3-fast': {
    key: 'vertex-imagen3-fast',
    id: 'imagen-3.0-fast-generate-001',
    name: 'Imagen 3 Fast',
    description: 'Faster generation, slightly lower quality',
    provider: 'vertex',
    requiredEnvVar: 'GOOGLE_CLOUD_PROJECT',
  },
  'vertex-imagen3-capability': {
    key: 'vertex-imagen3-capability',
    id: 'imagen-3.0-capability-001',
    name: 'Imagen 3 Controlled',
    description: 'Supports subject, control, and style references',
    provider: 'vertex',
    requiredEnvVar: 'GOOGLE_CLOUD_PROJECT',
  },
  'openai-dalle3': {
    key: 'openai-dalle3',
    id: 'dall-e-3',
    name: 'DALL-E 3',
    description: 'Latest OpenAI model, highest quality',
    provider: 'openai',
    requiredEnvVar: 'OPENAI_API_KEY',
  },
  'openai-dalle2': {
    key: 'openai-dalle2',
    id: 'dall-e-2',
    name: 'DALL-E 2',
    description: 'Faster, lower cost, good quality',
    provider: 'openai',
    requiredEnvVar: 'OPENAI_API_KEY',
  },
  'gemini-flash-image': {
    key: 'gemini-flash-image',
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    description: 'Fast image generation with multimodal reference support',
    provider: 'gemini',
    requiredEnvVar: 'GOOGLE_AI_API_KEY',
  },
  'gemini-pro-image': {
    key: 'gemini-pro-image',
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    description: 'Advanced image generation with enhanced visual precision',
    provider: 'gemini',
    requiredEnvVar: 'GOOGLE_AI_API_KEY',
  },
} as const satisfies Record<string, ModelDefinition>;

// =============================================================================
// Derived Types (Computed from Registry)
// =============================================================================

/**
 * Valid model keys (derived from registry).
 */
export type ModelKey = keyof typeof MODEL_REGISTRY;

/**
 * All model keys as an array (for iteration).
 */
export const MODEL_KEYS = Object.keys(MODEL_REGISTRY) as ModelKey[];

/**
 * Production model keys.
 * Since MODEL_REGISTRY doesn't include 'mock', this is identical to MODEL_KEYS.
 * Kept for semantic clarity in code that distinguishes production vs testing.
 */
export const PRODUCTION_MODEL_KEYS = MODEL_KEYS;

// =============================================================================
// Lookup Utilities
// =============================================================================

/**
 * Get a model definition by key.
 * @throws Error if key is invalid
 */
export function getModel(key: ModelKey): ModelDefinition {
  const model = MODEL_REGISTRY[key];
  if (!model) {
    throw new Error(`Unknown model key: ${key}`);
  }
  return model;
}

/**
 * Find a model by its API ID.
 */
export function findModelByApiId(apiId: string): ModelDefinition | undefined {
  return Object.values(MODEL_REGISTRY).find((m) => m.id === apiId);
}

/**
 * Get all models for a provider.
 */
export function getModelsByProvider(provider: AIProvider): ModelDefinition[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.provider === provider);
}

/**
 * Check if a string is a valid model key.
 */
export function isValidModelKey(key: string): key is ModelKey {
  return key in MODEL_REGISTRY;
}

/**
 * Get models grouped by provider.
 */
export function getModelsGroupedByProvider(): Record<AIProvider, ModelDefinition[]> {
  return {
    vertex: getModelsByProvider('vertex'),
    openai: getModelsByProvider('openai'),
    gemini: getModelsByProvider('gemini'),
  };
}

