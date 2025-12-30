/**
 * Core Module Barrel Export
 *
 * @module core
 */

// State Management
export {
  type IJobRepository,
  type JobCreateInput,
  JsonJobRepository,
  type StateManagerConfig,
  type JobAtomicUpdate,
  StateManager,
} from "./state/index.js";

// Events
export { EventBus } from "./events/index.js";

// Services
export {
  type ImageMetadata,
  ImagePersistenceService,
  type EditableConfig,
  ConfigService,
  type ReferenceLoaderConfig,
  type LoadedReference,
  ReferenceLoaderService,
} from "./services/index.js";

// Orchestrator
export { type OrchestratorStatus, Orchestrator } from "./orchestrator.js";

// Lifecycle
export {
  type ShutdownDependencies,
  setupGracefulShutdown,
} from "./lifecycle.js";

