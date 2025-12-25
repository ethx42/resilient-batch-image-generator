/**
 * Application Lifecycle Management
 *
 * Handles graceful shutdown on SIGTERM/SIGINT.
 * Ensures current job completes and state is saved.
 *
 * @module core/lifecycle
 */

import type { FastifyInstance } from "fastify";
import type { Orchestrator } from "./orchestrator.js";
import { DEFAULTS } from "../types/index.js";
import { createChildLogger, defaultLogger } from "../config/index.js";
import type pino from "pino";

// =============================================================================
// Types
// =============================================================================

/**
 * Dependencies required for graceful shutdown.
 */
export interface ShutdownDependencies {
  readonly orchestrator: Orchestrator;
  readonly server: FastifyInstance;
}

// =============================================================================
// Lifecycle Management
// =============================================================================

/**
 * Setup graceful shutdown handlers.
 *
 * On SIGTERM or SIGINT:
 * 1. Stop accepting new connections
 * 2. Close the HTTP server
 * 3. Signal orchestrator to stop (finishes current job)
 * 4. Exit cleanly
 *
 * A timeout ensures we don't hang indefinitely.
 *
 * @param deps - Shutdown dependencies
 */
export function setupGracefulShutdown(deps: ShutdownDependencies): void {
  const logger: pino.Logger = createChildLogger(defaultLogger, {
    component: "Lifecycle",
  });

  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      logger.warn({ signal }, "Shutdown already in progress, ignoring signal");
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, "Shutdown signal received");

    // Set a hard timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      logger.error("Shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, DEFAULTS.SHUTDOWN_TIMEOUT_MS);

    try {
      // 1. Stop the HTTP server (stop accepting new connections)
      logger.debug("Closing HTTP server...");
      await deps.server.close();
      logger.info("HTTP server closed");

      // 2. Stop the orchestrator (finishes current job)
      logger.debug("Stopping orchestrator...");
      await deps.orchestrator.stop();
      logger.info("Orchestrator stopped");

      // 3. Clear timeout and exit cleanly
      clearTimeout(timeoutId);
      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error(
        { error: error instanceof Error ? error.message : error },
        "Error during shutdown"
      );
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.fatal({ error: error.message, stack: error.stack }, "Uncaught exception");
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    logger.fatal(
      { reason: reason instanceof Error ? reason.message : reason },
      "Unhandled promise rejection"
    );
    process.exit(1);
  });

  logger.debug("Graceful shutdown handlers registered");
}

