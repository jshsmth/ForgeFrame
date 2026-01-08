import type { Dimensions, IframeAttributes } from '../types';

export interface IframeOptions {
  url: string;
  name: string;
  container: HTMLElement;
  dimensions: Dimensions;
  attributes?: IframeAttributes;
}

/**
 * Create an iframe element with the specified options
 */
export function createIframe(options: IframeOptions): HTMLIFrameElement {
  const { url, name, container, dimensions, attributes = {} } = options;

  const iframe = document.createElement('iframe');

  // Set essential attributes
  iframe.name = name;
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('scrolling', 'no');

  // Set dimensions
  applyDimensions(iframe, dimensions);

  // Set custom attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) continue;

    if (typeof value === 'boolean') {
      if (value) {
        iframe.setAttribute(key, '');
      }
    } else {
      iframe.setAttribute(key, value);
    }
  }

  // Default sandbox if not specified (security)
  if (!attributes.sandbox) {
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
    );
  }

  // Add to container first (some browsers need this before setting src)
  container.appendChild(iframe);

  // Set src last to start loading
  iframe.src = url;

  return iframe;
}

/**
 * Create an iframe for prerender (loading state)
 */
export function createPrerenderIframe(
  container: HTMLElement,
  dimensions: Dimensions
): HTMLIFrameElement {
  const iframe = document.createElement('iframe');

  iframe.name = '__forgeframe_prerender__';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('scrolling', 'no');

  applyDimensions(iframe, dimensions);

  // Prerender iframe doesn't need to load external content
  iframe.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';

  container.appendChild(iframe);

  return iframe;
}

/**
 * Destroy an iframe
 */
export function destroyIframe(iframe: HTMLIFrameElement): void {
  try {
    // Clear src to stop loading
    iframe.src = 'about:blank';
    // Remove from DOM
    iframe.parentNode?.removeChild(iframe);
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Resize an iframe
 */
export function resizeIframe(
  iframe: HTMLIFrameElement,
  dimensions: Dimensions
): void {
  applyDimensions(iframe, dimensions);
}

/**
 * Show an iframe
 */
export function showIframe(iframe: HTMLIFrameElement): void {
  iframe.style.display = '';
  iframe.style.visibility = 'visible';
}

/**
 * Hide an iframe
 */
export function hideIframe(iframe: HTMLIFrameElement): void {
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
}

/**
 * Focus an iframe (if possible)
 */
export function focusIframe(iframe: HTMLIFrameElement): void {
  try {
    iframe.focus();
    iframe.contentWindow?.focus();
  } catch {
    // Cross-origin focus might fail
  }
}

/**
 * Apply dimensions to an iframe
 */
function applyDimensions(
  iframe: HTMLIFrameElement,
  dimensions: Dimensions
): void {
  if (dimensions.width !== undefined) {
    iframe.style.width = normalizeDimension(dimensions.width);
  }
  if (dimensions.height !== undefined) {
    iframe.style.height = normalizeDimension(dimensions.height);
  }
}

/**
 * Normalize a dimension value to CSS string
 */
function normalizeDimension(value: string | number): string {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  return value;
}

/**
 * Get content dimensions from iframe (for auto-resize)
 */
export function getIframeContentDimensions(
  iframe: HTMLIFrameElement
): Dimensions | null {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return null;

    const body = doc.body;
    const html = doc.documentElement;

    return {
      width: Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.clientWidth,
        html.scrollWidth,
        html.offsetWidth
      ),
      height: Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      ),
    };
  } catch {
    // Cross-origin access denied
    return null;
  }
}
