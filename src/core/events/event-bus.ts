/**
 * Event Bus Implementation
 *
 * Internal pub/sub system for SSE broadcasting.
 * Uses Node.js EventEmitter with type-safe wrapper.
 *
 * @module core/events/event-bus
 */

import { EventEmitter } from 'node:events';
import type { SystemEvent, EventHandler, Unsubscribe } from '../../types/index.js';
import { createChildLogger, defaultLogger } from '../../config/logger.js';
import type pino from 'pino';

// =============================================================================
// Event Bus Implementation
// =============================================================================

/**
 * Type-safe event bus for system-wide event broadcasting.
 *
 * Features:
 * - Pub/sub pattern with multiple subscribers
 * - Async iterator support for SSE streaming
 * - Memory leak prevention with proper cleanup
 * - Debug logging for all events
 *
 * @example
 * ```typescript
 * const eventBus = new EventBus();
 *
 * // Subscribe to events
 * const unsubscribe = eventBus.subscribe((event) => {
 *   console.log(event.type, event.payload);
 * });
 *
 * // Emit events
 * eventBus.emit({ type: 'STATUS_UPDATE', payload: { ... } });
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
export class EventBus {
  private readonly emitter: EventEmitter;
  private readonly logger: pino.Logger;
  private subscriberCount = 0;

  constructor() {
    this.emitter = new EventEmitter();
    this.logger = createChildLogger(defaultLogger, { component: 'EventBus' });

    // Increase max listeners for multiple SSE connections
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit an event to all subscribers.
   *
   * @param event - The event to emit
   */
  emit(event: SystemEvent): void {
    this.logger.debug(
      {
        eventType: event.type,
        subscriberCount: this.subscriberCount,
      },
      'Emitting event',
    );

    this.emitter.emit('system', event);
  }

  /**
   * Subscribe to all events.
   *
   * @param handler - Function to call for each event
   * @returns Unsubscribe function for cleanup
   */
  subscribe(handler: EventHandler): Unsubscribe {
    this.emitter.on('system', handler);
    this.subscriberCount++;

    this.logger.debug(
      { subscriberCount: this.subscriberCount },
      'Subscriber added',
    );

    return () => {
      this.emitter.off('system', handler);
      this.subscriberCount--;

      this.logger.debug(
        { subscriberCount: this.subscriberCount },
        'Subscriber removed',
      );
    };
  }

  /**
   * Get current subscriber count.
   * Useful for monitoring and debugging.
   */
  getSubscriberCount(): number {
    return this.subscriberCount;
  }

  /**
   * Create an async iterator for SSE streaming.
   *
   * The iterator yields events until the returned cleanup function is called.
   * Designed for use with SSE response streaming.
   *
   * @returns Object with iterator and cleanup function
   *
   * @example
   * ```typescript
   * const { iterator, cleanup } = eventBus.createAsyncIterator();
   *
   * try {
   *   for await (const event of iterator) {
   *     response.write(serializeSSE(event));
   *   }
   * } finally {
   *   cleanup();
   * }
   * ```
   */
  createAsyncIterator(): {
    iterator: AsyncIterableIterator<SystemEvent>;
    cleanup: () => void;
  } {
    const eventQueue: SystemEvent[] = [];
    let resolveNext: ((value: IteratorResult<SystemEvent>) => void) | null = null;
    let isDone = false;

    // Subscribe to events
    const handler: EventHandler = (event) => {
      if (isDone) return;

      if (resolveNext) {
        // Waiting consumer - deliver immediately
        const resolve = resolveNext;
        resolveNext = null;
        resolve({ value: event, done: false });
      } else {
        // No waiting consumer - queue the event
        eventQueue.push(event);
      }
    };

    const unsubscribe = this.subscribe(handler);

    const cleanup = (): void => {
      isDone = true;
      unsubscribe();

      // Resolve any pending next() with done
      if (resolveNext) {
        resolveNext({ value: undefined as unknown as SystemEvent, done: true });
        resolveNext = null;
      }
    };

    const iterator: AsyncIterableIterator<SystemEvent> = {
      [Symbol.asyncIterator]() {
        return this;
      },

      async next(): Promise<IteratorResult<SystemEvent>> {
        if (isDone) {
          return { value: undefined as unknown as SystemEvent, done: true };
        }

        // Check queue first
        const queued = eventQueue.shift();
        if (queued) {
          return { value: queued, done: false };
        }

        // Wait for next event
        return new Promise((resolve) => {
          resolveNext = resolve;
        });
      },

      async return(): Promise<IteratorResult<SystemEvent>> {
        cleanup();
        return { value: undefined as unknown as SystemEvent, done: true };
      },
    };

    return { iterator, cleanup };
  }

  /**
   * Remove all subscribers.
   * Useful for testing and shutdown.
   */
  removeAllSubscribers(): void {
    this.emitter.removeAllListeners('system');
    this.subscriberCount = 0;
    this.logger.debug('All subscribers removed');
  }
}


