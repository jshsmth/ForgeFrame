/**
 * Code generation for ForgeFrame Playground
 */
import { elements } from './elements';
import { currentPropValues } from './state';
import { getDefaultValue } from './props-bar';
import type { PlaygroundConfig, RenderContext, IframeStyle } from './types';

// Prism.js type declaration (loaded via CDN)
declare const Prism: {
  highlightElement: (element: Element) => void;
};

export function generateCode(
  config: PlaygroundConfig,
  context: RenderContext,
  iframeStyle: IframeStyle
): string {
  const propsEntries = Object.entries(config.props || {})
    .map(([key, val]) => {
      const v = val as Record<string, unknown>;
      const parts = [`type: ForgeFrame.PROP_TYPE.${v.type || 'STRING'}`];
      if (v.required) parts.push('required: true');
      if (v.default !== undefined) {
        parts.push(`default: ${JSON.stringify(v.default)}`);
      }
      return `    ${key}: { ${parts.join(', ')} }`;
    })
    .join(',\n');

  // Generate instance prop values based on config
  const instancePropsEntries = Object.entries(config.props || {})
    .map(([key, val]) => {
      const v = val as Record<string, unknown>;
      const value = currentPropValues[key] ?? v.default ?? getDefaultValue(v);
      return `  ${key}: ${JSON.stringify(value)}`;
    })
    .join(',\n');

  const styleEntries = Object.entries(config.style || {})
    .map(([key, val]) => `    ${key}: ${JSON.stringify(val)}`)
    .join(',\n');

  const styleStr = styleEntries ? `  style: {\n${styleEntries}\n  },` : '';
  const propsStr = propsEntries ? `  props: {\n${propsEntries}\n  },` : '';

  // Generate modal-specific or embedded-specific code
  const isModal = context === 'iframe' && iframeStyle === 'modal';
  const ms = config.modalStyle || {};

  if (isModal) {
    const modalWidth = ms.width || 500;
    const modalHeight = ms.height || 400;

    return `import ForgeFrame from 'forgeframe';

// Define your modal component
const MyComponent = ForgeFrame.create({
  tag: ${JSON.stringify(config.tag)},
  url: ${JSON.stringify(config.url)},
  dimensions: { width: ${modalWidth}, height: ${modalHeight} },
${styleStr}
  containerTemplate: ({ doc, frame, prerenderFrame, close, uid }) => {
    // Create overlay
    const overlay = doc.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: ${JSON.stringify(ms.overlayBackground || 'rgba(0, 0, 0, 0.5)')},
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000',
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Create modal box
    const modal = doc.createElement('div');
    Object.assign(modal.style, {
      background: ${JSON.stringify(ms.boxBackground || '#ffffff')},
      borderRadius: ${JSON.stringify(ms.borderRadius || '8px')},
      boxShadow: ${JSON.stringify(ms.boxShadow || '0 20px 60px rgba(0, 0, 0, 0.3)')},
      border: '1px solid ${ms.borderColor || '#e0e0e0'}',
      overflow: 'hidden',
    });

    // Create header
    const header = doc.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 1rem',
      background: ${JSON.stringify(ms.headerBackground || '#fafafa')},
      borderBottom: '1px solid ${ms.borderColor || '#e0e0e0'}',
    });

    const title = doc.createElement('span');
    title.textContent = 'My Component';
    title.style.color = ${JSON.stringify(ms.headerColor || '#333333')};

    const closeBtn = doc.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background:none;border:none;font-size:1.5rem;cursor:pointer;';
    closeBtn.addEventListener('click', () => close());

    header.append(title, closeBtn);

    // Create body for iframe
    const body = doc.createElement('div');
    body.style.cssText = 'width:${modalWidth}px;height:${modalHeight}px;position:relative;';
    if (prerenderFrame) body.appendChild(prerenderFrame);
    if (frame) body.appendChild(frame);

    modal.append(header, body);
    overlay.appendChild(modal);
    return overlay;
  },
${propsStr}
});

// Create instance with props
const instance = MyComponent({
${instancePropsEntries},
  onGreet: (msg) => console.log('Greeting:', msg),
  onClose: () => instance.close(),
  onError: (err) => console.error(err),
});

// Render to body for modal overlay
await instance.render(document.body, 'iframe');`;
  }

  // Non-modal (embedded iframe or popup)
  const dimensionsStr = config.dimensions
    ? `  dimensions: { width: ${JSON.stringify(config.dimensions.width)}, height: ${JSON.stringify(config.dimensions.height)} },`
    : '';

  return `import ForgeFrame from 'forgeframe';

// Define your component
const MyComponent = ForgeFrame.create({
  tag: ${JSON.stringify(config.tag)},
  url: ${JSON.stringify(config.url)},
${dimensionsStr}
${styleStr}
${propsStr}
});

// Create instance with props
const instance = MyComponent({
${instancePropsEntries},
  onGreet: (msg) => console.log('Greeting:', msg),
  onClose: () => instance.close(),
  onError: (err) => console.error(err),
});

// Render the component
await instance.render('#container', '${context}');`;
}

export function updateCodePreview(
  config: PlaygroundConfig,
  context: RenderContext,
  iframeStyle: IframeStyle
) {
  const code = generateCode(config, context, iframeStyle);
  elements.codeOutput.textContent = code;
  // Re-highlight with Prism
  if (typeof Prism !== 'undefined') {
    Prism.highlightElement(elements.codeOutput);
  }
}
