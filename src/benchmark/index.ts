/**
 * Benchmark CLI Entry Point
 *
 * Usage:
 *   yarn benchmark                              # Default: 5 prompts, Vertex AI models
 *   yarn benchmark --prompts 10                 # Use 10 prompts
 *   yarn benchmark --models imagen3             # Only Imagen 3
 *   yarn benchmark --models imagen3-fast        # Only Imagen 3 Fast
 *   yarn benchmark --models dalle3              # Only DALL-E 3
 *   yarn benchmark --models dalle2              # Only DALL-E 2
 *   yarn benchmark --models vertex              # All Vertex AI models
 *   yarn benchmark --models openai              # All OpenAI models
 *   yarn benchmark --models all                 # All available models
 *   yarn benchmark --models imagen3,dalle3      # Custom combination
 *
 * @module benchmark
 */

import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { getEnv } from '../config/env.js';
import { defaultLogger } from '../config/logger.js';
import {
  VERTEX_MODELS,
  OPENAI_MODELS,
  GEMINI_MODELS,
  DEFAULTS,
  type BenchmarkConfig,
} from '../types/index.js';
import { ConfigService } from '../core/services/config.service.js';
import { BenchmarkRunner, type BenchmarkProviderConfigs } from './runner.js';
import { generateHtmlReport } from './report-generator.js';

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CliOptions {
  prompts: number;
  models: string[];
  delay: number;
}

function printUsage(): void {
  console.log(`
Usage: yarn benchmark [options]

Options:
  -p, --prompts <n>    Number of prompts to test (1-32, default: 5)
  -m, --models <list>  Models to benchmark (default: vertex)
  -d, --delay <ms>     Delay between generations in ms (default: 2000)

Model shortcuts:
  vertex         All Vertex AI models (Imagen 3, Imagen 3 Fast)
  openai         All OpenAI models (DALL-E 3, DALL-E 2)
  gemini         All Gemini models (Nano Banana, Nano Banana Pro)
  all            All available models
  imagen3        Vertex AI Imagen 3
  imagen3-fast   Vertex AI Imagen 3 Fast
  dalle3         OpenAI DALL-E 3
  dalle2         OpenAI DALL-E 2
  gemini-flash   Gemini 2.5 Flash (Nano Banana)
  gemini-pro     Gemini 2.5 Pro (Nano Banana Pro)

You can also specify comma-separated model IDs:
  --models imagen-3.0-generate-001,dall-e-3

Examples:
  yarn benchmark --prompts 3 --models vertex
  yarn benchmark --prompts 5 --models imagen3,dalle3
  yarn benchmark --prompts 5 --models gemini
  yarn benchmark --prompts 10 --models all
`);
}

function parseCliArgs(): CliOptions {
  const { values } = parseArgs({
    options: {
      prompts: {
        type: 'string',
        short: 'p',
        default: '5',
      },
      models: {
        type: 'string',
        short: 'm',
        default: 'vertex',
      },
      delay: {
        type: 'string',
        short: 'd',
        default: '2000',
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
    },
    strict: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  // Parse prompt count
  const prompts = parseInt(values.prompts ?? '5', 10);
  if (isNaN(prompts) || prompts < 1 || prompts > 32) {
    console.error('Error: --prompts must be a number between 1 and 32');
    process.exit(1);
  }

  // Parse models
  const modelsArg = values.models ?? 'vertex';
  const models = parseModelsArg(modelsArg);

  // Parse delay
  const delay = parseInt(values.delay ?? '2000', 10);
  if (isNaN(delay) || delay < 0) {
    console.error('Error: --delay must be a non-negative number');
    process.exit(1);
  }

  return { prompts, models, delay };
}

function parseModelsArg(modelsArg: string): string[] {
  const allVertexModels = Object.values(VERTEX_MODELS).map((m) => m.id);
  const allOpenAIModels = Object.values(OPENAI_MODELS).map((m) => m.id);
  const allGeminiModels = Object.values(GEMINI_MODELS).map((m) => m.id);

  switch (modelsArg.toLowerCase()) {
    // Provider shortcuts
    case 'vertex':
      return allVertexModels;
    case 'openai':
      return allOpenAIModels;
    case 'gemini':
      return allGeminiModels;
    case 'all':
      return [...allVertexModels, ...allOpenAIModels, ...allGeminiModels];

    // Vertex AI shortcuts
    case 'imagen3':
    case 'imagen-3':
      return [VERTEX_MODELS.IMAGEN_3.id];
    case 'imagen3-fast':
    case 'imagen-3-fast':
    case 'fast':
      return [VERTEX_MODELS.IMAGEN_3_FAST.id];

    // OpenAI shortcuts
    case 'dalle3':
    case 'dalle-3':
    case 'dall-e-3':
      return [OPENAI_MODELS.DALLE_3.id];
    case 'dalle2':
    case 'dalle-2':
    case 'dall-e-2':
      return [OPENAI_MODELS.DALLE_2.id];

    // Gemini shortcuts
    case 'gemini-flash':
    case 'nano-banana':
      return [GEMINI_MODELS.GEMINI_FLASH_IMAGE.id];
    case 'gemini-pro':
    case 'nano-banana-pro':
      return [GEMINI_MODELS.GEMINI_PRO_IMAGE.id];

    default:
      // Assume it's a comma-separated list of model IDs or shortcuts
      return modelsArg.split(',').flatMap((m) => {
        const trimmed = m.trim().toLowerCase();
        // Recursively resolve shortcuts
        const shortcuts = [
          'vertex', 'openai', 'gemini', 'all', 
          'imagen3', 'imagen3-fast', 
          'dalle3', 'dalle2',
          'gemini-flash', 'gemini-pro', 'nano-banana', 'nano-banana-pro'
        ];
        if (shortcuts.includes(trimmed)) {
          return parseModelsArg(trimmed);
        }
        return [m.trim()];
      });
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('\n⚡ RBIG Benchmark\n');
  console.log('═'.repeat(60));

  // Parse CLI arguments
  const cliOptions = parseCliArgs();

  // Validate environment
  const env = getEnv();

  // Load master aesthetic from config file
  const configService = new ConfigService();
  await configService.initialize();
  const masterAesthetic = configService.getMasterAesthetic();

  // Build provider configs based on what's available
  const providerConfigs: BenchmarkProviderConfigs = {};

  // Check if Vertex AI config is available
  if (env.GOOGLE_CLOUD_PROJECT) {
    providerConfigs.vertex = {
      projectId: env.GOOGLE_CLOUD_PROJECT,
      location: env.GOOGLE_CLOUD_LOCATION,
      getMasterAesthetic: () => masterAesthetic,
    };
  }

  // Check if OpenAI config is available
  if (env.OPENAI_API_KEY) {
    providerConfigs.openai = {
      apiKey: env.OPENAI_API_KEY,
      getMasterAesthetic: () => masterAesthetic,
    };
  }

  // Check if Gemini config is available
  if (env.GOOGLE_AI_API_KEY) {
    providerConfigs.gemini = {
      apiKey: env.GOOGLE_AI_API_KEY,
      getMasterAesthetic: () => masterAesthetic,
    };
  }

  // Display configuration
  console.log(`📊 Prompts:  ${cliOptions.prompts}`);
  console.log(`🤖 Models:   ${cliOptions.models.join(', ')}`);
  console.log(`⏱️  Delay:    ${cliOptions.delay}ms`);
  console.log('');
  console.log('🔧 Providers configured:');
  if (providerConfigs.vertex) {
    console.log(`   ✅ Vertex AI (${providerConfigs.vertex.projectId})`);
  } else {
    console.log('   ⚠️  Vertex AI (not configured)');
  }
  if (providerConfigs.openai) {
    console.log('   ✅ OpenAI (API key set)');
  } else {
    console.log('   ⚠️  OpenAI (not configured)');
  }
  if (providerConfigs.gemini) {
    console.log('   ✅ Gemini (API key set)');
  } else {
    console.log('   ⚠️  Gemini (not configured)');
  }
  console.log('═'.repeat(60) + '\n');

  const benchmarkConfig: BenchmarkConfig = {
    promptCount: cliOptions.prompts,
    models: cliOptions.models,
    delayMs: cliOptions.delay,
    aspectRatio: DEFAULTS.ASPECT_RATIO,
  };

  // Run benchmark
  const runner = new BenchmarkRunner(providerConfigs, benchmarkConfig);

  try {
    const report = await runner.run();

    // Generate HTML report
    const outputDir = join(DEFAULTS.BENCHMARK_DIR, report.runId);
    const reportPath = await generateHtmlReport(report, outputDir);

    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Benchmark Complete!\n');

    for (const model of report.models) {
      let provider = '🔵 Vertex';
      if (model.modelId.includes('dall-e')) {
        provider = '🟢 OpenAI';
      } else if (model.modelId.includes('gemini')) {
        provider = '🟣 Gemini';
      }
      console.log(`${provider} ${model.modelName}:`);
      console.log(`   Success Rate: ${model.successRate}%`);
      console.log(`   Avg Time:     ${formatMs(model.timing.mean)}`);
      console.log(`   P95 Time:     ${formatMs(model.timing.p95)}`);
      console.log('');
    }

    console.log('📁 Results saved to:');
    console.log(`   ${outputDir}/results.json`);
    console.log(`   ${reportPath}`);
    console.log('\n🌐 Open the HTML report in your browser to view the comparison gallery.\n');
  } catch (error) {
    defaultLogger.error({ error }, 'Benchmark failed');
    console.error('\n❌ Benchmark failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
