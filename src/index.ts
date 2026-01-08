/**
 * ForgeFrame - Modern cross-domain component framework
 * A minimal, TypeScript-first alternative to zoid
 */

// Core API
import {
  create,
  destroy,
  destroyComponents,
  destroyAll,
  isChild,
  getXProps,
  initChild,
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

// Auto-initialize child if in a ForgeFrame window
// This makes window.xprops available automatically
initChild();

/**
 * Main ForgeFrame API object
 * Provides zoid-compatible interface
 */
export const ForgeFrame = {
  /**
   * Create a new component
   * @example
   * const MyComponent = ForgeFrame.create({
   *   tag: 'my-component',
   *   url: 'https://example.com/component',
   *   props: {
   *     onLogin: { type: ForgeFrame.PROP_TYPE.FUNCTION },
   *   },
   * });
   */
  create,

  /**
   * Destroy a single component instance
   */
  destroy,

  /**
   * Destroy all instances of a specific component
   */
  destroyComponents,

  /**
   * Destroy all ForgeFrame component instances
   */
  destroyAll,

  /**
   * Check if current window is a child component
   */
  isChild,

  /**
   * Get xprops from child window
   */
  getXProps,

  // Constants
  PROP_TYPE,
  PROP_SERIALIZATION,
  CONTEXT,
  EVENT,

  // Errors
  PopupOpenError,

  // Version
  VERSION,
} as const;

// Default export
export default ForgeFrame;

// Named exports for tree-shaking
export {
  create,
  destroy,
  destroyComponents,
  destroyAll,
  isChild,
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
  ZoidComponent,
  ZoidComponentInstance,
  ChildProps,

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
