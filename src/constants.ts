/**
 * Prop type constants for defining component props
 */
export const PROP_TYPE = {
  STRING: 'string',
  OBJECT: 'object',
  FUNCTION: 'function',
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  ARRAY: 'array',
} as const;

export type PropType = (typeof PROP_TYPE)[keyof typeof PROP_TYPE];

/**
 * Rendering context types
 */
export const CONTEXT = {
  IFRAME: 'iframe',
  POPUP: 'popup',
} as const;

export type ContextType = (typeof CONTEXT)[keyof typeof CONTEXT];

/**
 * Component lifecycle events
 */
export const EVENT = {
  RENDER: 'render',
  RENDERED: 'rendered',
  PRERENDER: 'prerender',
  PRERENDERED: 'prerendered',
  DISPLAY: 'display',
  ERROR: 'error',
  CLOSE: 'close',
  DESTROY: 'destroy',
  PROPS: 'props',
  RESIZE: 'resize',
  FOCUS: 'focus',
} as const;

export type EventType = (typeof EVENT)[keyof typeof EVENT];

/**
 * Prop serialization strategies
 */
export const PROP_SERIALIZATION = {
  JSON: 'json',
  BASE64: 'base64',
} as const;

export type SerializationType =
  (typeof PROP_SERIALIZATION)[keyof typeof PROP_SERIALIZATION];

/**
 * Internal message types for cross-domain communication
 */
export const MESSAGE_TYPE = {
  REQUEST: 'request',
  RESPONSE: 'response',
  ACK: 'ack',
} as const;

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

/**
 * Message names for parent-child communication protocol
 */
export const MESSAGE_NAME = {
  INIT: 'forgeframe_init',
  PROPS: 'forgeframe_props',
  CLOSE: 'forgeframe_close',
  RESIZE: 'forgeframe_resize',
  FOCUS: 'forgeframe_focus',
  SHOW: 'forgeframe_show',
  HIDE: 'forgeframe_hide',
  ERROR: 'forgeframe_error',
  EXPORT: 'forgeframe_export',
  CALL: 'forgeframe_call',
} as const;

export type MessageName = (typeof MESSAGE_NAME)[keyof typeof MESSAGE_NAME];

/**
 * Window name prefix for identifying ForgeFrame windows
 */
export const WINDOW_NAME_PREFIX = '__forgeframe__';

/**
 * Library version
 */
export const VERSION = '1.0.0';
