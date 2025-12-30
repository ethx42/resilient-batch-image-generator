/**
 * Services Barrel Export
 *
 * @module core/services
 */

export {
  type ImageMetadata,
  ImagePersistenceService,
} from "./image-persistence.service.js";

export { type EditableConfig, ConfigService } from "./config.service.js";

export {
  type ReferenceLoaderConfig,
  type LoadedReference,
  ReferenceLoaderService,
} from "./reference-loader.service.js";

export {
  type BatchGenerationConfig,
  type BatchPrompt,
  type BatchItemResult,
  type BatchGenerationResult,
  type BatchProgressCallback,
  BatchGenerationService,
} from "./batch-generation.service.js";
