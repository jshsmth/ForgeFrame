import type { WindowRef } from '../types';
import { getParent, getOpener, getAncestor } from './helpers';

// Global storage for window references by UID
const windowRegistry = new Map<string, Window>();

/**
 * Register a window with a UID for later reference
 */
export function registerWindow(uid: string, win: Window): void {
  windowRegistry.set(uid, win);
}

/**
 * Unregister a window
 */
export function unregisterWindow(uid: string): void {
  windowRegistry.delete(uid);
}

/**
 * Get a window by UID
 */
export function getWindowByUID(uid: string): Window | null {
  return windowRegistry.get(uid) ?? null;
}

/**
 * Create a reference to a window that can be serialized
 */
export function createWindowRef(
  targetWin: Window,
  sourceWin: Window = window
): WindowRef {
  // Check if it's the opener (for popups)
  const opener = getOpener(sourceWin);
  if (opener === targetWin) {
    return { type: 'opener' };
  }

  // Check if it's a parent (for iframes)
  let parent = getParent(sourceWin);
  let distance = 1;

  while (parent) {
    if (parent === targetWin) {
      return { type: 'parent', distance };
    }
    parent = getParent(parent);
    distance++;

    // Safety limit
    if (distance > 100) break;
  }

  // Default to direct reference (won't work cross-domain, but needed for same-domain)
  return { type: 'direct', win: targetWin };
}

/**
 * Resolve a window reference to an actual window
 */
export function resolveWindowRef(
  ref: WindowRef,
  sourceWin: Window = window
): Window | null {
  switch (ref.type) {
    case 'opener':
      return getOpener(sourceWin);

    case 'parent':
      return getAncestor(sourceWin, ref.distance);

    case 'global':
      return getWindowByUID(ref.uid);

    case 'direct':
      return ref.win;

    default:
      return null;
  }
}

/**
 * Serialize a window reference for cross-domain transfer
 * Strips non-serializable data
 */
export function serializeWindowRef(ref: WindowRef): WindowRef {
  if (ref.type === 'direct') {
    // Can't serialize actual window object
    // This should be converted to a global ref with UID first
    throw new Error(
      'Cannot serialize direct window reference. Use registerWindow first.'
    );
  }
  return ref;
}

/**
 * Clear all registered windows
 * Useful for cleanup/testing
 */
export function clearWindowRegistry(): void {
  windowRegistry.clear();
}
