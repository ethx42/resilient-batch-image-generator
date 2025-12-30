/**
 * Image Generator Factory
 *
 * Creates ImageGenerator instances based on the Model Registry.
 * Uses MODEL_REGISTRY as the Single Source of Truth for all model definitions.
 *
 * @module adapters/generator.factory
 */

import type { EnvConfig, VertexConfig, OpenAIConfig, GeminiConfig, GeminiModelId } from '../types/index.js';
import {
  MODEL_REGISTRY,
  MODEL_KEYS,
  PRODUCTION_MODEL_KEYS,
  getModel,
  isValidModelKey,
  type ModelKey,
  type ModelDefinition,
} from '../types/index.js';
import type { ImageGenerator } from './generator.interface.js';
import { VertexImagen3Strategy, VertexControlledStrategy } from './vertex/index.js';
import { DalleStrategy } from './openai/index.js';
import { GeminiImageStrategy } from './gemini/index.js';
import { MockImageGenerator, type MockGeneratorConfig } from './mock.generator.js';

/** Model ID that requires the Controlled Generation strategy */
const CAPABILITY_MODEL_ID = 'imagen-3.0-capability-001';

// =============================================================================
// Types (Derived from Model Registry)
// =============================================================================

/**
 * Supported generator providers.
 * Derived from MODEL_REGISTRY keys plus 'mock'.
 */
export type GeneratorProvider = ModelKey | 'mock';

/**
 * All supported provider values for validation.
 * Derived from MODEL_REGISTRY.
 */
export const SUPPORTED_PROVIDERS: readonly GeneratorProvider[] = [
  ...MODEL_KEYS,
  'mock',
] as const;

/**
 * Production providers (excludes mock).
 */
export const PRODUCTION_PROVIDERS = PRODUCTION_MODEL_KEYS;

// =============================================================================
// Factory Implementation
// =============================================================================

/**
 * Options for creating a generator.
 */
export interface GeneratorCreateOptions {
  /** 
   * Getter for master aesthetic prompt.
   * Called dynamically on each generation to get the current value.
   * This allows the aesthetic to be changed at runtime without recreating the generator.
   */
  getMasterAesthetic: () => string;
}

/**
 * Factory for creating ImageGenerator instances.
 *
 * Uses MODEL_REGISTRY as the Single Source of Truth.
 * All model metadata (id, name, description) is derived from the registry.
 *
 * @example
 * ```typescript
 * // Get model info from registry
 * const model = getModel('vertex-imagen3');
 * console.log(model.name); // "Imagen 3"
 *
 * // Create generator with dynamic masterAesthetic getter
 * const generator = GeneratorFactory.create('vertex-imagen3', env, {
 *   getMasterAesthetic: () => configService.getMasterAesthetic(),
 * });
 * ```
 */
export class GeneratorFactory {
  /**
   * Create an ImageGenerator for the specified provider.
   *
   * @param provider - The provider key (must exist in MODEL_REGISTRY or be 'mock')
   * @param config - Application configuration (env vars)
   * @param options - Generator options including masterAesthetic
   * @param mockConfig - Optional mock generator configuration
   * @returns Configured ImageGenerator instance
   * @throws {Error} If provider is unsupported or misconfigured
   */
  static create(
    provider: GeneratorProvider,
    config: EnvConfig,
    options: GeneratorCreateOptions,
    mockConfig?: MockGeneratorConfig,
  ): ImageGenerator {
    // Handle mock separately
    if (provider === 'mock') {
      return new MockImageGenerator(mockConfig);
    }

    // Validate provider exists in registry
    if (!isValidModelKey(provider)) {
      throw new Error(
        `Unsupported generator provider: ${provider}. ` +
        `Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`,
      );
    }

    // Get model definition from registry
    const model = getModel(provider);

    // Check required env var
    const envValue = config[model.requiredEnvVar as keyof EnvConfig];
    if (!envValue) {
      throw new Error(
        `${model.requiredEnvVar} is required for ${model.name}`,
      );
    }

    // Create provider-specific generator
    return GeneratorFactory.createForModel(model, config, options.getMasterAesthetic);
  }

  /**
   * Create generator for a specific model definition.
   */
  private static createForModel(
    model: ModelDefinition,
    config: EnvConfig,
    getMasterAesthetic: () => string,
  ): ImageGenerator {
    switch (model.provider) {
      case 'vertex':
        return GeneratorFactory.createVertexGenerator(config, model.id, getMasterAesthetic);

      case 'openai':
        return GeneratorFactory.createOpenAIGenerator(config, model.id, getMasterAesthetic);

      case 'gemini':
        return GeneratorFactory.createGeminiGenerator(config, model.id, getMasterAesthetic);

      default:
        throw new Error(`Unsupported provider type: ${model.provider}`);
    }
  }

  /**
   * Create a Vertex AI Imagen generator.
   *
   * Automatically uses VertexControlledStrategy for the capability model
   * which supports Subject, Control, and Style references.
   */
  private static createVertexGenerator(
    config: EnvConfig,
    modelId: string,
    getMasterAesthetic: () => string,
  ): ImageGenerator {
    const vertexConfig: VertexConfig = {
      projectId: config.GOOGLE_CLOUD_PROJECT,
      location: config.GOOGLE_CLOUD_LOCATION,
      getMasterAesthetic,
    };

    // Use VertexControlledStrategy for the capability model
    // which supports Subject, Control, and Style references
    if (modelId === CAPABILITY_MODEL_ID) {
      return new VertexControlledStrategy({
        config: vertexConfig,
      });
    }

    return new VertexImagen3Strategy({
      config: vertexConfig,
      modelId: modelId as import('../types/index.js').VertexModelId,
    });
  }

  /**
   * Create an OpenAI DALL-E generator.
   */
  private static createOpenAIGenerator(
    config: EnvConfig,
    modelId: string,
    getMasterAesthetic: () => string,
  ): ImageGenerator {
    const openaiConfig: OpenAIConfig = {
      apiKey: config.OPENAI_API_KEY ?? '',
      getMasterAesthetic,
    };

    return new DalleStrategy({
      config: openaiConfig,
      modelId: modelId as import('../types/index.js').OpenAIModelId,
    });
  }

  /**
   * Create a Google Gemini generator (Nano Banana / Nano Banana Pro).
   *
   * Supports multimodal input with multiple reference images.
   */
  private static createGeminiGenerator(
    config: EnvConfig,
    modelId: string,
    getMasterAesthetic: () => string,
  ): ImageGenerator {
    const geminiConfig: GeminiConfig = {
      apiKey: config.GOOGLE_AI_API_KEY ?? '',
      getMasterAesthetic,
    };

    return new GeminiImageStrategy({
      config: geminiConfig,
      modelId: modelId as GeminiModelId,
    });
  }

  /**
   * Check if a provider string is valid.
   */
  static isValidProvider(provider: string): provider is GeneratorProvider {
    return provider === 'mock' || isValidModelKey(provider);
  }

  /**
   * Get the default provider for production use.
   */
  static getDefaultProvider(): GeneratorProvider {
    return 'vertex-imagen3';
  }

  /**
   * Get all available models with their metadata.
   * Useful for UI model selection.
   */
  static getAvailableModels(config: EnvConfig): Array<ModelDefinition & { available: boolean }> {
    return PRODUCTION_MODEL_KEYS.map((key) => {
      const model = MODEL_REGISTRY[key];
      const envValue = config[model.requiredEnvVar as keyof EnvConfig];
      return {
        ...model,
        available: !!envValue,
      };
    });
  }
}
