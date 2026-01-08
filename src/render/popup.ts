import type { Dimensions } from '../types';

export interface PopupOptions {
  url: string;
  name: string;
  dimensions: Dimensions;
}

/**
 * Error thrown when popup is blocked by browser
 */
export class PopupOpenError extends Error {
  constructor(message = 'Popup blocked by browser') {
    super(message);
    this.name = 'PopupOpenError';
  }
}

/**
 * Open a popup window
 */
export function openPopup(options: PopupOptions): Window {
  const { url, name, dimensions } = options;

  const width = normalizeDimensionForPopup(dimensions.width, 500);
  const height = normalizeDimensionForPopup(dimensions.height, 500);

  // Center on screen
  const left = Math.floor(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.floor(window.screenY + (window.outerHeight - height) / 2);

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=no',
    'toolbar=no',
    'location=yes', // Required for security
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');

  const win = window.open(url, name, features);

  if (!win || isPopupBlocked(win)) {
    throw new PopupOpenError();
  }

  return win;
}

/**
 * Close a popup window
 */
export function closePopup(win: Window): void {
  try {
    if (!win.closed) {
      win.close();
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Focus a popup window
 */
export function focusPopup(win: Window): void {
  try {
    if (!win.closed) {
      win.focus();
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Check if a popup was blocked
 */
export function isPopupBlocked(win: Window | null): boolean {
  if (!win) return true;

  try {
    // Try to access a property - blocked popups throw errors
    if (win.closed) return true;

    // Some browsers return a window that's not really usable
    if (win.innerHeight === 0 || win.innerWidth === 0) return true;

    return false;
  } catch {
    return true;
  }
}

/**
 * Watch for popup close
 */
export function watchPopupClose(
  win: Window,
  callback: () => void,
  interval = 500
): () => void {
  const timer = setInterval(() => {
    try {
      if (win.closed) {
        clearInterval(timer);
        callback();
      }
    } catch {
      // Window might be inaccessible
      clearInterval(timer);
      callback();
    }
  }, interval);

  return () => clearInterval(timer);
}

/**
 * Resize a popup window
 */
export function resizePopup(win: Window, dimensions: Dimensions): void {
  try {
    const width = normalizeDimensionForPopup(dimensions.width, win.outerWidth);
    const height = normalizeDimensionForPopup(
      dimensions.height,
      win.outerHeight
    );
    win.resizeTo(width, height);
  } catch {
    // Resize might be blocked
  }
}

/**
 * Normalize dimension for popup (must be number)
 */
function normalizeDimensionForPopup(
  value: string | number | undefined,
  fallback: number
): number {
  if (value === undefined) return fallback;
  if (typeof value === 'number') return value;

  // Try to parse pixel value
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}
