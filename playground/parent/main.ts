/**
 * Parent Component Example
 *
 * This demonstrates how to use ForgeFrame from the parent (host) side.
 * The parent creates and controls the embedded component.
 */
import ForgeFrame from '../../src';

// ============================================================================
// Playground UI Helpers (not part of ForgeFrame API)
// ============================================================================

type RenderMode = 'embedded' | 'modal' | 'popup';

function log(message: string, type: 'default' | 'error' | 'success' | 'info' = 'default') {
  const logEl = document.getElementById('log');
  if (logEl) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }
  console.log(message);
}

function setStatus(status: string) {
  const el = document.getElementById('status');
  if (el) el.textContent = status;
}

function setContext(context: string) {
  const el = document.getElementById('context-display');
  if (el) el.textContent = context;
}

function setExports(exports: string) {
  const el = document.getElementById('exports-display');
  if (el) el.textContent = exports;
}

function setGreeting(greeting: string) {
  const el = document.getElementById('greeting-display');
  if (el) el.textContent = greeting;
}

function setButtonsEnabled(enabled: boolean) {
  const buttons = ['btn-close', 'btn-update-name', 'btn-increment', 'btn-show', 'btn-hide', 'btn-focus', 'btn-resize'];
  buttons.forEach(id => {
    const btn = document.getElementById(id) as HTMLButtonElement;
    if (btn) btn.disabled = !enabled;
  });
  const renderBtn = document.getElementById('btn-render') as HTMLButtonElement;
  if (renderBtn) renderBtn.disabled = enabled;
  document.getElementById('component-container')?.classList.toggle('has-component', enabled);
}

// ============================================================================
// ForgeFrame Component Definition
// ============================================================================

/**
 * Define props interface for type safety
 */
interface GreeterProps {
  name: string;
  count: number;
  onGreet: (message: string) => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

/**
 * Create the component definition
 * This is typically done once and can be shared/exported
 */
const GreeterComponent = ForgeFrame.create<GreeterProps>({
  // Unique identifier for this component type
  tag: 'greeter-component',

  // URL of the child page to embed
  url: 'https://localhost:5174/',

  // Iframe dimensions
  dimensions: {
    width: '100%',
    height: '100%',
  },

  // Iframe styling
  style: {
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },

  // Props schema - defines what can be passed to the child
  props: {
    name: {
      type: ForgeFrame.PROP_TYPE.STRING,
      required: true,
    },
    count: {
      type: ForgeFrame.PROP_TYPE.NUMBER,
      default: 0,
    },
    onGreet: {
      type: ForgeFrame.PROP_TYPE.FUNCTION,
    },
    onClose: {
      type: ForgeFrame.PROP_TYPE.FUNCTION,
    },
    onError: {
      type: ForgeFrame.PROP_TYPE.FUNCTION,
    },
  },
});

// ============================================================================
// Component Instance Management
// ============================================================================

let instance: ReturnType<typeof GreeterComponent> | null = null;
let currentCount = 0;
let currentMode: RenderMode = 'embedded';
let modalOverlay: HTMLElement | null = null;

// ============================================================================
// Event Handlers
// ============================================================================

// Render Component
document.getElementById('btn-render')?.addEventListener('click', async () => {
  if (instance) {
    log('Component already rendered', 'info');
    return;
  }

  // Get settings from UI
  currentMode = (document.getElementById('context-select') as HTMLSelectElement)?.value as RenderMode || 'embedded';
  const name = (document.getElementById('input-name') as HTMLInputElement)?.value || 'World';
  const context = currentMode === 'popup' ? 'popup' : 'iframe';

  log(`Rendering as ${currentMode}...`, 'info');
  setStatus('Rendering...');
  setContext(currentMode);

  // For modal mode, create a component with modal containerTemplate
  // This demonstrates how ForgeFrame handles modal rendering via templates
  const Component = currentMode === 'modal'
    ? ForgeFrame.create<GreeterProps>({
        tag: 'greeter-component-modal',
        url: 'https://localhost:5174/',
        dimensions: { width: 500, height: 400 },
        style: {
          border: 'none',
          borderRadius: '0 0 8px 8px',
        },
        containerTemplate: ({ doc, frame, prerenderFrame, close, uid }) => {
          // Create modal overlay
          const overlay = doc.createElement('div');
          overlay.id = `forgeframe-modal-${uid}`;
          Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1000',
          });

          // Close on backdrop click
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
          });

          // Create modal container
          const modal = doc.createElement('div');
          Object.assign(modal.style, {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
          });

          // Create modal header
          const header = doc.createElement('div');
          Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            background: '#f8f9fa',
            borderBottom: '1px solid #e0e0e0',
          });

          const title = doc.createElement('h4');
          title.textContent = 'ForgeFrame Component';
          Object.assign(title.style, {
            margin: '0',
            fontSize: '0.875rem',
            color: '#333',
          });

          const closeBtn = doc.createElement('button');
          closeBtn.innerHTML = '&times;';
          Object.assign(closeBtn.style, {
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: '#666',
            padding: '0.25rem',
            lineHeight: '1',
          });
          closeBtn.addEventListener('click', () => close());

          header.appendChild(title);
          header.appendChild(closeBtn);

          // Create modal body and place the frame elements (zoid-style)
          const body = doc.createElement('div');
          Object.assign(body.style, {
            width: '500px',
            height: '400px',
            position: 'relative',
          });

          // Place prerender element first (will be swapped out when iframe loads)
          if (prerenderFrame) {
            body.appendChild(prerenderFrame);
          }

          // Place the iframe (hidden initially, shown after load)
          if (frame) {
            body.appendChild(frame);
          }

          // Build the structure
          modal.appendChild(header);
          modal.appendChild(body);
          overlay.appendChild(modal);

          // Store reference for cleanup
          modalOverlay = overlay;

          // Return the overlay - ForgeFrame will append it to the container
          return overlay;
        },
        props: {
          name: { type: ForgeFrame.PROP_TYPE.STRING, required: true },
          count: { type: ForgeFrame.PROP_TYPE.NUMBER, default: 0 },
          onGreet: { type: ForgeFrame.PROP_TYPE.FUNCTION },
          onClose: { type: ForgeFrame.PROP_TYPE.FUNCTION },
          onError: { type: ForgeFrame.PROP_TYPE.FUNCTION },
        },
      })
    : GreeterComponent;

  // Create component instance with props
  instance = Component({
    name,
    count: currentCount,
    onGreet: (message) => {
      log(`Child says: ${message}`, 'success');
      setGreeting(message);
    },
    onClose: () => {
      log('Child requested close', 'info');
      instance?.close();
    },
    onError: (error) => {
      log(`Child error: ${error.message}`, 'error');
    },
  });

  // Subscribe to lifecycle events
  instance.event.on('rendered', () => log('Component rendered', 'success'));
  instance.event.on('close', () => {
    log('Component closed');
    instance = null;
    currentCount = 0;
    setStatus('Closed');
    setButtonsEnabled(false);
    setExports('-');
    setGreeting('-');

    // Clean up modal overlay if present
    if (modalOverlay) {
      modalOverlay.remove();
      modalOverlay = null;
    }
  });
  instance.event.on('error', (err) => log(`Error: ${err}`, 'error'));
  instance.event.on('resize', (dims) => log(`Resized: ${JSON.stringify(dims)}`, 'info'));

  // Render the component
  // Modal mode renders to body (overlay covers page), others to container
  const container = currentMode === 'modal' ? document.body : '#component-container';

  try {
    await instance.render(container, context);
    setStatus('Rendered');
    setButtonsEnabled(true);
    if (instance.exports) {
      setExports(JSON.stringify(instance.exports));
    }
  } catch (err) {
    log(`Render failed: ${err}`, 'error');
    setStatus('Failed');
    instance = null;
  }
});

// Close Component
document.getElementById('btn-close')?.addEventListener('click', () => {
  instance?.close();
});

// Update Name Prop
document.getElementById('btn-update-name')?.addEventListener('click', async () => {
  if (!instance) return;
  const name = (document.getElementById('input-name') as HTMLInputElement)?.value || 'World';
  log(`Updating name to: ${name}`, 'info');
  await instance.updateProps({ name });
});

// Increment Count Prop
document.getElementById('btn-increment')?.addEventListener('click', async () => {
  if (!instance) return;
  currentCount++;
  log(`Count: ${currentCount}`, 'info');
  await instance.updateProps({ count: currentCount });
});

// Show/Hide/Focus/Resize
document.getElementById('btn-show')?.addEventListener('click', () => instance?.show());
document.getElementById('btn-hide')?.addEventListener('click', () => instance?.hide());
document.getElementById('btn-focus')?.addEventListener('click', () => instance?.focus());
document.getElementById('btn-resize')?.addEventListener('click', async () => {
  if (!instance) return;
  const height = parseInt((document.getElementById('input-height') as HTMLInputElement)?.value) || 420;
  log(`Resizing to ${height}px`, 'info');
  await instance.resize({ height });
});

// ============================================================================
// Initialize
// ============================================================================

log('Parent ready', 'success');
