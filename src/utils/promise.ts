/**
 * Represents a deferred promise with externally accessible resolve and reject functions.
 *
 * @typeParam T - The type of value the promise will resolve to
 *
 * @remarks
 * This interface is useful when you need to create a promise that will be
 * resolved or rejected from outside the promise executor function.
 *
 * @public
 */
export interface Deferred<T> {
  /** The underlying promise that can be awaited */
  promise: Promise<T>;
  /** Function to resolve the promise with a value */
  resolve: (value: T) => void;
  /** Function to reject the promise with an error */
  reject: (error: Error) => void;
}

/**
 * Creates a deferred promise with externally accessible resolve and reject functions.
 *
 * @typeParam T - The type of value the promise will resolve to
 * @returns A {@link Deferred} object containing the promise and its control functions
 *
 * @remarks
 * This utility is helpful when the resolution of a promise depends on external
 * events or callbacks that occur outside the promise executor scope.
 *
 * @example
 * ```typescript
 * const deferred = createDeferred<string>();
 *
 * // Pass the promise to something that will await it
 * someAsyncOperation(deferred.promise);
 *
 * // Later, resolve from elsewhere
 * deferred.resolve('Success!');
 * ```
 *
 * @public
 */
export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Wraps a promise with a timeout, rejecting if the timeout is exceeded.
 *
 * @typeParam T - The type of value the promise will resolve to
 * @param promise - The promise to wrap with a timeout
 * @param ms - The timeout duration in milliseconds
 * @param message - Custom error message for timeout (defaults to 'Operation timed out')
 * @returns A new promise that resolves with the original value or rejects on timeout
 *
 * @throws Error when the timeout is exceeded before the promise resolves
 *
 * @remarks
 * This is useful for adding time constraints to operations that might hang
 * or take unexpectedly long. The original promise continues executing even
 * after timeout, but its result is ignored.
 *
 * @example
 * ```typescript
 * try {
 *   const result = await promiseTimeout(
 *     fetchData(),
 *     5000,
 *     'Data fetch timed out'
 *   );
 * } catch (error) {
 *   console.error(error.message); // "Data fetch timed out (5000ms)"
 * }
 * ```
 *
 * @public
 */
export function promiseTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${message} (${ms}ms)`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Waits for a condition function to return true, polling at a specified interval.
 *
 * @param condition - A function that returns `true` when the wait condition is met
 * @param options - Configuration options for the wait behavior
 * @param options.timeout - Maximum time to wait in milliseconds (defaults to 5000)
 * @param options.interval - Polling interval in milliseconds (defaults to 50)
 * @returns A promise that resolves when the condition becomes true
 *
 * @throws Error when the timeout is exceeded before the condition becomes true
 *
 * @remarks
 * This utility is particularly useful in testing scenarios or when waiting
 * for DOM elements, state changes, or other asynchronous conditions.
 *
 * @example
 * ```typescript
 * // Wait for an element to appear
 * await waitFor(
 *   () => document.querySelector('.modal') !== null,
 *   { timeout: 3000, interval: 100 }
 * );
 * ```
 *
 * @public
 */
export function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error('waitFor timed out'));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Creates a promise that resolves after a specified delay.
 *
 * @param ms - The delay duration in milliseconds
 * @returns A promise that resolves after the specified delay
 *
 * @remarks
 * This is a simple utility for introducing delays in async code,
 * useful for throttling, debouncing, or creating artificial pauses.
 *
 * @example
 * ```typescript
 * console.log('Starting...');
 * await delay(1000);
 * console.log('One second later');
 * ```
 *
 * @public
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a function and returns its result, returning a fallback value if an error occurs.
 *
 * @typeParam T - The type of value returned by the function and fallback
 * @param fn - The function to execute (can be sync or async)
 * @param fallback - The value to return if the function throws an error
 * @returns A promise that resolves to either the function result or the fallback value
 *
 * @remarks
 * This utility provides a concise way to handle errors without explicit try-catch blocks,
 * particularly useful when a sensible default value exists for error cases.
 *
 * @example
 * ```typescript
 * // Safely parse JSON with a fallback
 * const config = await tryCatch(
 *   () => JSON.parse(rawConfig),
 *   { defaultSetting: true }
 * );
 *
 * // Safely fetch with a fallback
 * const data = await tryCatch(
 *   async () => await fetchData(),
 *   []
 * );
 * ```
 *
 * @public
 */
export async function tryCatch<T>(
  fn: () => T | Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
