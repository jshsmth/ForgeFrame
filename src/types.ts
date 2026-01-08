import type {
  PropType,
  ContextType,
  SerializationType,
  EventType,
} from './constants';

// ============================================================================
// Utility Types
// ============================================================================

export type DomainMatcher = string | RegExp | string[];

export interface Dimensions {
  width?: string | number;
  height?: string | number;
}

export interface AutoResizeOptions {
  width?: boolean;
  height?: boolean;
  element?: string;
}

export interface IframeAttributes {
  title?: string;
  allow?: string;
  allowFullscreen?: boolean;
  loading?: 'lazy' | 'eager';
  referrerPolicy?: ReferrerPolicy;
  sandbox?: string;
  [key: string]: string | boolean | undefined;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

// ============================================================================
// Props System Types
// ============================================================================

export interface PropContext<P> {
  props: P;
  state: Record<string, unknown>;
  close: () => Promise<void>;
  focus: () => Promise<void>;
  onError: (err: Error) => void;
  container: HTMLElement | null;
  uid: string;
  tag: string;
}

export interface PropDefinition<T = unknown, P = Record<string, unknown>> {
  type: PropType;
  required?: boolean;
  default?: T | ((ctx: PropContext<P>) => T);
  value?: (ctx: PropContext<P>) => T;

  // Cross-domain control
  sendToChild?: boolean;
  sameDomain?: boolean;
  trustedDomains?: DomainMatcher[];

  // Serialization
  serialization?: SerializationType;
  queryParam?: boolean | string | ((opts: { value: T }) => string);
  bodyParam?: boolean | string | ((opts: { value: T }) => string);

  // Validation & decoration
  validate?: (opts: { value: T; props: P }) => void;
  decorate?: (opts: { value: T; props: P }) => T;
  childDecorate?: (opts: { value: T; props: P }) => T;

  // Alias support
  alias?: string;
}

export type PropsDefinition<P> = {
  [K in keyof P]?: PropDefinition<P[K], P>;
};

// ============================================================================
// Template Types
// ============================================================================

export interface TemplateContext<P = Record<string, unknown>> {
  uid: string;
  tag: string;
  context: ContextType;
  dimensions: Dimensions;
  props: P;
  doc: Document;
  container: HTMLElement;
  frame: HTMLIFrameElement | null;
  prerenderFrame: HTMLIFrameElement | null;
  close: () => Promise<void>;
  focus: () => Promise<void>;
}

export type ContainerTemplate<P = Record<string, unknown>> = (
  ctx: TemplateContext<P>
) => HTMLElement | null;

export type PrerenderTemplate<P = Record<string, unknown>> = (
  ctx: TemplateContext<P>
) => HTMLElement | null;

// ============================================================================
// Component Options
// ============================================================================

export interface ComponentOptions<P = Record<string, unknown>> {
  /**
   * Unique tag name for the component (e.g., 'my-login-component')
   */
  tag: string;

  /**
   * URL of the child component, or function that returns URL based on props
   */
  url: string | ((props: P) => string);

  /**
   * Prop definitions
   */
  props?: PropsDefinition<P>;

  /**
   * Default dimensions for the component
   */
  dimensions?: Dimensions | ((props: P) => Dimensions);

  /**
   * Auto-resize configuration
   */
  autoResize?: AutoResizeOptions;

  /**
   * Default rendering context (iframe or popup)
   */
  defaultContext?: ContextType;

  /**
   * Allowed child domains (for security)
   */
  domain?: DomainMatcher;

  /**
   * Restrict which parent domains can embed this component
   */
  allowedParentDomains?: DomainMatcher;

  /**
   * Custom container template
   */
  containerTemplate?: ContainerTemplate<P>;

  /**
   * Custom prerender (loading) template
   */
  prerenderTemplate?: PrerenderTemplate<P>;

  /**
   * Check if component is eligible to render
   */
  eligible?: (opts: { props: P }) => EligibilityResult;

  /**
   * Validate props before rendering
   */
  validate?: (opts: { props: P }) => void;

  /**
   * Additional iframe/popup attributes
   */
  attributes?: IframeAttributes | ((props: P) => IframeAttributes);

  /**
   * Timeout for component initialization (ms)
   */
  timeout?: number;
}

// ============================================================================
// Event Emitter Types
// ============================================================================

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export interface EventEmitterInterface {
  on<T = unknown>(event: EventType | string, handler: EventHandler<T>): () => void;
  once<T = unknown>(event: EventType | string, handler: EventHandler<T>): () => void;
  emit<T = unknown>(event: EventType | string, data?: T): void;
  off(event: EventType | string, handler?: EventHandler): void;
  removeAllListeners(): void;
}

// ============================================================================
// Component Instance Types
// ============================================================================

export interface ZoidComponentInstance<P = Record<string, unknown>, X = unknown> {
  /**
   * Render the component into a container
   */
  render(
    container?: string | HTMLElement,
    context?: ContextType
  ): Promise<void>;

  /**
   * Render into a different window's container
   */
  renderTo(
    win: Window,
    container?: string | HTMLElement,
    context?: ContextType
  ): Promise<void>;

  /**
   * Close and destroy the component
   */
  close(): Promise<void>;

  /**
   * Focus the component window
   */
  focus(): Promise<void>;

  /**
   * Resize the component
   */
  resize(dimensions: Dimensions): Promise<void>;

  /**
   * Show the component (if hidden)
   */
  show(): Promise<void>;

  /**
   * Hide the component
   */
  hide(): Promise<void>;

  /**
   * Update component props
   */
  updateProps(props: Partial<P>): Promise<void>;

  /**
   * Clone this instance with same props
   */
  clone(): ZoidComponentInstance<P, X>;

  /**
   * Check if component is eligible to render
   */
  isEligible(): boolean;

  /**
   * Event emitter for lifecycle events
   */
  event: EventEmitterInterface;

  /**
   * Component state
   */
  state: Record<string, unknown>;

  /**
   * Exports from child component
   */
  exports?: X;
}

// ============================================================================
// Component Factory Types
// ============================================================================

export interface ZoidComponent<P = Record<string, unknown>, X = unknown> {
  /**
   * Create a new component instance with props
   */
  (props?: P): ZoidComponentInstance<P, X>;

  /**
   * Check if current window is a child component
   */
  isChild(): boolean;

  /**
   * Get xprops if in child context
   */
  xprops?: ChildProps<P>;

  /**
   * Check if we can render to a target window
   */
  canRenderTo(win: Window): Promise<boolean>;

  /**
   * All active instances of this component
   */
  instances: ZoidComponentInstance<P, X>[];
}

// ============================================================================
// Child Component Types
// ============================================================================

export interface ChildProps<P = Record<string, unknown>> {
  /**
   * All user-defined props passed from parent
   */
  [K: string]: unknown;

  /**
   * Unique instance ID
   */
  uid: string;

  /**
   * Component tag name
   */
  tag: string;

  /**
   * Close the component
   */
  close: () => Promise<void>;

  /**
   * Focus the component window
   */
  focus: () => Promise<void>;

  /**
   * Resize the component
   */
  resize: (dimensions: Dimensions) => Promise<void>;

  /**
   * Show the component
   */
  show: () => Promise<void>;

  /**
   * Hide the component
   */
  hide: () => Promise<void>;

  /**
   * Subscribe to prop updates
   */
  onProps: (handler: (props: P) => void) => { cancel: () => void };

  /**
   * Report an error to the parent
   */
  onError: (err: Error) => Promise<void>;

  /**
   * Get the parent window reference
   */
  getParent: () => Window;

  /**
   * Get the parent domain
   */
  getParentDomain: () => string;

  /**
   * Export data/methods to parent
   */
  export: <X>(exports: X) => Promise<void>;
}

// ============================================================================
// Communication Types
// ============================================================================

export interface WindowNamePayload<_P = Record<string, unknown>> {
  uid: string;
  tag: string;
  version: string;
  context: ContextType;
  parentDomain: string;
  props: SerializedProps;
  exports: ParentExports;
}

export interface SerializedProps {
  [key: string]: unknown;
}

export interface ParentExports {
  init: string;
  close: string;
  resize: string;
  show: string;
  hide: string;
  onError: string;
  updateProps: string;
  export: string;
}

export interface FunctionRef {
  __type__: 'function';
  __id__: string;
  __name__: string;
}

export interface Message {
  id: string;
  type: 'request' | 'response' | 'ack';
  name: string;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
  };
  source: {
    uid: string;
    domain: string;
  };
}

// ============================================================================
// Window Reference Types
// ============================================================================

export type WindowRef =
  | { type: 'opener' }
  | { type: 'parent'; distance: number }
  | { type: 'global'; uid: string }
  | { type: 'direct'; win: Window };
