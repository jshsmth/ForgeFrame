/**
 * @packageDocumentation
 * Child component implementation module.
 *
 * @remarks
 * This module contains the ChildComponent class which runs inside the iframe
 * or popup and handles communication with the parent window. It also provides
 * utilities for detecting child context and accessing xprops.
 */

import type {
  ChildProps,
  WindowNamePayload,
  Dimensions,
  PropsDefinition,
  SerializedProps,
  SiblingInfo,
  GetSiblingsOptions,
  ForgeFrameComponent,
  ChildComponentRef,
} from '../types';
import { MESSAGE_NAME, EVENT } from '../constants';
import { EventEmitter } from '../events/emitter';
import { Messenger } from '../communication/messenger';
import { FunctionBridge } from '../communication/bridge';
import {
  getDomain,
  getParent,
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
 * Child-side component implementation.
 *
 * @remarks
 * This class runs inside the iframe or popup window and manages communication
 * with the parent component. It provides the xprops object with props and
 * control methods.
 *
 * @typeParam P - The props type passed from the parent
 *
 * @example
 * ```typescript
 * // In child window
 * const { email, onLogin, close } = window.xprops;
 * console.log('Email:', email);
 * onLogin({ id: 1, name: 'John' });
 * close();
 * ```
 *
 * @public
 */
export class ChildComponent<P extends Record<string, unknown>> {
  /** The xprops object containing props and control methods. */
  public xprops: ChildProps<P>;

  /** Event emitter for lifecycle events. */
  public event: EventEmitter;

  /** @internal */
  private uid: string;

  /** @internal */
  private tag: string;

  /** @internal */
  private parentWindow: Window;

  /** @internal */
  private parentDomain: string;

  /** @internal */
  private messenger: Messenger;

  /** @internal */
  private bridge: FunctionBridge;

  /** @internal */
  private propsHandlers: Set<(props: P) => void> = new Set();

  /** @internal */
  private parentProps!: P;

  /** @internal */
  private initError: Error | null = null;

  /**
   * Creates a new ChildComponent instance.
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
    this.parentDomain = payload.parentDomain;
    this.event = new EventEmitter();

    // Create messenger with parent domain as trusted origin for security
    this.messenger = new Messenger(this.uid, window, getDomain(), this.parentDomain);

    // IMPORTANT: Set up message handlers immediately after creating messenger
    // to prevent race conditions where parent messages arrive before handlers exist
    this.setupMessageHandlers();

    // Now safe to resolve parent and build xprops
    this.parentWindow = this.resolveParentWindow();
    this.bridge = new FunctionBridge(this.messenger);
    this.xprops = this.buildXProps(payload);
    (window as unknown as { xprops: ChildProps<P> }).xprops = this.xprops;

    this.sendInit();
  }

  /**
   * Returns the xprops object.
   *
   * @returns The xprops object with props and control methods
   */
  getProps(): ChildProps<P> {
    return this.xprops;
  }

  /**
   * Resolves the parent window reference (iframe parent or popup opener).
   * @internal
   */
  private resolveParentWindow(): Window {
    if (isIframe()) {
      const parent = getParent();
      if (parent) return parent;
    }

    if (isPopup()) {
      const opener = getOpener();
      if (opener) return opener;
    }

    throw new Error('Could not resolve parent window');
  }

  /**
   * Builds the xprops object with deserialized props and control methods.
   * @internal
   */
  private buildXProps(payload: WindowNamePayload<P>): ChildProps<P> {
    const deserializedProps = deserializeProps(
      payload.props,
      this.propDefinitions,
      this.messenger,
      this.bridge,
      this.parentWindow,
      this.parentDomain
    );

    this.parentProps = deserializedProps;

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
      getParent: () => this.parentWindow,
      getParentDomain: () => this.parentDomain,
      export: <T>(exports: T) => this.exportData(exports),
      parent: {
        props: this.parentProps,
        export: <T>(data: T) => this.parentExport(data),
      },
      getSiblings: (options?: GetSiblingsOptions) => this.getSiblings(options),
      children: this.buildChildComponents(payload.children),
    };
  }

  /**
   * Sends initialization message to the parent.
   * @internal
   */
  private async sendInit(): Promise<void> {
    try {
      await this.messenger.send(
        this.parentWindow,
        this.parentDomain,
        MESSAGE_NAME.INIT,
        { uid: this.uid, tag: this.tag }
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.initError = error;

      // Emit error event so parent/listeners can be notified
      this.event.emit(EVENT.ERROR, {
        type: 'init_failed',
        message: `Failed to initialize child component: ${error.message}`,
        error,
      });

      // Log for debugging
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
   * Requests the parent to close this component.
   * @internal
   */
  private async close(): Promise<void> {
    await this.messenger.send(
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.CLOSE,
      {}
    );
  }

  /**
   * Focuses this window and notifies the parent.
   * @internal
   */
  private async focus(): Promise<void> {
    window.focus();
    await this.messenger.send(
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.FOCUS,
      {}
    );
  }

  /**
   * Requests the parent to resize this component.
   * @internal
   */
  private async resize(dimensions: Dimensions): Promise<void> {
    await this.messenger.send(
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.RESIZE,
      dimensions
    );
  }

  /**
   * Requests the parent to show this component.
   * @internal
   */
  private async show(): Promise<void> {
    await this.messenger.send(
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.SHOW,
      {}
    );
  }

  /**
   * Requests the parent to hide this component.
   * @internal
   */
  private async hide(): Promise<void> {
    await this.messenger.send(
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.HIDE,
      {}
    );
  }

  /**
   * Subscribes to prop updates from the parent.
   * @internal
   */
  private onProps(handler: (props: P) => void): { cancel: () => void } {
    this.propsHandlers.add(handler);
    return {
      cancel: () => this.propsHandlers.delete(handler),
    };
  }

  /**
   * Reports an error to the parent.
   * @internal
   */
  private async onError(err: Error): Promise<void> {
    await this.messenger.send(
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.ERROR,
      {
        message: err.message,
        stack: err.stack,
      }
    );
  }

  /**
   * Exports data or methods to the parent.
   * @internal
   */
  private async exportData<T>(exports: T): Promise<void> {
    await this.messenger.send(
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.EXPORT,
      exports
    );
  }

  /**
   * Exports data to the parent for bidirectional communication.
   * @internal
   */
  private async parentExport<T>(data: T): Promise<void> {
    await this.messenger.send(
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.PARENT_EXPORT,
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
      this.parentWindow,
      this.parentDomain,
      MESSAGE_NAME.GET_SIBLINGS,
      { uid: this.uid, tag: this.tag, options }
    );
    return response ?? [];
  }

  /**
   * Builds child component factories from refs passed by the parent.
   * @internal
   */
  private buildChildComponents(
    childrenRefs?: Record<string, ChildComponentRef>
  ): Record<string, ForgeFrameComponent> | undefined {
    if (!childrenRefs) return undefined;

    const children: Record<string, ForgeFrameComponent> = {};

    for (const [name, ref] of Object.entries(childrenRefs)) {
      try {
        children[name] = create({
          tag: ref.tag,
          url: ref.url,
          props: ref.props,
          dimensions: ref.dimensions,
          defaultContext: ref.defaultContext,
        });
      } catch (err) {
        console.warn(`Failed to create child component "${name}":`, err);
      }
    }

    return Object.keys(children).length > 0 ? children : undefined;
  }

  /**
   * Sets up message handlers for parent communication.
   * @internal
   */
  private setupMessageHandlers(): void {
    this.messenger.on<SerializedProps>(MESSAGE_NAME.PROPS, (serializedProps) => {
      const newProps = deserializeProps(
        serializedProps,
        this.propDefinitions,
        this.messenger,
        this.bridge,
        this.parentWindow,
        this.parentDomain
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
    });
  }

  /**
   * Destroys the child component and cleans up resources.
   */
  destroy(): void {
    this.messenger.destroy();
    this.bridge.destroy();
    this.event.removeAllListeners();
    this.propsHandlers.clear();
  }
}

/**
 * Global child instance (singleton per window).
 * @internal
 */
let childInstance: ChildComponent<Record<string, unknown>> | null = null;

/**
 * Initializes the child component if running in a ForgeFrame window.
 *
 * @remarks
 * This function detects if the current window was created by ForgeFrame
 * and sets up the child component with xprops. Returns null if not in
 * a ForgeFrame child context.
 *
 * @typeParam P - The props type passed from the parent
 * @param propDefinitions - Optional prop definitions for deserialization
 * @returns The child component instance or null if not in a child window
 *
 * @example
 * ```typescript
 * const child = initChild();
 * if (child) {
 *   console.log('Running in ForgeFrame child context');
 *   console.log('Props:', child.xprops);
 * }
 * ```
 *
 * @public
 */
export function initChild<P extends Record<string, unknown>>(
  propDefinitions?: PropsDefinition<P>
): ChildComponent<P> | null {
  if (childInstance) {
    return childInstance as ChildComponent<P>;
  }

  if (!isForgeFrameWindow()) {
    return null;
  }

  const payload = getInitialPayload<P>();
  if (!payload) {
    console.error('Failed to parse ForgeFrame payload from window.name');
    return null;
  }

  childInstance = new ChildComponent(
    payload,
    propDefinitions
  ) as ChildComponent<Record<string, unknown>>;

  return childInstance as ChildComponent<P>;
}

/**
 * Gets the current child component instance.
 *
 * @typeParam P - The props type passed from the parent
 * @returns The child component instance or null if not initialized
 *
 * @public
 */
export function getChild<P extends Record<string, unknown>>(): ChildComponent<P> | null {
  return childInstance as ChildComponent<P> | null;
}

/**
 * Checks if the current window is a ForgeFrame child context.
 *
 * @returns True if running inside a ForgeFrame iframe or popup
 *
 * @example
 * ```typescript
 * if (isChild()) {
 *   console.log('Running in ForgeFrame child');
 * }
 * ```
 *
 * @public
 */
export function isChild(): boolean {
  return isForgeFrameWindow();
}

/**
 * Gets the xprops object from the window.
 *
 * @remarks
 * This is a convenience function to access `window.xprops`.
 *
 * @typeParam P - The props type passed from the parent
 * @returns The xprops object or undefined if not in a child context
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
export function getXProps<P extends Record<string, unknown>>(): ChildProps<P> | undefined {
  return (window as unknown as { xprops?: ChildProps<P> }).xprops;
}
