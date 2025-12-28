/**
 * System Event Types (SSE & Internal)
 *
 * Defines all events that flow through the EventBus.
 * Uses discriminated unions for type-safe event handling.
 *
 * @module types/events
 */

import { z } from 'zod';
import type { Job, JobStats, JobStatus } from './job.types.js';

// =============================================================================
// Event Type Literals
// =============================================================================

export const EventTypeSchema = z.enum([
  'INIT',
  'STATUS_UPDATE',
  'IMAGE_READY',
  'BATCH_COMPLETE',
  'ERROR',
  'HEARTBEAT',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

// =============================================================================
// Event Payloads (Discriminated Union)
// =============================================================================

/**
 * INIT Event - Sent on SSE connection to sync full state.
 * The dashboard uses this to render the initial gallery.
 */
export interface InitEvent {
  readonly type: 'INIT';
  readonly payload: {
    readonly jobs: readonly Job[];
    readonly stats: JobStats;
  };
}

/**
 * STATUS_UPDATE Event - Sent on any job state transition.
 * Enables real-time status updates in the dashboard.
 */
export interface StatusUpdateEvent {
  readonly type: 'STATUS_UPDATE';
  readonly payload: {
    readonly jobId: number;
    readonly status: JobStatus;
    readonly error?: string;
    readonly timestamp: string;
  };
}

/**
 * IMAGE_READY Event - Sent when an image is successfully generated.
 * The dashboard uses this to display the new image in the gallery.
 */
export interface ImageReadyEvent {
  readonly type: 'IMAGE_READY';
  readonly payload: {
    readonly jobId: number;
    readonly imageUrl: string;
    readonly timestamp: string;
  };
}

/**
 * BATCH_COMPLETE Event - Sent when all jobs are processed.
 * Signals the end of the batch processing run.
 */
export interface BatchCompleteEvent {
  readonly type: 'BATCH_COMPLETE';
  readonly payload: {
    readonly stats: JobStats;
    readonly duration: number; // milliseconds
    readonly timestamp: string;
  };
}

/**
 * ERROR Event - Sent for system-level errors.
 * Used for errors that aren't specific to a single job.
 */
export interface ErrorEvent {
  readonly type: 'ERROR';
  readonly payload: {
    readonly message: string;
    readonly code?: string;
    readonly timestamp: string;
  };
}

/**
 * HEARTBEAT Event - Keep-alive signal for SSE connections.
 * Prevents connection timeouts and enables disconnection detection.
 */
export interface HeartbeatEvent {
  readonly type: 'HEARTBEAT';
  readonly payload: {
    readonly timestamp: string;
  };
}

// =============================================================================
// Unified System Event Type
// =============================================================================

/**
 * Discriminated union of all system events.
 *
 * Usage:
 * ```typescript
 * function handleEvent(event: SystemEvent) {
 *   switch (event.type) {
 *     case 'INIT':
 *       // TypeScript knows event.payload has jobs and stats
 *       break;
 *     case 'IMAGE_READY':
 *       // TypeScript knows event.payload has jobId and imageUrl
 *       break;
 *   }
 * }
 * ```
 */
export type SystemEvent =
  | InitEvent
  | StatusUpdateEvent
  | ImageReadyEvent
  | BatchCompleteEvent
  | ErrorEvent
  | HeartbeatEvent;

// =============================================================================
// Event Handler Types
// =============================================================================

/**
 * Function signature for event subscribers.
 */
export type EventHandler = (event: SystemEvent) => void;

/**
 * Function to unsubscribe from events.
 */
export type Unsubscribe = () => void;

// =============================================================================
// SSE Wire Format
// =============================================================================

/**
 * Format for SSE transmission.
 * Matches the EventSource API expectations.
 */
export interface SSEMessage {
  readonly event: EventType;
  readonly data: string; // JSON stringified payload
  readonly id?: string;
  readonly retry?: number;
}

/**
 * Serialize an event to SSE wire format.
 */
export function serializeSSE(event: SystemEvent, id?: string): string {
  const lines: string[] = [];

  if (id) {
    lines.push(`id: ${id}`);
  }

  lines.push(`event: ${event.type}`);
  lines.push(`data: ${JSON.stringify(event.payload)}`);
  lines.push(''); // Empty line terminates the message

  return lines.join('\n') + '\n';
}


