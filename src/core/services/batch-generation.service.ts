/**
 * Batch Generation Service
 *
 * Provides parallel image generation with controlled concurrency.
 * Useful for processing multiple prompts efficiently while respecting
 * rate limits and avoiding API overload.
 *
 * Features:
 * - Configurable concurrency (number of parallel requests)
 * - Per-request rate limiting
 * - Progress callbacks for UI updates
 * - Error isolation (one failure doesn't stop others)
 * - Results aggregation
 *
 * @module core/services/batch-generation
 */

import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type { ImageGenerator, GenerationResult, GenerationOptions } from '../../adapters/generator.interface.js';
import type pino from 'pino';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for batch generation.
 */
export interface BatchGenerationConfig {
  /** Number of concurrent requests (default: 3) */
  readonly concurrency?: number;
  /** Delay between starting each request in ms (default: 500) */
  readonly staggerDelayMs?: number;
  /** Maximum retries per prompt (default: 2) */
  readonly maxRetries?: number;
  /** Timeout per request in ms (default: 120000 = 2 min) */
  readonly timeoutMs?: number;
}

/**
 * A single prompt with optional generation options.
 */
export interface BatchPrompt {
  readonly text: string;
  readonly options?: GenerationOptions;
}

/**
 * Result of a single batch item.
 */
export interface BatchItemResult {
  readonly index: number;
  readonly prompt: string;
  readonly success: boolean;
  readonly result?: GenerationResult;
  readonly error?: string;
  readonly durationMs: number;
  readonly attempts: number;
}

/**
 * Complete batch generation result.
 */
export interface BatchGenerationResult {
  readonly totalPrompts: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalDurationMs: number;
  readonly averageDurationMs: number;
  readonly results: BatchItemResult[];
}

/**
 * Progress callback for batch generation.
 */
export type BatchProgressCallback = (progress: {
  completed: number;
  total: number;
  current: string;
  successCount: number;
  failureCount: number;
}) => void;

// =============================================================================
// Service Implementation
// =============================================================================

const DEFAULT_CONFIG: Required<BatchGenerationConfig> = {
  concurrency: 3,
  staggerDelayMs: 500,
  maxRetries: 2,
  timeoutMs: 120000,
};

/**
 * Batch Generation Service.
 *
 * Enables parallel processing of multiple prompts with controlled concurrency.
 *
 * @example
 * ```typescript
 * const batchService = new BatchGenerationService(generator, {
 *   concurrency: 5,
 *   staggerDelayMs: 300,
 * });
 *
 * const result = await batchService.generateBatch(prompts, (progress) => {
 *   console.log(`${progress.completed}/${progress.total} completed`);
 * });
 *
 * console.log(`Success rate: ${result.successCount}/${result.totalPrompts}`);
 * ```
 */
export class BatchGenerationService {
  private readonly config: Required<BatchGenerationConfig>;
  private readonly logger: pino.Logger;

  constructor(
    private readonly generator: ImageGenerator,
    config?: BatchGenerationConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createChildLogger(defaultLogger, {
      component: 'BatchGenerationService',
      model: generator.modelId,
      concurrency: this.config.concurrency,
    });
  }

  /**
   * Generate images for multiple prompts in parallel.
   *
   * @param prompts - Array of prompts to process
   * @param onProgress - Optional callback for progress updates
   * @returns Aggregated results
   */
  async generateBatch(
    prompts: BatchPrompt[],
    onProgress?: BatchProgressCallback,
  ): Promise<BatchGenerationResult> {
    const startTime = performance.now();
    const results: BatchItemResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    this.logger.info(
      {
        promptCount: prompts.length,
        concurrency: this.config.concurrency,
        staggerDelayMs: this.config.staggerDelayMs,
      },
      '🚀 Starting batch generation',
    );

    // Create a pool of work items
    const workItems = prompts.map((prompt, index) => ({
      index,
      prompt,
    }));

    // Process with controlled concurrency
    const workers: Promise<void>[] = [];
    let currentIndex = 0;
    const lock = { processing: 0 };

    const processNext = async (): Promise<void> => {
      while (currentIndex < workItems.length) {
        // Check if we can start a new request
        if (lock.processing >= this.config.concurrency) {
          await this.sleep(100); // Wait for a slot
          continue;
        }

        const item = workItems[currentIndex];
        if (!item) break;
        
        currentIndex++;
        lock.processing++;

        // Stagger delay to avoid burst requests
        if (currentIndex > 1) {
          await this.sleep(this.config.staggerDelayMs);
        }

        // Process this item
        try {
          const itemResult = await this.processItem(item.index, item.prompt);
          results.push(itemResult);

          if (itemResult.success) {
            successCount++;
          } else {
            failureCount++;
          }

          // Report progress
          onProgress?.({
            completed: results.length,
            total: prompts.length,
            current: item.prompt.text,
            successCount,
            failureCount,
          });
        } finally {
          lock.processing--;
        }
      }
    };

    // Start workers
    for (let i = 0; i < this.config.concurrency; i++) {
      workers.push(processNext());
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    // Sort results by original index
    results.sort((a, b) => a.index - b.index);

    const totalDurationMs = performance.now() - startTime;
    const successfulResults = results.filter((r) => r.success);
    const averageDurationMs = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.durationMs, 0) / successfulResults.length
      : 0;

    this.logger.info(
      {
        totalPrompts: prompts.length,
        successCount,
        failureCount,
        totalDurationMs: Math.round(totalDurationMs),
        averageDurationMs: Math.round(averageDurationMs),
        successRate: `${Math.round((successCount / prompts.length) * 100)}%`,
      },
      '✅ Batch generation completed',
    );

    return {
      totalPrompts: prompts.length,
      successCount,
      failureCount,
      totalDurationMs: Math.round(totalDurationMs),
      averageDurationMs: Math.round(averageDurationMs),
      results,
    };
  }

  /**
   * Process a single item with retries.
   */
  private async processItem(
    index: number,
    prompt: BatchPrompt,
  ): Promise<BatchItemResult> {
    const startTime = performance.now();
    let lastError: string | undefined;
    let attempts = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      attempts++;

      try {
        // Create timeout wrapper
        const result = await this.withTimeout(
          this.generator.generate(prompt.text, prompt.options),
          this.config.timeoutMs,
        );

        const durationMs = Math.round(performance.now() - startTime);

        this.logger.debug(
          { index, attempts, durationMs },
          `Generated image ${index + 1}`,
        );

        return {
          index,
          prompt: prompt.text,
          success: true,
          result,
          durationMs,
          attempts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        this.logger.warn(
          { index, attempt: attempt + 1, maxRetries: this.config.maxRetries, error: lastError },
          `Generation attempt failed`,
        );

        // Don't retry on non-retryable errors
        if (this.isNonRetryableError(lastError)) {
          break;
        }

        // Wait before retry with exponential backoff
        if (attempt < this.config.maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    const failedResult: BatchItemResult = {
      index,
      prompt: prompt.text,
      success: false,
      durationMs,
      attempts,
    };

    if (lastError) {
      (failedResult as { error: string }).error = lastError;
    }

    return failedResult;
  }

  /**
   * Wrap a promise with a timeout.
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Check if an error is non-retryable.
   */
  private isNonRetryableError(error: string): boolean {
    const nonRetryablePatterns = [
      'safety',
      'blocked',
      'invalid',
      'authentication',
      'permission',
      'not found',
    ];

    const lowerError = error.toLowerCase();
    return nonRetryablePatterns.some((pattern) => lowerError.includes(pattern));
  }

  /**
   * Sleep utility.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

