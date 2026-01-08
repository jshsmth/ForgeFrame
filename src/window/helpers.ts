import type { DomainMatcher } from '../types';

/**
 * Get the current window's domain (origin)
 */
export function getDomain(win: Window = window): string {
  try {
    return win.location.origin;
  } catch {
    // Cross-origin access denied
    return '';
  }
}

/**
 * Check if a window is from the same domain
 */
export function isSameDomain(win: Window, reference: Window = window): boolean {
  try {
    // If we can access the location, it's same domain
    return win.location.origin === reference.location.origin;
  } catch {
    return false;
  }
}

/**
 * Check if a domain matches a pattern
 */
export function matchDomain(
  pattern: DomainMatcher,
  domain: string
): boolean {
  if (typeof pattern === 'string') {
    // Wildcard matches everything
    if (pattern === '*') return true;
    // Exact match
    return pattern === domain;
  }

  if (pattern instanceof RegExp) {
    return pattern.test(domain);
  }

  if (Array.isArray(pattern)) {
    return pattern.some((p) => matchDomain(p, domain));
  }

  return false;
}

/**
 * Check if a window is closed
 */
export function isWindowClosed(win: Window | null): boolean {
  if (!win) return true;

  try {
    return win.closed;
  } catch {
    // Cross-origin error usually means window is closed or inaccessible
    return true;
  }
}

/**
 * Get the opener window (for popups)
 */
export function getOpener(win: Window = window): Window | null {
  try {
    return win.opener;
  } catch {
    return null;
  }
}

/**
 * Get the parent window (for iframes)
 */
export function getParent(win: Window = window): Window | null {
  try {
    const parent = win.parent;
    // Check if we're actually in an iframe (parent !== self)
    if (parent && parent !== win) {
      return parent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the top-level window
 */
export function getTop(win: Window = window): Window | null {
  try {
    return win.top;
  } catch {
    return null;
  }
}

/**
 * Check if current window is an iframe
 */
export function isIframe(win: Window = window): boolean {
  try {
    return win.parent !== win;
  } catch {
    // If we can't access parent, assume we might be in an iframe
    return true;
  }
}

/**
 * Check if current window is a popup (has opener)
 */
export function isPopup(win: Window = window): boolean {
  try {
    return win.opener !== null && win.opener !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get the ancestor window at a specific distance
 * distance 1 = parent, distance 2 = grandparent, etc.
 */
export function getAncestor(
  win: Window = window,
  distance: number
): Window | null {
  let current: Window | null = win;

  for (let i = 0; i < distance; i++) {
    current = getParent(current);
    if (!current) return null;
  }

  return current;
}

/**
 * Get distance to a parent window
 * Returns -1 if not a parent
 */
export function getDistanceToParent(
  child: Window,
  parent: Window
): number {
  let current: Window | null = child;
  let distance = 0;

  while (current) {
    if (current === parent) {
      return distance;
    }
    current = getParent(current);
    distance++;

    // Safety limit
    if (distance > 100) {
      break;
    }
  }

  return -1;
}

/**
 * Focus a window
 */
export function focusWindow(win: Window): void {
  try {
    win.focus();
  } catch {
    // Ignore focus errors
  }
}

/**
 * Close a window
 */
export function closeWindow(win: Window): void {
  try {
    win.close();
  } catch {
    // Ignore close errors
  }
}

/**
 * Get all frames in a window
 */
export function getFrames(win: Window = window): Window[] {
  const frames: Window[] = [];

  try {
    for (let i = 0; i < win.frames.length; i++) {
      frames.push(win.frames[i] as Window);
    }
  } catch {
    // Cross-origin error
  }

  return frames;
}
