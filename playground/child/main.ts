/**
 * Child Component Example
 *
 * This demonstrates how to use ForgeFrame from the child (embedded) side.
 * The child receives props from the parent via window.xprops.
 */
import ForgeFrame, { type ChildProps } from "../../src";

/**
 * Define your custom props interface.
 * These are the props passed from the parent component.
 */
interface MyProps {
  name: string;
  count: number;
  onGreet: (message: string) => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

/**
 * Type window.xprops using ForgeFrame's ChildProps generic.
 * ChildProps<MyProps> includes:
 * - All your custom props (name, count, onGreet, etc.)
 * - Built-in ForgeFrame methods (close, resize, focus, show, hide, export, etc.)
 * - Context info (uid, tag, getParentDomain, etc.)
 */
declare global {
  interface Window {
    xprops?: ChildProps<MyProps>;
  }
}

const app = document.getElementById("app")!;

/**
 * Render when embedded via ForgeFrame
 */
function renderEmbedded() {
  // window.xprops is provided by ForgeFrame and contains:
  // - All props passed from parent (name, count, onGreet, etc.)
  // - Built-in methods (close, resize, focus, show, hide, export, etc.)
  // - Context info (uid, tag, getParentDomain, etc.)
  const xprops = window.xprops!;

  const render = () => {
    app.innerHTML = `
      <div class="header">
        <h2>Child Component</h2>
        <span class="badge">${xprops.tag}</span>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Received Props</h3>
          <dl class="props-grid">
            <dt>name</dt>
            <dd id="prop-name">${xprops.name}</dd>
            <dt>count</dt>
            <dd id="prop-count">${xprops.count}</dd>
          </dl>
        </div>

        <div class="card">
          <h3>Context Info</h3>
          <dl class="props-grid">
            <dt>uid</dt>
            <dd>${xprops.uid.slice(0, 12)}...</dd>
            <dt>parent</dt>
            <dd>${xprops.getParentDomain()}</dd>
          </dl>
        </div>

        <div class="card full">
          <h3>Call Parent Functions</h3>
          <div class="buttons">
            <button id="btn-greet">Send Greeting</button>
            <button id="btn-export">Export Data</button>
            <button id="btn-error" class="warning">Report Error</button>
            <button id="btn-close" class="danger">Request Close</button>
          </div>
        </div>

        <div class="card full">
          <h3>Control Iframe</h3>
          <div class="buttons">
            <button id="btn-resize-grow">Grow (500px)</button>
            <button id="btn-resize-shrink">Shrink (300px)</button>
            <button id="btn-focus">Focus</button>
            <button id="btn-hide">Hide</button>
          </div>
        </div>
      </div>

      <p class="status" id="status">Ready</p>
    `;

    bindEventHandlers();
  };

  const setStatus = (msg: string) => {
    const el = document.getElementById("status");
    if (el) el.textContent = msg;
  };

  const bindEventHandlers = () => {
    // Call parent function prop
    document.getElementById("btn-greet")?.addEventListener("click", () => {
      // xprops.name and xprops.count are always current (updated by ForgeFrame)
      const message = `Hello! Name: ${xprops.name}, Count: ${xprops.count}`;
      xprops.onGreet(message);
      setStatus("Sent greeting to parent");
    });

    // Export data to parent
    document
      .getElementById("btn-export")
      ?.addEventListener("click", async () => {
        await xprops.export({
          exportedAt: new Date().toISOString(),
          data: { name: xprops.name, count: xprops.count },
        });
        setStatus("Exported data to parent");
      });

    // Report error to parent
    document.getElementById("btn-error")?.addEventListener("click", () => {
      xprops.onError(new Error("Test error from child"));
      setStatus("Reported error to parent");
    });

    // Request close (calls parent's onClose callback)
    document.getElementById("btn-close")?.addEventListener("click", () => {
      xprops.onClose();
    });

    // Resize the iframe
    document
      .getElementById("btn-resize-grow")
      ?.addEventListener("click", async () => {
        await xprops.resize({ height: 500 });
        setStatus("Resized to 500px");
      });

    document
      .getElementById("btn-resize-shrink")
      ?.addEventListener("click", async () => {
        await xprops.resize({ height: 300 });
        setStatus("Resized to 300px");
      });

    // Focus the iframe
    document
      .getElementById("btn-focus")
      ?.addEventListener("click", async () => {
        await xprops.focus();
        setStatus("Focused");
      });

    // Hide the iframe
    document.getElementById("btn-hide")?.addEventListener("click", async () => {
      await xprops.hide();
      setStatus("Hidden (use parent Show button)");
    });
  };

  // Initial render
  render();

  // Listen for prop updates from parent
  xprops.onProps((newProps) => {
    console.log("[Child] Props updated:", newProps);
    // Update UI with new values
    const nameEl = document.getElementById("prop-name");
    const countEl = document.getElementById("prop-count");
    if (nameEl && "name" in newProps)
      nameEl.textContent = String(newProps.name);
    if (countEl && "count" in newProps)
      countEl.textContent = String(newProps.count);
    setStatus("Props updated");
  });

  // Export initial data to parent
  xprops.export({ ready: true, timestamp: Date.now() });
}

/**
 * Render when opened directly (not embedded)
 */
function renderStandalone() {
  app.innerHTML = `
    <div class="not-embedded">
      <h2>Child Component</h2>
      <p>This page is designed to be embedded via ForgeFrame.</p>
      <p>Open <strong>https://localhost:5173</strong> and click <strong>Render Component</strong>.</p>
      <p class="hint">window.xprops is not available (no ForgeFrame payload).</p>
    </div>
  `;
}

// Check if running as ForgeFrame child
if (ForgeFrame.isChild()) {
  renderEmbedded();
} else {
  renderStandalone();
}
