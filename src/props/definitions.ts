/**
 * @packageDocumentation
 * Built-in prop definitions for ForgeFrame components.
 *
 * @remarks
 * This module defines the standard props that are automatically available
 * to all ForgeFrame components, including identifiers, dimensions, and
 * lifecycle callbacks.
 */

import type { PropDefinition, Dimensions } from '../types';
import { PROP_TYPE } from '../constants';

/**
 * Built-in props that are automatically provided to all components.
 *
 * @remarks
 * These props are always available regardless of the component's prop definitions.
 * They include component identifiers, dimensions, timeouts, and lifecycle callbacks.
 *
 * @public
 */
export interface BuiltinProps {
  /** Unique component instance identifier. */
  uid: string;

  /** Component tag name. */
  tag: string;

  /** Component dimensions. */
  dimensions: Dimensions;

  /** Initialization timeout in milliseconds. */
  timeout: number;

  /** CSP nonce for inline scripts/styles. */
  cspNonce?: string;

  /** Called when component becomes visible. */
  onDisplay?: () => void;

  /** Called when component is fully rendered. */
  onRendered?: () => void;

  /** Called when rendering starts. */
  onRender?: () => void;

  /** Called when prerender phase completes. */
  onPrerendered?: () => void;

  /** Called when prerender phase starts. */
  onPrerender?: () => void;

  /** Called when component is closing. */
  onClose?: () => void;

  /** Called when component is destroyed. */
  onDestroy?: () => void;

  /** Called when component is resized. */
  onResize?: (dimensions: Dimensions) => void;

  /** Called when component receives focus. */
  onFocus?: () => void;

  /** Called when an error occurs. */
  onError?: (err: Error) => void;

  /** Called when props are updated. */
  onProps?: (props: Record<string, unknown>) => void;
}

/**
 * Default prop definitions for all built-in props.
 *
 * @remarks
 * These definitions specify the type, required status, and default values
 * for built-in props.
 *
 * @public
 */
export const BUILTIN_PROP_DEFINITIONS: Record<string, PropDefinition> = {
  uid: {
    type: PROP_TYPE.STRING,
    required: false,
    sendToChild: true,
  },

  tag: {
    type: PROP_TYPE.STRING,
    required: false,
    sendToChild: true,
  },

  dimensions: {
    type: PROP_TYPE.OBJECT,
    required: false,
    sendToChild: false,
    default: () => ({ width: '100%', height: '100%' }),
  },

  timeout: {
    type: PROP_TYPE.NUMBER,
    required: false,
    sendToChild: false,
    default: () => 10000,
  },

  cspNonce: {
    type: PROP_TYPE.STRING,
    required: false,
    sendToChild: true,
  },

  // Lifecycle callbacks - functions sent to child
  onDisplay: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onRendered: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onRender: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onPrerendered: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onPrerender: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onClose: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onDestroy: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onResize: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onFocus: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onError: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },

  onProps: {
    type: PROP_TYPE.FUNCTION,
    required: false,
    sendToChild: false,
  },
};

/**
 * Gets the default value for a prop type.
 *
 * @param type - The prop type string
 * @returns The default value for that type
 *
 * @public
 */
export function getDefaultForType(type: string): unknown {
  switch (type) {
    case PROP_TYPE.STRING:
      return '';
    case PROP_TYPE.NUMBER:
      return 0;
    case PROP_TYPE.BOOLEAN:
      return false;
    case PROP_TYPE.ARRAY:
      return [];
    case PROP_TYPE.OBJECT:
      return {};
    case PROP_TYPE.FUNCTION:
      return undefined;
    default:
      return undefined;
  }
}
