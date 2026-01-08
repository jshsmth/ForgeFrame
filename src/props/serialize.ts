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
 * Serialize props for cross-domain transfer
 * Functions are converted to references, objects are JSON/base64 encoded
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
 * Serialize a single value
 */
function serializeValue(
  value: unknown,
  definition: PropDefinition | undefined,
  bridge: FunctionBridge
): unknown {
  // Handle functions
  if (typeof value === 'function') {
    return bridge.serialize(value as Function);
  }

  // Handle based on serialization strategy
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

  // Recursively serialize functions in objects/arrays
  return serializeFunctions(value, bridge);
}

/**
 * Deserialize props received from parent
 * Function references are converted back to callable functions
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
 * Deserialize a single value
 */
function deserializeValue(
  value: unknown,
  _definition: PropDefinition | undefined,
  _messenger: Messenger,
  bridge: FunctionBridge,
  parentWin: Window,
  parentDomain: string
): unknown {
  // Handle base64 encoded values
  if (isBase64Encoded(value)) {
    try {
      const json = decodeURIComponent(atob(value.__value__));
      return JSON.parse(json);
    } catch {
      return value;
    }
  }

  // Recursively deserialize functions
  return deserializeFunctions(value, bridge, parentWin, parentDomain);
}

/**
 * Check if value is base64 encoded
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
 * Clone props with deep copy (for isolation)
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
