/**
 * @packageDocumentation
 * Type definitions for ForgeFrame cross-domain component framework.
 *
 * @remarks
 * This module exports all the TypeScript interfaces and types used throughout
 * the ForgeFrame library. These types enable type-safe component creation,
 * prop handling, and cross-domain communication.
 */

import type {
  PropType,
  ContextType,
  SerializationType,
  EventType,
} from './constants';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pattern for matching domains in security configurations.
 *
 * @remarks
 * Can be a single domain string, a RegExp pattern, or an array of domain strings.
 *
 * @example
 * ```typescript
 * // Single domain
 * const domain: DomainMatcher = 'https://example.com';
 *
 * // RegExp pattern
 * const pattern: DomainMatcher = /^https:\/\/.*\.example\.com$/;
 *
 * // Multiple domains
 * const domains: DomainMatcher = ['https://a.com', 'https://b.com'];
 * ```
 *
 * @public
 */
export type DomainMatcher = string | RegExp | string[];

/**
 * Component dimension specification.
 *
 * @remarks
 * Dimensions can be specified as CSS values (strings) or pixel numbers.
 *
 * @public
 */
export interface Dimensions {
  /** Width of the component (e.g., '100%', 400, '500px') */
  width?: string | number;
  /** Height of the component (e.g., '100%', 300, '400px') */
  height?: string | number;
}

/**
 * Configuration for automatic component resizing.
 *
 * @remarks
 * When enabled, the parent will automatically resize the iframe
 * based on the child content dimensions.
 *
 * @public
 */
export interface AutoResizeOptions {
  /** Enable automatic width resizing */
  width?: boolean;
  /** Enable automatic height resizing */
  height?: boolean;
  /** CSS selector of element to measure for auto-resize */
  element?: string;
}

/**
 * HTML attributes that can be applied to an iframe element.
 *
 * @remarks
 * These attributes are passed directly to the iframe element when rendering.
 *
 * @public
 */
export interface IframeAttributes {
  /** Title attribute for accessibility */
  title?: string;
  /** Permissions policy (e.g., 'camera; microphone') */
  allow?: string;
  /** Allow fullscreen mode */
  allowFullscreen?: boolean;
  /** Loading strategy */
  loading?: 'lazy' | 'eager';
  /** Referrer policy */
  referrerPolicy?: ReferrerPolicy;
  /** Sandbox restrictions */
  sandbox?: string;
  /** Additional custom attributes */
  [key: string]: string | boolean | undefined;
}

/**
 * CSS styles that can be applied to the iframe element.
 *
 * @remarks
 * These styles are applied directly to the iframe's style property.
 * Common use cases include setting borders, shadows, border-radius, etc.
 *
 * @example
 * ```typescript
 * const styles: IframeStyles = {
 *   border: 'none',
 *   borderRadius: '8px',
 *   boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
 * };
 * ```
 *
 * @public
 */
export interface IframeStyles {
  /** CSS properties to apply to the iframe */
  [key: string]: string | number | undefined;
}

/**
 * Result of an eligibility check for component rendering.
 *
 * @public
 */
export interface EligibilityResult {
  /** Whether the component is eligible to render */
  eligible: boolean;
  /** Reason for ineligibility (if not eligible) */
  reason?: string;
}

// ============================================================================
// Props System Types
// ============================================================================

/**
 * Context object passed to prop value functions and decorators.
 *
 * @typeParam P - The props type for the component
 *
 * @remarks
 * This context provides access to component state and methods during
 * prop normalization and decoration.
 *
 * @public
 */
export interface PropContext<P> {
  /** Current props values */
  props: P;
  /** Component state object */
  state: Record<string, unknown>;
  /** Close the component */
  close: () => Promise<void>;
  /** Focus the component */
  focus: () => Promise<void>;
  /** Report an error */
  onError: (err: Error) => void;
  /** Container element (null during prerender) */
  container: HTMLElement | null;
  /** Unique instance identifier */
  uid: string;
  /** Component tag name */
  tag: string;
}

/**
 * Definition for a single component prop.
 *
 * @typeParam T - The type of the prop value
 * @typeParam P - The props type for the component
 *
 * @remarks
 * Prop definitions control how individual props are validated, serialized,
 * and passed between parent and child components.
 *
 * @example
 * ```typescript
 * const propDef: PropDefinition<string> = {
 *   type: PROP_TYPE.STRING,
 *   required: true,
 *   default: 'hello',
 *   validate: ({ value }) => {
 *     if (value.length > 100) throw new Error('Too long');
 *   },
 * };
 * ```
 *
 * @public
 */
export interface PropDefinition<T = unknown, P = Record<string, unknown>> {
  /** The prop type (STRING, NUMBER, FUNCTION, etc.) */
  type: PropType;
  /** Whether the prop is required */
  required?: boolean;
  /** Default value or function returning default value */
  default?: T | ((ctx: PropContext<P>) => T);
  /** Function to compute the prop value */
  value?: (ctx: PropContext<P>) => T;

  /** Whether to send this prop to the child window (default: true) */
  sendToChild?: boolean;
  /** Only send if parent and child are same domain */
  sameDomain?: boolean;
  /** List of trusted domains that can receive this prop */
  trustedDomains?: DomainMatcher[];

  /** Serialization strategy for cross-domain transfer */
  serialization?: SerializationType;
  /** Pass prop via URL query parameter */
  queryParam?: boolean | string | ((opts: { value: T }) => string);
  /** Pass prop via POST body parameter */
  bodyParam?: boolean | string | ((opts: { value: T }) => string);

  /** Validate the prop value (throw to reject) */
  validate?: (opts: { value: T; props: P }) => void;
  /** Transform the prop value in parent context */
  decorate?: (opts: { value: T; props: P }) => T;
  /** Transform the prop value in child context */
  childDecorate?: (opts: { value: T; props: P }) => T;

  /** Alternative name for the prop */
  alias?: string;
}

/**
 * Map of prop names to their definitions.
 *
 * @typeParam P - The props type for the component
 *
 * @public
 */
export type PropsDefinition<P> = {
  [K in keyof P]?: PropDefinition<P[K], P>;
};

// ============================================================================
// Template Types
// ============================================================================

/**
 * Context object passed to container and prerender template functions.
 *
 * @typeParam P - The props type for the component
 *
 * @public
 */
export interface TemplateContext<P = Record<string, unknown>> {
  /** Unique instance identifier */
  uid: string;
  /** Component tag name */
  tag: string;
  /** Rendering context (iframe or popup) */
  context: ContextType;
  /** Component dimensions */
  dimensions: Dimensions;
  /** Current props */
  props: P;
  /** Document object for creating elements */
  doc: Document;
  /** Container element */
  container: HTMLElement;
  /** The iframe element (null for popup context) */
  frame: HTMLIFrameElement | null;
  /** The prerender/loading element (from prerenderTemplate) */
  prerenderFrame: HTMLElement | null;
  /** Close the component */
  close: () => Promise<void>;
  /** Focus the component */
  focus: () => Promise<void>;
}

/**
 * Function that creates a custom container element for the component.
 *
 * @typeParam P - The props type for the component
 *
 * @param ctx - Template context with component info
 * @returns The container element or null to use default
 *
 * @public
 */
export type ContainerTemplate<P = Record<string, unknown>> = (
  ctx: TemplateContext<P>
) => HTMLElement | null;

/**
 * Function that creates a custom prerender (loading) element.
 *
 * @typeParam P - The props type for the component
 *
 * @param ctx - Template context with component info
 * @returns The prerender element or null for no prerender
 *
 * @public
 */
export type PrerenderTemplate<P = Record<string, unknown>> = (
  ctx: TemplateContext<P>
) => HTMLElement | null;

// ============================================================================
// Children Component Types
// ============================================================================

/**
 * Function that returns child components for nested composition.
 *
 * @typeParam P - The props type for the parent component
 *
 * @remarks
 * Child components can be rendered within the parent component's iframe/popup.
 *
 * @param props - Object containing the parent's props
 * @returns Map of child component names to ForgeFrameComponent instances
 *
 * @public
 */
export type ChildrenDefinition<P = Record<string, unknown>> = (props: {
  props: P;
}) => Record<string, ForgeFrameComponent>;

/**
 * Serializable reference to a child component for cross-domain transfer.
 *
 * @internal
 */
export interface ChildComponentRef {
  /** Component tag name */
  tag: string;
  /** Component URL (or stringified function) */
  url: string | ((props: Record<string, unknown>) => string);
  /** Prop definitions */
  props?: PropsDefinition<Record<string, unknown>>;
  /** Default dimensions */
  dimensions?: Dimensions;
  /** Default rendering context */
  defaultContext?: ContextType;
}

// ============================================================================
// Component Options
// ============================================================================

/**
 * Configuration options for creating a component.
 *
 * @typeParam P - The props type for the component
 *
 * @remarks
 * These options are passed to `ForgeFrame.create()` to define a new component.
 *
 * @example
 * ```typescript
 * const options: ComponentOptions<MyProps> = {
 *   tag: 'my-component',
 *   url: 'https://example.com/component',
 *   props: {
 *     name: { type: PROP_TYPE.STRING, required: true },
 *   },
 *   dimensions: { width: 400, height: 300 },
 * };
 * ```
 *
 * @public
 */
export interface ComponentOptions<P = Record<string, unknown>> {
  /**
   * Unique tag name for the component.
   *
   * @remarks
   * Must start with a lowercase letter and contain only lowercase letters,
   * numbers, and hyphens.
   */
  tag: string;

  /**
   * URL of the child component page, or function that returns URL based on props.
   */
  url: string | ((props: P) => string);

  /**
   * Prop definitions for type checking and serialization.
   */
  props?: PropsDefinition<P>;

  /**
   * Default dimensions for the component.
   */
  dimensions?: Dimensions | ((props: P) => Dimensions);

  /**
   * Configuration for automatic resizing based on content.
   */
  autoResize?: AutoResizeOptions;

  /**
   * Default rendering context (iframe or popup).
   * @defaultValue 'iframe'
   */
  defaultContext?: ContextType;

  /**
   * Allowed child domains for security validation.
   */
  domain?: DomainMatcher;

  /**
   * Restrict which parent domains can embed this component.
   */
  allowedParentDomains?: DomainMatcher;

  /**
   * Custom container template function.
   */
  containerTemplate?: ContainerTemplate<P>;

  /**
   * Custom prerender (loading state) template function.
   */
  prerenderTemplate?: PrerenderTemplate<P>;

  /**
   * Function to check if component is eligible to render.
   */
  eligible?: (opts: { props: P }) => EligibilityResult;

  /**
   * Function to validate props before rendering.
   */
  validate?: (opts: { props: P }) => void;

  /**
   * Additional HTML attributes for the iframe/popup.
   */
  attributes?: IframeAttributes | ((props: P) => IframeAttributes);

  /**
   * CSS styles to apply to the iframe element.
   *
   * @example
   * ```typescript
   * style: {
   *   border: 'none',
   *   borderRadius: '8px',
   *   boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
   * }
   * ```
   */
  style?: IframeStyles | ((props: P) => IframeStyles);

  /**
   * Timeout in milliseconds for child initialization.
   * @defaultValue 10000
   */
  timeout?: number;

  /**
   * Child components that can be rendered within this component.
   */
  children?: ChildrenDefinition<P>;
}

// ============================================================================
// Event Emitter Types
// ============================================================================

/**
 * Handler function for component events.
 *
 * @typeParam T - The type of data passed to the handler
 *
 * @public
 */
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

/**
 * Event emitter interface for component lifecycle events.
 *
 * @public
 */
export interface EventEmitterInterface {
  /**
   * Subscribe to an event.
   *
   * @param event - Event name to listen for
   * @param handler - Handler function to call
   * @returns Unsubscribe function
   */
  on<T = unknown>(event: EventType | string, handler: EventHandler<T>): () => void;

  /**
   * Subscribe to an event for a single emission.
   *
   * @param event - Event name to listen for
   * @param handler - Handler function to call
   * @returns Unsubscribe function
   */
  once<T = unknown>(event: EventType | string, handler: EventHandler<T>): () => void;

  /**
   * Emit an event with optional data.
   *
   * @param event - Event name to emit
   * @param data - Data to pass to handlers
   */
  emit<T = unknown>(event: EventType | string, data?: T): void;

  /**
   * Unsubscribe a handler from an event.
   *
   * @param event - Event name
   * @param handler - Handler to remove (optional, removes all if not provided)
   */
  off(event: EventType | string, handler?: EventHandler): void;

  /**
   * Remove all event listeners.
   */
  removeAllListeners(): void;
}

// ============================================================================
// Component Instance Types
// ============================================================================

/**
 * Instance of a rendered component.
 *
 * @typeParam P - The props type for the component
 * @typeParam X - The type of exports from the child
 *
 * @remarks
 * Component instances are created by calling the component factory function
 * and provide methods to control the rendered component.
 *
 * @example
 * ```typescript
 * const instance = MyComponent({ name: 'World' });
 * await instance.render('#container');
 * await instance.updateProps({ name: 'Updated' });
 * await instance.close();
 * ```
 *
 * @public
 */
export interface ForgeFrameComponentInstance<P = Record<string, unknown>, X = unknown> {
  /**
   * Unique instance identifier.
   */
  readonly uid: string;

  /**
   * Render the component into a container.
   *
   * @param container - CSS selector or element to render into
   * @param context - Override the default context (iframe/popup)
   * @returns Promise that resolves when rendering is complete
   */
  render(
    container?: string | HTMLElement,
    context?: ContextType
  ): Promise<void>;

  /**
   * Render into a different window's container.
   *
   * @param win - Target window
   * @param container - CSS selector or element in target window
   * @param context - Override the default context
   * @returns Promise that resolves when rendering is complete
   */
  renderTo(
    win: Window,
    container?: string | HTMLElement,
    context?: ContextType
  ): Promise<void>;

  /**
   * Close and destroy the component.
   *
   * @returns Promise that resolves when closed
   */
  close(): Promise<void>;

  /**
   * Focus the component window.
   *
   * @returns Promise that resolves when focused
   */
  focus(): Promise<void>;

  /**
   * Resize the component to new dimensions.
   *
   * @param dimensions - New dimensions
   * @returns Promise that resolves when resized
   */
  resize(dimensions: Dimensions): Promise<void>;

  /**
   * Show the component (if hidden).
   *
   * @returns Promise that resolves when shown
   */
  show(): Promise<void>;

  /**
   * Hide the component.
   *
   * @returns Promise that resolves when hidden
   */
  hide(): Promise<void>;

  /**
   * Update the component's props.
   *
   * @param props - Partial props to merge with existing
   * @returns Promise that resolves when props are updated
   */
  updateProps(props: Partial<P>): Promise<void>;

  /**
   * Create a copy of this instance with the same props.
   *
   * @returns New component instance
   */
  clone(): ForgeFrameComponentInstance<P, X>;

  /**
   * Check if the component is eligible to render.
   *
   * @returns Whether the component can render
   */
  isEligible(): boolean;

  /**
   * Event emitter for subscribing to lifecycle events.
   */
  event: EventEmitterInterface;

  /**
   * Mutable state object for the component.
   */
  state: Record<string, unknown>;

  /**
   * Data exported from the child component via `xprops.export()`.
   */
  exports?: X;
}

// ============================================================================
// Component Factory Types
// ============================================================================

/**
 * Component factory function and static properties.
 *
 * @typeParam P - The props type for the component
 * @typeParam X - The type of exports from the child
 *
 * @remarks
 * This is the return type of `ForgeFrame.create()`. It can be called as a
 * function to create instances, and has static properties for child detection.
 *
 * @example
 * ```typescript
 * const MyComponent = ForgeFrame.create<MyProps>({ ... });
 *
 * // Create an instance
 * const instance = MyComponent({ name: 'World' });
 *
 * // Check if we're in a child context
 * if (MyComponent.isChild()) {
 *   const props = MyComponent.xprops;
 * }
 * ```
 *
 * @public
 */
export interface ForgeFrameComponent<P = Record<string, unknown>, X = unknown> {
  /**
   * Create a new component instance with props.
   *
   * @param props - Props to pass to the component
   * @returns New component instance
   */
  (props?: P): ForgeFrameComponentInstance<P, X>;

  /**
   * Check if current window is a child instance of this component.
   *
   * @returns True if in child context
   */
  isChild(): boolean;

  /**
   * Get xprops if in child context.
   *
   * @remarks
   * Only available when `isChild()` returns true.
   */
  xprops?: ChildProps<P>;

  /**
   * Check if we can render to a target window.
   *
   * @param win - Target window to check
   * @returns Promise resolving to whether rendering is allowed
   */
  canRenderTo(win: Window): Promise<boolean>;

  /**
   * All active instances of this component.
   */
  instances: ForgeFrameComponentInstance<P, X>[];
}

// ============================================================================
// Parent Namespace Types (for child access to parent)
// ============================================================================

/**
 * Parent namespace available in child via `xprops.parent`.
 *
 * @typeParam P - The props type for the component
 *
 * @remarks
 * Provides bidirectional communication from child to parent.
 *
 * @public
 */
export interface ParentNamespace<P = Record<string, unknown>> {
  /**
   * Access parent's props.
   */
  props: P;

  /**
   * Export data/methods from parent context.
   *
   * @param data - Data to export
   * @returns Promise that resolves when export is complete
   */
  export: <T>(data: T) => Promise<void>;
}

// ============================================================================
// Sibling Component Types
// ============================================================================

/**
 * Information about a sibling component instance.
 *
 * @public
 */
export interface SiblingInfo {
  /** Unique instance ID */
  uid: string;
  /** Component tag name */
  tag: string;
  /** Exports from sibling (if any) */
  exports?: unknown;
}

/**
 * Options for getting sibling components.
 *
 * @public
 */
export interface GetSiblingsOptions {
  /**
   * If true, get siblings from any parent window (not just same parent).
   * @defaultValue false
   */
  anyParent?: boolean;
}

// ============================================================================
// Child Component Types
// ============================================================================

/**
 * Props object available in child window via `window.xprops`.
 *
 * @typeParam P - The props type for the component
 *
 * @remarks
 * The xprops object contains all props passed from the parent, plus
 * built-in methods for controlling the component and communicating
 * with the parent.
 *
 * @example
 * ```typescript
 * // In child window
 * const { name, onSubmit, close, resize } = window.xprops;
 *
 * // Use passed props
 * console.log(name);
 *
 * // Call parent callbacks
 * await onSubmit({ success: true });
 *
 * // Control the frame
 * await resize({ width: 500, height: 400 });
 * await close();
 * ```
 *
 * @public
 */
export interface ChildProps<P = Record<string, unknown>> {
  /** User-defined props passed from parent */
  [K: string]: unknown;

  /** Unique instance ID */
  uid: string;

  /** Component tag name */
  tag: string;

  /**
   * Close the component.
   *
   * @returns Promise that resolves when closed
   */
  close: () => Promise<void>;

  /**
   * Focus the component window.
   *
   * @returns Promise that resolves when focused
   */
  focus: () => Promise<void>;

  /**
   * Resize the component.
   *
   * @param dimensions - New dimensions
   * @returns Promise that resolves when resized
   */
  resize: (dimensions: Dimensions) => Promise<void>;

  /**
   * Show the component (if hidden).
   *
   * @returns Promise that resolves when shown
   */
  show: () => Promise<void>;

  /**
   * Hide the component.
   *
   * @returns Promise that resolves when hidden
   */
  hide: () => Promise<void>;

  /**
   * Subscribe to prop updates from parent.
   *
   * @param handler - Function called when props change
   * @returns Object with cancel function to unsubscribe
   */
  onProps: (handler: (props: P) => void) => { cancel: () => void };

  /**
   * Report an error to the parent.
   *
   * @param err - Error to report
   * @returns Promise that resolves when error is sent
   */
  onError: (err: Error) => Promise<void>;

  /**
   * Get a reference to the parent window.
   *
   * @returns Parent window object
   */
  getParent: () => Window;

  /**
   * Get the parent window's domain.
   *
   * @returns Parent domain string
   */
  getParentDomain: () => string;

  /**
   * Export data/methods to the parent.
   *
   * @param exports - Data to export
   * @returns Promise that resolves when export is complete
   */
  export: <X>(exports: X) => Promise<void>;

  /**
   * Parent namespace for bidirectional communication.
   */
  parent: ParentNamespace<P>;

  /**
   * Get sibling component instances.
   *
   * @param options - Options for sibling discovery
   * @returns Promise resolving to array of sibling info
   */
  getSiblings: (options?: GetSiblingsOptions) => Promise<SiblingInfo[]>;

  /**
   * Child components available for nested rendering.
   */
  children?: Record<string, ForgeFrameComponent>;
}

// ============================================================================
// Communication Types
// ============================================================================

/**
 * Payload encoded in window.name for initial parent-to-child data transfer.
 *
 * @typeParam _P - The props type (unused, for compatibility)
 *
 * @internal
 */
export interface WindowNamePayload<_P = Record<string, unknown>> {
  /** Parent component instance UID */
  uid: string;
  /** Component tag name */
  tag: string;
  /** ForgeFrame version */
  version: string;
  /** Rendering context */
  context: ContextType;
  /** Parent window domain */
  parentDomain: string;
  /** Serialized props */
  props: SerializedProps;
  /** Parent method message names */
  exports: ParentExports;
  /** Child component references */
  children?: Record<string, ChildComponentRef>;
}

/**
 * Serialized props ready for cross-domain transfer.
 *
 * @internal
 */
export interface SerializedProps {
  [key: string]: unknown;
}

/**
 * Map of parent methods to their message names.
 *
 * @internal
 */
export interface ParentExports {
  /** Init message name */
  init: string;
  /** Close message name */
  close: string;
  /** Resize message name */
  resize: string;
  /** Show message name */
  show: string;
  /** Hide message name */
  hide: string;
  /** Error message name */
  onError: string;
  /** Update props message name */
  updateProps: string;
  /** Export message name */
  export: string;
}

/**
 * Serialized function reference for cross-domain calls.
 *
 * @internal
 */
export interface FunctionRef {
  /** Type marker */
  __type__: 'function';
  /** Unique function ID */
  __id__: string;
  /** Function name for debugging */
  __name__: string;
}

/**
 * Cross-domain message structure.
 *
 * @internal
 */
export interface Message {
  /** Unique message ID */
  id: string;
  /** Message type */
  type: 'request' | 'response' | 'ack';
  /** Message name/action */
  name: string;
  /** Message payload */
  data?: unknown;
  /** Error information (for error responses) */
  error?: {
    message: string;
    stack?: string;
  };
  /** Message source info */
  source: {
    uid: string;
    domain: string;
  };
}

// ============================================================================
// Window Reference Types
// ============================================================================

/**
 * Reference to a window for cross-domain communication.
 *
 * @internal
 */
export type WindowRef =
  | { type: 'opener' }
  | { type: 'parent'; distance: number }
  | { type: 'global'; uid: string }
  | { type: 'direct'; win: Window };
