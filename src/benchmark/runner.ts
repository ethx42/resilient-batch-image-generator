/**
 * Benchmark Runner
 *
 * Runs image generation benchmarks across multiple AI models.
 * Supports Vertex AI Imagen and OpenAI DALL-E.
 * Collects timing, success rates, and outputs comparison data.
 *
 * @module benchmark/runner
 */

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import type {
  BenchmarkConfig,
  BenchmarkReport,
  BenchmarkModelStats,
  BenchmarkGenerationResult,
  VertexConfig,
  OpenAIConfig,
  GeminiConfig,
  GeminiModelId,
} from '../types/index.js';
import { DEFAULTS, VERTEX_MODELS, OPENAI_MODELS, GEMINI_MODELS, ALL_MODELS } from '../types/index.js';
import type { ImageGenerator } from '../adapters/generator.interface.js';
import { VertexImagen3Strategy } from '../adapters/vertex/imagen3.strategy.js';
import { DalleStrategy } from '../adapters/openai/dalle.strategy.js';
import { GeminiImageStrategy } from '../adapters/gemini/gemini.strategy.js';
import { createChildLogger, defaultLogger } from '../config/logger.js';
import { atomicWriteBuffer } from '../utils/fs.utils.js';

// =============================================================================
// Constants
// =============================================================================

const logger = createChildLogger(defaultLogger, { component: 'BenchmarkRunner' });

// =============================================================================
// Types
// =============================================================================

/**
 * Provider configurations for the benchmark runner.
 */
export interface BenchmarkProviderConfigs {
  vertex?: VertexConfig;
  openai?: OpenAIConfig;
  gemini?: GeminiConfig;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate percentile from sorted array.
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)] ?? 0;
}

/**
 * Calculate statistics from duration array.
 */
function calculateTimingStats(durations: number[]): BenchmarkModelStats['timing'] {
  if (durations.length === 0) {
    return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0, total: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const total = durations.reduce((sum, d) => sum + d, 0);

  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: Math.round(total / durations.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    total: Math.round(total),
  };
}

/**
 * Check if a model ID belongs to Vertex AI.
 */
function isVertexModel(modelId: string): boolean {
  return Object.values(VERTEX_MODELS).some((m) => m.id === modelId);
}

/**
 * Check if a model ID belongs to OpenAI.
 */
function isOpenAIModel(modelId: string): boolean {
  return Object.values(OPENAI_MODELS).some((m) => m.id === modelId);
}

/**
 * Check if a model ID belongs to Gemini.
 */
function isGeminiModel(modelId: string): boolean {
  return Object.values(GEMINI_MODELS).some((m) => m.id === modelId);
}

/**
 * Embed metadata into an image buffer.
 * 
 * @param buffer - Original image buffer
 * @param metadata - Metadata to embed
 * @returns Buffer with embedded EXIF metadata
 */
async function embedBenchmarkMetadata(
  buffer: Buffer,
  metadata: {
    masterAesthetic: string;
    prompt: string;
    model: string;
    provider: string;
    generatedAt: Date;
  },
): Promise<Buffer> {
  try {
    // Build the full prompt description (aesthetic + prompt)
    const fullPrompt = metadata.masterAesthetic
      ? `[STYLE] ${metadata.masterAesthetic}\n\n[PROMPT] ${metadata.prompt}`
      : metadata.prompt;

    const description = fullPrompt.slice(0, 2000); // EXIF limit
    const software = `RBIG-Benchmark/${metadata.provider}/${metadata.model}`;
    const timestamp = metadata.generatedAt.toISOString();

    return await sharp(buffer)
      .withMetadata({
        exif: {
          IFD0: {
            ImageDescription: description,
            Software: software,
            Artist: 'RBIG Benchmark (Resilient Batch Image Generator)',
            Copyright: `Generated: ${timestamp}`,
          },
        },
      })
      .png()
      .toBuffer();
  } catch (error) {
    // If metadata embedding fails, return original buffer
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to embed metadata in benchmark image',
    );
    return buffer;
  }
}

// =============================================================================
// Benchmark Runner Class
// =============================================================================

export class BenchmarkRunner {
  private readonly runId: string;
  private readonly outputDir: string;

  constructor(
    private readonly providerConfigs: BenchmarkProviderConfigs,
    private readonly config: BenchmarkConfig,
  ) {
    this.runId = randomUUID().slice(0, 8);
    this.outputDir = join(DEFAULTS.BENCHMARK_DIR, this.runId);
  }

  /**
   * Run the complete benchmark suite.
   */
  async run(): Promise<BenchmarkReport> {
    const startedAt = new Date();
    logger.info(
      {
        runId: this.runId,
        models: this.config.models,
        promptCount: this.config.promptCount,
      },
      'Starting benchmark run',
    );

    // Validate that we have configs for all requested models
    this.validateModelConfigs();

    // Load prompts
    const prompts = await this.loadPrompts();

    // Create output directories for each model
    await this.setupOutputDirectories();

    // Get master aesthetic from the provider configs (using the getter)
    const masterAesthetic = this.providerConfigs.vertex?.getMasterAesthetic?.() 
      ?? this.providerConfigs.openai?.getMasterAesthetic?.() 
      ?? this.providerConfigs.gemini?.getMasterAesthetic?.()
      ?? '';

    // Run benchmark for each model
    const modelStats: BenchmarkModelStats[] = [];

    for (const modelId of this.config.models) {
      const stats = await this.benchmarkModel(modelId, prompts, masterAesthetic);
      modelStats.push(stats);
    }

    const completedAt = new Date();
    const totalDurationMs = completedAt.getTime() - startedAt.getTime();

    // Build report
    const report: BenchmarkReport = {
      runId: this.runId,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      totalDurationMs,
      config: {
        promptCount: this.config.promptCount,
        aspectRatio: this.config.aspectRatio,
        models: this.config.models,
      },
      models: modelStats,
    };

    // Save results
    await this.saveReport(report);

    logger.info(
      {
        runId: this.runId,
        totalDurationMs,
        modelsCount: modelStats.length,
      },
      'Benchmark completed',
    );

    return report;
  }

  /**
   * Validate that we have configurations for all requested models.
   */
  private validateModelConfigs(): void {
    for (const modelId of this.config.models) {
      if (isVertexModel(modelId)) {
        if (!this.providerConfigs.vertex) {
          throw new Error(
            `Vertex AI model "${modelId}" requested but no Vertex config provided. ` +
            `Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.`,
          );
        }
      } else if (isOpenAIModel(modelId)) {
        if (!this.providerConfigs.openai) {
          throw new Error(
            `OpenAI model "${modelId}" requested but no OpenAI config provided. ` +
            `Set OPENAI_API_KEY environment variable.`,
          );
        }
      } else if (isGeminiModel(modelId)) {
        if (!this.providerConfigs.gemini) {
          throw new Error(
            `Gemini model "${modelId}" requested but no Gemini config provided. ` +
            `Set GOOGLE_AI_API_KEY environment variable.`,
          );
        }
      } else {
        throw new Error(`Unknown model ID: "${modelId}". Available models: ${Object.values(ALL_MODELS).map(m => m.id).join(', ')}`);
      }
    }
  }

  /**
   * Create a strategy for the given model ID.
   */
  private createStrategy(modelId: string): ImageGenerator {
    if (isVertexModel(modelId)) {
      return new VertexImagen3Strategy({
        config: this.providerConfigs.vertex!,
        modelId: modelId as any,
      });
    }

    if (isOpenAIModel(modelId)) {
      return new DalleStrategy({
        config: this.providerConfigs.openai!,
        modelId: modelId as any,
      });
    }

    if (isGeminiModel(modelId)) {
      return new GeminiImageStrategy({
        config: this.providerConfigs.gemini!,
        modelId: modelId as GeminiModelId,
      });
    }

    throw new Error(`Unknown model ID: ${modelId}`);
  }

  /**
   * Benchmark a single model.
   */
  private async benchmarkModel(
    modelId: string,
    prompts: string[],
    masterAesthetic: string,
  ): Promise<BenchmarkModelStats> {
    const modelName = this.getModelName(modelId);
    const modelOutputDir = join(this.outputDir, modelId.replace(/[^a-z0-9-]/gi, '_'));
    const provider = isVertexModel(modelId) 
      ? 'google-vertex' 
      : isGeminiModel(modelId) 
        ? 'google-gemini' 
        : 'openai';

    logger.info({ 
      modelId, 
      modelName, 
      promptCount: prompts.length,
      masterAestheticActive: !!masterAesthetic,
    }, 'Benchmarking model');

    // Create strategy for this model
    const strategy = this.createStrategy(modelId);

    const results: BenchmarkGenerationResult[] = [];
    const successDurations: number[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i]!;
      const startTime = performance.now();

      let result: BenchmarkGenerationResult;

      try {
        const genResult = await strategy.generate(prompt, {
          aspectRatio: this.config.aspectRatio as any,
        });

        const durationMs = Math.round(performance.now() - startTime);
        const outputPath = join(modelOutputDir, `img_${String(i + 1).padStart(4, '0')}.png`);

        // Embed metadata into the image
        const bufferWithMetadata = await embedBenchmarkMetadata(genResult.buffer, {
          masterAesthetic,
          prompt,
          model: modelId,
          provider,
          generatedAt: genResult.generatedAt,
        });

        // Save image with embedded metadata
        await atomicWriteBuffer(outputPath, bufferWithMetadata);

        result = {
          promptIndex: i,
          prompt,
          success: true,
          durationMs,
          outputPath,
          timestamp: new Date().toISOString(),
        };

        successDurations.push(durationMs);

        logger.info(
          { modelId, promptIndex: i, durationMs },
          `Generated image ${i + 1}/${prompts.length}`,
        );
      } catch (error) {
        const durationMs = Math.round(performance.now() - startTime);

        result = {
          promptIndex: i,
          prompt,
          success: false,
          durationMs,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        };

        logger.error(
          { modelId, promptIndex: i, error: result.error },
          `Failed to generate image ${i + 1}/${prompts.length}`,
        );
      }

      results.push(result);

      // Rate limiting delay (except after last prompt)
      if (i < prompts.length - 1) {
        await sleep(this.config.delayMs);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return {
      modelId,
      modelName,
      totalPrompts: prompts.length,
      successCount,
      failureCount,
      successRate: Math.round((successCount / prompts.length) * 100),
      timing: calculateTimingStats(successDurations),
      results,
    };
  }

  /**
   * Load prompts from config file.
   * Supports both array format and { prompts: [...] } format.
   */
  private async loadPrompts(): Promise<string[]> {
    const content = await readFile(DEFAULTS.PROMPTS_FILE, 'utf-8');
    const data = JSON.parse(content) as string[] | { prompts: string[] };

    // Handle both formats: direct array or { prompts: [...] }
    const prompts = Array.isArray(data) ? data : data.prompts;

    if (!prompts || prompts.length === 0) {
      throw new Error(`No prompts found in ${DEFAULTS.PROMPTS_FILE}`);
    }

    return prompts.slice(0, this.config.promptCount);
  }

  /**
   * Setup output directories for each model.
   */
  private async setupOutputDirectories(): Promise<void> {
    await mkdir(this.outputDir, { recursive: true });

    for (const modelId of this.config.models) {
      const modelDir = join(this.outputDir, modelId.replace(/[^a-z0-9-]/gi, '_'));
      await mkdir(modelDir, { recursive: true });
    }
  }

  /**
   * Get human-readable model name.
   */
  private getModelName(modelId: string): string {
    for (const model of Object.values(ALL_MODELS)) {
      if (model.id === modelId) {
        return model.name;
      }
    }
    return modelId;
  }

  /**
   * Save benchmark report to disk.
   */
  private async saveReport(report: BenchmarkReport): Promise<void> {
    const reportPath = join(this.outputDir, 'results.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    logger.info({ path: reportPath }, 'Saved benchmark results');
  }
}
