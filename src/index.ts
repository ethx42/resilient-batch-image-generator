/**
 * RBIG - Resilient Batch Image Generator
 *
 * Main entry point that wires all dependencies and starts the application.
 *
 * Flow:
 * 1. Provision infrastructure (directories, credentials)
 * 2. Initialize dependencies (state, generator, events)
 * 3. Start HTTP server with dashboard
 * 4. Setup graceful shutdown handlers
 * 5. Start batch processing
 *
 * @module index
 */

import { resolve } from "node:path";
import { DEFAULTS } from "./types/index.js";
import { getEnv } from "./config/index.js";
import { createLogger, createChildLogger } from "./config/index.js";
import { Provisioner } from "./setup/index.js";
import {
  JsonJobRepository,
  StateManager,
  EventBus,
  ImagePersistenceService,
  Orchestrator,
  setupGracefulShutdown,
} from "./core/index.js";
import { GeneratorFactory } from "./adapters/index.js";
import { createApp } from "./server/index.js";

// =============================================================================
// Main Application
// =============================================================================

async function main(): Promise<void> {
  // ---------------------------------------------------------------------------
  // 1. Load Configuration
  // ---------------------------------------------------------------------------

  const env = getEnv();

  const logger = createLogger({
    level: env.LOG_LEVEL,
    prettyPrint: process.env["NODE_ENV"] !== "production",
  });

  const appLogger = createChildLogger(logger, { component: "Main" });

  appLogger.info(
    {
      version: DEFAULTS.JOBS_FILE_VERSION,
      project: env.GOOGLE_CLOUD_PROJECT,
      location: env.GOOGLE_CLOUD_LOCATION,
    },
    "Starting RBIG - Resilient Batch Image Generator"
  );

  // ---------------------------------------------------------------------------
  // 2. Provision Infrastructure
  // ---------------------------------------------------------------------------

  const provisioner = new Provisioner(env);
  const provisionResult = await provisioner.provision();

  appLogger.info(
    {
      directoriesCreated: provisionResult.directoriesCreated.length,
      jobsInitialized: provisionResult.jobsInitialized,
      jobCount: provisionResult.jobCount,
    },
    "Infrastructure provisioned"
  );

  // ---------------------------------------------------------------------------
  // 3. Initialize Dependencies
  // ---------------------------------------------------------------------------

  // Event bus for SSE
  const eventBus = new EventBus();

  // State management
  const repository = new JsonJobRepository(resolve(DEFAULTS.JOBS_FILE));
  const stateManager = new StateManager(repository, {
    maxRetries: env.MAX_RETRIES,
  });

  // Check if we have jobs to process
  const hasJobs = await stateManager.hasJobs();
  if (!hasJobs) {
    appLogger.warn(
      "No jobs to process. Create config/prompts.json with an array of prompts."
    );
    appLogger.info("Example: [\"A sunset over mountains\", \"A cat in space\"]");
    process.exit(0);
  }

  // Image generator (Vertex AI or Mock based on env)
  const useMock = process.env["USE_MOCK_GENERATOR"] === "true";
  const generator = GeneratorFactory.create(
    useMock ? "mock" : "vertex-imagen3",
    env
  );

  appLogger.info(
    { provider: generator.providerName, model: generator.modelId },
    "Image generator initialized"
  );

  // Image persistence
  const imagePersistence = new ImagePersistenceService(
    resolve(DEFAULTS.OUTPUT_DIR)
  );

  // Orchestrator
  const orchestrator = new Orchestrator(
    stateManager,
    generator,
    imagePersistence,
    eventBus,
    {
      rateLimitMs: env.RATE_LIMIT_MS,
      maxRetries: env.MAX_RETRIES,
    }
  );

  // ---------------------------------------------------------------------------
  // 4. Start HTTP Server
  // ---------------------------------------------------------------------------

  const server = await createApp(
    {
      port: env.PORT,
      outputDir: resolve(DEFAULTS.OUTPUT_DIR),
      logLevel: env.LOG_LEVEL,
    },
    {
      eventBus,
      stateManager,
    }
  );

  await server.listen({ port: env.PORT, host: "0.0.0.0" });

  appLogger.info(
    { port: env.PORT, dashboard: `http://localhost:${env.PORT}` },
    "Dashboard server started"
  );

  // ---------------------------------------------------------------------------
  // 5. Setup Graceful Shutdown
  // ---------------------------------------------------------------------------

  setupGracefulShutdown({ orchestrator, server });

  // ---------------------------------------------------------------------------
  // 6. Start Batch Processing
  // ---------------------------------------------------------------------------

  const stats = await stateManager.getStats();
  appLogger.info(
    {
      pending: stats.pending,
      processing: stats.processing,
      done: stats.done,
      failed: stats.failed,
      total: stats.total,
    },
    "Starting batch processing"
  );

  await orchestrator.start();

  // ---------------------------------------------------------------------------
  // 7. Completion
  // ---------------------------------------------------------------------------

  const finalStats = await stateManager.getStats();
  appLogger.info(
    {
      completed: finalStats.done,
      failed: finalStats.failed,
      total: finalStats.total,
    },
    "Batch processing complete!"
  );

  // Give SSE clients time to receive final events
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Clean exit
  appLogger.info("Shutting down...");
  await server.close();
  process.exit(0);
}

// =============================================================================
// Entry Point
// =============================================================================

main().catch((error) => {
  console.error("Fatal error during startup:", error);
  process.exit(1);
});
