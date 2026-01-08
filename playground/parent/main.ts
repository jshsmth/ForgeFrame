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

type RenderMode = 'iframe' | 'modal' | 'popup';

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

function showModal() {
  document.getElementById('modal-overlay')?.classList.add('active');
}

function hideModal() {
  document.getElementById('modal-overlay')?.classList.remove('active');
  const container = document.getElementById('modal-container');
  if (container) container.innerHTML = '';
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
let currentMode: RenderMode = 'iframe';

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
  currentMode = (document.getElementById('context-select') as HTMLSelectElement)?.value as RenderMode || 'iframe';
  const name = (document.getElementById('input-name') as HTMLInputElement)?.value || 'World';
  const context = currentMode === 'popup' ? 'popup' : 'iframe';
  const container = currentMode === 'modal' ? '#modal-container' : '#component-container';

  log(`Rendering as ${currentMode}...`, 'info');
  setStatus('Rendering...');
  setContext(currentMode);

  if (currentMode === 'modal') {
    showModal();
  }

  // Create component instance with props
  instance = GreeterComponent({
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
    if (currentMode === 'modal') hideModal();
  });
  instance.event.on('error', (err) => log(`Error: ${err}`, 'error'));
  instance.event.on('resize', (dims) => log(`Resized: ${JSON.stringify(dims)}`, 'info'));

  // Render the component
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
    if (currentMode === 'modal') hideModal();
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

// Modal controls
document.getElementById('modal-close')?.addEventListener('click', () => instance?.close());
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) instance?.close();
});

// ============================================================================
// Initialize
// ============================================================================

log('Parent ready', 'success');
