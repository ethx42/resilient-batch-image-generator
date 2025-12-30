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
  ConfigService,
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

  // Config service (editable prompts and aesthetic from config files)
  const configService = new ConfigService();
  await configService.initialize();

  appLogger.info(
    { promptCount: configService.getPrompts().length },
    "Configuration loaded"
  );

  // State management
  const repository = new JsonJobRepository(resolve(DEFAULTS.JOBS_FILE));
  const stateManager = new StateManager(repository, {
    maxRetries: env.MAX_RETRIES,
  });

  // Initialize jobs from prompts if needed
  const hasJobs = await stateManager.hasJobs();
  if (!hasJobs) {
    const prompts = configService.getPrompts();
    if (prompts.length > 0) {
      await stateManager.initializeFromPrompts(prompts);
      appLogger.info({ count: prompts.length }, "Jobs initialized from prompts");
    } else {
      appLogger.warn("No prompts configured. Add prompts via the dashboard.");
    }
  }

  // Image generator (Vertex AI or Mock based on env)
  // The getMasterAesthetic getter ensures the current value is used for each generation
  const useMock = process.env["USE_MOCK_GENERATOR"] === "true";
  const generator = GeneratorFactory.create(
    useMock ? "mock" : "vertex-imagen3",
    env,
    { getMasterAesthetic: () => configService.getMasterAesthetic() }
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
    },
    () => configService.getMasterAesthetic()
  );

  // ---------------------------------------------------------------------------
  // 4. Start HTTP Server
  // ---------------------------------------------------------------------------

  // Build provider configs for benchmark
  // Use getter to ensure current aesthetic value is used for each generation
  const vertexConfig = {
    projectId: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
    getMasterAesthetic: () => configService.getMasterAesthetic(),
  };

  const serverDeps = {
    eventBus,
    stateManager,
    orchestrator,
    configService,
    env,
    vertexConfig,
    ...(env.OPENAI_API_KEY ? { openaiApiKey: env.OPENAI_API_KEY } : {}),
    ...(env.GOOGLE_AI_API_KEY ? { geminiApiKey: env.GOOGLE_AI_API_KEY } : {}),
  };

  const server = await createApp(
    {
      port: env.PORT,
      outputDir: resolve(DEFAULTS.OUTPUT_DIR),
      logLevel: env.LOG_LEVEL,
    },
    serverDeps
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
  // 6. Server Ready - Wait for UI to Start Batch
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
    "Server ready. Open dashboard to start batch processing."
  );

  appLogger.info(
    { dashboard: `http://localhost:${env.PORT}` },
    "🚀 Dashboard available - click 'Start Batch' to begin"
  );

  // Keep server running until shutdown signal
  // The batch is started via POST /api/start from the dashboard
}

// =============================================================================
// Entry Point
// =============================================================================

main().catch((error) => {
  console.error("Fatal error during startup:", error);
  process.exit(1);
});
