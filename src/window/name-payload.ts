import type { WindowNamePayload, SerializedProps, ParentExports } from '../types';
import type { ContextType } from '../constants';
import { WINDOW_NAME_PREFIX, VERSION } from '../constants';

/**
 * Build a window name with encoded payload
 * This is how initial props are passed from parent to child
 */
export function buildWindowName<P>(payload: WindowNamePayload<P>): string {
  const encoded = encodePayload(payload);
  return `${WINDOW_NAME_PREFIX}${encoded}`;
}

/**
 * Parse a window name to extract payload
 * Returns null if not a ForgeFrame window name
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
 * Check if current window is a ForgeFrame child window
 */
export function isForgeFrameWindow(win: Window = window): boolean {
  try {
    return win.name.startsWith(WINDOW_NAME_PREFIX);
  } catch {
    return false;
  }
}

/**
 * Check if current window is a child of a specific component tag
 */
export function isChildOfComponent(
  tag: string,
  win: Window = window
): boolean {
  const payload = parseWindowName(win.name);
  return payload?.tag === tag;
}

/**
 * Encode payload to base64 for window name
 */
function encodePayload<P>(payload: WindowNamePayload<P>): string {
  try {
    const json = JSON.stringify(payload);
    // Use base64 encoding that's safe for window.name
    return btoa(encodeURIComponent(json));
  } catch (err) {
    throw new Error(`Failed to encode payload: ${err}`);
  }
}

/**
 * Decode payload from base64 window name
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
 * Create a minimal payload for window name
 */
export function createWindowPayload<P>(options: {
  uid: string;
  tag: string;
  context: ContextType;
  parentDomain: string;
  props: SerializedProps;
  exports: ParentExports;
}): WindowNamePayload<P> {
  return {
    uid: options.uid,
    tag: options.tag,
    version: VERSION,
    context: options.context,
    parentDomain: options.parentDomain,
    props: options.props,
    exports: options.exports,
  };
}

/**
 * Update window name with new payload
 * Used when parent needs to update the child's reference
 */
export function updateWindowName<P>(
  win: Window,
  payload: WindowNamePayload<P>
): void {
  try {
    win.name = buildWindowName(payload);
  } catch {
    // Cross-origin error - can't update
  }
}

/**
 * Get the initial payload from current window
 * Used by child component to read parent's data
 */
export function getInitialPayload<P>(
  win: Window = window
): WindowNamePayload<P> | null {
  return parseWindowName(win.name);
}
