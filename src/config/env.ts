/**
 * Environment Configuration Loader
 *
 * Validates and loads all environment variables at startup.
 * Fail-fast: Invalid config causes immediate exit with clear error message.
 *
 * @module config/env
 */

import { EnvSchema, type EnvConfig } from '../types/index.js';
import { defaultLogger } from './logger.js';

// =============================================================================
// Environment Loader
// =============================================================================

/**
 * Load and validate environment configuration.
 *
 * This function:
 * 1. Reads all environment variables
 * 2. Validates against the EnvSchema
 * 3. Returns the typed configuration
 *
 * @throws {Error} If validation fails (with detailed Zod error)
 */
export function loadEnvConfig(): EnvConfig {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((e) => {
      const path = e.path.join('.');
      return `  - ${path}: ${e.message}`;
    }).join('\n');

    defaultLogger.fatal(
      { errors: result.error.errors },
      'Environment validation failed',
    );

    throw new Error(
      `Invalid environment configuration:\n${errors}\n\nSee .env.example for required variables.`,
    );
  }

  return result.data;
}

// =============================================================================
// Lazy Singleton
// =============================================================================

let cachedEnv: EnvConfig | null = null;

/**
 * Get the validated environment configuration.
 *
 * Caches the result after first load to avoid repeated validation.
 */
export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = loadEnvConfig();
  }
  return cachedEnv;
}

/**
 * Reset the cached environment (for testing).
 */
export function resetEnvCache(): void {
  cachedEnv = null;
}

