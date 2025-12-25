/**
 * Batch Processing Orchestrator
 *
 * The main processing loop for image generation.
 * Coordinates state management, generation, persistence, and events.
 *
 * @module core/orchestrator
 */

import type { Job, OrchestratorConfig } from '../types/index.js';
import type { ImageGenerator } from '../adapters/index.js';
import { GeneratorError } from '../adapters/index.js';
import type { StateManager } from './state/index.js';
import type { EventBus } from './events/index.js';
import type { ImagePersistenceService } from './services/index.js';
import { createChildLogger, defaultLogger } from '../config/logger.js';
import type pino from 'pino';

// =============================================================================
// Orchestrator Implementation
// =============================================================================

/**
 * Orchestrator state for external inspection.
 */
export interface OrchestratorStatus {
  readonly isRunning: boolean;
  readonly currentJobId: number | null;
  readonly processedCount: number;
  readonly startTime: Date | null;
}

/**
 * Main batch processing orchestrator.
 *
 * Responsibilities:
 * - Claim and process pending jobs sequentially
 * - Coordinate image generation and persistence
 * - Emit SSE events for dashboard updates
 * - Handle errors with retry logic
 * - Respect rate limiting between API calls
 * - Support graceful shutdown
 *
 * @example
 * ```typescript
 * const orchestrator = new Orchestrator(
 *   stateManager,
 *   generator,
 *   imagePersistence,
 *   eventBus,
 *   { rateLimitMs: 2000, maxRetries: 3 },
 * );
 *
 * // Start processing
 * await orchestrator.start();
 *
 * // Or stop gracefully
 * await orchestrator.stop();
 * ```
 */
export class Orchestrator {
  private isRunning = false;
  private shouldStop = false;
  private currentJobId: number | null = null;
  private processedCount = 0;
  private startTime: Date | null = null;

  private readonly logger: pino.Logger;

  constructor(
    private readonly stateManager: StateManager,
    private readonly generator: ImageGenerator,
    private readonly imagePersistence: ImagePersistenceService,
    private readonly eventBus: EventBus,
    private readonly config: OrchestratorConfig,
  ) {
    this.logger = createChildLogger(defaultLogger, {
      component: 'Orchestrator',
      provider: generator.providerName,
      model: generator.modelId,
    });
  }

  /**
   * Start the batch processing loop.
   *
   * The loop continues until:
   * - All jobs are processed (DONE or terminal FAILED)
   * - stop() is called
   *
   * This method is idempotent - calling it while running has no effect.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Orchestrator already running');
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.processedCount = 0;
    this.startTime = new Date();

    this.logger.info(
      {
        rateLimitMs: this.config.rateLimitMs,
        maxRetries: this.config.maxRetries,
      },
      'Starting batch processing',
    );

    // Emit initial state to any connected clients
    await this.emitInitEvent();

    // Main processing loop
    while (!this.shouldStop) {
      const job = await this.stateManager.claimNextJob();

      if (!job) {
        // No more pending jobs
        await this.handleBatchComplete();
        break;
      }

      await this.processJob(job);

      // Rate limiting between jobs
      if (!this.shouldStop) {
        await this.sleep(this.config.rateLimitMs);
      }
    }

    this.isRunning = false;
    this.currentJobId = null;

    this.logger.info(
      {
        processedCount: this.processedCount,
        durationMs: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      },
      'Batch processing stopped',
    );
  }

  /**
   * Request graceful shutdown.
   *
   * The current job will complete before stopping.
   * This method returns immediately; the actual stop is asynchronous.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stop requested, will finish current job');
    this.shouldStop = true;
  }

  /**
   * Get current orchestrator status.
   */
  getStatus(): OrchestratorStatus {
    return {
      isRunning: this.isRunning,
      currentJobId: this.currentJobId,
      processedCount: this.processedCount,
      startTime: this.startTime,
    };
  }

  // ---------------------------------------------------------------------------
  // Job Processing
  // ---------------------------------------------------------------------------

  /**
   * Process a single job.
   */
  private async processJob(job: Job): Promise<void> {
    this.currentJobId = job.id;
    const startTime = performance.now();

    this.logger.info(
      {
        jobId: job.id,
        promptPreview: job.prompt.slice(0, 50) + (job.prompt.length > 50 ? '...' : ''),
        retries: job.retries,
      },
      'Processing job',
    );

    // Emit PROCESSING status (already set by claimNextJob, but notify clients)
    this.eventBus.emit({
      type: 'STATUS_UPDATE',
      payload: {
        jobId: job.id,
        status: 'PROCESSING',
        timestamp: new Date().toISOString(),
      },
    });

    try {
      // Generate image
      const result = await this.generator.generate(job.prompt);

      // Save to disk
      const outputPath = await this.imagePersistence.save(
        job.id,
        result.buffer,
        result.mimeType,
      );

      // Update state
      await this.stateManager.markComplete(job.id, outputPath);
      this.processedCount++;

      const duration = performance.now() - startTime;
      this.logger.info(
        {
          jobId: job.id,
          outputPath,
          durationMs: Math.round(duration),
        },
        'Job completed successfully',
      );

      // Emit success events
      this.eventBus.emit({
        type: 'STATUS_UPDATE',
        payload: {
          jobId: job.id,
          status: 'DONE',
          timestamp: new Date().toISOString(),
        },
      });

      this.eventBus.emit({
        type: 'IMAGE_READY',
        payload: {
          jobId: job.id,
          imageUrl: this.imagePersistence.getPublicUrl(outputPath),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      await this.handleJobError(job, error as Error, duration);
    }

    this.currentJobId = null;
  }

  /**
   * Handle a job error with retry logic.
   */
  private async handleJobError(job: Job, error: Error, durationMs: number): Promise<void> {
    const isRetryable = error instanceof GeneratorError && error.isRetryable;

    this.logger.error(
      {
        jobId: job.id,
        error: error.message,
        isRetryable,
        retries: job.retries,
        maxRetries: this.config.maxRetries,
        durationMs: Math.round(durationMs),
      },
      'Job failed',
    );

    // Mark as failed in state
    await this.stateManager.markFailed(job.id, error);

    // Emit failure event
    this.eventBus.emit({
      type: 'STATUS_UPDATE',
      payload: {
        jobId: job.id,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    });

    // Check if should retry
    // Need to fetch fresh job state since markFailed incremented retries
    const updatedJob = await this.stateManager.getJob(job.id);

    if (updatedJob && isRetryable && this.stateManager.shouldRetry(updatedJob)) {
      this.logger.info(
        {
          jobId: job.id,
          retryCount: updatedJob.retries,
          maxRetries: this.config.maxRetries,
        },
        'Scheduling job for retry',
      );

      await this.stateManager.resetForRetry(job.id);
    } else {
      this.logger.warn(
        {
          jobId: job.id,
          retries: updatedJob?.retries ?? job.retries + 1,
          reason: isRetryable ? 'max retries exceeded' : 'non-retryable error',
        },
        'Job will not be retried',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Event Emission
  // ---------------------------------------------------------------------------

  /**
   * Emit the INIT event with current state.
   */
  private async emitInitEvent(): Promise<void> {
    const jobs = await this.stateManager.getAllJobs();
    const stats = await this.stateManager.getStats();

    this.eventBus.emit({
      type: 'INIT',
      payload: { jobs, stats },
    });

    this.logger.debug(
      { jobCount: jobs.length, stats },
      'Emitted INIT event',
    );
  }

  /**
   * Handle batch completion.
   */
  private async handleBatchComplete(): Promise<void> {
    const stats = await this.stateManager.getStats();
    const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    this.logger.info(
      {
        stats,
        durationMs: duration,
        processedCount: this.processedCount,
      },
      'Batch processing complete',
    );

    this.eventBus.emit({
      type: 'BATCH_COMPLETE',
      payload: {
        stats,
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

