/**
 * Dynamic props bar for ForgeFrame Playground
 */
import { elements } from './elements';
import { log } from './logger';
import { currentPropValues, setPropValue, deletePropValue, instance } from './state';
import type { PlaygroundConfig, DynamicProps } from './types';

export function getDefaultValue(propDef: Record<string, unknown>): unknown {
  if (propDef.default !== undefined) return propDef.default;
  switch (propDef.type) {
    case 'STRING': return '';
    case 'NUMBER': return 0;
    case 'BOOLEAN': return false;
    default: return '';
  }
}

export function renderPropsBar(config: PlaygroundConfig) {
  const props = config.props || {};

  // Initialize prop values from config defaults
  for (const [key, def] of Object.entries(props)) {
    if (currentPropValues[key] === undefined) {
      setPropValue(key, getDefaultValue(def as Record<string, unknown>));
    }
  }

  // Remove props that are no longer in config
  for (const key of Object.keys(currentPropValues)) {
    if (!(key in props)) {
      deletePropValue(key);
    }
  }

  elements.propsBar.innerHTML = Object.entries(props)
    .map(([key, def]) => {
      const propDef = def as Record<string, unknown>;
      const type = propDef.type as string;
      const value = currentPropValues[key] ?? getDefaultValue(propDef);
      const inputType = type === 'NUMBER' ? 'number' : 'text';

      return `
        <div class="prop-item">
          <label>${key}</label>
          <input type="${inputType}" data-prop="${key}" value="${value}" />
          <button data-update-prop="${key}">Set</button>
        </div>
      `;
    })
    .join('');

  // Bind update buttons
  elements.propsBar.querySelectorAll('button[data-update-prop]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const propName = (btn as HTMLButtonElement).dataset.updateProp!;
      const input = elements.propsBar.querySelector(`input[data-prop="${propName}"]`) as HTMLInputElement;
      if (!input) return;

      const propDef = props[propName] as Record<string, unknown>;
      let value: unknown = input.value;

      // Convert to correct type
      if (propDef.type === 'NUMBER') {
        value = parseFloat(input.value) || 0;
      } else if (propDef.type === 'BOOLEAN') {
        value = input.value === 'true';
      }

      setPropValue(propName, value);

      if (instance) {
        await instance.updateProps({ [propName]: value } as Partial<DynamicProps>);
        log(`Updated ${propName} to: ${value}`, 'info');
      }
    });
  });

  // Update prop values on input change
  elements.propsBar.querySelectorAll('input[data-prop]').forEach((input) => {
    input.addEventListener('change', () => {
      const propName = (input as HTMLInputElement).dataset.prop!;
      const propDef = props[propName] as Record<string, unknown>;
      let value: unknown = (input as HTMLInputElement).value;

      if (propDef.type === 'NUMBER') {
        value = parseFloat((input as HTMLInputElement).value) || 0;
      } else if (propDef.type === 'BOOLEAN') {
        value = (input as HTMLInputElement).value === 'true';
      }

      setPropValue(propName, value);
    });
  });
}
