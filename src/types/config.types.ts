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
  // Google AI (Gemini)
  // -------------------------------------------------------------------------

  /** Google AI API Key for Gemini models (optional, enables Nano Banana) */
  GOOGLE_AI_API_KEY: z.string().optional(),

  // -------------------------------------------------------------------------
  // Application
  // -------------------------------------------------------------------------

  /** Dashboard server port */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // -------------------------------------------------------------------------
  // Resilience
  // -------------------------------------------------------------------------

  /** Maximum retry attempts for failed jobs */
  MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

  /** Delay between API calls (rate limiting) in milliseconds */
  RATE_LIMIT_MS: z.coerce.number().int().min(0).max(60000).default(2000),

  // -------------------------------------------------------------------------
  // OpenAI (Optional - for benchmark comparison)
  // -------------------------------------------------------------------------

  /** OpenAI API Key (optional, enables DALL-E in benchmarks) */
  OPENAI_API_KEY: z.string().optional(),

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
  /** 
   * Getter for master aesthetic prompt.
   * Called dynamically on each generation to get the current value.
   */
  readonly getMasterAesthetic: () => string;
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
 * Available Vertex AI Imagen models for benchmarking.
 */
export const VERTEX_MODELS = {
  IMAGEN_3: {
    id: 'imagen-3.0-generate-001',
    name: 'Imagen 3',
    description: 'High quality, slower generation',
  },
  IMAGEN_3_FAST: {
    id: 'imagen-3.0-fast-generate-001',
    name: 'Imagen 3 Fast',
    description: 'Faster generation, slightly lower quality',
  },
  IMAGEN_3_CAPABILITY: {
    id: 'imagen-3.0-capability-001',
    name: 'Imagen 3 Controlled',
    description: 'Supports subject, control, and style references',
  },
} as const;

export type VertexModelKey = keyof typeof VERTEX_MODELS;
export type VertexModelId = (typeof VERTEX_MODELS)[VertexModelKey]['id'];

/**
 * Available OpenAI DALL-E models for benchmarking.
 */
export const OPENAI_MODELS = {
  DALLE_3: {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    description: 'Latest OpenAI image model, highest quality',
  },
  DALLE_2: {
    id: 'dall-e-2',
    name: 'DALL-E 2',
    description: 'Faster, lower cost, good quality',
  },
} as const;

export type OpenAIModelKey = keyof typeof OPENAI_MODELS;
export type OpenAIModelId = (typeof OPENAI_MODELS)[OpenAIModelKey]['id'];

/**
 * Configuration passed to the OpenAI adapter.
 */
export interface OpenAIConfig {
  readonly apiKey: string;
  /** 
   * Getter for master aesthetic prompt.
   * Called dynamically on each generation to get the current value.
   */
  readonly getMasterAesthetic: () => string;
}

// =============================================================================
// Gemini Configuration
// =============================================================================

/**
 * Available Google Gemini models for image generation.
 * 
 * These models use the Google Generative AI SDK (@google/genai) 
 * and support multimodal input including multiple reference images.
 */
export const GEMINI_MODELS = {
  GEMINI_FLASH_IMAGE: {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    description: 'Fast image generation with multimodal input support',
  },
  GEMINI_PRO_IMAGE: {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    description: 'Advanced image generation with enhanced visual precision',
  },
} as const;

export type GeminiModelKey = keyof typeof GEMINI_MODELS;
export type GeminiModelId = (typeof GEMINI_MODELS)[GeminiModelKey]['id'];

/**
 * Configuration passed to the Gemini adapter.
 */
export interface GeminiConfig {
  /** Google AI API Key */
  readonly apiKey: string;
  /** 
   * Getter for master aesthetic prompt.
   * Called dynamically on each generation to get the current value.
   */
  readonly getMasterAesthetic: () => string;
}

/**
 * All available models across providers.
 */
export const ALL_MODELS = {
  ...VERTEX_MODELS,
  ...OPENAI_MODELS,
  ...GEMINI_MODELS,
} as const;

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
  MODEL_ID: VERTEX_MODELS.IMAGEN_3.id,

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

  /** Benchmark output directory */
  BENCHMARK_DIR: './benchmark',
} as const;

export type Defaults = typeof DEFAULTS;

