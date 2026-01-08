/**
 * ForgeFrame Playground - Parent
 *
 * Interactive playground for testing ForgeFrame component configuration.
 * Edit JSON config, see generated code, and test the component live.
 */
import ForgeFrame from '../../src';

// Prism.js type declaration (loaded via CDN)
declare const Prism: {
  highlightElement: (element: Element) => void;
};
import type { ForgeFrameComponentInstance } from '../../src/types';

// ============================================================================
// Types
// ============================================================================

type RenderContext = 'iframe' | 'popup';
type IframeStyle = 'embedded' | 'modal';

interface PlaygroundConfig {
  tag: string;
  url: string;
  dimensions?: {
    width?: string | number;
    height?: string | number;
  };
  style?: Record<string, string | number>;
  attributes?: Record<string, string | boolean>;
  autoResize?: {
    width?: boolean;
    height?: boolean;
    element?: string;
  };
  timeout?: number;
  props?: {
    name?: { type: string; required?: boolean; default?: string };
    count?: { type: string; default?: number };
    [key: string]: unknown;
  };
}

interface GreeterProps {
  name: string;
  count: number;
  onGreet: (message: string) => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PlaygroundConfig = {
  tag: 'playground-component',
  url: 'https://localhost:5174/',
  dimensions: {
    width: '100%',
    height: '100%',
  },
  style: {
    border: 'none',
    borderRadius: '8px',
  },
  props: {
    name: {
      type: 'STRING',
      required: true,
    },
    count: {
      type: 'NUMBER',
      default: 0,
    },
  },
};

// ============================================================================
// State
// ============================================================================

let currentContext: RenderContext = 'iframe';
let currentIframeStyle: IframeStyle = 'embedded';
let currentConfig: PlaygroundConfig = { ...DEFAULT_CONFIG };
let instance: ForgeFrameComponentInstance<GreeterProps> | null = null;
let modalOverlay: HTMLElement | null = null;

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  jsonEditor: document.getElementById('json-editor') as HTMLTextAreaElement,
  editorError: document.getElementById('editor-error') as HTMLDivElement,
  codeOutput: document.getElementById('code-output') as HTMLElement,
  eventLog: document.getElementById('event-log') as HTMLDivElement,
  statusDot: document.getElementById('status-dot') as HTMLSpanElement,
  statusText: document.getElementById('status-text') as HTMLSpanElement,
  container: document.getElementById('component-container') as HTMLDivElement,
  btnRender: document.getElementById('btn-render') as HTMLButtonElement,
  btnClose: document.getElementById('btn-close') as HTMLButtonElement,
  btnFocus: document.getElementById('btn-focus') as HTMLButtonElement,
  btnShow: document.getElementById('btn-show') as HTMLButtonElement,
  btnHide: document.getElementById('btn-hide') as HTMLButtonElement,
  btnReset: document.getElementById('btn-reset') as HTMLButtonElement,
  btnClearLog: document.getElementById('btn-clear-log') as HTMLButtonElement,
  btnUpdateName: document.getElementById('btn-update-name') as HTMLButtonElement,
  btnUpdateCount: document.getElementById('btn-update-count') as HTMLButtonElement,
  propName: document.getElementById('prop-name') as HTMLInputElement,
  propCount: document.getElementById('prop-count') as HTMLInputElement,
  contextButtons: document.querySelectorAll('[data-context]') as NodeListOf<HTMLButtonElement>,
  styleButtons: document.querySelectorAll('[data-style]') as NodeListOf<HTMLButtonElement>,
  iframeStyleGroup: document.getElementById('iframe-style-group') as HTMLDivElement,
};

// ============================================================================
// Utility Functions
// ============================================================================

function log(message: string, type: 'default' | 'error' | 'success' | 'info' = 'default') {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="time">${time}</span> ${message}`;
  elements.eventLog.appendChild(entry);
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
  console.log(`[${time}] ${message}`);
}

function setStatus(status: string, state: 'idle' | 'rendered' | 'error' = 'idle') {
  elements.statusText.textContent = status;
  elements.statusDot.className = 'status-dot';
  if (state !== 'idle') {
    elements.statusDot.classList.add(state);
  }
}

function setButtonsEnabled(rendered: boolean) {
  elements.btnRender.disabled = rendered;
  elements.btnClose.disabled = !rendered;
  elements.btnFocus.disabled = !rendered;
  elements.btnShow.disabled = !rendered;
  elements.btnHide.disabled = !rendered;
  elements.container.classList.toggle('has-component', rendered);
}

function showEditorError(message: string | null) {
  if (message) {
    elements.editorError.textContent = message;
    elements.editorError.classList.add('visible');
  } else {
    elements.editorError.classList.remove('visible');
  }
}

// ============================================================================
// Code Generation
// ============================================================================

function generateCode(config: PlaygroundConfig, context: RenderContext, iframeStyle: IframeStyle): string {
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

  const styleEntries = Object.entries(config.style || {})
    .map(([key, val]) => `    ${key}: ${JSON.stringify(val)}`)
    .join(',\n');

  const dimensionsStr = config.dimensions
    ? `  dimensions: { width: ${JSON.stringify(config.dimensions.width)}, height: ${JSON.stringify(config.dimensions.height)} },`
    : '';

  const styleStr = styleEntries ? `  style: {\n${styleEntries}\n  },` : '';
  const propsStr = propsEntries ? `  props: {\n${propsEntries}\n  },` : '';

  // Add containerTemplate note for modal style
  const modalNote = context === 'iframe' && iframeStyle === 'modal'
    ? `  // For modal: add containerTemplate to wrap in overlay
  // containerTemplate: ({ doc, frame, close }) => { ... },`
    : '';

  return `import ForgeFrame from 'forgeframe';

// Define your component
const MyComponent = ForgeFrame.create({
  tag: ${JSON.stringify(config.tag)},
  url: ${JSON.stringify(config.url)},
${dimensionsStr}
${styleStr}
${modalNote}
${propsStr}
});

// Create instance with props
const instance = MyComponent({
  name: 'World',
  count: 0,
  onGreet: (msg) => console.log('Greeting:', msg),
  onClose: () => instance.close(),
  onError: (err) => console.error(err),
});

// Render the component
// Context: ${context}${context === 'iframe' ? ` (${iframeStyle})` : ''}
await instance.render('${iframeStyle === 'modal' ? 'document.body' : '#container'}', '${context}');`;
}

function updateCodePreview() {
  const code = generateCode(currentConfig, currentContext, currentIframeStyle);
  elements.codeOutput.textContent = code;
  // Re-highlight with Prism
  if (typeof Prism !== 'undefined') {
    Prism.highlightElement(elements.codeOutput);
  }
}

// ============================================================================
// JSON Editor
// ============================================================================

function parseConfig(): PlaygroundConfig | null {
  try {
    const parsed = JSON.parse(elements.jsonEditor.value);
    showEditorError(null);
    return parsed;
  } catch (e) {
    showEditorError(`Invalid JSON: ${(e as Error).message}`);
    return null;
  }
}

function initEditor() {
  elements.jsonEditor.value = JSON.stringify(DEFAULT_CONFIG, null, 2);
  updateCodePreview();
}

elements.jsonEditor.addEventListener('input', () => {
  const config = parseConfig();
  if (config) {
    currentConfig = config;
    updateCodePreview();
  }
});

elements.btnReset.addEventListener('click', () => {
  currentConfig = { ...DEFAULT_CONFIG };
  elements.jsonEditor.value = JSON.stringify(DEFAULT_CONFIG, null, 2);
  showEditorError(null);
  updateCodePreview();
  log('Config reset to defaults', 'info');
});

// ============================================================================
// Mode Toggle
// ============================================================================

function updateIframeStyleVisibility() {
  if (currentContext === 'popup') {
    elements.iframeStyleGroup.classList.add('disabled');
  } else {
    elements.iframeStyleGroup.classList.remove('disabled');
  }
}

elements.contextButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    elements.contextButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentContext = btn.dataset.context as RenderContext;
    updateIframeStyleVisibility();
    updateCodePreview();
    log(`Context changed to: ${currentContext}`, 'info');
  });
});

elements.styleButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    elements.styleButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentIframeStyle = btn.dataset.style as IframeStyle;
    updateCodePreview();
    log(`Iframe style changed to: ${currentIframeStyle}`, 'info');
  });
});

// ============================================================================
// Component Rendering
// ============================================================================

function createModalTemplate(config: PlaygroundConfig) {
  return ForgeFrame.create<GreeterProps>({
    tag: `${config.tag}-modal`,
    url: config.url,
    dimensions: { width: 500, height: 400 },
    style: {
      border: 'none',
      borderRadius: '0 0 8px 8px',
      ...config.style,
    },
    containerTemplate: ({ doc, frame, prerenderFrame, close, uid }) => {
      const overlay = doc.createElement('div');
      overlay.id = `forgeframe-modal-${uid}`;
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '10000',
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      const modal = doc.createElement('div');
      Object.assign(modal.style, {
        background: '#1a1a2e',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        border: '1px solid #0f3460',
      });

      const header = doc.createElement('div');
      Object.assign(header.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: '#16213e',
        borderBottom: '1px solid #0f3460',
      });

      const title = doc.createElement('span');
      title.textContent = 'ForgeFrame Component';
      Object.assign(title.style, {
        fontSize: '0.875rem',
        color: '#eee',
        fontWeight: '500',
      });

      const closeBtn = doc.createElement('button');
      closeBtn.innerHTML = '&times;';
      Object.assign(closeBtn.style, {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        color: '#888',
        padding: '0',
        lineHeight: '1',
      });
      closeBtn.addEventListener('click', () => close());

      header.appendChild(title);
      header.appendChild(closeBtn);

      const body = doc.createElement('div');
      Object.assign(body.style, {
        width: '500px',
        height: '400px',
        position: 'relative',
      });

      if (prerenderFrame) body.appendChild(prerenderFrame);
      if (frame) body.appendChild(frame);

      modal.appendChild(header);
      modal.appendChild(body);
      overlay.appendChild(modal);

      modalOverlay = overlay;
      return overlay;
    },
    props: {
      name: { type: ForgeFrame.PROP_TYPE.STRING, required: true },
      count: { type: ForgeFrame.PROP_TYPE.NUMBER, default: 0 },
      onGreet: { type: ForgeFrame.PROP_TYPE.FUNCTION },
      onClose: { type: ForgeFrame.PROP_TYPE.FUNCTION },
      onError: { type: ForgeFrame.PROP_TYPE.FUNCTION },
    },
  });
}

function createComponent(config: PlaygroundConfig) {
  return ForgeFrame.create<GreeterProps>({
    tag: config.tag,
    url: config.url,
    dimensions: config.dimensions as { width?: string | number; height?: string | number },
    style: config.style as Record<string, string>,
    attributes: config.attributes,
    autoResize: config.autoResize,
    timeout: config.timeout,
    props: {
      name: { type: ForgeFrame.PROP_TYPE.STRING, required: true },
      count: { type: ForgeFrame.PROP_TYPE.NUMBER, default: 0 },
      onGreet: { type: ForgeFrame.PROP_TYPE.FUNCTION },
      onClose: { type: ForgeFrame.PROP_TYPE.FUNCTION },
      onError: { type: ForgeFrame.PROP_TYPE.FUNCTION },
    },
  });
}

async function renderComponent() {
  if (instance) {
    log('Component already rendered', 'info');
    return;
  }

  const config = parseConfig();
  if (!config) {
    log('Cannot render: invalid configuration', 'error');
    setStatus('Invalid config', 'error');
    return;
  }

  currentConfig = config;
  const name = elements.propName.value || 'World';
  const count = parseInt(elements.propCount.value) || 0;

  const modeLabel = currentContext === 'popup'
    ? 'popup'
    : `iframe (${currentIframeStyle})`;

  log(`Rendering as ${modeLabel}...`, 'info');
  setStatus('Rendering...', 'idle');

  try {
    // Use modal template only for iframe context with modal style
    const useModal = currentContext === 'iframe' && currentIframeStyle === 'modal';
    const Component = useModal
      ? createModalTemplate(config)
      : createComponent(config);

    instance = Component({
      name,
      count,
      onGreet: (message) => {
        log(`Child says: ${message}`, 'success');
      },
      onClose: () => {
        log('Child requested close', 'info');
        instance?.close();
      },
      onError: (error) => {
        log(`Child error: ${error.message}`, 'error');
      },
    });

    // Subscribe to events
    instance.event.on('rendered', () => {
      log('Event: rendered', 'success');
    });
    instance.event.on('close', () => {
      log('Event: close', 'info');
      instance = null;
      setStatus('Closed', 'idle');
      setButtonsEnabled(false);
      if (modalOverlay) {
        modalOverlay.remove();
        modalOverlay = null;
      }
    });
    instance.event.on('error', (err) => {
      log(`Event: error - ${err}`, 'error');
    });
    instance.event.on('resize', (dims) => {
      log(`Event: resize - ${JSON.stringify(dims)}`, 'info');
    });
    instance.event.on('focus', () => {
      log('Event: focus', 'info');
    });

    const container = useModal ? document.body : '#component-container';

    await instance.render(container, currentContext);

    setStatus('Rendered', 'rendered');
    setButtonsEnabled(true);
    log(`Component rendered successfully (${modeLabel})`, 'success');
  } catch (err) {
    log(`Render failed: ${err}`, 'error');
    setStatus('Failed', 'error');
    instance = null;
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

elements.btnRender.addEventListener('click', renderComponent);

elements.btnClose.addEventListener('click', () => {
  instance?.close();
});

elements.btnFocus.addEventListener('click', () => {
  instance?.focus();
  log('Focus requested', 'info');
});

elements.btnShow.addEventListener('click', () => {
  instance?.show();
  log('Show requested', 'info');
});

elements.btnHide.addEventListener('click', () => {
  instance?.hide();
  log('Hide requested', 'info');
});

elements.btnClearLog.addEventListener('click', () => {
  elements.eventLog.innerHTML = '';
});

elements.btnUpdateName.addEventListener('click', async () => {
  if (!instance) return;
  const name = elements.propName.value || 'World';
  await instance.updateProps({ name });
  log(`Updated name to: ${name}`, 'info');
});

elements.btnUpdateCount.addEventListener('click', async () => {
  if (!instance) return;
  const count = parseInt(elements.propCount.value) || 0;
  await instance.updateProps({ count });
  log(`Updated count to: ${count}`, 'info');
});

// Handle tab key in editor
elements.jsonEditor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = elements.jsonEditor.selectionStart;
    const end = elements.jsonEditor.selectionEnd;
    elements.jsonEditor.value =
      elements.jsonEditor.value.substring(0, start) +
      '  ' +
      elements.jsonEditor.value.substring(end);
    elements.jsonEditor.selectionStart = elements.jsonEditor.selectionEnd = start + 2;
  }
});

// ============================================================================
// Initialize
// ============================================================================

initEditor();
log('Playground ready', 'success');
