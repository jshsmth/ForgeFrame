import type { EventHandler, EventEmitterInterface } from '../types';

/**
 * Simple typed event emitter for component lifecycle events
 */
export class EventEmitter implements EventEmitterInterface {
  private listeners = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    return () => this.off(event, handler as EventHandler);
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   * @returns Unsubscribe function
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const onceHandler: EventHandler<T> = (data) => {
      this.off(event, onceHandler as EventHandler);
      return handler(data);
    };
    return this.on(event, onceHandler);
  }

  /**
   * Emit an event with optional data
   */
  emit<T = unknown>(event: string, data?: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in event handler for "${event}":`, err);
      }
    }
  }

  /**
   * Unsubscribe from an event
   * If no handler provided, removes all handlers for that event
   */
  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      this.listeners.delete(event);
      return;
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get listener count for an event (useful for debugging)
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
