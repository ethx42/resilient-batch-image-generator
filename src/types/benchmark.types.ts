/**
 * Benchmark Types
 *
 * Defines interfaces for benchmark results and comparison data.
 *
 * @module types/benchmark
 */

import { z } from 'zod';

// =============================================================================
// Benchmark Result Types
// =============================================================================

/**
 * Result of a single image generation in a benchmark.
 */
export interface BenchmarkGenerationResult {
  /** Prompt index (0-based) */
  promptIndex: number;

  /** The prompt used */
  prompt: string;

  /** Whether generation succeeded */
  success: boolean;

  /** Time taken in milliseconds */
  durationMs: number;

  /** Output file path (if successful) */
  outputPath?: string;

  /** Error message (if failed) */
  error?: string;

  /** Timestamp of generation */
  timestamp: string;
}

/**
 * Aggregated statistics for a model's benchmark run.
 */
export interface BenchmarkModelStats {
  /** Model identifier */
  modelId: string;

  /** Human-readable model name */
  modelName: string;

  /** Total prompts attempted */
  totalPrompts: number;

  /** Successful generations */
  successCount: number;

  /** Failed generations */
  failureCount: number;

  /** Success rate as percentage */
  successRate: number;

  /** Timing statistics in milliseconds */
  timing: {
    /** Minimum duration */
    min: number;
    /** Maximum duration */
    max: number;
    /** Mean duration */
    mean: number;
    /** Median duration (P50) */
    p50: number;
    /** 95th percentile */
    p95: number;
    /** 99th percentile */
    p99: number;
    /** Total time for all generations */
    total: number;
  };

  /** Individual generation results */
  results: BenchmarkGenerationResult[];
}

/**
 * Complete benchmark run results.
 */
export interface BenchmarkReport {
  /** Benchmark run identifier */
  runId: string;

  /** When the benchmark started */
  startedAt: string;

  /** When the benchmark completed */
  completedAt: string;

  /** Total duration in milliseconds */
  totalDurationMs: number;

  /** Configuration used */
  config: {
    promptCount: number;
    aspectRatio: string;
    models: string[];
  };

  /** Results per model */
  models: BenchmarkModelStats[];
}

// =============================================================================
// Benchmark Configuration
// =============================================================================

/**
 * Configuration for a benchmark run.
 */
export const BenchmarkConfigSchema = z.object({
  /** Number of prompts to use (from config/prompts.json) */
  promptCount: z.number().int().min(1).max(32).default(5),

  /** Models to benchmark (model IDs) */
  models: z.array(z.string()).min(1),

  /** Delay between generations (rate limiting) */
  delayMs: z.number().int().min(0).default(2000),

  /** Aspect ratio for generated images */
  aspectRatio: z.string().default('1:1'),
});

export type BenchmarkConfig = z.infer<typeof BenchmarkConfigSchema>;




