import type { TemplateContext, Dimensions } from '../types';

/**
 * Default container template
 * Creates a wrapper div that holds the iframe/popup with transitions
 */
export function defaultContainerTemplate<P>(
  ctx: TemplateContext<P>
): HTMLElement {
  const { doc, dimensions, uid, tag } = ctx;

  const container = doc.createElement('div');
  container.id = `forgeframe-container-${uid}`;
  container.setAttribute('data-forgeframe-tag', tag);

  // Apply base styles
  Object.assign(container.style, {
    display: 'inline-block',
    position: 'relative',
    width: normalizeDimension(dimensions.width),
    height: normalizeDimension(dimensions.height),
    overflow: 'hidden',
  });

  return container;
}

/**
 * Default prerender template
 * Shows a loading spinner while the component loads
 */
export function defaultPrerenderTemplate<P>(
  ctx: TemplateContext<P> & { cspNonce?: string }
): HTMLElement {
  const { doc, dimensions, cspNonce } = ctx;

  const wrapper = doc.createElement('div');
  Object.assign(wrapper.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: normalizeDimension(dimensions.width),
    height: normalizeDimension(dimensions.height),
    backgroundColor: '#f5f5f5',
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '100',
  });

  // Create spinner
  const spinner = doc.createElement('div');
  Object.assign(spinner.style, {
    width: '40px',
    height: '40px',
    border: '3px solid #e0e0e0',
    borderTopColor: '#3498db',
    borderRadius: '50%',
    animation: 'forgeframe-spin 1s linear infinite',
  });

  // Add keyframes animation
  const style = doc.createElement('style');
  if (cspNonce) {
    style.setAttribute('nonce', cspNonce);
  }
  style.textContent = `
    @keyframes forgeframe-spin {
      to { transform: rotate(360deg); }
    }
  `;

  wrapper.appendChild(style);
  wrapper.appendChild(spinner);

  return wrapper;
}

/**
 * Normalize dimension to CSS value
 */
function normalizeDimension(value: string | number | undefined): string {
  if (value === undefined) return '100%';
  if (typeof value === 'number') return `${value}px`;
  return value;
}

/**
 * Apply dimensions to an element
 */
export function applyDimensions(
  element: HTMLElement,
  dimensions: Dimensions
): void {
  if (dimensions.width !== undefined) {
    element.style.width = normalizeDimension(dimensions.width);
  }
  if (dimensions.height !== undefined) {
    element.style.height = normalizeDimension(dimensions.height);
  }
}

/**
 * Create inline styles element
 */
export function createStyleElement(
  doc: Document,
  css: string,
  nonce?: string
): HTMLStyleElement {
  const style = doc.createElement('style');
  if (nonce) {
    style.setAttribute('nonce', nonce);
  }
  style.textContent = css;
  return style;
}

/**
 * Fade in animation helper
 */
export function fadeIn(element: HTMLElement, duration = 200): Promise<void> {
  return new Promise((resolve) => {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease-in`;

    // Force reflow
    element.offsetHeight;

    element.style.opacity = '1';

    setTimeout(resolve, duration);
  });
}

/**
 * Fade out animation helper
 */
export function fadeOut(element: HTMLElement, duration = 200): Promise<void> {
  return new Promise((resolve) => {
    element.style.transition = `opacity ${duration}ms ease-out`;
    element.style.opacity = '0';

    setTimeout(resolve, duration);
  });
}

/**
 * Swap prerender content with actual content
 */
export async function swapPrerenderContent(
  container: HTMLElement,
  prerenderElement: HTMLElement | null,
  actualElement: HTMLElement
): Promise<void> {
  // Hide prerender
  if (prerenderElement) {
    await fadeOut(prerenderElement, 150);
    prerenderElement.remove();
  }

  // Show actual content
  actualElement.style.opacity = '0';
  container.appendChild(actualElement);
  await fadeIn(actualElement, 150);
}
