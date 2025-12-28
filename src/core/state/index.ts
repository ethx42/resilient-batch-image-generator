/**
 * State Management Barrel Export
 *
 * @module core/state
 */

export {
  type IJobRepository,
  type JobCreateInput,
  JsonJobRepository,
} from './job.repository.js';

export {
  type StateManagerConfig,
  type JobAtomicUpdate,
  StateManager,
} from './state-manager.js';

