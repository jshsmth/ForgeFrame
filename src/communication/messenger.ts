import type { Message } from '../types';
import { MESSAGE_TYPE } from '../constants';
import { generateShortUID } from '../utils/uid';
import { createDeferred, type Deferred } from '../utils/promise';
import {
  serializeMessage,
  deserializeMessage,
  createRequestMessage,
  createResponseMessage,
} from './protocol';

export type MessageHandler<T = unknown, R = unknown> = (
  data: T,
  source: { uid: string; domain: string }
) => R | Promise<R>;

interface PendingRequest {
  deferred: Deferred<unknown>;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Cross-domain messenger using postMessage
 * Replaces post-robot with a simpler implementation
 */
export class Messenger {
  private pending = new Map<string, PendingRequest>();
  private handlers = new Map<string, MessageHandler>();
  private listener: ((event: MessageEvent) => void) | null = null;
  private destroyed = false;

  constructor(
    private uid: string,
    private win: Window = window,
    private domain: string = window.location.origin
  ) {
    this.setupListener();
  }

  /**
   * Send a message and wait for response
   */
  async send<T = unknown, R = unknown>(
    targetWin: Window,
    targetDomain: string,
    name: string,
    data?: T,
    timeout = 10000
  ): Promise<R> {
    if (this.destroyed) {
      throw new Error('Messenger has been destroyed');
    }

    const id = generateShortUID();
    const message = createRequestMessage(id, name, data, {
      uid: this.uid,
      domain: this.domain,
    });

    const deferred = createDeferred<R>();
    const timeoutId = setTimeout(() => {
      this.pending.delete(id);
      deferred.reject(new Error(`Message "${name}" timed out after ${timeout}ms`));
    }, timeout);

    this.pending.set(id, {
      deferred: deferred as Deferred<unknown>,
      timeout: timeoutId,
    });

    try {
      targetWin.postMessage(serializeMessage(message), targetDomain);
    } catch (err) {
      this.pending.delete(id);
      clearTimeout(timeoutId);
      throw err;
    }

    return deferred.promise;
  }

  /**
   * Send a one-way message (no response expected)
   */
  post<T = unknown>(
    targetWin: Window,
    targetDomain: string,
    name: string,
    data?: T
  ): void {
    if (this.destroyed) {
      throw new Error('Messenger has been destroyed');
    }

    const id = generateShortUID();
    const message = createRequestMessage(id, name, data, {
      uid: this.uid,
      domain: this.domain,
    });

    targetWin.postMessage(serializeMessage(message), targetDomain);
  }

  /**
   * Register a handler for incoming messages
   * @returns Unsubscribe function
   */
  on<T = unknown, R = unknown>(
    name: string,
    handler: MessageHandler<T, R>
  ): () => void {
    this.handlers.set(name, handler as MessageHandler);
    return () => this.handlers.delete(name);
  }

  /**
   * Handle incoming postMessage events
   */
  private setupListener(): void {
    this.listener = (event: MessageEvent) => {
      // Ignore messages from self
      if (event.source === this.win) return;

      const message = deserializeMessage(event.data);
      if (!message) return;

      this.handleMessage(message, event.source as Window, event.origin);
    };

    this.win.addEventListener('message', this.listener);
  }

  /**
   * Process a received message
   */
  private async handleMessage(
    message: Message,
    sourceWin: Window,
    origin: string
  ): Promise<void> {
    // Handle response to a pending request
    if (message.type === MESSAGE_TYPE.RESPONSE) {
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        clearTimeout(pending.timeout);

        if (message.error) {
          const error = new Error(message.error.message);
          error.stack = message.error.stack;
          pending.deferred.reject(error);
        } else {
          pending.deferred.resolve(message.data);
        }
      }
      return;
    }

    // Handle incoming request
    if (message.type === MESSAGE_TYPE.REQUEST) {
      const handler = this.handlers.get(message.name);
      if (!handler) {
        // No handler registered, ignore
        return;
      }

      let responseData: unknown;
      let responseError: Error | undefined;

      try {
        responseData = await handler(message.data, message.source);
      } catch (err) {
        responseError = err instanceof Error ? err : new Error(String(err));
      }

      // Send response
      const response = createResponseMessage(
        message.id,
        responseData,
        { uid: this.uid, domain: this.domain },
        responseError
      );

      try {
        sourceWin.postMessage(serializeMessage(response), origin);
      } catch {
        // Window might be closed, ignore
      }
    }
  }

  /**
   * Clean up the messenger
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.listener) {
      this.win.removeEventListener('message', this.listener);
      this.listener = null;
    }

    // Reject all pending requests
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.deferred.reject(new Error('Messenger destroyed'));
    }
    this.pending.clear();
    this.handlers.clear();
  }

  /**
   * Check if messenger has been destroyed
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }
}
