/**
 * Image Generator Factory
 *
 * Creates ImageGenerator instances based on provider configuration.
 * Decouples instantiation from usage for testability.
 *
 * @module adapters/generator.factory
 */

import type { EnvConfig, VertexConfig } from '../types/index.js';
import type { ImageGenerator } from './generator.interface.js';
import { VertexImagen3Strategy } from './vertex/index.js';
import { MockImageGenerator, type MockGeneratorConfig } from './mock.generator.js';

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Supported generator providers.
 */
export type GeneratorProvider = 'vertex-imagen3' | 'mock';

/**
 * All supported provider values for validation.
 */
export const SUPPORTED_PROVIDERS: readonly GeneratorProvider[] = [
  'vertex-imagen3',
  'mock',
] as const;

// =============================================================================
// Factory Implementation
// =============================================================================

/**
 * Factory for creating ImageGenerator instances.
 *
 * Benefits:
 * - Decouples consumer from concrete implementations
 * - Centralizes configuration mapping
 * - Enables easy testing with mock provider
 * - Future-proof for additional providers
 *
 * @example
 * ```typescript
 * // Production: Vertex AI
 * const generator = GeneratorFactory.create('vertex-imagen3', env);
 *
 * // Testing: Mock
 * const mockGenerator = GeneratorFactory.create('mock', env);
 *
 * // Both work with the same interface
 * const result = await generator.generate('A beautiful sunset');
 * ```
 */
export class GeneratorFactory {
  /**
   * Create an ImageGenerator for the specified provider.
   *
   * @param provider - The provider type
   * @param config - Application configuration
   * @param mockConfig - Optional mock generator configuration
   * @returns Configured ImageGenerator instance
   * @throws {Error} If provider is unsupported
   */
  static create(
    provider: GeneratorProvider,
    config: EnvConfig,
    mockConfig?: MockGeneratorConfig,
  ): ImageGenerator {
    switch (provider) {
      case 'vertex-imagen3':
        return GeneratorFactory.createVertexGenerator(config);

      case 'mock':
        return new MockImageGenerator(mockConfig);

      default:
        // TypeScript exhaustiveness check
        throw new Error(
          `Unsupported generator provider: ${provider as string}. ` +
          `Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`,
        );
    }
  }

  /**
   * Create a Vertex AI Imagen 3 generator.
   */
  private static createVertexGenerator(config: EnvConfig): ImageGenerator {
    const vertexConfig: VertexConfig = {
      projectId: config.GOOGLE_CLOUD_PROJECT,
      location: config.GOOGLE_CLOUD_LOCATION,
      masterAesthetic: config.MASTER_AESTHETIC_PROMPT,
    };

    return new VertexImagen3Strategy(vertexConfig);
  }

  /**
   * Check if a provider string is valid.
   *
   * @param provider - Provider string to validate
   * @returns true if the provider is supported
   */
  static isValidProvider(provider: string): provider is GeneratorProvider {
    return SUPPORTED_PROVIDERS.includes(provider as GeneratorProvider);
  }

  /**
   * Get the default provider for production use.
   */
  static getDefaultProvider(): GeneratorProvider {
    return 'vertex-imagen3';
  }
}

