/**
 * @packageDocumentation
 * Function bridge for cross-domain function calls.
 *
 * @remarks
 * This module enables passing functions as props across domain boundaries
 * by converting them to references that can be called via postMessage.
 */

import type { FunctionRef } from '../types';
import { MESSAGE_NAME } from '../constants';
import { generateShortUID } from '../utils/uid';
import type { Messenger } from './messenger';

/**
 * Handles serialization and deserialization of functions for cross-domain calls.
 *
 * @remarks
 * When you pass a function as a prop, it gets converted to a reference
 * that can be called across domains via postMessage. The bridge maintains
 * mappings of local and remote functions.
 *
 * @example
 * ```typescript
 * const bridge = new FunctionBridge(messenger);
 *
 * // Serialize a local function
 * const ref = bridge.serialize(() => console.log('Hello'));
 *
 * // Deserialize a remote reference
 * const remoteFn = bridge.deserialize(ref, targetWin, targetDomain);
 * await remoteFn(); // Calls the original function cross-domain
 * ```
 *
 * @public
 */
export class FunctionBridge {
  /** @internal */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private localFunctions = new Map<string, Function>();

  /** @internal */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private remoteFunctions = new Map<string, Function>();

  /**
   * Creates a new FunctionBridge instance.
   *
   * @param messenger - The messenger to use for cross-domain calls
   */
  constructor(private messenger: Messenger) {
    this.setupCallHandler();
  }

  /**
   * Serializes a local function to a transferable reference.
   *
   * @param fn - The function to serialize
   * @param name - Optional name for debugging
   * @returns A function reference that can be sent across domains
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
   * Deserializes a function reference to a callable wrapper.
   *
   * @remarks
   * The returned function, when called, will invoke the original function
   * in the remote window via postMessage and return the result.
   *
   * @param ref - The function reference to deserialize
   * @param targetWin - The window containing the original function
   * @param targetDomain - The origin of the target window
   * @returns A callable wrapper function
   */
  deserialize(
    ref: FunctionRef,
    targetWin: Window,
    targetDomain: string
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  ): Function {
    const cacheKey = `${ref.__id__}`;
    const cached = this.remoteFunctions.get(cacheKey);
    if (cached) return cached;

    const wrapper = async (...args: unknown[]): Promise<unknown> => {
      return this.messenger.send(targetWin, targetDomain, MESSAGE_NAME.CALL, {
        id: ref.__id__,
        args,
      });
    };

    Object.defineProperty(wrapper, 'name', {
      value: ref.__name__,
      configurable: true,
    });

    this.remoteFunctions.set(cacheKey, wrapper);
    return wrapper;
  }

  /**
   * Type guard to check if a value is a function reference.
   *
   * @param value - The value to check
   * @returns True if the value is a FunctionRef
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
   * Sets up the handler for incoming function call messages.
   * @internal
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
   * Removes a local function reference.
   *
   * @param id - The function reference ID to remove
   */
  removeLocal(id: string): void {
    this.localFunctions.delete(id);
  }

  /**
   * Cleans up all function references.
   */
  destroy(): void {
    this.localFunctions.clear();
    this.remoteFunctions.clear();
  }
}

/**
 * Recursively serializes all functions in an object.
 *
 * @param obj - The object to process
 * @param bridge - The function bridge to use for serialization
 * @returns A new object with all functions replaced by references
 *
 * @public
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
 * Recursively deserializes all function references in an object.
 *
 * @param obj - The object to process
 * @param bridge - The function bridge to use for deserialization
 * @param targetWin - The window containing the original functions
 * @param targetDomain - The origin of the target window
 * @returns A new object with all references replaced by callable wrappers
 *
 * @public
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
