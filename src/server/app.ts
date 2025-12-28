/**
 * Fastify Application Factory
 *
 * Creates and configures the Fastify server instance.
 * Handles static file serving and route registration.
 *
 * @module server/app
 */

import { resolve } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import type { EventBus, StateManager, ConfigService } from "../core/index.js";
import { registerEventsRoute } from "./routes/events.route.js";
import { registerDashboardRoute } from "./routes/dashboard.route.js";
import { registerApiRoutes } from "./routes/api.route.js";
import { registerBenchmarkRoutes } from "./routes/benchmark.route.js";
import { registerReferenceRoutes } from "./routes/reference.route.js";
import { registerBatchRoutes } from "./routes/batch.route.js";
import type { Orchestrator } from "../core/index.js";
import type { VertexConfig } from "../types/index.js";
import { DEFAULTS } from "../types/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Server configuration options.
 */
export interface ServerConfig {
  /** Port to listen on */
  readonly port: number;
  /** Absolute path to output directory for static serving */
  readonly outputDir: string;
  /** Log level for Pino */
  readonly logLevel: string;
}

/**
 * Dependencies required by the server.
 */
export interface ServerDependencies {
  readonly eventBus: EventBus;
  readonly stateManager: StateManager;
  readonly orchestrator: Orchestrator;
  readonly configService: ConfigService;
  readonly env: import("../types/index.js").EnvConfig;
  readonly vertexConfig?: VertexConfig;
  readonly openaiApiKey?: string;
  readonly geminiApiKey?: string;
}

// =============================================================================
// Application Factory
// =============================================================================

/**
 * Create and configure a Fastify application.
 *
 * Features:
 * - Static file serving for generated images
 * - SSE endpoint for real-time updates
 * - Dashboard HTML serving
 * - Health check endpoint
 *
 * @param config - Server configuration
 * @param deps - Server dependencies
 * @returns Configured Fastify instance
 */
export async function createApp(
  config: ServerConfig,
  deps: ServerDependencies
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Static File Serving
  // ---------------------------------------------------------------------------

  // Serve generated images from /output
  await app.register(fastifyStatic, {
    root: resolve(config.outputDir),
    prefix: "/output/",
    decorateReply: true,
  });

  // Serve benchmark results from /benchmark
  await app.register(fastifyStatic, {
    root: resolve(DEFAULTS.BENCHMARK_DIR),
    prefix: "/benchmark/",
    decorateReply: false,
  });

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  // Health check endpoint
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // SSE events endpoint
  registerEventsRoute(app, deps.eventBus, deps.stateManager);

  // API endpoints
  registerApiRoutes(app, {
    orchestrator: deps.orchestrator,
    stateManager: deps.stateManager,
    configService: deps.configService,
    env: deps.env,
  });

  // Reference image management endpoints (Controlled Generation)
  registerReferenceRoutes(app, {
    stateManager: deps.stateManager,
  });

  // Benchmark API
  const benchmarkDeps: Parameters<typeof registerBenchmarkRoutes>[1] = {
    configService: deps.configService,
    ...(deps.vertexConfig ? { vertexConfig: deps.vertexConfig } : {}),
    ...(deps.openaiApiKey ? { openaiApiKey: deps.openaiApiKey } : {}),
    ...(deps.geminiApiKey ? { geminiApiKey: deps.geminiApiKey } : {}),
  };
  registerBenchmarkRoutes(app, benchmarkDeps);

  // Batch Generation API
  registerBatchRoutes(app, {
    configService: deps.configService,
    env: deps.env,
  });

  // Dashboard HTML
  registerDashboardRoute(app);

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error, "Request error");

    const statusCode =
      error instanceof Error && "statusCode" in error
        ? (error as { statusCode: number }).statusCode
        : 500;

    const message =
      error instanceof Error ? error.message : "An error occurred";

    reply.status(statusCode).send({
      error: "Internal Server Error",
      message: process.env["NODE_ENV"] === "production" ? "An error occurred" : message,
    });
  });

  return app;
}

