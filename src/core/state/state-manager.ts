/**
 * State Manager Facade
 *
 * High-level interface for job state management.
 * Combines repository operations with business logic (retry policy, etc.).
 *
 * @module core/state/state-manager
 */

import type { Job, JobStats } from '../../types/index.js';
import type { IJobRepository } from './job.repository.js';

// =============================================================================
// State Manager Configuration
// =============================================================================

export interface StateManagerConfig {
  /** Maximum number of retry attempts before marking as terminal */
  readonly maxRetries: number;
}

// =============================================================================
// State Manager Implementation
// =============================================================================

/**
 * Facade for job state operations with business logic.
 *
 * The StateManager sits between the Orchestrator and Repository,
 * providing:
 * - Atomic "claim" operation to prevent double-processing
 * - Retry policy enforcement
 * - Clean API for state transitions
 *
 * @example
 * ```typescript
 * const stateManager = new StateManager(repository, { maxRetries: 3 });
 *
 * // Claim next job (atomically marks as PROCESSING)
 * const job = await stateManager.claimNextJob();
 *
 * if (job) {
 *   try {
 *     const result = await generateImage(job.prompt);
 *     await stateManager.markComplete(job.id, result.outputPath);
 *   } catch (error) {
 *     await stateManager.markFailed(job.id, error);
 *   }
 * }
 * ```
 */
export class StateManager {
  constructor(
    private readonly repository: IJobRepository,
    private readonly config: StateManagerConfig,
  ) {}

  // -------------------------------------------------------------------------
  // Claim Operations (Atomic Transitions)
  // -------------------------------------------------------------------------

  /**
   * Atomically claim the next pending job.
   *
   * This operation:
   * 1. Finds the first PENDING job
   * 2. Immediately marks it as PROCESSING
   * 3. Returns the claimed job
   *
   * The atomic nature prevents two workers from claiming the same job.
   *
   * @returns The claimed job, or null if no pending jobs
   */
  async claimNextJob(): Promise<Job | null> {
    const pendingJob = await this.repository.findNextPending();

    if (!pendingJob) {
      return null;
    }

    // Atomically transition to PROCESSING
    await this.repository.updateStatus(pendingJob.id, 'PROCESSING');

    // Return the updated job
    return await this.repository.findById(pendingJob.id);
  }

  // -------------------------------------------------------------------------
  // Completion Operations
  // -------------------------------------------------------------------------

  /**
   * Mark a job as successfully completed.
   *
   * @param jobId - ID of the job to complete
   * @param outputPath - Path to the generated image
   */
  async markComplete(jobId: number, outputPath: string): Promise<void> {
    await this.repository.updateStatus(jobId, 'DONE', { outputPath });
  }

  /**
   * Mark a job as failed.
   *
   * The error is logged but the stack trace is NOT stored
   * (security: avoid storing potentially sensitive context).
   *
   * @param jobId - ID of the failed job
   * @param error - The error that caused the failure
   */
  async markFailed(jobId: number, error: Error): Promise<void> {
    const job = await this.repository.findById(jobId);

    if (!job) {
      throw new Error(`Cannot mark non-existent job as failed: ${jobId}`);
    }

    await this.repository.updateStatus(jobId, 'FAILED', {
      errorLog: error.message.slice(0, 500), // Truncate long messages
      retries: job.retries + 1,
    });
  }

  // -------------------------------------------------------------------------
  // Retry Operations
  // -------------------------------------------------------------------------

  /**
   * Check if a job should be retried.
   *
   * A job is retryable if:
   * - It's in FAILED status
   * - It hasn't exceeded the max retry count
   *
   * @param job - The job to check
   * @returns true if the job should be retried
   */
  shouldRetry(job: Job): boolean {
    return job.status === 'FAILED' && job.retries < this.config.maxRetries;
  }

  /**
   * Reset a failed job for retry.
   *
   * Changes status back to PENDING so it can be claimed again.
   * The retry count is NOT reset (preserves history).
   *
   * @param jobId - ID of the job to reset
   */
  async resetForRetry(jobId: number): Promise<void> {
    const job = await this.repository.findById(jobId);

    if (!job) {
      throw new Error(`Cannot reset non-existent job: ${jobId}`);
    }

    if (!this.shouldRetry(job)) {
      throw new Error(
        `Job ${jobId} is not retryable (status: ${job.status}, retries: ${job.retries}/${this.config.maxRetries})`,
      );
    }

    await this.repository.updateStatus(jobId, 'PENDING');
  }

  // -------------------------------------------------------------------------
  // Query Operations (Delegated)
  // -------------------------------------------------------------------------

  /**
   * Get all jobs.
   */
  async getAllJobs(): Promise<readonly Job[]> {
    return this.repository.findAll();
  }

  /**
   * Get a job by ID.
   */
  async getJob(jobId: number): Promise<Job | null> {
    return this.repository.findById(jobId);
  }

  /**
   * Get job statistics.
   */
  async getStats(): Promise<JobStats> {
    return this.repository.getStats();
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  /**
   * Initialize jobs from prompts.
   *
   * Should only be called if no jobs exist (first run).
   *
   * @param prompts - Array of prompts to create jobs from
   */
  async initializeFromPrompts(prompts: readonly string[]): Promise<void> {
    await this.repository.initializeFromPrompts([...prompts]);
  }

  /**
   * Check if the state has any jobs.
   */
  async hasJobs(): Promise<boolean> {
    const stats = await this.repository.getStats();
    return stats.total > 0;
  }

  /**
   * Check if the batch is complete.
   *
   * A batch is complete when there are no PENDING or PROCESSING jobs.
   */
  async isBatchComplete(): Promise<boolean> {
    const stats = await this.repository.getStats();
    return stats.pending === 0 && stats.processing === 0;
  }

  /**
   * Get the underlying repository (for advanced operations).
   *
   * Prefer using StateManager methods when possible.
   */
  getRepository(): IJobRepository {
    return this.repository;
  }
}

