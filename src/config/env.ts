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
 * Parse command line arguments for environment overrides.
 * Supports --port <number> to override PORT environment variable.
 */
function parseCommandLineArgs(): Partial<Record<string, string>> {
  const overrides: Partial<Record<string, string>> = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
      overrides.PORT = args[i + 1];
      i++; // Skip next argument as it's the value
    }
  }

  return overrides;
}

/**
 * Load and validate environment configuration.
 *
 * This function:
 * 1. Reads all environment variables
 * 2. Applies command line argument overrides (e.g., --port)
 * 3. Validates against the EnvSchema
 * 4. Returns the typed configuration
 *
 * @throws {Error} If validation fails (with detailed Zod error)
 */
export function loadEnvConfig(): EnvConfig {
  // Parse command line arguments for overrides
  const cliOverrides = parseCommandLineArgs();
  
  // Merge environment variables with CLI overrides (CLI takes precedence)
  const envWithOverrides = { ...process.env, ...cliOverrides };
  
  const result = EnvSchema.safeParse(envWithOverrides);

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



