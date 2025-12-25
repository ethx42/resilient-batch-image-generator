/**
 * Configuration Types & Environment Schema
 *
 * Validates all environment variables at startup.
 * Fail-fast principle: Invalid config = immediate exit with clear message.
 *
 * @module types/config
 */

import { z } from 'zod';

// =============================================================================
// Environment Schema (Validated at Startup)
// =============================================================================

/**
 * Complete environment configuration schema.
 *
 * All external configuration enters the system through this schema.
 * This is the ONLY place where process.env should be accessed.
 */
export const EnvSchema = z.object({
  // -------------------------------------------------------------------------
  // Google Cloud Platform
  // -------------------------------------------------------------------------

  /** GCP Project ID (required) */
  GOOGLE_CLOUD_PROJECT: z.string().min(1, 'GCP project ID is required'),

  /** GCP Region for Vertex AI */
  GOOGLE_CLOUD_LOCATION: z.string().default('us-central1'),

  /** Path to service account key (optional, uses ADC if not set) */
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // -------------------------------------------------------------------------
  // Application
  // -------------------------------------------------------------------------

  /** Dashboard server port */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  /** Master aesthetic prompt prepended to all generations */
  MASTER_AESTHETIC_PROMPT: z.string().default(''),

  // -------------------------------------------------------------------------
  // Resilience
  // -------------------------------------------------------------------------

  /** Maximum retry attempts for failed jobs */
  MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

  /** Delay between API calls (rate limiting) in milliseconds */
  RATE_LIMIT_MS: z.coerce.number().int().min(0).max(60000).default(2000),

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------

  /** Pino log level */
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

// =============================================================================
// Vertex AI Configuration (Derived from Env)
// =============================================================================

/**
 * Configuration passed to the Vertex AI adapter.
 */
export interface VertexConfig {
  readonly projectId: string;
  readonly location: string;
  readonly masterAesthetic: string;
}

// =============================================================================
// Orchestrator Configuration
// =============================================================================

/**
 * Configuration for the batch processing orchestrator.
 */
export interface OrchestratorConfig {
  readonly rateLimitMs: number;
  readonly maxRetries: number;
}

// =============================================================================
// Server Configuration
// =============================================================================

/**
 * Configuration for the Fastify server.
 */
export interface ServerConfig {
  readonly port: number;
  readonly outputDir: string;
  readonly logLevel: string;
}

// =============================================================================
// Application Defaults (Immutable Constants)
// =============================================================================

/**
 * Default values that are NOT configurable via environment.
 * These are architectural constants.
 */
export const DEFAULTS = {
  /** Current jobs.json schema version */
  JOBS_FILE_VERSION: '2.1.0',

  /** Default aspect ratio for generated images */
  ASPECT_RATIO: '1:1' as const,

  /** Default safety filter level */
  SAFETY_FILTER: 'block_some' as const,

  /** Target number of images to generate */
  TOTAL_IMAGES: 32,

  /** Imagen 3 model identifier */
  MODEL_ID: 'imagen-3.0-generate-001',

  /** Output directory for generated images */
  OUTPUT_DIR: './output',

  /** Logs directory */
  LOGS_DIR: './logs',

  /** Jobs file path */
  JOBS_FILE: './jobs.json',

  /** Prompts file path */
  PROMPTS_FILE: './config/prompts.json',

  /** SSE heartbeat interval in milliseconds */
  HEARTBEAT_INTERVAL_MS: 30000,

  /** Graceful shutdown timeout in milliseconds */
  SHUTDOWN_TIMEOUT_MS: 30000,
} as const;

export type Defaults = typeof DEFAULTS;

