/**
 * Adapters Barrel Export
 *
 * Exports all image generator adapters and interfaces.
 *
 * @module adapters
 */

// Core Interface
export {
  type ImageGenerator,
  type GenerationOptions,
  type GenerationResult,
  type AspectRatio,
  type SafetyFilterLevel,
  type ImageMimeType,
  GeneratorError,
  RateLimitError,
  ContentFilterError,
  AuthenticationError,
} from './generator.interface.js';

// Factory
export {
  type GeneratorProvider,
  type GeneratorCreateOptions,
  SUPPORTED_PROVIDERS,
  GeneratorFactory,
} from './generator.factory.js';

// Mock Generator
export {
  type MockGeneratorConfig,
  MockImageGenerator,
} from './mock.generator.js';

// Vertex AI
export {
  VertexImagen3Strategy,
  VertexControlledStrategy,
  VertexApiError,
  validateCredentials,
} from './vertex/index.js';

// OpenAI
export {
  DalleStrategy,
  type DalleStrategyOptions,
} from './openai/index.js';

// Gemini (Nano Banana)
export {
  GeminiImageStrategy,
  GeminiApiError,
  type GeminiImageStrategyOptions,
} from './gemini/index.js';

