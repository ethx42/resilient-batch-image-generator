/**
 * Infrastructure Provisioner
 *
 * Handles first-run setup and validation.
 * Ensures all required directories, credentials, and APIs are ready.
 *
 * @module setup/provisioner
 */

import { resolve } from "node:path";
import type { EnvConfig } from "../types/index.js";
import { DEFAULTS } from "../types/index.js";
import {
  ensureDirectory,
  fileExists,
  safeReadJSON,
  atomicWriteJSON,
} from "../utils/index.js";
import { PromptsInputSchema, type JobsFile } from "../types/index.js";
import { validateCredentials } from "../adapters/index.js";
import { createChildLogger, defaultLogger } from "../config/index.js";
import type pino from "pino";

// =============================================================================
// Types
// =============================================================================

/**
 * Provisioning result.
 */
export interface ProvisioningResult {
  readonly directoriesCreated: string[];
  readonly jobsInitialized: boolean;
  readonly jobCount: number;
}

// =============================================================================
// Provisioner Implementation
// =============================================================================

/**
 * Infrastructure provisioner for first-run setup.
 *
 * Responsibilities:
 * - Create required directories (output, logs, config)
 * - Validate GCP credentials
 * - Initialize jobs.json from prompts if needed
 *
 * @example
 * ```typescript
 * const provisioner = new Provisioner(env);
 * const result = await provisioner.provision();
 * console.log(`Created ${result.directoriesCreated.length} directories`);
 * ```
 */
export class Provisioner {
  private readonly logger: pino.Logger;

  constructor(private readonly config: EnvConfig) {
    this.logger = createChildLogger(defaultLogger, {
      component: "Provisioner",
    });
  }

  /**
   * Run the full provisioning process.
   */
  async provision(): Promise<ProvisioningResult> {
    this.logger.info("Starting infrastructure provisioning...");

    // 1. Create directories
    const directoriesCreated = await this.ensureDirectories();

    // 2. Validate credentials
    await this.validateCredentials();

    // 3. Initialize jobs if needed
    const { initialized, count } = await this.initializeJobsIfNeeded();

    this.logger.info(
      {
        directoriesCreated: directoriesCreated.length,
        jobsInitialized: initialized,
        jobCount: count,
      },
      "Provisioning complete"
    );

    return {
      directoriesCreated,
      jobsInitialized: initialized,
      jobCount: count,
    };
  }

  // ---------------------------------------------------------------------------
  // Directory Setup
  // ---------------------------------------------------------------------------

  /**
   * Ensure all required directories exist.
   */
  private async ensureDirectories(): Promise<string[]> {
    const directories = [
      resolve(DEFAULTS.OUTPUT_DIR),
      resolve(DEFAULTS.LOGS_DIR),
      resolve("./config"),
    ];

    const created: string[] = [];

    for (const dir of directories) {
      this.logger.debug({ directory: dir }, "Ensuring directory exists");
      await ensureDirectory(dir);
      created.push(dir);
    }

    this.logger.info(
      { directories: created },
      "Directories verified/created"
    );

    return created;
  }

  // ---------------------------------------------------------------------------
  // Credential Validation
  // ---------------------------------------------------------------------------

  /**
   * Validate GCP credentials are available.
   */
  private async validateCredentials(): Promise<void> {
    this.logger.debug("Validating GCP credentials...");

    try {
      await validateCredentials();
      this.logger.info(
        { project: this.config.GOOGLE_CLOUD_PROJECT },
        "GCP credentials validated"
      );
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : error },
        "GCP credential validation failed"
      );
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Jobs Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initialize jobs.json from prompts file if it doesn't exist.
   */
  private async initializeJobsIfNeeded(): Promise<{
    initialized: boolean;
    count: number;
  }> {
    const jobsPath = resolve(DEFAULTS.JOBS_FILE);

    // Check if jobs.json already exists
    if (await fileExists(jobsPath)) {
      this.logger.debug("jobs.json already exists, skipping initialization");

      // Read to get count
      const existing = await safeReadJSON(jobsPath, PromptsInputSchema.or(
        // Also accept JobsFile format
        await import("../types/index.js").then((m) => m.JobsFileSchema)
      ));

      if (existing && "jobs" in existing) {
        return { initialized: false, count: (existing as JobsFile).jobs.length };
      }

      return { initialized: false, count: 0 };
    }

    // Load prompts
    const prompts = await this.loadPrompts();

    if (prompts.length === 0) {
      this.logger.warn(
        "No prompts found. Create config/prompts.json or jobs.json"
      );
      return { initialized: false, count: 0 };
    }

    // Create jobs.json
    const now = new Date().toISOString();
    const jobsFile: JobsFile = {
      version: DEFAULTS.JOBS_FILE_VERSION,
      jobs: prompts.map((prompt, index) => ({
        id: index + 1,
        prompt,
        status: "PENDING" as const,
        retries: 0,
        createdAt: now,
        updatedAt: now,
      })),
    };

    await atomicWriteJSON(jobsPath, jobsFile);

    this.logger.info(
      { jobCount: jobsFile.jobs.length, path: jobsPath },
      "Initialized jobs.json from prompts"
    );

    return { initialized: true, count: jobsFile.jobs.length };
  }

  /**
   * Load prompts from the prompts file.
   */
  private async loadPrompts(): Promise<string[]> {
    const promptsPath = resolve(DEFAULTS.PROMPTS_FILE);

    if (!(await fileExists(promptsPath))) {
      this.logger.debug({ path: promptsPath }, "Prompts file not found");
      return [];
    }

    try {
      const prompts = await safeReadJSON(promptsPath, PromptsInputSchema);
      return prompts ?? [];
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : error },
        "Failed to load prompts file"
      );
      return [];
    }
  }
}

