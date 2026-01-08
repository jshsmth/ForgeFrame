import type {
  ChildProps,
  WindowNamePayload,
  Dimensions,
  PropsDefinition,
  SerializedProps,
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

/**
 * Child component implementation
 * Runs inside the iframe/popup and communicates with parent
 */
export class ChildComponent<P extends Record<string, unknown>> {
  public xprops: ChildProps<P>;
  public event: EventEmitter;

  private uid: string;
  private tag: string;
  private parentWindow: Window;
  private parentDomain: string;
  private messenger: Messenger;
  private bridge: FunctionBridge;
  private propsHandlers: Set<(props: P) => void> = new Set();

  constructor(
    payload: WindowNamePayload<P>,
    private propDefinitions: PropsDefinition<P> = {}
  ) {
    this.uid = payload.uid;
    this.tag = payload.tag;
    this.parentDomain = payload.parentDomain;
    this.event = new EventEmitter();

    // Resolve parent window
    this.parentWindow = this.resolveParentWindow();

    // Setup communication
    this.messenger = new Messenger(this.uid, window, getDomain());
    this.bridge = new FunctionBridge(this.messenger);

    // Build xprops
    this.xprops = this.buildXProps(payload);

    // Expose to window
    (window as unknown as { xprops: ChildProps<P> }).xprops = this.xprops;

    // Setup message handlers
    this.setupMessageHandlers();

    // Notify parent we're ready
    this.sendInit();
  }

  /**
   * Get the xprops object
   */
  getProps(): ChildProps<P> {
    return this.xprops;
  }

  /**
   * Resolve the parent window reference
   */
  private resolveParentWindow(): Window {
    // Check if we're in an iframe
    if (isIframe()) {
      const parent = getParent();
      if (parent) return parent;
    }

    // Check if we're a popup
    if (isPopup()) {
      const opener = getOpener();
      if (opener) return opener;
    }

    throw new Error('Could not resolve parent window');
  }

  /**
   * Build the xprops object for the child
   */
  private buildXProps(payload: WindowNamePayload<P>): ChildProps<P> {
    // Deserialize props from payload
    const deserializedProps = deserializeProps(
      payload.props,
      this.propDefinitions,
      this.messenger,
      this.bridge,
      this.parentWindow,
      this.parentDomain
    );

    // Build the full xprops object
    return {
      ...deserializedProps,

      // Identifiers
      uid: this.uid,
      tag: this.tag,

      // Control methods
      close: () => this.close(),
      focus: () => this.focus(),
      resize: (dimensions: Dimensions) => this.resize(dimensions),
      show: () => this.show(),
      hide: () => this.hide(),

      // Parent interaction
      onProps: (handler: (props: P) => void) => this.onProps(handler),
      onError: (err: Error) => this.onError(err),
      getParent: () => this.parentWindow,
      getParentDomain: () => this.parentDomain,

      // Exports
      export: <T>(exports: T) => this.exportData(exports),
    };
  }

  /**
   * Notify parent that child is initialized
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
      console.error('Failed to send init message:', err);
    }
  }

  /**
   * Close the component
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
   * Focus the component
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
   * Resize the component
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
   * Show the component
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
   * Hide the component
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
   * Subscribe to prop updates
   */
  private onProps(handler: (props: P) => void): { cancel: () => void } {
    this.propsHandlers.add(handler);
    return {
      cancel: () => this.propsHandlers.delete(handler),
    };
  }

  /**
   * Report an error to the parent
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
   * Export data/methods to parent
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
   * Setup handlers for incoming messages from parent
   */
  private setupMessageHandlers(): void {
    // Handle prop updates from parent
    this.messenger.on<SerializedProps>(MESSAGE_NAME.PROPS, (serializedProps) => {
      const newProps = deserializeProps(
        serializedProps,
        this.propDefinitions,
        this.messenger,
        this.bridge,
        this.parentWindow,
        this.parentDomain
      );

      // Update xprops
      Object.assign(this.xprops, newProps);

      // Notify handlers
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
   * Destroy the child component
   */
  destroy(): void {
    this.messenger.destroy();
    this.bridge.destroy();
    this.event.removeAllListeners();
    this.propsHandlers.clear();
  }
}

// Global child instance (singleton per window)
let childInstance: ChildComponent<Record<string, unknown>> | null = null;

/**
 * Initialize child component if in a ForgeFrame window
 * Returns the child instance or null if not in a child window
 */
export function initChild<P extends Record<string, unknown>>(
  propDefinitions?: PropsDefinition<P>
): ChildComponent<P> | null {
  // Already initialized
  if (childInstance) {
    return childInstance as ChildComponent<P>;
  }

  // Check if we're in a ForgeFrame window
  if (!isForgeFrameWindow()) {
    return null;
  }

  // Get payload from window name
  const payload = getInitialPayload<P>();
  if (!payload) {
    console.error('Failed to parse ForgeFrame payload from window.name');
    return null;
  }

  // Create child instance
  childInstance = new ChildComponent(
    payload,
    propDefinitions
  ) as ChildComponent<Record<string, unknown>>;

  return childInstance as ChildComponent<P>;
}

/**
 * Get the current child instance
 */
export function getChild<P extends Record<string, unknown>>(): ChildComponent<P> | null {
  return childInstance as ChildComponent<P> | null;
}

/**
 * Check if we're in a child component context
 */
export function isChild(): boolean {
  return isForgeFrameWindow();
}

/**
 * Get xprops from window (convenience function)
 */
export function getXProps<P extends Record<string, unknown>>(): ChildProps<P> | undefined {
  return (window as unknown as { xprops?: ChildProps<P> }).xprops;
}
