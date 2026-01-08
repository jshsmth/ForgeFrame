import type { PropDefinition, Dimensions } from '../types';
import { PROP_TYPE } from '../constants';

/**
 * Built-in props that are automatically provided to all components
 */
export interface BuiltinProps {
  // Component identifiers
  uid: string;
  tag: string;

  // Dimensions
  dimensions: Dimensions;

  // Timeout for initialization
  timeout: number;

  // CSP nonce for inline scripts/styles
  cspNonce?: string;

  // Lifecycle callbacks
  onDisplay?: () => void;
  onRendered?: () => void;
  onRender?: () => void;
  onPrerendered?: () => void;
  onPrerender?: () => void;
  onClose?: () => void;
  onDestroy?: () => void;
  onResize?: (dimensions: Dimensions) => void;
  onFocus?: () => void;
  onError?: (err: Error) => void;
  onProps?: (props: Record<string, unknown>) => void;
}

/**
 * Default prop definitions for built-in props
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
 * Get the default value for a prop type
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
