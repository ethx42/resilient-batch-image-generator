/**
 * Job Domain Types & Zod Schemas
 *
 * Defines the core data structures for job state management.
 * All external data (file reads, API responses) MUST be validated
 * against these schemas at system boundaries.
 *
 * @module types/job
 */

import { z } from 'zod';
import { GenerationReferencesSchema } from './reference.types.js';

// =============================================================================
// Job Status (State Machine)
// =============================================================================

/**
 * Job lifecycle states following the state machine:
 *
 * ```
 * PENDING → PROCESSING → DONE
 *               ↓
 *            FAILED (retries < MAX) → PENDING
 *            FAILED (retries >= MAX) → Terminal
 * ```
 */
export const JobStatusSchema = z.enum(['PENDING', 'PROCESSING', 'DONE', 'FAILED']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

// =============================================================================
// Job Entity
// =============================================================================

/**
 * Core job entity representing a single image generation task.
 *
 * Immutability Note: While this schema allows mutations, the StateManager
 * enforces immutable update patterns via atomic writes.
 */
export const JobSchema = z.object({
  /** Unique identifier (1-indexed, sequential) */
  id: z.number().int().positive(),

  /** The prompt to send to the image generation API */
  prompt: z.string().min(1).max(2000),

  /** Current lifecycle state */
  status: JobStatusSchema,

  /** Absolute path to generated image (set when DONE) */
  outputPath: z.string().optional(),

  /** Number of retry attempts made (always initialized to 0) */
  retries: z.number().int().min(0),

  /** Last error message (set when FAILED) */
  errorLog: z.string().optional(),

  /** ISO 8601 timestamp of job creation */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last state change */
  updatedAt: z.string().datetime(),

  /**
   * Optional reference images for controlled generation.
   *
   * When present, enables Structure-Conditioned Style Transfer:
   * - Subject Reference: Maintain product/person identity
   * - Control Reference: Structure from edges/sketches
   * - Style Reference: Visual style from reference image
   *
   * The system automatically uses imagen-3.0-capability-001 when present.
   */
  references: GenerationReferencesSchema.optional(),
});

export type Job = z.infer<typeof JobSchema>;

// =============================================================================
// Jobs File (Persistence Format)
// =============================================================================

/**
 * Root structure of the jobs.json file.
 * Version field enables future schema migrations.
 */
export const JobsFileSchema = z.object({
  /** Schema version for future migrations */
  version: z.string(),

  /** Array of all jobs */
  jobs: z.array(JobSchema),
});

export type JobsFile = z.infer<typeof JobsFileSchema>;

// =============================================================================
// Job Statistics
// =============================================================================

/**
 * Aggregated statistics for dashboard display.
 */
export const JobStatsSchema = z.object({
  pending: z.number().int().min(0),
  processing: z.number().int().min(0),
  done: z.number().int().min(0),
  failed: z.number().int().min(0),
  total: z.number().int().min(0),
});

export type JobStats = z.infer<typeof JobStatsSchema>;

// =============================================================================
// Input Schemas (for creating new jobs)
// =============================================================================

/**
 * Schema for initializing jobs from a list of prompts.
 * Used during first-run setup.
 */
export const PromptsInputSchema = z.array(z.string().min(1).max(2000)).min(1);
export type PromptsInput = z.infer<typeof PromptsInputSchema>;

// =============================================================================
// Update Schemas (for partial updates)
// =============================================================================

/**
 * Allowed fields for job updates.
 * Prevents accidental modification of immutable fields (id, createdAt).
 */
export const JobUpdateSchema = z.object({
  status: JobStatusSchema.optional(),
  outputPath: z.string().optional(),
  retries: z.number().int().min(0).optional(),
  errorLog: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type JobUpdate = z.infer<typeof JobUpdateSchema>;

