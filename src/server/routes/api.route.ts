/**
 * API Routes
 *
 * REST API endpoints for configuration and batch control.
 *
 * @module server/routes/api
 */

import type { FastifyInstance } from "fastify";
import type { Orchestrator } from "../../core/index.js";
import type {
  StateManager,
  ConfigService,
  JobCreateInput,
} from "../../core/index.js";
import { ReferenceLoaderService } from "../../core/services/reference-loader.service.js";
import {
  GeneratorFactory,
  type GeneratorProvider,
} from "../../adapters/index.js";
import {
  isValidModelKey,
  getModel,
  isExtendedPrompt,
  getPromptText,
  type EnvConfig,
} from "../../types/index.js";

// =============================================================================
// Types
// =============================================================================

export interface ApiDependencies {
  readonly orchestrator: Orchestrator;
  readonly stateManager: StateManager;
  readonly configService: ConfigService;
  readonly env: EnvConfig;
}

interface BatchState {
  isRunning: boolean;
  startedAt: string | null;
  selectedModel: string | null;
}

interface UpdateAestheticBody {
  masterAesthetic: string;
}

interface UpdatePromptsBody {
  prompts: string[];
}

interface StartBatchBody {
  model?: string;
}

// =============================================================================
// Module State
// =============================================================================

const batchState: BatchState = {
  isRunning: false,
  startedAt: null,
  selectedModel: null,
};

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Register API routes.
 */
export function registerApiRoutes(
  app: FastifyInstance,
  deps: ApiDependencies
): void {
  // ---------------------------------------------------------------------------
  // GET /api/config - Get prompts and master aesthetic
  // ---------------------------------------------------------------------------
  app.get("/api/config", async (_request, reply) => {
    try {
      const config = deps.configService.getConfig();
      const stats = await deps.stateManager.getStats();
      const jobs = await deps.stateManager.getAllJobs();

      // Check if jobs are synced with prompts
      // Jobs are out of sync if:
      // 1. Different number of jobs vs prompts
      // 2. Job prompts don't match config prompts
      const jobPrompts = jobs.map((j) => j.prompt);
      const configPrompts = config.prompts;

      let syncStatus: "synced" | "out_of_sync" | "no_jobs" = "synced";
      let syncMessage = "";

      if (jobs.length === 0) {
        syncStatus = "no_jobs";
        syncMessage =
          'No jobs exist. Click "Sync Prompts" to create jobs from your prompts.';
      } else if (jobPrompts.length !== configPrompts.length) {
        syncStatus = "out_of_sync";
        syncMessage = `Jobs (${jobPrompts.length}) and prompts (${configPrompts.length}) count mismatch. Click "Sync Prompts" to update.`;
      } else {
        // Check if prompts match (compare first and last as a quick check)
        const firstMatch = jobPrompts[0] === configPrompts[0];
        const lastMatch =
          jobPrompts[jobPrompts.length - 1] ===
          configPrompts[configPrompts.length - 1];
        if (!firstMatch || !lastMatch) {
          syncStatus = "out_of_sync";
          syncMessage =
            'Job prompts differ from config/prompts.json. Click "Sync Prompts" to update.';
        }
      }

      return reply.send({
        masterAesthetic: config.masterAesthetic,
        prompts: config.prompts,
        promptCount: config.prompts.length,
        stats,
        batchState: {
          isRunning: batchState.isRunning,
          startedAt: batchState.startedAt,
        },
        syncStatus,
        syncMessage,
        jobPromptPreview: jobPrompts
          .slice(0, 3)
          .map((p) => p.substring(0, 60) + "..."),
      });
    } catch (error) {
      app.log.error(error, "Failed to load config");
      return reply.status(500).send({
        error: "Failed to load configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // PUT /api/config/aesthetic - Update master aesthetic
  // ---------------------------------------------------------------------------
  app.put<{ Body: UpdateAestheticBody }>(
    "/api/config/aesthetic",
    async (request, reply) => {
      if (batchState.isRunning) {
        return reply.status(409).send({
          error: "Cannot update while running",
          message: "Stop the batch process first",
        });
      }

      try {
        const { masterAesthetic } = request.body;

        if (typeof masterAesthetic !== "string") {
          return reply.status(400).send({
            error: "Invalid request",
            message: "masterAesthetic must be a string",
          });
        }

        await deps.configService.setMasterAesthetic(masterAesthetic);
        app.log.info("Master aesthetic updated via API");

        return reply.send({
          message: "Master aesthetic updated",
          masterAesthetic: deps.configService.getMasterAesthetic(),
        });
      } catch (error) {
        app.log.error(error, "Failed to update aesthetic");
        return reply.status(500).send({
          error: "Failed to update aesthetic",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ---------------------------------------------------------------------------
  // PUT /api/config/prompts - Update prompts (auto-syncs jobs.json)
  // ---------------------------------------------------------------------------
  app.put<{ Body: UpdatePromptsBody }>(
    "/api/config/prompts",
    async (request, reply) => {
      if (batchState.isRunning) {
        return reply.status(409).send({
          error: "Cannot update while running",
          message: "Stop the batch process first",
        });
      }

      try {
        const { prompts } = request.body;

        if (!Array.isArray(prompts)) {
          return reply.status(400).send({
            error: "Invalid request",
            message: "prompts must be an array of strings",
          });
        }

        // Validate all prompts are strings
        if (!prompts.every((p) => typeof p === "string")) {
          return reply.status(400).send({
            error: "Invalid request",
            message: "All prompts must be strings",
          });
        }

        // 1. Save prompts to config/prompts.json
        await deps.configService.setPrompts(prompts);
        app.log.info({ count: prompts.length }, "Prompts updated via API");

        // 2. Auto-sync: Reinitialize jobs.json from new prompts
        await deps.stateManager.initializeFromPrompts(prompts);
        app.log.info(
          { count: prompts.length },
          "Jobs auto-synced from updated prompts"
        );

        return reply.send({
          message: "Prompts updated and jobs synced",
          promptCount: prompts.length,
          jobsCreated: prompts.length,
        });
      } catch (error) {
        app.log.error(error, "Failed to update prompts");
        return reply.status(500).send({
          error: "Failed to update prompts",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/models - List available models for batch processing
  // ---------------------------------------------------------------------------
  app.get("/api/models", async (_request, reply) => {
    // Use the factory method that derives from MODEL_REGISTRY (SSoT)
    const models = GeneratorFactory.getAvailableModels(deps.env);
    const currentModel = deps.orchestrator.getGeneratorInfo();

    return reply.send({
      models: models.map((m) => ({
        id: m.key,
        name: m.name,
        description: m.description,
        provider: m.provider,
        available: m.available,
      })),
      currentModel: currentModel.modelId,
      currentProvider: currentModel.providerName,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/start - Start batch processing
  // ---------------------------------------------------------------------------
  app.post<{ Body: StartBatchBody }>("/api/start", async (request, reply) => {
    if (batchState.isRunning) {
      return reply.status(409).send({
        error: "Batch already running",
        message: "A batch process is already in progress",
        startedAt: batchState.startedAt,
      });
    }

    try {
      // Validate prompts
      const prompts = deps.configService.getPrompts();
      if (prompts.length === 0) {
        return reply.status(400).send({
          error: "No prompts configured",
          message: "Add prompts before starting the batch",
        });
      }

      // Handle model selection
      const requestedModel = request.body?.model;
      if (requestedModel) {
        // Validate against MODEL_REGISTRY (SSoT)
        if (!isValidModelKey(requestedModel)) {
          return reply.status(400).send({
            error: "Invalid model",
            message: `Unknown model: ${requestedModel}`,
          });
        }

        // Get model metadata from registry
        const modelDef = getModel(requestedModel);

        // Check if provider is configured using registry's requiredEnvVar
        const envValue =
          deps.env[modelDef.requiredEnvVar as keyof typeof deps.env];
        if (!envValue) {
          return reply.status(400).send({
            error: `${modelDef.name} not configured`,
            message: `Set ${modelDef.requiredEnvVar} environment variable`,
          });
        }

        // Create and set the new generator
        // Use getter to ensure current aesthetic value is used for each generation
        try {
          const generator = GeneratorFactory.create(
            requestedModel as GeneratorProvider,
            deps.env,
            {
              getMasterAesthetic: () => deps.configService.getMasterAesthetic(),
            }
          );

          const wasSet = deps.orchestrator.setGenerator(generator);
          if (!wasSet) {
            // This shouldn't happen since we checked batchState.isRunning earlier
            // But handle it just in case
            return reply.status(409).send({
              error: "Cannot change model",
              message:
                "Batch is already running. Cancel it first to change models.",
            });
          }

          app.log.info(
            {
              requestedModel,
              newModelId: generator.modelId,
              newProvider: generator.providerName,
            },
            "Generator switched to requested model"
          );
        } catch (error) {
          return reply.status(500).send({
            error: "Failed to create generator",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        // No model specified - log what we're using
        const currentGen = deps.orchestrator.getGeneratorInfo();
        app.log.info(
          {
            currentModel: currentGen.modelId,
            currentProvider: currentGen.providerName,
          },
          "Using current generator (no model specified in request)"
        );
      }

      // Validate and reset jobs with missing output files
      const resetCount =
        await deps.stateManager.validateAndResetMissingOutputs();
      if (resetCount > 0) {
        app.log.info(
          { resetCount },
          "Reset jobs with missing output files to PENDING"
        );
      }

      // Check if there are any pending jobs to process
      const stats = await deps.stateManager.getStats();
      if (stats.pending === 0 && stats.processing === 0) {
        return reply.status(400).send({
          error: "No pending jobs",
          message:
            "All jobs are already complete. Use 'Reset All' or 'Reinit Jobs' to start fresh.",
        });
      }

      batchState.isRunning = true;
      batchState.startedAt = new Date().toISOString();
      batchState.selectedModel = deps.orchestrator.getGeneratorInfo().modelId;

      app.log.info(
        {
          promptCount: prompts.length,
          pendingJobs: stats.pending,
          model: batchState.selectedModel,
        },
        "Starting batch processing via API"
      );

      // Start orchestrator in background (non-blocking)
      deps.orchestrator
        .start()
        .then(() => {
          batchState.isRunning = false;
          app.log.info("Batch processing completed");
        })
        .catch((error) => {
          batchState.isRunning = false;
          app.log.error(error, "Batch processing failed");
        });

      return reply.status(202).send({
        message: "Batch processing started",
        startedAt: batchState.startedAt,
        promptCount: prompts.length,
        model: batchState.selectedModel,
      });
    } catch (error) {
      batchState.isRunning = false;
      app.log.error(error, "Failed to start batch");
      return reply.status(500).send({
        error: "Failed to start batch",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/status - Get batch status
  // ---------------------------------------------------------------------------
  app.get("/api/status", async (_request, reply) => {
    const stats = await deps.stateManager.getStats();

    return reply.send({
      isRunning: batchState.isRunning,
      startedAt: batchState.startedAt,
      stats,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/cancel - Cancel the running batch
  // ---------------------------------------------------------------------------
  app.post("/api/cancel", async (_request, reply) => {
    if (!batchState.isRunning) {
      return reply.status(409).send({
        error: "No batch running",
        message: "There is no batch process to cancel",
      });
    }

    try {
      app.log.info("Cancelling batch processing via API");
      await deps.orchestrator.stop();
      batchState.isRunning = false;

      return reply.send({
        message: "Batch cancelled. Current job will complete before stopping.",
      });
    } catch (error) {
      app.log.error(error, "Failed to cancel batch");
      return reply.status(500).send({
        error: "Failed to cancel batch",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/reset - Reset all jobs to pending
  // ---------------------------------------------------------------------------
  app.post("/api/reset", async (_request, reply) => {
    if (batchState.isRunning) {
      return reply.status(409).send({
        error: "Cannot reset while running",
        message: "Stop the batch process first",
      });
    }

    try {
      await deps.stateManager.resetAllJobs();
      app.log.info("All jobs reset to PENDING");

      return reply.send({
        message: "All jobs reset to PENDING",
      });
    } catch (error) {
      app.log.error(error, "Failed to reset jobs");
      return reply.status(500).send({
        error: "Failed to reset jobs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/reinitialize - Reinitialize jobs from current prompts
  // ---------------------------------------------------------------------------
  app.post("/api/reinitialize", async (_request, reply) => {
    if (batchState.isRunning) {
      return reply.status(409).send({
        error: "Cannot reinitialize while running",
        message: "Stop the batch process first",
      });
    }

    try {
      const promptsExtended = deps.configService.getPromptsExtended();

      if (promptsExtended.length === 0) {
        return reply.status(400).send({
          error: "No prompts configured",
          message: "Add prompts before reinitializing",
        });
      }

      // Check if any prompts have references
      const hasReferences = deps.configService.hasReferences();

      if (hasReferences) {
        // Load references from files and create jobs with them
        const referenceLoader = new ReferenceLoaderService();
        const jobInputs: JobCreateInput[] = [];

        for (const prompt of promptsExtended) {
          if (isExtendedPrompt(prompt)) {
            // Load reference image from file
            const loaded = await referenceLoader.loadFromPrompt(prompt);
            jobInputs.push({
              prompt: loaded.promptText,
              references: loaded.references,
            });
          } else {
            // Simple string prompt without reference
            jobInputs.push({ prompt });
          }
        }

        await deps.stateManager.initializeFromJobInputs(jobInputs);
        const withRefs = jobInputs.filter((j) => j.references).length;

        app.log.info(
          { count: jobInputs.length, withReferences: withRefs },
          "Jobs reinitialized from prompts with references"
        );

        return reply.send({
          message: "Jobs reinitialized from prompts",
          promptCount: jobInputs.length,
          withReferences: withRefs,
          note:
            withRefs > 0
              ? `${withRefs} jobs have reference images. Use model 'vertex-imagen3-capability' for controlled generation.`
              : undefined,
        });
      } else {
        // No references - use simple initialization
        const prompts = promptsExtended.map(getPromptText);
        await deps.stateManager.initializeFromPrompts(prompts);

        app.log.info(
          { count: prompts.length },
          "Jobs reinitialized from prompts"
        );

        return reply.send({
          message: "Jobs reinitialized from prompts",
          promptCount: prompts.length,
        });
      }
    } catch (error) {
      app.log.error(error, "Failed to reinitialize jobs");
      return reply.status(500).send({
        error: "Failed to reinitialize jobs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
