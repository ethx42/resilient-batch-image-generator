/**
 * SSE Events Route
 *
 * Server-Sent Events endpoint for real-time dashboard updates.
 * Streams job status changes, image completions, and batch progress.
 *
 * @module server/routes/events
 */

import type { FastifyInstance } from "fastify";
import type { EventBus } from "../../core/index.js";
import type { StateManager } from "../../core/index.js";
import { serializeSSE } from "../../types/index.js";
import { DEFAULTS } from "../../types/index.js";

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Register the SSE events endpoint.
 *
 * Endpoint: GET /events
 *
 * Protocol: Server-Sent Events (text/event-stream)
 *
 * Events:
 * - INIT: Full state sync on connection
 * - STATUS_UPDATE: Job state transitions
 * - IMAGE_READY: Successful generation
 * - BATCH_COMPLETE: All jobs processed
 * - HEARTBEAT: Keep-alive signal
 *
 * @param app - Fastify instance
 * @param eventBus - Event bus for subscribing to events
 * @param stateManager - State manager for initial state
 */
export function registerEventsRoute(
  app: FastifyInstance,
  eventBus: EventBus,
  stateManager: StateManager
): void {
  app.get("/events", async (request, reply) => {
    const clientId = Math.random().toString(36).slice(2, 10);

    app.log.info({ clientId }, "SSE client connected");

    // Set SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    // Send initial state
    await sendInitialState(reply.raw, stateManager, clientId);

    // Subscribe to events
    const unsubscribe = eventBus.subscribe((event) => {
      try {
        const sseData = serializeSSE(event);
        reply.raw.write(sseData);
      } catch (error) {
        app.log.error(
          { clientId, error: error instanceof Error ? error.message : error },
          "Failed to send SSE event"
        );
      }
    });

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        const heartbeat = serializeSSE({
          type: "HEARTBEAT",
          payload: { timestamp: new Date().toISOString() },
        });
        reply.raw.write(heartbeat);
      } catch {
        // Connection likely closed
        clearInterval(heartbeatInterval);
      }
    }, DEFAULTS.HEARTBEAT_INTERVAL_MS);

    // Cleanup on disconnect
    request.raw.on("close", () => {
      app.log.info({ clientId }, "SSE client disconnected");
      clearInterval(heartbeatInterval);
      unsubscribe();
    });

    // Keep the connection open (don't call reply.send())
    // Fastify will handle this as a raw response
  });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Send the initial state to a newly connected client.
 */
async function sendInitialState(
  response: NodeJS.WritableStream,
  stateManager: StateManager,
  clientId: string
): Promise<void> {
  try {
    const jobs = await stateManager.getAllJobs();
    const stats = await stateManager.getStats();

    const initEvent = serializeSSE({
      type: "INIT",
      payload: { jobs, stats },
    });

    response.write(initEvent);
  } catch (error) {
    console.error(`[${clientId}] Failed to send initial state:`, error);
  }
}




