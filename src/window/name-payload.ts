import type { WindowNamePayload, SerializedProps, ParentExports, ChildComponentRef } from '../types';
import type { ContextType } from '../constants';
import { WINDOW_NAME_PREFIX, VERSION } from '../constants';

/**
 * Builds a window name string with an encoded payload.
 *
 * @typeParam P - The type of the props included in the payload.
 * @param payload - The payload to encode into the window name.
 * @returns A window name string with the ForgeFrame prefix and base64-encoded payload.
 *
 * @remarks
 * This is the primary mechanism for passing initial props from a parent window
 * to a child window (iframe or popup). The payload is JSON-serialized and base64-encoded
 * to ensure safe transport via the window.name property.
 *
 * @example
 * ```typescript
 * const payload: WindowNamePayload<MyProps> = {
 *   uid: 'child-123',
 *   tag: 'my-component',
 *   version: '1.0.0',
 *   context: 'iframe',
 *   parentDomain: 'https://parent.com',
 *   props: { message: 'Hello' },
 *   exports: {}
 * };
 *
 * const windowName = buildWindowName(payload);
 * // Use when creating iframe: iframe.name = windowName;
 * ```
 *
 * @public
 */
export function buildWindowName<P>(payload: WindowNamePayload<P>): string {
  const encoded = encodePayload(payload);
  return `${WINDOW_NAME_PREFIX}${encoded}`;
}

/**
 * Parses a window name to extract the encoded payload.
 *
 * @typeParam P - The expected type of the props in the payload.
 * @param name - The window name string to parse.
 * @returns The decoded WindowNamePayload, or `null` if the name is not a valid ForgeFrame window name.
 *
 * @remarks
 * This function checks if the window name starts with the ForgeFrame prefix,
 * then decodes the base64-encoded payload. Returns `null` if the name doesn't
 * have the expected format or if decoding fails.
 *
 * @example
 * ```typescript
 * // In a child window
 * const payload = parseWindowName<MyProps>(window.name);
 * if (payload) {
 *   console.log('Received props:', payload.props);
 *   console.log('Parent domain:', payload.parentDomain);
 * }
 * ```
 *
 * @public
 */
export function parseWindowName<P>(
  name: string
): WindowNamePayload<P> | null {
  if (!name || !name.startsWith(WINDOW_NAME_PREFIX)) {
    return null;
  }

  const encoded = name.slice(WINDOW_NAME_PREFIX.length);
  return decodePayload<P>(encoded);
}

/**
 * Checks if the specified window is a ForgeFrame child window.
 *
 * @param win - The window to check. Defaults to the current window.
 * @returns `true` if the window's name starts with the ForgeFrame prefix, `false` otherwise.
 *
 * @remarks
 * A ForgeFrame child window is identified by having a window name that starts
 * with the ForgeFrame prefix. This function safely handles cross-origin errors.
 *
 * @example
 * ```typescript
 * if (isForgeFrameWindow()) {
 *   // This window was created by ForgeFrame
 *   const payload = getInitialPayload();
 * }
 * ```
 *
 * @public
 */
export function isForgeFrameWindow(win: Window = window): boolean {
  try {
    return win.name.startsWith(WINDOW_NAME_PREFIX);
  } catch {
    return false;
  }
}

/**
 * Checks if the current window is a child of a specific component tag.
 *
 * @param tag - The component tag to check for.
 * @param win - The window to check. Defaults to the current window.
 * @returns `true` if the window's payload has the specified tag, `false` otherwise.
 *
 * @remarks
 * This function parses the window name and checks if the tag in the payload
 * matches the specified tag. Useful for component-specific initialization logic.
 *
 * @example
 * ```typescript
 * if (isChildOfComponent('payment-form')) {
 *   // Initialize payment-specific features
 * }
 * ```
 *
 * @public
 */
export function isChildOfComponent(
  tag: string,
  win: Window = window
): boolean {
  const payload = parseWindowName(win.name);
  return payload?.tag === tag;
}

/**
 * Encodes a payload to a base64 string for use in window.name.
 *
 * @typeParam P - The type of the props in the payload.
 * @param payload - The payload to encode.
 * @returns A base64-encoded string representing the payload.
 * @throws Error if JSON serialization or encoding fails.
 *
 * @remarks
 * The payload is first JSON-serialized, then URI-encoded (to handle Unicode),
 * and finally base64-encoded. This ensures the result is safe for window.name.
 *
 * @internal
 */
function encodePayload<P>(payload: WindowNamePayload<P>): string {
  try {
    const json = JSON.stringify(payload);
    return btoa(encodeURIComponent(json));
  } catch (err) {
    throw new Error(`Failed to encode payload: ${err}`);
  }
}

/**
 * Decodes a base64-encoded payload from a window name.
 *
 * @typeParam P - The expected type of the props in the payload.
 * @param encoded - The base64-encoded string to decode.
 * @returns The decoded WindowNamePayload, or `null` if decoding fails.
 *
 * @remarks
 * Reverses the encoding performed by {@link encodePayload}: base64-decodes,
 * URI-decodes, and JSON-parses the string. Returns `null` on any error.
 *
 * @internal
 */
function decodePayload<P>(encoded: string): WindowNamePayload<P> | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as WindowNamePayload<P>;
  } catch {
    return null;
  }
}

/**
 * Creates a window payload object for encoding into a window name.
 *
 * @typeParam P - The type of the props (used for type inference in the returned payload).
 * @param options - The options for creating the payload.
 * @param options.uid - Unique identifier for the child window.
 * @param options.tag - Component tag name.
 * @param options.context - The context type (e.g., 'iframe' or 'popup').
 * @param options.parentDomain - The origin of the parent window.
 * @param options.props - Serialized props to pass to the child.
 * @param options.exports - Functions exported by the parent for the child to call.
 * @param options.children - Optional map of child component references.
 * @returns A WindowNamePayload object ready for encoding.
 *
 * @remarks
 * This is a factory function that creates a properly structured payload with
 * the current ForgeFrame version automatically included.
 *
 * @example
 * ```typescript
 * const payload = createWindowPayload<MyProps>({
 *   uid: generateUID(),
 *   tag: 'checkout-form',
 *   context: 'iframe',
 *   parentDomain: window.location.origin,
 *   props: { amount: 100 },
 *   exports: { onSuccess: true, onError: true }
 * });
 *
 * const windowName = buildWindowName(payload);
 * ```
 *
 * @public
 */
export function createWindowPayload<P>(options: {
  uid: string;
  tag: string;
  context: ContextType;
  parentDomain: string;
  props: SerializedProps;
  exports: ParentExports;
  children?: Record<string, ChildComponentRef>;
}): WindowNamePayload<P> {
  return {
    uid: options.uid,
    tag: options.tag,
    version: VERSION,
    context: options.context,
    parentDomain: options.parentDomain,
    props: options.props,
    exports: options.exports,
    children: options.children,
  };
}

/**
 * Updates a window's name with a new encoded payload.
 *
 * @typeParam P - The type of the props in the payload.
 * @param win - The window whose name should be updated.
 * @param payload - The new payload to encode into the window name.
 *
 * @remarks
 * This function is used when the parent needs to update the child's reference
 * or pass updated data. It safely handles cross-origin errors by silently failing.
 *
 * @example
 * ```typescript
 * // Update child window with new props
 * const updatedPayload = { ...existingPayload, props: { newValue: 42 } };
 * updateWindowName(childWindow, updatedPayload);
 * ```
 *
 * @public
 */
export function updateWindowName<P>(
  win: Window,
  payload: WindowNamePayload<P>
): void {
  try {
    win.name = buildWindowName(payload);
  } catch {
    // Cross-origin errors are silently ignored
  }
}

/**
 * Gets the initial payload from a window's name.
 *
 * @typeParam P - The expected type of the props in the payload.
 * @param win - The window to read the payload from. Defaults to the current window.
 * @returns The decoded WindowNamePayload, or `null` if not a ForgeFrame window.
 *
 * @remarks
 * This is a convenience function typically used by child components during
 * initialization to read the data passed by the parent window.
 *
 * @example
 * ```typescript
 * // In child window initialization
 * const payload = getInitialPayload<MyProps>();
 * if (payload) {
 *   initializeComponent(payload.props);
 *   setupParentCommunication(payload.parentDomain);
 * }
 * ```
 *
 * @public
 */
export function getInitialPayload<P>(
  win: Window = window
): WindowNamePayload<P> | null {
  return parseWindowName(win.name);
}
