/**
 * ForgeFrame Playground - Parent
 *
 * Interactive playground for testing ForgeFrame component configuration.
 * Edit JSON config, see generated code, and test the component live.
 */
import { elements } from './elements';
import { log, showEditorError, clearLog } from './logger';
import { renderPropsBar } from './props-bar';
import { updateCodePreview } from './code-generator';
import { renderComponent } from './renderer';
import { DEFAULT_CONFIG } from './config';
import {
  currentContext,
  currentIframeStyle,
  currentConfig,
  instance,
  setCurrentContext,
  setCurrentIframeStyle,
  setCurrentConfig,
  resetPropValues,
} from './state';
import type { PlaygroundConfig, RenderContext, IframeStyle } from './types';

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
  resetPropValues();
  renderPropsBar(DEFAULT_CONFIG);
  updateCodePreview(DEFAULT_CONFIG, currentContext, currentIframeStyle);
}

elements.jsonEditor.addEventListener('input', () => {
  const config = parseConfig();
  if (config) {
    setCurrentConfig(config);
    renderPropsBar(config);
    updateCodePreview(config, currentContext, currentIframeStyle);
  }
});

elements.btnReset.addEventListener('click', () => {
  setCurrentConfig({ ...DEFAULT_CONFIG });
  resetPropValues();
  elements.jsonEditor.value = JSON.stringify(DEFAULT_CONFIG, null, 2);
  showEditorError(null);
  renderPropsBar(DEFAULT_CONFIG);
  updateCodePreview(DEFAULT_CONFIG, currentContext, currentIframeStyle);
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
    setCurrentContext(btn.dataset.context as RenderContext);
    updateIframeStyleVisibility();
    updateCodePreview(currentConfig, currentContext, currentIframeStyle);
    log(`Context changed to: ${currentContext}`, 'info');
  });
});

elements.styleButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    elements.styleButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    setCurrentIframeStyle(btn.dataset.style as IframeStyle);
    updateCodePreview(currentConfig, currentContext, currentIframeStyle);
    log(`Iframe style changed to: ${currentIframeStyle}`, 'info');
  });
});

// ============================================================================
// Event Handlers
// ============================================================================

elements.btnRender.addEventListener('click', () => renderComponent(parseConfig));

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

elements.btnClearLog.addEventListener('click', clearLog);

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
