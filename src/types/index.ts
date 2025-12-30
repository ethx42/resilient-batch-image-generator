/**
 * Types Barrel Export
 *
 * Central export point for all domain types.
 * Import from '@/types' for clean imports.
 *
 * @module types
 */

// Job Domain
export {
  JobStatusSchema,
  JobSchema,
  JobsFileSchema,
  JobStatsSchema,
  PromptsInputSchema,
  JobUpdateSchema,
  type Job,
  type JobStatus,
  type JobsFile,
  type JobStats,
  type PromptsInput,
  type JobUpdate,
} from './job.types.js';

// Event Types
export {
  EventTypeSchema,
  serializeSSE,
  type EventType,
  type SystemEvent,
  type InitEvent,
  type StatusUpdateEvent,
  type ImageReadyEvent,
  type BatchCompleteEvent,
  type ErrorEvent,
  type HeartbeatEvent,
  type EventHandler,
  type Unsubscribe,
  type SSEMessage,
} from './events.types.js';

// Configuration
export {
  EnvSchema,
  DEFAULTS,
  VERTEX_MODELS,
  OPENAI_MODELS,
  GEMINI_MODELS,
  ALL_MODELS,
  type EnvConfig,
  type VertexConfig,
  type OpenAIConfig,
  type GeminiConfig,
  type OrchestratorConfig,
  type ServerConfig,
  type Defaults,
  type VertexModelKey,
  type VertexModelId,
  type OpenAIModelKey,
  type OpenAIModelId,
  type GeminiModelKey,
  type GeminiModelId,
} from './config.types.js';

// Benchmark
export {
  BenchmarkConfigSchema,
  type BenchmarkConfig,
  type BenchmarkGenerationResult,
  type BenchmarkModelStats,
  type BenchmarkReport,
} from './benchmark.types.js';

// Model Registry (Single Source of Truth)
export {
  MODEL_REGISTRY,
  MODEL_KEYS,
  PRODUCTION_MODEL_KEYS,
  getModel,
  findModelByApiId,
  getModelsByProvider,
  isValidModelKey,
  getModelsGroupedByProvider,
  type AIProvider,
  type ModelDefinition,
  type ModelKey,
} from './models.types.js';

// Reference Types (Controlled Generation)
export {
  ControlTypeSchema,
  ReferenceTypeSchema,
  SubjectReferenceSchema,
  ControlReferenceSchema,
  StyleReferenceSchema,
  ReferenceImageSchema,
  GenerationReferencesSchema,
  ExtendedGenerationOptionsSchema,
  REFERENCE_PRESETS,
  requiresCapabilityModel,
  validateReferenceIds,
  buildReferencePrompt,
  type ControlType,
  type ReferenceType,
  type SubjectReference,
  type ControlReference,
  type StyleReference,
  type ReferenceImage,
  type GenerationReferences,
  type ExtendedGenerationOptions,
} from './reference.types.js';

// Prompt Types (Extended format with references)
export {
  SimplePromptSchema,
  SingleReferenceSchema,
  ExtendedPromptSchema,
  PromptInputSchema,
  PromptsConfigSchema,
  isExtendedPrompt,
  hasReferences,
  getReferenceCount,
  getPromptText,
  getAllReferences,
  normalizePrompt,
  buildPromptLogSummary,
  type SimplePrompt,
  type SingleReference,
  type ExtendedPrompt,
  type PromptInput,
  type PromptsConfig,
} from './prompt.types.js';

