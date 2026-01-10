/**
 * @packageDocumentation
 * Host component implementation module.
 *
 * @remarks
 * This module contains the HostComponent class which runs inside the iframe
 * or popup and handles communication with the consumer window. It also provides
 * utilities for detecting host context and accessing xprops.
 */

import type {
  HostProps,
  WindowNamePayload,
  Dimensions,
  PropsDefinition,
  SerializedProps,
  SiblingInfo,
  GetSiblingsOptions,
  ForgeFrameComponent,
  HostComponentRef,
} from '../types';
import { MESSAGE_NAME, EVENT } from '../constants';
import { EventEmitter } from '../events/emitter';
import { Messenger } from '../communication/messenger';
import { FunctionBridge } from '../communication/bridge';
import {
  getDomain,
  getConsumer,
  getOpener,
  isIframe,
  isPopup,
} from '../window/helpers';
import {
  isForgeFrameWindow,
  getInitialPayload,
} from '../window/name-payload';
import { deserializeProps } from '../props/serialize';
import { create } from './component';

/**
 * Host-side component implementation.
 *
 * @remarks
 * This class runs inside the iframe or popup window and manages communication
 * with the consumer component. It provides the xprops object with props and
 * control methods.
 *
 * @typeParam P - The props type passed from the consumer
 *
 * @example
 * ```typescript
 * // In host window
 * const { email, onLogin, close } = window.xprops;
 * console.log('Email:', email);
 * onLogin({ id: 1, name: 'John' });
 * close();
 * ```
 *
 * @public
 */
export class HostComponent<P extends Record<string, unknown>> {
  /** The xprops object containing props and control methods. */
  public xprops: HostProps<P>;

  /** Event emitter for lifecycle events. */
  public event: EventEmitter;

  /** @internal */
  private uid: string;

  /** @internal */
  private tag: string;

  /** @internal */
  private consumerWindow: Window;

  /** @internal */
  private consumerDomain: string;

  /** @internal */
  private messenger: Messenger;

  /** @internal */
  private bridge: FunctionBridge;

  /** @internal */
  private propsHandlers: Set<(props: P) => void> = new Set();

  /** @internal */
  private consumerProps!: P;

  /** @internal */
  private initError: Error | null = null;

  /**
   * Creates a new HostComponent instance.
   *
   * @param payload - The payload parsed from window.name
   * @param propDefinitions - Optional prop definitions for deserialization
   */
  constructor(
    payload: WindowNamePayload<P>,
    private propDefinitions: PropsDefinition<P> = {}
  ) {
    this.uid = payload.uid;
    this.tag = payload.tag;
    this.consumerDomain = payload.consumerDomain;
    this.event = new EventEmitter();

    // Create messenger with consumer domain as trusted origin for security
    this.messenger = new Messenger(this.uid, window, getDomain(), this.consumerDomain);

    // IMPORTANT: Set up message handlers immediately after creating messenger
    // to prevent race conditions where consumer messages arrive before handlers exist
    this.setupMessageHandlers();

    // Now safe to resolve consumer and build xprops
    this.consumerWindow = this.resolveConsumerWindow();
    this.bridge = new FunctionBridge(this.messenger);
    this.xprops = this.buildXProps(payload);
    (window as unknown as { xprops: HostProps<P> }).xprops = this.xprops;

    this.sendInit();
  }

  /**
   * Returns the xprops object.
   *
   * @returns The xprops object with props and control methods
   */
  getProps(): HostProps<P> {
    return this.xprops;
  }

  /**
   * Resolves the consumer window reference (iframe parent or popup opener).
   * @internal
   */
  private resolveConsumerWindow(): Window {
    if (isIframe()) {
      const consumer = getConsumer();
      if (consumer) return consumer;
    }

    if (isPopup()) {
      const opener = getOpener();
      if (opener) return opener;
    }

    throw new Error('Could not resolve consumer window');
  }

  /**
   * Builds the xprops object with deserialized props and control methods.
   * @internal
   */
  private buildXProps(payload: WindowNamePayload<P>): HostProps<P> {
    const deserializedProps = deserializeProps(
      payload.props,
      this.propDefinitions,
      this.messenger,
      this.bridge,
      this.consumerWindow,
      this.consumerDomain
    );

    this.consumerProps = deserializedProps;

    return {
      ...deserializedProps,
      uid: this.uid,
      tag: this.tag,
      close: () => this.close(),
      focus: () => this.focus(),
      resize: (dimensions: Dimensions) => this.resize(dimensions),
      show: () => this.show(),
      hide: () => this.hide(),
      onProps: (handler: (props: P) => void) => this.onProps(handler),
      onError: (err: Error) => this.onError(err),
      getConsumer: () => this.consumerWindow,
      getConsumerDomain: () => this.consumerDomain,
      export: <T>(exports: T) => this.exportData(exports),
      consumer: {
        props: this.consumerProps,
        export: <T>(data: T) => this.consumerExport(data),
      },
      getSiblings: (options?: GetSiblingsOptions) => this.getSiblings(options),
      children: this.buildNestedComponents(payload.children),
    };
  }

  /**
   * Sends initialization message to the consumer.
   * @internal
   */
  private async sendInit(): Promise<void> {
    try {
      await this.messenger.send(
        this.consumerWindow,
        this.consumerDomain,
        MESSAGE_NAME.INIT,
        { uid: this.uid, tag: this.tag }
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.initError = error;

      this.event.emit(EVENT.ERROR, {
        type: 'init_failed',
        message: `Failed to initialize host component: ${error.message}`,
        error,
      });

      console.error('Failed to send init message:', err);
    }
  }

  /**
   * Returns the initialization error if one occurred.
   *
   * @returns The initialization error or null if successful
   */
  getInitError(): Error | null {
    return this.initError;
  }

  /**
   * Requests the consumer to close this component.
   * @internal
   */
  private async close(): Promise<void> {
    await this.messenger.send(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.CLOSE,
      {}
    );
  }

  /**
   * Focuses this window and notifies the consumer.
   * @internal
   */
  private async focus(): Promise<void> {
    window.focus();
    await this.messenger.send(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.FOCUS,
      {}
    );
  }

  /**
   * Requests the consumer to resize this component.
   * @internal
   */
  private async resize(dimensions: Dimensions): Promise<void> {
    await this.messenger.send(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.RESIZE,
      dimensions
    );
  }

  /**
   * Requests the consumer to show this component.
   * @internal
   */
  private async show(): Promise<void> {
    await this.messenger.send(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.SHOW,
      {}
    );
  }

  /**
   * Requests the consumer to hide this component.
   * @internal
   */
  private async hide(): Promise<void> {
    await this.messenger.send(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.HIDE,
      {}
    );
  }

  /**
   * Subscribes to prop updates from the consumer.
   * @internal
   */
  private onProps(handler: (props: P) => void): { cancel: () => void } {
    this.propsHandlers.add(handler);
    return {
      cancel: () => this.propsHandlers.delete(handler),
    };
  }

  /**
   * Reports an error to the consumer.
   * @internal
   */
  private async onError(err: Error): Promise<void> {
    await this.messenger.send(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.ERROR,
      {
        message: err.message,
        stack: err.stack,
      }
    );
  }

  /**
   * Exports data or methods to the consumer.
   * @internal
   */
  private async exportData<T>(exports: T): Promise<void> {
    await this.messenger.send(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.EXPORT,
      exports
    );
  }

  /**
   * Exports data to the consumer for bidirectional communication.
   * @internal
   */
  private async consumerExport<T>(data: T): Promise<void> {
    await this.messenger.send(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.CONSUMER_EXPORT,
      data
    );
  }

  /**
   * Gets information about sibling component instances.
   * @internal
   */
  private async getSiblings(options?: GetSiblingsOptions): Promise<SiblingInfo[]> {
    const response = await this.messenger.send<
      { uid: string; tag: string; options?: GetSiblingsOptions },
      SiblingInfo[]
    >(
      this.consumerWindow,
      this.consumerDomain,
      MESSAGE_NAME.GET_SIBLINGS,
      { uid: this.uid, tag: this.tag, options }
    );
    return response ?? [];
  }

  /**
   * Builds nested component factories from refs passed by the consumer.
   * @internal
   */
  private buildNestedComponents(
    nestedRefs?: Record<string, HostComponentRef>
  ): Record<string, ForgeFrameComponent> | undefined {
    if (!nestedRefs) return undefined;

    const components: Record<string, ForgeFrameComponent> = {};

    for (const [name, ref] of Object.entries(nestedRefs)) {
      try {
        components[name] = create({
          tag: ref.tag,
          url: ref.url,
          props: ref.props,
          dimensions: ref.dimensions,
          defaultContext: ref.defaultContext,
        });
      } catch (err) {
        console.warn(`Failed to create nested component "${name}":`, err);
      }
    }

    return Object.keys(components).length > 0 ? components : undefined;
  }

  /**
   * Sets up message handlers for consumer communication.
   * @internal
   */
  private setupMessageHandlers(): void {
    this.messenger.on<SerializedProps>(MESSAGE_NAME.PROPS, (serializedProps) => {
      try {
        const newProps = deserializeProps(
          serializedProps,
          this.propDefinitions,
          this.messenger,
          this.bridge,
          this.consumerWindow,
          this.consumerDomain
        );

        Object.assign(this.xprops, newProps);

        for (const handler of this.propsHandlers) {
          try {
            handler(newProps);
          } catch (err) {
            console.error('Error in props handler:', err);
          }
        }

        this.event.emit(EVENT.PROPS, newProps);

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Error deserializing props:', error);
        this.event.emit(EVENT.ERROR, error);
        throw error; // Propagate to consumer so it knows the update failed
      }
    });
  }

  /**
   * Destroys the host component and cleans up resources.
   */
  destroy(): void {
    this.messenger.destroy();
    this.bridge.destroy();
    this.event.removeAllListeners();
    this.propsHandlers.clear();
  }
}

/**
 * Global host instance (singleton per window).
 * @internal
 */
let hostInstance: HostComponent<Record<string, unknown>> | null = null;

/**
 * Initializes the host component if running in a ForgeFrame window.
 *
 * @remarks
 * This function detects if the current window was created by ForgeFrame
 * and sets up the host component with xprops. Returns null if not in
 * a ForgeFrame host context.
 *
 * @typeParam P - The props type passed from the consumer
 * @param propDefinitions - Optional prop definitions for deserialization
 * @returns The host component instance or null if not in a host window
 *
 * @example
 * ```typescript
 * const host = initHost();
 * if (host) {
 *   console.log('Running in ForgeFrame host context');
 *   console.log('Props:', host.xprops);
 * }
 * ```
 *
 * @public
 */
export function initHost<P extends Record<string, unknown>>(
  propDefinitions?: PropsDefinition<P>
): HostComponent<P> | null {
  if (hostInstance) {
    return hostInstance as HostComponent<P>;
  }

  if (!isForgeFrameWindow()) {
    return null;
  }

  const payload = getInitialPayload<P>();
  if (!payload) {
    console.error('Failed to parse ForgeFrame payload from window.name');
    return null;
  }

  hostInstance = new HostComponent(
    payload,
    propDefinitions
  ) as HostComponent<Record<string, unknown>>;

  return hostInstance as HostComponent<P>;
}

/**
 * Gets the current host component instance.
 *
 * @typeParam P - The props type passed from the consumer
 * @returns The host component instance or null if not initialized
 *
 * @public
 */
export function getHost<P extends Record<string, unknown>>(): HostComponent<P> | null {
  return hostInstance as HostComponent<P> | null;
}

/**
 * Checks if the current window is a ForgeFrame host context.
 *
 * @returns True if running inside a ForgeFrame iframe or popup
 *
 * @example
 * ```typescript
 * if (isHost()) {
 *   console.log('Running in ForgeFrame host');
 * }
 * ```
 *
 * @public
 */
export function isHost(): boolean {
  return isForgeFrameWindow();
}

/**
 * Gets the xprops object from the window.
 *
 * @remarks
 * This is a convenience function to access `window.xprops`.
 *
 * @typeParam P - The props type passed from the consumer
 * @returns The xprops object or undefined if not in a host context
 *
 * @example
 * ```typescript
 * const xprops = getXProps();
 * if (xprops) {
 *   xprops.onLogin({ id: 1, name: 'John' });
 * }
 * ```
 *
 * @public
 */
export function getXProps<P extends Record<string, unknown>>(): HostProps<P> | undefined {
  return (window as unknown as { xprops?: HostProps<P> }).xprops;
}
