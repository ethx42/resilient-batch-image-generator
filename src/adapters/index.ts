/**
 * Adapters Barrel Export
 *
 * Exports the ImageGenerator interface and related types.
 * Implementations are exported from their respective modules.
 *
 * @module adapters
 */

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

