import type {
  ComponentOptions,
  ZoidComponentInstance,
  Dimensions,
  PropsDefinition,
  TemplateContext,
  ParentExports,
} from '../types';
import type { ContextType } from '../constants';
import { CONTEXT, EVENT, MESSAGE_NAME } from '../constants';
import { EventEmitter } from '../events/emitter';
import { generateUID } from '../utils/uid';
import { CleanupManager } from '../utils/cleanup';
import { createDeferred, promiseTimeout } from '../utils/promise';
import { Messenger } from '../communication/messenger';
import { FunctionBridge } from '../communication/bridge';
import {
  getDomain,
  isSameDomain,
  isWindowClosed,
} from '../window/helpers';
import { buildWindowName, createWindowPayload } from '../window/name-payload';
import { registerWindow, unregisterWindow } from '../window/proxy';
import {
  normalizeProps,
  validateProps,
  getPropsForChild,
  serializeProps,
  propsToQueryParams,
} from '../props';
import {
  createIframe,
  destroyIframe,
  resizeIframe,
  showIframe,
  hideIframe,
  focusIframe,
} from '../render/iframe';
import {
  openPopup,
  closePopup,
  focusPopup,
  watchPopupClose,
  resizePopup,
} from '../render/popup';
import {
  defaultContainerTemplate,
  defaultPrerenderTemplate,
  swapPrerenderContent,
} from '../render/templates';

interface NormalizedOptions<P> {
  tag: string;
  url: string | ((props: P) => string);
  props: PropsDefinition<P>;
  defaultContext: ContextType;
  dimensions: Dimensions;
  timeout: number;
  domain?: ComponentOptions<P>['domain'];
  allowedParentDomains?: ComponentOptions<P>['allowedParentDomains'];
  containerTemplate?: ComponentOptions<P>['containerTemplate'];
  prerenderTemplate?: ComponentOptions<P>['prerenderTemplate'];
  eligible?: ComponentOptions<P>['eligible'];
  validate?: ComponentOptions<P>['validate'];
  attributes?: ComponentOptions<P>['attributes'];
  autoResize?: ComponentOptions<P>['autoResize'];
}

/**
 * Parent component implementation
 * Handles rendering and communication with child
 */
export class ParentComponent<P extends Record<string, unknown>, X = unknown>
  implements ZoidComponentInstance<P, X>
{
  public event: EventEmitter;
  public state: Record<string, unknown> = {};
  public exports?: X;

  private uid: string;
  private options: NormalizedOptions<P>;
  private props: P;
  private context: ContextType;

  private messenger: Messenger;
  private bridge: FunctionBridge;
  private cleanup: CleanupManager;

  private childWindow: Window | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private container: HTMLElement | null = null;
  private prerenderElement: HTMLElement | null = null;

  private initPromise: ReturnType<typeof createDeferred<void>> | null = null;
  private rendered = false;
  private destroyed = false;

  constructor(options: ComponentOptions<P>, props: Partial<P> = {}) {
    this.uid = generateUID();
    this.options = this.normalizeOptions(options);
    this.context = this.options.defaultContext;

    this.event = new EventEmitter();
    this.cleanup = new CleanupManager();
    this.messenger = new Messenger(this.uid, window, getDomain());
    this.bridge = new FunctionBridge(this.messenger);

    // Create prop context
    const propContext = this.createPropContext();

    // Normalize and validate props
    this.props = normalizeProps(props as Partial<P>, this.options.props, propContext);

    this.setupMessageHandlers();
    this.setupCleanup();
  }

  /**
   * Render the component into a container
   */
  async render(
    container?: string | HTMLElement,
    context?: ContextType
  ): Promise<void> {
    if (this.destroyed) {
      throw new Error('Component has been destroyed');
    }

    if (this.rendered) {
      throw new Error('Component has already been rendered');
    }

    this.context = context ?? this.options.defaultContext;

    // Check eligibility
    this.checkEligibility();

    // Validate props
    validateProps(this.props, this.options.props);

    // Resolve container
    this.container = this.resolveContainer(container);

    // Emit prerender
    this.event.emit(EVENT.PRERENDER);
    this.callPropCallback('onPrerender');

    // Create prerender element
    await this.prerender();

    this.event.emit(EVENT.PRERENDERED);
    this.callPropCallback('onPrerendered');

    // Emit render
    this.event.emit(EVENT.RENDER);
    this.callPropCallback('onRender');

    // Open child window
    await this.open();

    // Wait for child to initialize
    await this.waitForChild();

    // Swap prerender with actual content
    if (this.context === CONTEXT.IFRAME && this.iframe && this.prerenderElement) {
      await swapPrerenderContent(
        this.container,
        this.prerenderElement,
        this.iframe
      );
      this.prerenderElement = null;
    }

    this.rendered = true;

    // Emit rendered
    this.event.emit(EVENT.RENDERED);
    this.callPropCallback('onRendered');

    // Emit display
    this.event.emit(EVENT.DISPLAY);
    this.callPropCallback('onDisplay');
  }

  /**
   * Render into a different window's container
   */
  async renderTo(
    _win: Window,
    container?: string | HTMLElement,
    context?: ContextType
  ): Promise<void> {
    // For now, delegate to regular render
    // Full cross-window rendering would require additional complexity
    return this.render(container, context);
  }

  /**
   * Close and destroy the component
   */
  async close(): Promise<void> {
    if (this.destroyed) return;

    this.event.emit(EVENT.CLOSE);
    this.callPropCallback('onClose');

    await this.destroy();
  }

  /**
   * Focus the component window
   */
  async focus(): Promise<void> {
    if (this.context === CONTEXT.IFRAME && this.iframe) {
      focusIframe(this.iframe);
    } else if (this.context === CONTEXT.POPUP && this.childWindow) {
      focusPopup(this.childWindow);
    }

    this.event.emit(EVENT.FOCUS);
    this.callPropCallback('onFocus');
  }

  /**
   * Resize the component
   */
  async resize(dimensions: Dimensions): Promise<void> {
    if (this.context === CONTEXT.IFRAME && this.iframe) {
      resizeIframe(this.iframe, dimensions);
    } else if (this.context === CONTEXT.POPUP && this.childWindow) {
      resizePopup(this.childWindow, dimensions);
    }

    this.event.emit(EVENT.RESIZE, dimensions);
    this.callPropCallback('onResize', dimensions);
  }

  /**
   * Show the component
   */
  async show(): Promise<void> {
    if (this.context === CONTEXT.IFRAME && this.iframe) {
      showIframe(this.iframe);
    }
  }

  /**
   * Hide the component
   */
  async hide(): Promise<void> {
    if (this.context === CONTEXT.IFRAME && this.iframe) {
      hideIframe(this.iframe);
    }
  }

  /**
   * Update component props
   */
  async updateProps(newProps: Partial<P>): Promise<void> {
    const propContext = this.createPropContext();
    this.props = normalizeProps(
      { ...this.props, ...newProps },
      this.options.props,
      propContext
    );

    // Send updated props to child
    if (this.childWindow && !isWindowClosed(this.childWindow)) {
      const childDomain = this.getChildDomain();
      const propsForChild = getPropsForChild(
        this.props,
        this.options.props,
        childDomain,
        isSameDomain(this.childWindow)
      );
      const serialized = serializeProps(
        propsForChild as Record<string, unknown>,
        this.options.props as PropsDefinition<Record<string, unknown>>,
        this.bridge
      );

      await this.messenger.send(
        this.childWindow,
        childDomain,
        MESSAGE_NAME.PROPS,
        serialized
      );
    }

    this.event.emit(EVENT.PROPS, this.props);
    this.callPropCallback('onProps', this.props);
  }

  /**
   * Clone this instance with same props
   */
  clone(): ZoidComponentInstance<P, X> {
    return new ParentComponent(this.options, this.props);
  }

  /**
   * Check if component is eligible to render
   */
  isEligible(): boolean {
    if (!this.options.eligible) return true;

    const result = this.options.eligible({ props: this.props });
    return result.eligible;
  }

  // ==================== Private Methods ====================

  private normalizeOptions(options: ComponentOptions<P>): NormalizedOptions<P> {
    return {
      ...options,
      props: options.props ?? ({} as PropsDefinition<P>),
      defaultContext: options.defaultContext ?? CONTEXT.IFRAME,
      dimensions:
        typeof options.dimensions === 'function'
          ? options.dimensions(this.props)
          : options.dimensions ?? { width: '100%', height: '100%' },
      timeout: options.timeout ?? 10000,
    };
  }

  private createPropContext() {
    return {
      props: this.props,
      state: this.state,
      close: () => this.close(),
      focus: () => this.focus(),
      onError: (err: Error) => this.handleError(err),
      container: this.container,
      uid: this.uid,
      tag: this.options.tag,
    };
  }

  private resolveContainer(container?: string | HTMLElement): HTMLElement {
    if (!container) {
      throw new Error('Container is required for rendering');
    }

    if (typeof container === 'string') {
      const el = document.querySelector(container);
      if (!el) {
        throw new Error(`Container "${container}" not found`);
      }
      return el as HTMLElement;
    }

    return container;
  }

  private checkEligibility(): void {
    if (!this.options.eligible) return;

    const result = this.options.eligible({ props: this.props });
    if (!result.eligible) {
      throw new Error(`Component not eligible: ${result.reason ?? 'Unknown reason'}`);
    }
  }

  private async prerender(): Promise<void> {
    if (!this.container) return;

    const templateFn =
      this.options.prerenderTemplate ?? defaultPrerenderTemplate;
    const containerTemplateFn =
      this.options.containerTemplate ?? defaultContainerTemplate;

    const dimensions = this.options.dimensions;

    // Get cspNonce from props if available
    const cspNonce = (this.props as Record<string, unknown>).cspNonce as string | undefined;

    const templateContext: TemplateContext<P> & { cspNonce?: string } = {
      uid: this.uid,
      tag: this.options.tag,
      context: this.context,
      dimensions,
      props: this.props,
      doc: document,
      container: this.container,
      frame: null,
      prerenderFrame: null,
      close: () => this.close(),
      focus: () => this.focus(),
      cspNonce,
    };

    // Create container element
    const containerEl = containerTemplateFn(templateContext);
    if (containerEl) {
      this.container.appendChild(containerEl);
      this.container = containerEl;
    }

    // Create prerender element
    this.prerenderElement = templateFn(templateContext);
    if (this.prerenderElement) {
      this.container.appendChild(this.prerenderElement);
    }
  }

  private async open(): Promise<void> {
    const url = this.buildUrl();
    const windowName = this.buildWindowName();

    if (this.context === CONTEXT.IFRAME) {
      this.iframe = createIframe({
        url,
        name: windowName,
        container: this.container!,
        dimensions: this.options.dimensions,
        attributes:
          typeof this.options.attributes === 'function'
            ? this.options.attributes(this.props)
            : this.options.attributes,
      });

      // Hide initially (will show after prerender swap)
      hideIframe(this.iframe);

      this.childWindow = this.iframe.contentWindow;
    } else {
      this.childWindow = openPopup({
        url,
        name: windowName,
        dimensions: this.options.dimensions,
      });

      // Watch for popup close
      const stopWatching = watchPopupClose(this.childWindow, () => {
        this.destroy();
      });
      this.cleanup.register(stopWatching);
    }

    if (this.childWindow) {
      registerWindow(this.uid, this.childWindow);
    }
  }

  private buildUrl(): string {
    const baseUrl =
      typeof this.options.url === 'function'
        ? this.options.url(this.props)
        : this.options.url;

    // Add query params from props
    const queryParams = propsToQueryParams(this.props, this.options.props);
    const queryString = queryParams.toString();

    if (!queryString) return baseUrl;

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${queryString}`;
  }

  private buildWindowName(): string {
    const childDomain = this.getChildDomain();
    const propsForChild = getPropsForChild(
      this.props,
      this.options.props,
      childDomain,
      false // Assume cross-domain for initial payload
    );

    const serializedProps = serializeProps(
      propsForChild as Record<string, unknown>,
      this.options.props as PropsDefinition<Record<string, unknown>>,
      this.bridge
    );

    const payload = createWindowPayload({
      uid: this.uid,
      tag: this.options.tag,
      context: this.context,
      parentDomain: getDomain(),
      props: serializedProps,
      exports: this.createParentExports(),
    });

    return buildWindowName(payload);
  }

  private createParentExports(): ParentExports {
    return {
      init: MESSAGE_NAME.INIT,
      close: MESSAGE_NAME.CLOSE,
      resize: MESSAGE_NAME.RESIZE,
      show: MESSAGE_NAME.SHOW,
      hide: MESSAGE_NAME.HIDE,
      onError: MESSAGE_NAME.ERROR,
      updateProps: MESSAGE_NAME.PROPS,
      export: MESSAGE_NAME.EXPORT,
    };
  }

  private getChildDomain(): string {
    const url =
      typeof this.options.url === 'function'
        ? this.options.url(this.props)
        : this.options.url;

    try {
      return new URL(url, window.location.origin).origin;
    } catch {
      return '*';
    }
  }

  private async waitForChild(): Promise<void> {
    this.initPromise = createDeferred<void>();

    try {
      await promiseTimeout(
        this.initPromise.promise,
        this.options.timeout,
        `Child component "${this.options.tag}" did not initialize`
      );
    } catch (err) {
      this.handleError(err as Error);
      throw err;
    }
  }

  private setupMessageHandlers(): void {
    // Handle child init
    this.messenger.on(MESSAGE_NAME.INIT, () => {
      if (this.initPromise) {
        this.initPromise.resolve();
      }
      return { success: true };
    });

    // Handle close request from child
    this.messenger.on(MESSAGE_NAME.CLOSE, async () => {
      await this.close();
      return { success: true };
    });

    // Handle resize request from child
    this.messenger.on<Dimensions>(MESSAGE_NAME.RESIZE, async (dimensions) => {
      await this.resize(dimensions);
      return { success: true };
    });

    // Handle focus request from child
    this.messenger.on(MESSAGE_NAME.FOCUS, async () => {
      await this.focus();
      return { success: true };
    });

    // Handle show request from child
    this.messenger.on(MESSAGE_NAME.SHOW, async () => {
      await this.show();
      return { success: true };
    });

    // Handle hide request from child
    this.messenger.on(MESSAGE_NAME.HIDE, async () => {
      await this.hide();
      return { success: true };
    });

    // Handle error from child
    this.messenger.on<{ message: string; stack?: string }>(
      MESSAGE_NAME.ERROR,
      async (errorData) => {
        const error = new Error(errorData.message);
        error.stack = errorData.stack;
        this.handleError(error);
        return { success: true };
      }
    );

    // Handle exports from child
    this.messenger.on<X>(MESSAGE_NAME.EXPORT, async (exports) => {
      this.exports = exports;
      return { success: true };
    });
  }

  private setupCleanup(): void {
    this.cleanup.register(() => {
      this.messenger.destroy();
      this.bridge.destroy();
      this.event.removeAllListeners();
      unregisterWindow(this.uid);
    });
  }

  private handleError(error: Error): void {
    this.event.emit(EVENT.ERROR, error);
    this.callPropCallback('onError', error);
  }

  private callPropCallback(name: string, ...args: unknown[]): void {
    const callback = (this.props as Record<string, unknown>)[name];
    if (typeof callback === 'function') {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in ${name} callback:`, err);
      }
    }
  }

  private async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;

    // Destroy iframe
    if (this.iframe) {
      destroyIframe(this.iframe);
      this.iframe = null;
    }

    // Close popup
    if (this.context === CONTEXT.POPUP && this.childWindow) {
      closePopup(this.childWindow);
    }

    this.childWindow = null;

    // Remove prerender element
    if (this.prerenderElement) {
      this.prerenderElement.remove();
      this.prerenderElement = null;
    }

    // Cleanup
    await this.cleanup.cleanup();

    this.event.emit(EVENT.DESTROY);
    this.callPropCallback('onDestroy');
  }
}
