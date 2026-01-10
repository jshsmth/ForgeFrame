/**
 * @packageDocumentation
 * ForgeFrame - Modern cross-domain component framework.
 *
 * @remarks
 * A minimal, TypeScript-first alternative to zoid with zero runtime dependencies.
 * Enables rendering components in iframes or popups across domains while
 * seamlessly passing props (including functions) between consumer and host.
 *
 * @example
 * ```typescript
 * import ForgeFrame from 'forgeframe';
 *
 * // Define a component
 * const LoginComponent = ForgeFrame.create({
 *   tag: 'login-component',
 *   url: 'https://auth.example.com/login',
 *   props: {
 *     email: { type: ForgeFrame.PROP_TYPE.STRING },
 *     onLogin: { type: ForgeFrame.PROP_TYPE.FUNCTION },
 *   },
 * });
 *
 * // Render the component
 * LoginComponent({
 *   email: 'user@example.com',
 *   onLogin: (user) => console.log('Logged in:', user),
 * }).render('#container');
 * ```
 */

// Core API
import {
  create,
  destroy,
  destroyComponents,
  destroyAll,
  isHost,
  getXProps,
  initHost,
} from './core';

// Constants
import {
  PROP_TYPE,
  PROP_SERIALIZATION,
  CONTEXT,
  EVENT,
  VERSION,
} from './constants';

// Errors
import { PopupOpenError } from './render/popup';

// Auto-initialize host if in a ForgeFrame window.
// This makes window.xprops available automatically in host contexts.
initHost();

/**
 * Main ForgeFrame API object.
 *
 * @remarks
 * Provides a zoid-compatible interface for creating and managing
 * cross-domain components. All methods and constants are accessible
 * through this object.
 *
 * @example
 * ```typescript
 * import ForgeFrame from 'forgeframe';
 *
 * const Component = ForgeFrame.create({
 *   tag: 'my-component',
 *   url: '/component.html',
 * });
 * ```
 *
 * @public
 */
export const ForgeFrame = {
  /**
   * Create a new component definition.
   *
   * @remarks
   * This is the main entry point for defining components. Returns a
   * component factory function that can be called to create instances.
   *
   * @example
   * ```typescript
   * const MyComponent = ForgeFrame.create({
   *   tag: 'my-component',
   *   url: 'https://example.com/component',
   *   props: {
   *     onLogin: { type: ForgeFrame.PROP_TYPE.FUNCTION },
   *   },
   * });
   *
   * const instance = MyComponent({ onLogin: (user) => {} });
   * await instance.render('#container');
   * ```
   */
  create,

  /**
   * Destroy a single component instance.
   *
   * @param instance - The component instance to destroy
   */
  destroy,

  /**
   * Destroy all instances of a specific component by tag.
   *
   * @param tag - The component tag name
   */
  destroyComponents,

  /**
   * Destroy all ForgeFrame component instances.
   */
  destroyAll,

  /**
   * Check if the current window is a host component context.
   *
   * @returns True if running inside a ForgeFrame iframe/popup
   */
  isHost,

  /**
   * Get xprops from the current host window.
   *
   * @returns The xprops object if in host context, undefined otherwise
   */
  getXProps,

  /**
   * Prop type constants for defining component props.
   * @see {@link PROP_TYPE}
   */
  PROP_TYPE,

  /**
   * Serialization strategy constants.
   * @see {@link PROP_SERIALIZATION}
   */
  PROP_SERIALIZATION,

  /**
   * Rendering context constants (IFRAME, POPUP).
   * @see {@link CONTEXT}
   */
  CONTEXT,

  /**
   * Lifecycle event name constants.
   * @see {@link EVENT}
   */
  EVENT,

  /**
   * Error thrown when popup window fails to open.
   */
  PopupOpenError,

  /**
   * Current library version.
   */
  VERSION,
} as const;

/**
 * Default export of the ForgeFrame API object.
 * @public
 */
export default ForgeFrame;

// Named exports for tree-shaking
export {
  create,
  destroy,
  destroyComponents,
  destroyAll,
  isHost,
  getXProps,
} from './core';

export {
  PROP_TYPE,
  PROP_SERIALIZATION,
  CONTEXT,
  EVENT,
  VERSION,
} from './constants';

export { PopupOpenError } from './render/popup';

// Type exports
export type {
  // Component types
  ComponentOptions,
  ForgeFrameComponent,
  ForgeFrameComponentInstance,
  HostProps,

  // Props types
  PropDefinition,
  PropsDefinition,
  PropContext,

  // Template types
  TemplateContext,
  ContainerTemplate,
  PrerenderTemplate,

  // Utility types
  Dimensions,
  DomainMatcher,
  AutoResizeOptions,
  IframeAttributes,
  IframeStyles,
  EligibilityResult,

  // Event types
  EventHandler,
  EventEmitterInterface,
} from './types';

export type {
  PropType,
  ContextType,
  EventType,
  SerializationType,
} from './constants';

// React driver exports
export {
  createReactDriver,
  withReactDriver,
  type ReactDriverOptions,
  type ReactComponentProps,
  type ReactComponentType,
} from './drivers/react';
