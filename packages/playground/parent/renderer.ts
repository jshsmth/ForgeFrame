/**
 * Component rendering for ForgeFrame Playground
 */
import ForgeFrame from 'forgeframe';
import { elements } from './elements';
import { log, setStatus, setButtonsEnabled } from './logger';
import {
  currentContext,
  currentIframeStyle,
  currentPropValues,
  componentCache,
  instance,
  modalOverlay,
  setInstance,
  setModalOverlay,
  setCurrentConfig,
  setPropValue,
} from './state';
import type { PlaygroundConfig, DynamicProps } from './types';

export function buildPropsSchema(config: PlaygroundConfig) {
  const schema: Record<string, { type: string; required?: boolean; default?: unknown }> = {};

  // Add user-defined props from config
  for (const [key, def] of Object.entries(config.props || {})) {
    const propDef = def as Record<string, unknown>;
    const typeStr = (propDef.type as string) || 'STRING';
    const type = ForgeFrame.PROP_TYPE[typeStr as keyof typeof ForgeFrame.PROP_TYPE] || ForgeFrame.PROP_TYPE.STRING;

    schema[key] = {
      type,
      required: propDef.required as boolean,
      default: propDef.default,
    };
  }

  // Always add callback props
  schema.onGreet = { type: ForgeFrame.PROP_TYPE.FUNCTION };
  schema.onClose = { type: ForgeFrame.PROP_TYPE.FUNCTION };
  schema.onError = { type: ForgeFrame.PROP_TYPE.FUNCTION };

  return schema;
}

export function createModalTemplate(config: PlaygroundConfig) {
  const cacheKey = `${config.tag}-modal-${JSON.stringify(config.modalStyle || {})}`;
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey)!;
  }

  const ms = config.modalStyle || {};
  const modalWidth = ms.width || 500;
  const modalHeight = ms.height || 400;

  const component = ForgeFrame.create<DynamicProps>({
    tag: `${config.tag}-modal-${Date.now()}`, // Unique tag to allow style changes
    url: config.url,
    dimensions: { width: modalWidth, height: modalHeight },
    style: {
      border: 'none',
      borderRadius: `0 0 ${ms.borderRadius || '8px'} ${ms.borderRadius || '8px'}`,
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
        background: ms.overlayBackground || 'rgba(0, 0, 0, 0.5)',
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
        background: ms.boxBackground || '#fff',
        borderRadius: ms.borderRadius || '8px',
        boxShadow: ms.boxShadow || '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        border: `1px solid ${ms.borderColor || '#e0e0e0'}`,
      });

      const header = doc.createElement('div');
      Object.assign(header.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: ms.headerBackground || '#fafafa',
        borderBottom: `1px solid ${ms.borderColor || '#eee'}`,
      });

      const title = doc.createElement('span');
      title.textContent = 'ForgeFrame Component';
      Object.assign(title.style, {
        fontSize: '0.875rem',
        color: ms.headerColor || '#333',
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
        width: `${modalWidth}px`,
        height: `${modalHeight}px`,
        position: 'relative',
      });

      if (prerenderFrame) body.appendChild(prerenderFrame);
      if (frame) body.appendChild(frame);

      modal.appendChild(header);
      modal.appendChild(body);
      overlay.appendChild(modal);

      setModalOverlay(overlay);
      return overlay;
    },
    props: buildPropsSchema(config),
  });

  componentCache.set(cacheKey, component);
  return component;
}

export function createComponent(config: PlaygroundConfig) {
  // Create fresh component with unique tag each time to avoid registration conflicts
  // (unlike modals which can be cached since they append to body fresh each time)
  const uniqueTag = `${config.tag}-${Date.now()}`;

  const component = ForgeFrame.create<DynamicProps>({
    tag: uniqueTag,
    url: config.url,
    dimensions: config.dimensions as { width?: string | number; height?: string | number },
    style: config.style as Record<string, string>,
    attributes: config.attributes,
    autoResize: config.autoResize,
    timeout: config.timeout,
    props: buildPropsSchema(config),
  });

  return component;
}

export async function renderComponent(parseConfig: () => PlaygroundConfig | null) {
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

  setCurrentConfig(config);

  // Sync prop values from inputs before render
  elements.propsBar.querySelectorAll('input[data-prop]').forEach((input) => {
    const propName = (input as HTMLInputElement).dataset.prop!;
    const propDef = (config.props || {})[propName] as Record<string, unknown> | undefined;
    let value: unknown = (input as HTMLInputElement).value;

    if (propDef?.type === 'NUMBER') {
      value = parseFloat((input as HTMLInputElement).value) || 0;
    } else if (propDef?.type === 'BOOLEAN') {
      value = (input as HTMLInputElement).value === 'true';
    }

    setPropValue(propName, value);
  });

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

    // Build props object with current values + callbacks
    const props: DynamicProps = {
      ...currentPropValues,
      onGreet: (message: string) => {
        log(`Child says: ${message}`, 'success');
      },
      onClose: () => {
        log('Child requested close', 'info');
        instance?.close();
      },
      onError: (error: Error) => {
        log(`Child error: ${error.message}`, 'error');
      },
    };

    const newInstance = Component(props);
    setInstance(newInstance);

    // Subscribe to events
    newInstance.event.on('rendered', () => {
      log('Event: rendered', 'success');
    });
    newInstance.event.on('close', () => {
      log('Event: close', 'info');
      setInstance(null);
      setStatus('Closed', 'idle');
      setButtonsEnabled(false);
      if (modalOverlay) {
        modalOverlay.remove();
        setModalOverlay(null);
      }
      // Clear container for embedded iframes (keep only the placeholder)
      if (!useModal) {
        const placeholder = elements.container.querySelector('.container-placeholder');
        elements.container.innerHTML = '';
        if (placeholder) {
          elements.container.appendChild(placeholder);
        } else {
          const newPlaceholder = document.createElement('div');
          newPlaceholder.className = 'container-placeholder';
          newPlaceholder.textContent = 'Click "Render" to load component';
          elements.container.appendChild(newPlaceholder);
        }
      }
    });
    newInstance.event.on('error', (err) => {
      log(`Event: error - ${err}`, 'error');
    });
    newInstance.event.on('resize', (dims) => {
      log(`Event: resize - ${JSON.stringify(dims)}`, 'info');
    });
    newInstance.event.on('focus', () => {
      log('Event: focus', 'info');
    });

    const container = useModal ? document.body : '#component-container';

    await newInstance.render(container, currentContext);

    setStatus('Rendered', 'rendered');
    setButtonsEnabled(true);
    log(`Component rendered successfully (${modeLabel})`, 'success');
  } catch (err) {
    log(`Render failed: ${err}`, 'error');
    setStatus('Failed', 'error');
    setInstance(null);
  }
}
