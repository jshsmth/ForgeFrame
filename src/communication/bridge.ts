import type { FunctionRef } from '../types';
import { MESSAGE_NAME } from '../constants';
import { generateShortUID } from '../utils/uid';
import type { Messenger } from './messenger';

/**
 * Handles serialization and deserialization of functions for cross-domain calls
 * When you pass a function as a prop, it gets converted to a reference
 * that can be called across domains via postMessage
 */
export class FunctionBridge {
  private localFunctions = new Map<string, Function>();
  private remoteFunctions = new Map<string, Function>();

  constructor(private messenger: Messenger) {
    this.setupCallHandler();
  }

  /**
   * Serialize a local function to a reference
   */
  serialize(fn: Function, name?: string): FunctionRef {
    const id = generateShortUID();
    this.localFunctions.set(id, fn);

    return {
      __type__: 'function',
      __id__: id,
      __name__: name || fn.name || 'anonymous',
    };
  }

  /**
   * Deserialize a function reference to a callable function
   * The returned function will call the original across domains
   */
  deserialize(
    ref: FunctionRef,
    targetWin: Window,
    targetDomain: string
  ): Function {
    // Check if we already have a wrapper for this reference
    const cacheKey = `${ref.__id__}`;
    const cached = this.remoteFunctions.get(cacheKey);
    if (cached) return cached;

    // Create a wrapper function that calls across domains
    const wrapper = async (...args: unknown[]): Promise<unknown> => {
      return this.messenger.send(targetWin, targetDomain, MESSAGE_NAME.CALL, {
        id: ref.__id__,
        args,
      });
    };

    // Preserve function name for debugging
    Object.defineProperty(wrapper, 'name', {
      value: ref.__name__,
      configurable: true,
    });

    this.remoteFunctions.set(cacheKey, wrapper);
    return wrapper;
  }

  /**
   * Check if a value is a function reference
   */
  static isFunctionRef(value: unknown): value is FunctionRef {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as FunctionRef).__type__ === 'function' &&
      typeof (value as FunctionRef).__id__ === 'string'
    );
  }

  /**
   * Setup handler for incoming function calls
   */
  private setupCallHandler(): void {
    this.messenger.on<{ id: string; args: unknown[] }>(
      MESSAGE_NAME.CALL,
      async ({ id, args }) => {
        const fn = this.localFunctions.get(id);
        if (!fn) {
          throw new Error(`Function with id "${id}" not found`);
        }
        return fn(...args);
      }
    );
  }

  /**
   * Remove a local function reference
   */
  removeLocal(id: string): void {
    this.localFunctions.delete(id);
  }

  /**
   * Clean up all function references
   */
  destroy(): void {
    this.localFunctions.clear();
    this.remoteFunctions.clear();
  }
}

/**
 * Recursively serialize all functions in an object
 */
export function serializeFunctions(
  obj: unknown,
  bridge: FunctionBridge
): unknown {
  if (typeof obj === 'function') {
    return bridge.serialize(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeFunctions(item, bridge));
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeFunctions(value, bridge);
    }
    return result;
  }

  return obj;
}

/**
 * Recursively deserialize all function references in an object
 */
export function deserializeFunctions(
  obj: unknown,
  bridge: FunctionBridge,
  targetWin: Window,
  targetDomain: string
): unknown {
  if (FunctionBridge.isFunctionRef(obj)) {
    return bridge.deserialize(obj, targetWin, targetDomain);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      deserializeFunctions(item, bridge, targetWin, targetDomain)
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deserializeFunctions(value, bridge, targetWin, targetDomain);
    }
    return result;
  }

  return obj;
}
