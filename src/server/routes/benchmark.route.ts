/**
 * Benchmark API Routes
 *
 * Endpoints for running and viewing benchmarks.
 *
 * @module server/routes/benchmark
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import {
  DEFAULTS,
  MODEL_REGISTRY,
  PRODUCTION_MODEL_KEYS,
  isValidModelKey,
  getModel,
  type BenchmarkConfig,
  type BenchmarkReport,
  type VertexConfig,
  type OpenAIConfig,
  type GeminiConfig,
} from "../../types/index.js";
import { BenchmarkRunner } from "../../benchmark/runner.js";
import { generateHtmlReport } from "../../benchmark/report-generator.js";
import type { ConfigService } from "../../core/index.js";

// =============================================================================
// Types
// =============================================================================

export interface BenchmarkDependencies {
  readonly configService: ConfigService;
  readonly vertexConfig?: VertexConfig;
  readonly openaiApiKey?: string;
  readonly geminiApiKey?: string;
}

interface BenchmarkState {
  isRunning: boolean;
  currentRunId: string | null;
  progress: {
    currentModel: string;
    currentPrompt: number;
    totalPrompts: number;
    modelsCompleted: number;
    totalModels: number;
  } | null;
}

interface StartBenchmarkBody {
  models: string[];
  promptCount: number;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
}

// =============================================================================
// Module State
// =============================================================================

const benchmarkState: BenchmarkState = {
  isRunning: false,
  currentRunId: null,
  progress: null,
};

// =============================================================================
// Route Registration
// =============================================================================

export function registerBenchmarkRoutes(
  app: FastifyInstance,
  deps: BenchmarkDependencies
): void {
  // ---------------------------------------------------------------------------
  // GET /api/benchmark/models - List available models (from MODEL_REGISTRY)
  // ---------------------------------------------------------------------------
  app.get("/api/benchmark/models", async (_request, reply) => {
    // Derive models from the Single Source of Truth
    const models = PRODUCTION_MODEL_KEYS.map((key) => {
      const model = MODEL_REGISTRY[key];
      let available = false;

      switch (model.provider) {
        case "vertex":
          available = !!deps.vertexConfig;
          break;
        case "openai":
          available = !!deps.openaiApiKey;
          break;
        case "gemini":
          available = !!deps.geminiApiKey;
          break;
      }

      return {
        id: model.id,
        key: model.key,
        name: model.name,
        provider: model.provider,
        description: model.description,
        available,
      };
    });

    return reply.send({
      models,
      providers: {
        vertex: { configured: !!deps.vertexConfig, name: "Google Vertex AI" },
        openai: { configured: !!deps.openaiApiKey, name: "OpenAI" },
        gemini: {
          configured: !!deps.geminiApiKey,
          name: "Google Gemini (Nano Banana)",
        },
      },
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/benchmark/status - Get benchmark status
  // ---------------------------------------------------------------------------
  app.get("/api/benchmark/status", async (_request, reply) => {
    return reply.send({
      isRunning: benchmarkState.isRunning,
      currentRunId: benchmarkState.currentRunId,
      progress: benchmarkState.progress,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/benchmark/start - Start a benchmark
  // ---------------------------------------------------------------------------
  app.post<{ Body: StartBenchmarkBody }>(
    "/api/benchmark/start",
    async (request, reply) => {
      if (benchmarkState.isRunning) {
        return reply.status(409).send({
          error: "Benchmark already running",
          currentRunId: benchmarkState.currentRunId,
        });
      }

      const { models, promptCount, aspectRatio = "1:1" } = request.body;

      // Validate
      if (!Array.isArray(models) || models.length === 0) {
        return reply.status(400).send({ error: "Select at least one model" });
      }

      if (
        typeof promptCount !== "number" ||
        promptCount < 1 ||
        promptCount > 32
      ) {
        return reply
          .status(400)
          .send({ error: "promptCount must be between 1 and 32" });
      }

      // Validate models against registry and check provider configs
      for (const modelKey of models) {
        if (!isValidModelKey(modelKey)) {
          return reply
            .status(400)
            .send({ error: `Unknown model: ${modelKey}` });
        }

        const model = getModel(modelKey);
        if (model.provider === "vertex" && !deps.vertexConfig) {
          return reply
            .status(400)
            .send({ error: `${model.name} requires Vertex AI configuration` });
        }
        if (model.provider === "openai" && !deps.openaiApiKey) {
          return reply
            .status(400)
            .send({ error: `${model.name} requires OpenAI API key` });
        }
        if (model.provider === "gemini" && !deps.geminiApiKey) {
          return reply
            .status(400)
            .send({ error: `${model.name} requires GOOGLE_AI_API_KEY` });
        }
      }

      // Build config
      const providerConfigs: {
        vertex?: VertexConfig;
        openai?: OpenAIConfig;
        gemini?: GeminiConfig;
      } = {};
      if (deps.vertexConfig) {
        providerConfigs.vertex = deps.vertexConfig;
      }
      if (deps.openaiApiKey) {
        providerConfigs.openai = {
          apiKey: deps.openaiApiKey,
          getMasterAesthetic: () => deps.configService.getMasterAesthetic(),
        };
      }
      if (deps.geminiApiKey) {
        providerConfigs.gemini = {
          apiKey: deps.geminiApiKey,
          getMasterAesthetic: () => deps.configService.getMasterAesthetic(),
        };
      }

      // Convert model keys to model IDs for the benchmark runner
      const modelIds = models.map((key) => getModel(key as any).id);

      const benchmarkConfig: BenchmarkConfig = {
        models: modelIds,
        promptCount,
        delayMs: 2000,
        aspectRatio,
      };

      benchmarkState.isRunning = true;
      benchmarkState.progress = {
        currentModel: models[0] || "",
        currentPrompt: 0,
        totalPrompts: promptCount,
        modelsCompleted: 0,
        totalModels: models.length,
      };

      app.log.info({ models, promptCount }, "Starting benchmark via API");

      // Run in background
      const runner = new BenchmarkRunner(providerConfigs, benchmarkConfig);

      runner
        .run()
        .then(async (report) => {
          benchmarkState.currentRunId = report.runId;
          benchmarkState.isRunning = false;
          benchmarkState.progress = null;

          // Generate HTML report
          const outputDir = join(DEFAULTS.BENCHMARK_DIR, report.runId);
          await generateHtmlReport(report, outputDir);

          app.log.info({ runId: report.runId }, "Benchmark completed");
        })
        .catch((error) => {
          benchmarkState.isRunning = false;
          benchmarkState.progress = null;
          app.log.error(error, "Benchmark failed");
        });

      return reply.status(202).send({
        message: "Benchmark started",
        models,
        promptCount,
      });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /api/benchmark/runs - List previous benchmark runs
  // ---------------------------------------------------------------------------
  app.get("/api/benchmark/runs", async (_request, reply) => {
    try {
      const benchmarkDir = DEFAULTS.BENCHMARK_DIR;
      const entries = await readdir(benchmarkDir, {
        withFileTypes: true,
      }).catch(() => []);

      const runs: { runId: string; timestamp: string; hasReport: boolean }[] =
        [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const resultsPath = join(benchmarkDir, entry.name, "results.json");
          try {
            const content = await readFile(resultsPath, "utf-8");
            const report = JSON.parse(content) as BenchmarkReport;
            runs.push({
              runId: entry.name,
              timestamp: report.startedAt,
              hasReport: true,
            });
          } catch {
            // Skip invalid runs
          }
        }
      }

      // Sort by timestamp descending
      runs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return reply.send({ runs });
    } catch (error) {
      return reply.send({ runs: [] });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/benchmark/runs/:runId - Get benchmark results
  // ---------------------------------------------------------------------------
  app.get<{ Params: { runId: string } }>(
    "/api/benchmark/runs/:runId",
    async (request, reply) => {
      const { runId } = request.params;
      const resultsPath = join(DEFAULTS.BENCHMARK_DIR, runId, "results.json");

      try {
        const content = await readFile(resultsPath, "utf-8");
        const report = JSON.parse(content) as BenchmarkReport;

        // Add image URLs
        const reportWithUrls = {
          ...report,
          models: report.models.map((model) => ({
            ...model,
            results: model.results.map((result) => ({
              ...result,
              imageUrl: result.outputPath
                ? `/benchmark/${runId}/${model.modelId.replace(
                    /[^a-z0-9-]/gi,
                    "_"
                  )}/${result.outputPath.split("/").pop()}`
                : null,
            })),
          })),
        };

        return reply.send(reportWithUrls);
      } catch {
        return reply.status(404).send({ error: "Benchmark run not found" });
      }
    }
  );
}
