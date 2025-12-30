/**
 * Batch Generation API Routes
 *
 * Endpoints for parallel batch image generation.
 * Supports processing multiple prompts concurrently with progress tracking.
 * Supports reference images for controlled generation.
 *
 * @module server/routes/batch
 */

import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import {
  DEFAULTS,
  MODEL_REGISTRY,
  isValidModelKey,
  getModel,
  type EnvConfig,
  type PromptInput,
  isExtendedPrompt,
  getPromptText,
} from "../../types/index.js";
import { GeneratorFactory } from "../../adapters/generator.factory.js";
import {
  BatchGenerationService,
  type BatchPrompt,
  type BatchGenerationResult,
} from "../../core/services/batch-generation.service.js";
import type { ConfigService } from "../../core/index.js";
import { ReferenceLoaderService } from "../../core/services/reference-loader.service.js";
import { atomicWriteBuffer } from "../../utils/fs.utils.js";

// =============================================================================
// Metadata Embedding
// =============================================================================

interface BatchImageMetadata {
  masterAesthetic: string;
  prompt: string;
  model: string;
  provider: string;
  generatedAt: Date;
}

/**
 * Embed generation metadata into the image as EXIF data.
 */
async function embedBatchMetadata(
  buffer: Buffer,
  metadata: BatchImageMetadata
): Promise<Buffer> {
  try {
    const fullPrompt = metadata.masterAesthetic
      ? `[STYLE] ${metadata.masterAesthetic}\n\n[PROMPT] ${metadata.prompt}`
      : metadata.prompt;

    const description = fullPrompt.slice(0, 2000); // EXIF limit
    const software = `RBIG-Batch/${metadata.provider}/${metadata.model}`;
    const timestamp = metadata.generatedAt.toISOString();

    return await sharp(buffer)
      .withMetadata({
        exif: {
          IFD0: {
            ImageDescription: description,
            Software: software,
            Artist: "RBIG (Resilient Batch Image Generator)",
            Copyright: `Generated: ${timestamp}`,
          },
        },
      })
      .png()
      .toBuffer();
  } catch {
    // If metadata embedding fails, return original buffer
    return buffer;
  }
}

// =============================================================================
// Types
// =============================================================================

export interface BatchDependencies {
  readonly configService: ConfigService;
  readonly env: EnvConfig;
}

interface StartBatchBody {
  /** Model key to use (e.g., 'gemini-flash-image') */
  model: string;
  /** 
   * Array of prompts - supports both formats:
   * - Simple: ["prompt 1", "prompt 2"]
   * - Extended with references: [{ text: "prompt", references: [...] }]
   */
  prompts: PromptInput[];
  /** Number of concurrent requests (1-10, default: 3) */
  concurrency?: number;
  /** Output directory name (optional) */
  outputDir?: string;
  /** Aspect ratio for generated images (default: '1:1') */
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

interface BatchState {
  isRunning: boolean;
  currentJobId: string | null;
  progress: {
    completed: number;
    total: number;
    successCount: number;
    failureCount: number;
    currentPrompt: string;
  } | null;
  lastResult: BatchGenerationResult | null;
}

// =============================================================================
// Module State
// =============================================================================

const batchState: BatchState = {
  isRunning: false,
  currentJobId: null,
  progress: null,
  lastResult: null,
};

// =============================================================================
// Route Registration
// =============================================================================

export function registerBatchRoutes(
  app: FastifyInstance,
  deps: BatchDependencies
): void {
  // ---------------------------------------------------------------------------
  // GET /api/batch/status - Get current batch status
  // ---------------------------------------------------------------------------
  app.get("/api/batch/status", async (_request, reply) => {
    return reply.send({
      isRunning: batchState.isRunning,
      jobId: batchState.currentJobId,
      progress: batchState.progress,
      lastResult: batchState.lastResult
        ? {
            totalPrompts: batchState.lastResult.totalPrompts,
            successCount: batchState.lastResult.successCount,
            failureCount: batchState.lastResult.failureCount,
            totalDurationMs: batchState.lastResult.totalDurationMs,
            averageDurationMs: batchState.lastResult.averageDurationMs,
          }
        : null,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/batch/start - Start a batch generation job
  // ---------------------------------------------------------------------------
  app.post<{ Body: StartBatchBody }>("/api/batch/start", async (request, reply) => {
    // Validate not already running
    if (batchState.isRunning) {
      return reply.status(409).send({
        error: "Batch already running",
        jobId: batchState.currentJobId,
      });
    }

    const { model, prompts, concurrency = 3, outputDir, aspectRatio = '1:1' } = request.body;

    // Validate inputs
    if (!model || typeof model !== "string") {
      return reply.status(400).send({ error: "model is required" });
    }

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return reply.status(400).send({ error: "prompts array is required and must not be empty" });
    }

    if (prompts.length > 100) {
      return reply.status(400).send({ error: "Maximum 100 prompts per batch" });
    }

    // Validate all prompts have text
    for (let i = 0; i < prompts.length; i++) {
      const promptItem = prompts[i];
      if (!promptItem) {
        return reply.status(400).send({ error: `Prompt at index ${i} is missing` });
      }
      const text = getPromptText(promptItem);
      if (!text || text.trim().length === 0) {
        return reply.status(400).send({ error: `Prompt at index ${i} is empty or invalid` });
      }
    }

    if (concurrency < 1 || concurrency > 10) {
      return reply.status(400).send({ error: "concurrency must be between 1 and 10" });
    }

    // Validate model
    if (!isValidModelKey(model)) {
      const availableKeys = Object.keys(MODEL_REGISTRY).join(", ");
      return reply.status(400).send({
        error: `Unknown model: ${model}. Available: ${availableKeys}`,
      });
    }

    const modelDef = getModel(model);

    // Check if model is configured
    const envValue = deps.env[modelDef.requiredEnvVar as keyof EnvConfig];
    if (!envValue) {
      return reply.status(400).send({
        error: `${modelDef.name} requires ${modelDef.requiredEnvVar} to be set`,
      });
    }

    // Generate job ID
    const jobId = `batch-${Date.now().toString(36)}`;

    // Initialize state
    batchState.isRunning = true;
    batchState.currentJobId = jobId;
    batchState.progress = {
      completed: 0,
      total: prompts.length,
      successCount: 0,
      failureCount: 0,
      currentPrompt: prompts[0] ? getPromptText(prompts[0]) ?? "" : "",
    };
    batchState.lastResult = null;

    // Respond immediately
    reply.status(202).send({
      message: "Batch generation started",
      jobId,
      model: modelDef.name,
      promptCount: prompts.length,
      concurrency,
    });

    // Run batch in background
    setImmediate(async () => {
      try {
        // Create generator
        const generator = GeneratorFactory.create(model as any, deps.env, {
          getMasterAesthetic: () => deps.configService.getMasterAesthetic(),
        });

        // Create batch service
        const batchService = new BatchGenerationService(generator, {
          concurrency,
          staggerDelayMs: 300,
          maxRetries: 2,
          timeoutMs: 120000,
        });

        // Load references if any prompts have them
        const referenceLoader = new ReferenceLoaderService();
        const batchPrompts: BatchPrompt[] = [];

        for (const prompt of prompts) {
          if (isExtendedPrompt(prompt)) {
            // Extended prompt with potential references
            const loaded = await referenceLoader.loadFromPrompt(prompt);
            batchPrompts.push({
              text: loaded.promptText,
              options: { 
                aspectRatio,
                ...(loaded.references && { references: loaded.references }),
              },
            });
          } else {
            // Simple string prompt
            batchPrompts.push({
              text: String(prompt),
              options: { aspectRatio },
            });
          }
        }

        // Log reference loading summary
        const withRefs = batchPrompts.filter(p => p.options?.references).length;
        if (withRefs > 0) {
          app.log.info(
            { totalPrompts: batchPrompts.length, withReferences: withRefs },
            "Loaded references for batch prompts"
          );
        }

        // Run batch with progress tracking
        const result = await batchService.generateBatch(batchPrompts, (progress) => {
          batchState.progress = {
            completed: progress.completed,
            total: progress.total,
            successCount: progress.successCount,
            failureCount: progress.failureCount,
            currentPrompt: progress.current.slice(0, 100),
          };
        });

        // Save successful images with embedded metadata
        const outputPath = outputDir
          ? join(DEFAULTS.OUTPUT_DIR, outputDir)
          : join(DEFAULTS.OUTPUT_DIR, `batch-${jobId}`);

        const masterAesthetic = deps.configService.getMasterAesthetic();

        for (const item of result.results) {
          if (item.success && item.result) {
            const filename = `img_${String(item.index + 1).padStart(4, "0")}.png`;
            const filePath = join(outputPath, filename);

            // Embed metadata (prompt, model, aesthetic) into the image
            const bufferWithMetadata = await embedBatchMetadata(item.result.buffer, {
              masterAesthetic,
              prompt: item.prompt,
              model: generator.modelId,
              provider: generator.providerName,
              generatedAt: item.result.generatedAt,
            });

            await atomicWriteBuffer(filePath, bufferWithMetadata);
          }
        }

        // Store result
        batchState.lastResult = result;

        app.log.info(
          {
            jobId,
            successCount: result.successCount,
            failureCount: result.failureCount,
            durationMs: result.totalDurationMs,
          },
          "Batch generation completed",
        );
      } catch (error) {
        app.log.error(error, "Batch generation failed");
      } finally {
        batchState.isRunning = false;
        batchState.progress = null;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/batch/result - Get last batch result details
  // ---------------------------------------------------------------------------
  app.get("/api/batch/result", async (_request, reply) => {
    if (!batchState.lastResult) {
      return reply.status(404).send({ error: "No batch result available" });
    }

    return reply.send({
      totalPrompts: batchState.lastResult.totalPrompts,
      successCount: batchState.lastResult.successCount,
      failureCount: batchState.lastResult.failureCount,
      totalDurationMs: batchState.lastResult.totalDurationMs,
      averageDurationMs: batchState.lastResult.averageDurationMs,
      results: batchState.lastResult.results.map((r) => ({
        index: r.index,
        prompt: r.prompt.slice(0, 100) + (r.prompt.length > 100 ? "..." : ""),
        success: r.success,
        error: r.error,
        durationMs: r.durationMs,
        attempts: r.attempts,
      })),
    });
  });
}

