/**
 * @packageDocumentation
 * Props serialization module for cross-domain transfer.
 *
 * @remarks
 * This module handles serializing and deserializing props for transfer
 * between parent and child windows across domain boundaries.
 */

import type { PropDefinition, PropsDefinition, SerializedProps } from '../types';
import { PROP_SERIALIZATION } from '../constants';
import {
  FunctionBridge,
  serializeFunctions,
  deserializeFunctions,
} from '../communication/bridge';
import type { Messenger } from '../communication/messenger';
import { BUILTIN_PROP_DEFINITIONS } from './definitions';

/**
 * Converts a nested object to dot notation string.
 *
 * @example
 * ```typescript
 * toDotNotation({a: {b: 1, c: 2}}) // => 'a.b=1&a.c=2'
 * ```
 *
 * @internal
 */
function toDotNotation(
  obj: Record<string, unknown>,
  prefix = ''
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse into nested objects
      parts.push(toDotNotation(value as Record<string, unknown>, fullKey));
    } else {
      // Encode value (handle arrays and primitives)
      const encodedValue = encodeURIComponent(JSON.stringify(value));
      parts.push(`${fullKey}=${encodedValue}`);
    }
  }

  return parts.filter(Boolean).join('&');
}

/**
 * Converts dot notation string back to nested object.
 *
 * @example
 * ```typescript
 * fromDotNotation('a.b=1&a.c=2') // => {a: {b: 1, c: 2}}
 * ```
 *
 * @internal
 */
function fromDotNotation(str: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!str) return result;

  const pairs = str.split('&');

  for (const pair of pairs) {
    const [path, encodedValue] = pair.split('=');
    if (!path || encodedValue === undefined) continue;

    // Decode and parse the value
    let value: unknown;
    try {
      value = JSON.parse(decodeURIComponent(encodedValue));
    } catch {
      value = decodeURIComponent(encodedValue);
    }

    // Set the value at the nested path
    const keys = path.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

/**
 * Checks if a value is dotify encoded.
 * @internal
 */
function isDotifyEncoded(
  value: unknown
): value is { __type__: 'dotify'; __value__: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).__type__ === 'dotify' &&
    typeof (value as Record<string, unknown>).__value__ === 'string'
  );
}

/**
 * Serializes props for cross-domain transfer.
 *
 * @remarks
 * Functions are converted to references, objects are JSON/base64/dotify encoded
 * based on the prop definition's serialization setting.
 *
 * @typeParam P - The props type
 * @param props - Props to serialize
 * @param definitions - Prop definitions
 * @param bridge - Function bridge for serializing functions
 * @returns Serialized props ready for postMessage
 *
 * @public
 */
export function serializeProps<P extends Record<string, unknown>>(
  props: P,
  definitions: PropsDefinition<P>,
  bridge: FunctionBridge
): SerializedProps {
  const allDefs = {
    ...BUILTIN_PROP_DEFINITIONS,
    ...definitions,
  } as PropsDefinition<P>;

  const result: SerializedProps = {};

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;

    const definition = (allDefs as Record<string, PropDefinition>)[key];

    result[key] = serializeValue(value, definition, bridge);
  }

  return result;
}

/**
 * Serializes a single value.
 * @internal
 */
function serializeValue(
  value: unknown,
  definition: PropDefinition | undefined,
  bridge: FunctionBridge
): unknown {
  if (typeof value === 'function') {
    return bridge.serialize(value as Function);
  }

  const serialization = definition?.serialization ?? PROP_SERIALIZATION.JSON;

  if (serialization === PROP_SERIALIZATION.BASE64) {
    if (typeof value === 'object') {
      const json = JSON.stringify(value);
      return {
        __type__: 'base64',
        __value__: btoa(encodeURIComponent(json)),
      };
    }
  }

  if (serialization === PROP_SERIALIZATION.DOTIFY) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return {
        __type__: 'dotify',
        __value__: toDotNotation(value as Record<string, unknown>),
      };
    }
  }

  return serializeFunctions(value, bridge);
}

/**
 * Deserializes props received from the parent.
 *
 * @remarks
 * Function references are converted back to callable functions that
 * invoke the original via postMessage.
 *
 * @typeParam P - The props type
 * @param serialized - Serialized props from parent
 * @param definitions - Prop definitions
 * @param messenger - Messenger for function calls
 * @param bridge - Function bridge for deserializing functions
 * @param parentWin - Parent window reference
 * @param parentDomain - Parent origin domain
 * @returns Deserialized props
 *
 * @public
 */
export function deserializeProps<P extends Record<string, unknown>>(
  serialized: SerializedProps,
  definitions: PropsDefinition<P>,
  messenger: Messenger,
  bridge: FunctionBridge,
  parentWin: Window,
  parentDomain: string
): P {
  const allDefs = {
    ...BUILTIN_PROP_DEFINITIONS,
    ...definitions,
  } as PropsDefinition<P>;

  const result = {} as P;

  for (const [key, value] of Object.entries(serialized)) {
    const definition = (allDefs as Record<string, PropDefinition>)[key];

    (result as Record<string, unknown>)[key] = deserializeValue(
      value,
      definition,
      messenger,
      bridge,
      parentWin,
      parentDomain
    );
  }

  return result;
}

/**
 * Deserializes a single value.
 * @internal
 */
function deserializeValue(
  value: unknown,
  _definition: PropDefinition | undefined,
  _messenger: Messenger,
  bridge: FunctionBridge,
  parentWin: Window,
  parentDomain: string
): unknown {
  if (isBase64Encoded(value)) {
    try {
      const json = decodeURIComponent(atob(value.__value__));
      return JSON.parse(json);
    } catch {
      return value;
    }
  }

  if (isDotifyEncoded(value)) {
    try {
      return fromDotNotation(value.__value__);
    } catch {
      return value;
    }
  }

  return deserializeFunctions(value, bridge, parentWin, parentDomain);
}

/**
 * Checks if a value is base64 encoded.
 * @internal
 */
function isBase64Encoded(
  value: unknown
): value is { __type__: 'base64'; __value__: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).__type__ === 'base64' &&
    typeof (value as Record<string, unknown>).__value__ === 'string'
  );
}

/**
 * Creates a deep clone of props.
 *
 * @remarks
 * Functions are passed by reference, objects are deep cloned using
 * structuredClone, and primitives are copied directly.
 *
 * @typeParam P - The props type
 * @param props - Props to clone
 * @returns Cloned props
 *
 * @public
 */
export function cloneProps<P extends Record<string, unknown>>(
  props: P
): P {
  const result = {} as P;

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function') {
      // Functions are passed by reference
      (result as Record<string, unknown>)[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Deep clone objects
      (result as Record<string, unknown>)[key] = structuredClone(value);
    } else {
      // Primitives are copied directly
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}
