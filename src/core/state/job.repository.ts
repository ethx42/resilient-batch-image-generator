/**
 * Job Repository Implementation
 *
 * Provides CRUD operations for job persistence using JSON file storage.
 * All mutations are atomic to prevent state corruption.
 *
 * @module core/state/job.repository
 */

import type { Job, JobsFile, JobStatus, JobStats, PromptsInput } from '../../types/index.js';
import { JobsFileSchema } from '../../types/index.js';
import { DEFAULTS } from '../../types/config.types.js';
import { atomicWriteJSON, safeReadJSON, StateCorruptionError } from '../../utils/index.js';

// =============================================================================
// Repository Interface
// =============================================================================

/**
 * Interface for job persistence operations.
 *
 * Following the Repository pattern, this abstracts the persistence mechanism.
 * The implementation uses JSON files, but could be swapped for a database.
 */
export interface IJobRepository {
  // -------------------------------------------------------------------------
  // Query Operations
  // -------------------------------------------------------------------------

  /**
   * Get all jobs.
   */
  findAll(): Promise<readonly Job[]>;

  /**
   * Get a job by ID.
   */
  findById(id: number): Promise<Job | null>;

  /**
   * Get all jobs with a specific status.
   */
  findByStatus(status: JobStatus): Promise<readonly Job[]>;

  /**
   * Get the next pending job (lowest ID first).
   * Used by the orchestrator to claim work.
   */
  findNextPending(): Promise<Job | null>;

  // -------------------------------------------------------------------------
  // Mutation Operations
  // -------------------------------------------------------------------------

  /**
   * Save a job (insert or update).
   */
  save(job: Job): Promise<void>;

  /**
   * Update a job's status and optional metadata.
   */
  updateStatus(
    id: number,
    status: JobStatus,
    metadata?: Partial<Pick<Job, 'outputPath' | 'errorLog' | 'retries'>>,
  ): Promise<void>;

  // -------------------------------------------------------------------------
  // Batch Operations
  // -------------------------------------------------------------------------

  /**
   * Initialize the repository from a list of prompts.
   * Creates new PENDING jobs for each prompt.
   */
  initializeFromPrompts(prompts: PromptsInput): Promise<void>;

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  /**
   * Get aggregated job statistics.
   */
  getStats(): Promise<JobStats>;
}

// =============================================================================
// JSON File Implementation
// =============================================================================

/**
 * JSON file-based job repository.
 *
 * Implements atomic writes to prevent corruption during crashes.
 * Uses in-memory caching for efficient reads.
 */
export class JsonJobRepository implements IJobRepository {
  /** In-memory cache of jobs */
  private cache: JobsFile | null = null;

  /** Lock flag to prevent concurrent writes */
  private isWriting = false;

  constructor(private readonly filePath: string) {}

  // -------------------------------------------------------------------------
  // Query Operations
  // -------------------------------------------------------------------------

  async findAll(): Promise<readonly Job[]> {
    const state = await this.loadState();
    return state.jobs;
  }

  async findById(id: number): Promise<Job | null> {
    const state = await this.loadState();
    return state.jobs.find((job) => job.id === id) ?? null;
  }

  async findByStatus(status: JobStatus): Promise<readonly Job[]> {
    const state = await this.loadState();
    return state.jobs.filter((job) => job.status === status);
  }

  async findNextPending(): Promise<Job | null> {
    const state = await this.loadState();

    // Find the first PENDING job (sorted by ID)
    const pending = state.jobs
      .filter((job) => job.status === 'PENDING')
      .sort((a, b) => a.id - b.id);

    return pending[0] ?? null;
  }

  // -------------------------------------------------------------------------
  // Mutation Operations
  // -------------------------------------------------------------------------

  async save(job: Job): Promise<void> {
    await this.mutateState((state) => {
      const index = state.jobs.findIndex((j) => j.id === job.id);

      if (index >= 0) {
        // Update existing job
        state.jobs[index] = job;
      } else {
        // Insert new job
        state.jobs.push(job);
      }
    });
  }

  async updateStatus(
    id: number,
    status: JobStatus,
    metadata?: Partial<Pick<Job, 'outputPath' | 'errorLog' | 'retries'>>,
  ): Promise<void> {
    await this.mutateState((state) => {
      const job = state.jobs.find((j) => j.id === id);

      if (!job) {
        throw new Error(`Job not found: ${id}`);
      }

      // Update status and timestamp
      job.status = status;
      job.updatedAt = new Date().toISOString();

      // Apply optional metadata
      if (metadata?.outputPath !== undefined) {
        job.outputPath = metadata.outputPath;
      }
      if (metadata?.errorLog !== undefined) {
        job.errorLog = metadata.errorLog;
      }
      if (metadata?.retries !== undefined) {
        job.retries = metadata.retries;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Batch Operations
  // -------------------------------------------------------------------------

  async initializeFromPrompts(prompts: PromptsInput): Promise<void> {
    const now = new Date().toISOString();

    const jobs: Job[] = prompts.map((prompt, index) => ({
      id: index + 1, // 1-indexed
      prompt,
      status: 'PENDING' as const,
      retries: 0,
      createdAt: now,
      updatedAt: now,
    }));

    const state: JobsFile = {
      version: DEFAULTS.JOBS_FILE_VERSION,
      jobs,
    };

    await this.writeState(state);
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  async getStats(): Promise<JobStats> {
    const state = await this.loadState();

    const stats: JobStats = {
      pending: 0,
      processing: 0,
      done: 0,
      failed: 0,
      total: state.jobs.length,
    };

    for (const job of state.jobs) {
      switch (job.status) {
        case 'PENDING':
          stats.pending++;
          break;
        case 'PROCESSING':
          stats.processing++;
          break;
        case 'DONE':
          stats.done++;
          break;
        case 'FAILED':
          stats.failed++;
          break;
      }
    }

    return stats;
  }

  // -------------------------------------------------------------------------
  // Internal State Management
  // -------------------------------------------------------------------------

  /**
   * Load state from disk, using cache if available.
   */
  private async loadState(): Promise<JobsFile> {
    // Return cached state if available
    if (this.cache) {
      return this.cache;
    }

    // Read from disk
    const state = await safeReadJSON(this.filePath, JobsFileSchema);

    if (state === null) {
      // First run - return empty state
      const emptyState: JobsFile = {
        version: DEFAULTS.JOBS_FILE_VERSION,
        jobs: [],
      };
      this.cache = emptyState;
      return emptyState;
    }

    this.cache = state;
    return state;
  }

  /**
   * Apply a mutation to the state and persist atomically.
   *
   * Uses a simple lock to prevent concurrent writes.
   * In a multi-process scenario, file locking would be needed.
   */
  private async mutateState(mutator: (state: JobsFile) => void): Promise<void> {
    // Simple concurrency guard
    if (this.isWriting) {
      throw new StateCorruptionError(
        this.filePath,
        'Concurrent write attempted - this should not happen in single-process mode',
      );
    }

    this.isWriting = true;

    try {
      const state = await this.loadState();

      // Create a mutable copy for the mutator
      // Explicitly copy all fields to satisfy strict types
      const mutableState: JobsFile = {
        version: state.version,
        jobs: state.jobs.map((job) => ({
          id: job.id,
          prompt: job.prompt,
          status: job.status,
          outputPath: job.outputPath,
          retries: job.retries,
          errorLog: job.errorLog,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        })),
      };

      // Apply mutation
      mutator(mutableState);

      // Persist atomically
      await this.writeState(mutableState);
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Write state to disk atomically and update cache.
   */
  private async writeState(state: JobsFile): Promise<void> {
    await atomicWriteJSON(this.filePath, state);
    this.cache = state;
  }

  /**
   * Invalidate the cache, forcing a fresh read on next access.
   * Useful for testing or recovering from external modifications.
   */
  invalidateCache(): void {
    this.cache = null;
  }
}

