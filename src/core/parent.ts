/**
 * @packageDocumentation
 * Parent component implementation module.
 *
 * @remarks
 * This module contains the ParentComponent class which handles the host-side
 * rendering and communication with child components embedded in iframes or popups.
 */

import type {
  ComponentOptions,
  ForgeFrameComponentInstance,
  Dimensions,
  PropsDefinition,
  TemplateContext,
  ParentExports,
  SiblingInfo,
  GetSiblingsOptions,
  ChildComponentRef,
  ForgeFrameComponent,
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
import { getComponent } from './component';

/**
 * Normalized and validated component options.
 * @internal
 */
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
  style?: ComponentOptions<P>['style'];
  autoResize?: ComponentOptions<P>['autoResize'];
  children?: ComponentOptions<P>['children'];
}

/**
 * Parent-side component implementation.
 *
 * @remarks
 * This class manages the lifecycle of a component from the host page perspective.
 * It handles rendering the component into iframes or popups, communicating with
 * the child window via postMessage, and managing component state.
 *
 * @typeParam P - The props type passed to the component
 * @typeParam X - The exports type that the child can expose to the parent
 *
 * @example
 * ```typescript
 * const instance = new ParentComponent(options, { email: 'user@example.com' });
 * await instance.render('#container');
 * ```
 *
 * @public
 */
export class ParentComponent<P extends Record<string, unknown>, X = unknown>
  implements ForgeFrameComponentInstance<P, X>
{
  /** Event emitter for lifecycle events. */
  public event: EventEmitter;

  /** Arbitrary state storage for the component instance. */
  public state: Record<string, unknown> = {};

  /** Data exported by the child component. */
  public exports?: X;

  /** Data exported from the parent by the child. */
  public parentExports?: unknown;

  /** @internal */
  private _uid: string;

  /**
   * Unique instance identifier.
   * @readonly
   */
  public get uid(): string {
    return this._uid;
  }

  /** @internal */
  private options: NormalizedOptions<P>;

  /** @internal */
  private props: P;

  /** @internal */
  private context: ContextType;

  /** @internal */
  private messenger: Messenger;

  /** @internal */
  private bridge: FunctionBridge;

  /** @internal */
  private cleanup: CleanupManager;

  /** @internal */
  private childWindow: Window | null = null;

  /** @internal */
  private iframe: HTMLIFrameElement | null = null;

  /** @internal */
  private container: HTMLElement | null = null;

  /** @internal */
  private prerenderElement: HTMLElement | null = null;

  /** @internal */
  private initPromise: ReturnType<typeof createDeferred<void>> | null = null;

  /** @internal */
  private rendered = false;

  /** @internal */
  private destroyed = false;

  /**
   * Creates a new ParentComponent instance.
   *
   * @param options - Component configuration options
   * @param props - Initial props to pass to the component
   */
  constructor(options: ComponentOptions<P>, props: Partial<P> = {}) {
    this._uid = generateUID();
    this.options = this.normalizeOptions(options);
    this.context = this.options.defaultContext;

    this.event = new EventEmitter();
    this.cleanup = new CleanupManager();
    this.messenger = new Messenger(this.uid, window, getDomain());
    this.bridge = new FunctionBridge(this.messenger);

    const propContext = this.createPropContext();
    this.props = normalizeProps(props as Partial<P>, this.options.props, propContext);

    this.setupMessageHandlers();
    this.setupCleanup();
  }

  /**
   * Renders the component into a DOM container.
   *
   * @remarks
   * This is the primary method for displaying the component. It creates
   * an iframe or popup, establishes communication with the child, and
   * handles the prerender/render lifecycle.
   *
   * @param container - CSS selector or HTMLElement to render into
   * @param context - Override the default rendering context (iframe or popup)
   * @throws Error if component was already destroyed or rendered
   *
   * @example
   * ```typescript
   * await instance.render('#container');
   * await instance.render(document.getElementById('target'), 'popup');
   * ```
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

    this.checkEligibility();
    validateProps(this.props, this.options.props);
    this.container = this.resolveContainer(container);

    this.event.emit(EVENT.PRERENDER);
    this.callPropCallback('onPrerender');

    await this.prerender();

    this.event.emit(EVENT.PRERENDERED);
    this.callPropCallback('onPrerendered');

    this.event.emit(EVENT.RENDER);
    this.callPropCallback('onRender');

    await this.open();
    await this.waitForChild();

    if (this.context === CONTEXT.IFRAME && this.iframe && this.prerenderElement) {
      await swapPrerenderContent(
        this.container,
        this.prerenderElement,
        this.iframe
      );
      this.prerenderElement = null;
    }

    this.rendered = true;

    this.event.emit(EVENT.RENDERED);
    this.callPropCallback('onRendered');

    this.event.emit(EVENT.DISPLAY);
    this.callPropCallback('onDisplay');
  }

  /**
   * Renders the component into a container in a different window.
   *
   * @remarks
   * Currently delegates to regular render. Full cross-window rendering
   * would require additional complexity.
   *
   * @param _win - Target window (currently unused)
   * @param container - CSS selector or HTMLElement to render into
   * @param context - Override the default rendering context
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
   * Closes and destroys the component.
   *
   * @remarks
   * Emits the 'close' event before destruction. Safe to call multiple times.
   */
  async close(): Promise<void> {
    if (this.destroyed) return;

    this.event.emit(EVENT.CLOSE);

    await this.destroy();
  }

  /**
   * Focuses the component window.
   *
   * @remarks
   * For iframes, focuses the iframe element. For popups, brings the window to front.
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
   * Resizes the component to the specified dimensions.
   *
   * @param dimensions - New width and height for the component
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
   * Shows the component if hidden.
   *
   * @remarks
   * Only applicable to iframe context.
   */
  async show(): Promise<void> {
    if (this.context === CONTEXT.IFRAME && this.iframe) {
      showIframe(this.iframe);
    }
  }

  /**
   * Hides the component.
   *
   * @remarks
   * Only applicable to iframe context.
   */
  async hide(): Promise<void> {
    if (this.context === CONTEXT.IFRAME && this.iframe) {
      hideIframe(this.iframe);
    }
  }

  /**
   * Updates the component props and sends them to the child.
   *
   * @remarks
   * Props are normalized and serialized before being sent to the child window.
   *
   * @param newProps - Partial props object to merge with existing props
   */
  async updateProps(newProps: Partial<P>): Promise<void> {
    const propContext = this.createPropContext();
    this.props = normalizeProps(
      { ...this.props, ...newProps },
      this.options.props,
      propContext
    );

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
   * Creates a clone of this instance with the same props.
   *
   * @returns A new unrendered component instance with identical configuration
   */
  clone(): ForgeFrameComponentInstance<P, X> {
    return new ParentComponent(this.options, this.props);
  }

  /**
   * Checks if the component is eligible to render based on the eligible option.
   *
   * @returns True if eligible or no eligibility check defined
   */
  isEligible(): boolean {
    if (!this.options.eligible) return true;

    const result = this.options.eligible({ props: this.props });
    return result.eligible;
  }

  /**
   * Normalizes component options with default values.
   * @internal
   */
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
      children: options.children,
    };
  }

  /**
   * Creates the prop context passed to prop callbacks and validators.
   * @internal
   */
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

  /**
   * Resolves a container selector or element to an HTMLElement.
   * @internal
   */
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

  /**
   * Checks eligibility and throws if component cannot render.
   * @internal
   */
  private checkEligibility(): void {
    if (!this.options.eligible) return;

    const result = this.options.eligible({ props: this.props });
    if (!result.eligible) {
      throw new Error(`Component not eligible: ${result.reason ?? 'Unknown reason'}`);
    }
  }

  /**
   * Creates and displays the prerender (loading) content.
   * @internal
   */
  private async prerender(): Promise<void> {
    if (!this.container) return;

    const prerenderTemplateFn =
      this.options.prerenderTemplate ?? defaultPrerenderTemplate;
    const containerTemplateFn =
      this.options.containerTemplate ?? defaultContainerTemplate;

    const dimensions = this.options.dimensions;
    const cspNonce = (this.props as Record<string, unknown>).cspNonce as string | undefined;

    // Pre-create iframe element for iframe context (zoid-style)
    // This allows containerTemplate to place it anywhere in the DOM
    // We set the window name now (carries payload) but not src (loads content)
    if (this.context === CONTEXT.IFRAME) {
      const windowName = this.buildWindowName();
      this.iframe = this.createIframeElement(windowName);
      hideIframe(this.iframe);
    }

    // Create prerender element
    const prerenderContext: TemplateContext<P> & { cspNonce?: string } = {
      uid: this.uid,
      tag: this.options.tag,
      context: this.context,
      dimensions,
      props: this.props,
      doc: document,
      container: this.container,
      frame: this.iframe,
      prerenderFrame: null,
      close: () => this.close(),
      focus: () => this.focus(),
      cspNonce,
    };

    this.prerenderElement = prerenderTemplateFn(prerenderContext);

    // Create template context with pre-created frame elements
    const templateContext: TemplateContext<P> & { cspNonce?: string } = {
      uid: this.uid,
      tag: this.options.tag,
      context: this.context,
      dimensions,
      props: this.props,
      doc: document,
      container: this.container,
      frame: this.iframe,
      prerenderFrame: this.prerenderElement,
      close: () => this.close(),
      focus: () => this.focus(),
      cspNonce,
    };

    // Call containerTemplate - it's responsible for placing frame and prerenderFrame
    const containerEl = containerTemplateFn(templateContext);
    if (containerEl) {
      this.container.appendChild(containerEl);
      this.container = containerEl;
    }

    // If containerTemplate didn't place the elements, append them to container
    // This maintains backwards compatibility with simple templates
    if (this.prerenderElement && !this.prerenderElement.parentNode) {
      this.container.appendChild(this.prerenderElement);
    }
    if (this.iframe && !this.iframe.parentNode) {
      this.container.appendChild(this.iframe);
    }
  }

  /**
   * Creates an iframe element without setting src (for prerender phase).
   * The window name is set immediately as it carries the payload for the child.
   * @internal
   */
  private createIframeElement(windowName: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    const dimensions = this.options.dimensions;
    const attributes = typeof this.options.attributes === 'function'
      ? this.options.attributes(this.props)
      : this.options.attributes ?? {};
    const style = typeof this.options.style === 'function'
      ? this.options.style(this.props)
      : this.options.style ?? {};

    // Set name first - carries the payload that child reads from window.name
    iframe.name = windowName;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('scrolling', 'auto');

    // Apply dimensions
    if (dimensions.width !== undefined) {
      iframe.style.width = typeof dimensions.width === 'number'
        ? `${dimensions.width}px`
        : dimensions.width;
    }
    if (dimensions.height !== undefined) {
      iframe.style.height = typeof dimensions.height === 'number'
        ? `${dimensions.height}px`
        : dimensions.height;
    }

    // Apply HTML attributes
    for (const [key, value] of Object.entries(attributes)) {
      if (value === undefined) continue;
      if (typeof value === 'boolean') {
        if (value) iframe.setAttribute(key, '');
      } else {
        iframe.setAttribute(key, value);
      }
    }

    // Apply CSS styles
    for (const [key, value] of Object.entries(style)) {
      if (value === undefined) continue;
      const cssValue = typeof value === 'number' ? `${value}px` : value;
      iframe.style.setProperty(
        key.replace(/([A-Z])/g, '-$1').toLowerCase(),
        String(cssValue)
      );
    }

    // Default sandbox if not specified
    if (!attributes.sandbox) {
      iframe.setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
      );
    }

    return iframe;
  }

  /**
   * Opens the child window (iframe or popup).
   * @internal
   */
  private async open(): Promise<void> {
    const url = this.buildUrl();

    if (this.context === CONTEXT.IFRAME) {
      // Iframe was pre-created in prerender() with name already set
      // Now just set src to start loading content
      if (!this.iframe) {
        throw new Error('Iframe not created during prerender');
      }

      this.iframe.src = url;
      this.childWindow = this.iframe.contentWindow;
    } else {
      const windowName = this.buildWindowName();
      this.childWindow = openPopup({
        url,
        name: windowName,
        dimensions: this.options.dimensions,
      });

      const stopWatching = watchPopupClose(this.childWindow, () => {
        this.destroy();
      });
      this.cleanup.register(stopWatching);
    }

    if (this.childWindow) {
      registerWindow(this.uid, this.childWindow);
    }
  }

  /**
   * Builds the URL for the child window including query parameters.
   * @internal
   */
  private buildUrl(): string {
    const baseUrl =
      typeof this.options.url === 'function'
        ? this.options.url(this.props)
        : this.options.url;

    const queryParams = propsToQueryParams(this.props, this.options.props);
    const queryString = queryParams.toString();

    if (!queryString) return baseUrl;

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${queryString}`;
  }

  /**
   * Builds the window.name payload for the child window.
   * @internal
   */
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

    const childrenRefs = this.buildChildrenRefs();

    const payload = createWindowPayload({
      uid: this.uid,
      tag: this.options.tag,
      context: this.context,
      parentDomain: getDomain(),
      props: serializedProps,
      exports: this.createParentExports(),
      children: childrenRefs,
    });

    return buildWindowName(payload);
  }

  /**
   * Builds component references for nested child components.
   * @internal
   */
  private buildChildrenRefs(): Record<string, ChildComponentRef> | undefined {
    if (!this.options.children) return undefined;

    const childComponents = this.options.children({ props: this.props });
    const refs: Record<string, ChildComponentRef> = {};

    for (const [name, component] of Object.entries(childComponents)) {
      const componentAny = component as ForgeFrameComponent & {
        _options?: ComponentOptions<Record<string, unknown>>;
        tag?: string;
        url?: string | ((props: Record<string, unknown>) => string);
      };

      refs[name] = {
        tag: componentAny.tag ?? name,
        url: typeof componentAny.url === 'function'
          ? componentAny.url.toString()
          : componentAny.url ?? '',
      };
    }

    return Object.keys(refs).length > 0 ? refs : undefined;
  }

  /**
   * Creates the exports object sent to the child.
   * @internal
   */
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

  /**
   * Extracts the origin domain from the component URL.
   * @internal
   */
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

  /**
   * Waits for the child to send the init message.
   * @internal
   */
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

  /**
   * Sets up message handlers for child communication.
   * @internal
   */
  private setupMessageHandlers(): void {
    this.messenger.on(MESSAGE_NAME.INIT, () => {
      if (this.initPromise) {
        this.initPromise.resolve();
      }
      return { success: true };
    });

    this.messenger.on(MESSAGE_NAME.CLOSE, async () => {
      await this.close();
      return { success: true };
    });

    this.messenger.on<Dimensions>(MESSAGE_NAME.RESIZE, async (dimensions) => {
      await this.resize(dimensions);
      return { success: true };
    });

    this.messenger.on(MESSAGE_NAME.FOCUS, async () => {
      await this.focus();
      return { success: true };
    });

    this.messenger.on(MESSAGE_NAME.SHOW, async () => {
      await this.show();
      return { success: true };
    });

    this.messenger.on(MESSAGE_NAME.HIDE, async () => {
      await this.hide();
      return { success: true };
    });

    this.messenger.on<{ message: string; stack?: string }>(
      MESSAGE_NAME.ERROR,
      async (errorData) => {
        const error = new Error(errorData.message);
        error.stack = errorData.stack;
        this.handleError(error);
        return { success: true };
      }
    );

    this.messenger.on<X>(MESSAGE_NAME.EXPORT, async (exports) => {
      this.exports = exports;
      return { success: true };
    });

    this.messenger.on<unknown>(MESSAGE_NAME.PARENT_EXPORT, async (data) => {
      this.parentExports = data;
      return { success: true };
    });

    this.messenger.on<{ uid: string; tag: string; options?: GetSiblingsOptions }>(
      MESSAGE_NAME.GET_SIBLINGS,
      async (request) => {
        const siblings: SiblingInfo[] = [];

        const component = getComponent(request.tag);
        if (component) {
          for (const instance of component.instances) {
            if (instance.uid === request.uid) continue;

            siblings.push({
              uid: instance.uid,
              tag: request.tag,
              exports: instance.exports,
            });
          }
        }

        // TODO: If anyParent option, iterate all components in registry

        return siblings;
      }
    );
  }

  /**
   * Registers cleanup handlers for the instance.
   * @internal
   */
  private setupCleanup(): void {
    this.cleanup.register(() => {
      this.messenger.destroy();
      this.bridge.destroy();
      this.event.removeAllListeners();
      unregisterWindow(this.uid);
    });
  }

  /**
   * Handles errors by emitting events and calling callbacks.
   * @internal
   */
  private handleError(error: Error): void {
    this.event.emit(EVENT.ERROR, error);
    this.callPropCallback('onError', error);
  }

  /**
   * Calls a prop callback if it exists.
   * @internal
   */
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

  /**
   * Destroys the component and cleans up all resources.
   * @internal
   */
  private async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.iframe) {
      destroyIframe(this.iframe);
      this.iframe = null;
    }

    if (this.context === CONTEXT.POPUP && this.childWindow) {
      closePopup(this.childWindow);
    }

    this.childWindow = null;

    if (this.prerenderElement) {
      this.prerenderElement.remove();
      this.prerenderElement = null;
    }

    await this.cleanup.cleanup();

    this.event.emit(EVENT.DESTROY);
    this.callPropCallback('onDestroy');
  }
}
