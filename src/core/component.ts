import type {
  ComponentOptions,
  ZoidComponent,
  ZoidComponentInstance,
  ChildProps,
} from '../types';
import { ParentComponent } from './parent';
import { initChild } from './child';
import { isChildOfComponent } from '../window/name-payload';
import { isSameDomain } from '../window/helpers';

// Global registry of components
const componentRegistry = new Map<string, ZoidComponent<Record<string, unknown>>>();

/**
 * Validate component options
 */
function validateComponentOptions<P>(options: ComponentOptions<P>): void {
  if (!options.tag) {
    throw new Error('Component tag is required');
  }

  if (!/^[a-z][a-z0-9-]*$/.test(options.tag)) {
    throw new Error(
      `Invalid component tag "${options.tag}". Must start with lowercase letter and contain only lowercase letters, numbers, and hyphens.`
    );
  }

  if (!options.url) {
    throw new Error('Component url is required');
  }

  if (componentRegistry.has(options.tag)) {
    throw new Error(`Component "${options.tag}" is already registered`);
  }
}

/**
 * Create a new component
 * This is the main entry point - equivalent to zoid.create()
 */
export function create<P extends Record<string, unknown> = Record<string, unknown>, X = unknown>(
  options: ComponentOptions<P>
): ZoidComponent<P, X> {
  // Validate options
  validateComponentOptions(options);

  // Track all instances
  const instances: ZoidComponentInstance<P, X>[] = [];

  // Initialize child if we're in a child window for this component
  let childXProps: ChildProps<P> | undefined;
  if (isChildOfComponent(options.tag)) {
    const child = initChild<P>(options.props);
    if (child) {
      childXProps = child.xprops;
    }
  }

  /**
   * Component factory function
   * Call this with props to create an instance
   */
  const Component = function (props: Partial<P> = {} as Partial<P>): ZoidComponentInstance<P, X> {
    const instance = new ParentComponent<P, X>(options, props);

    instances.push(instance);

    // Remove from instances on destroy
    instance.event.once('destroy', () => {
      const index = instances.indexOf(instance);
      if (index !== -1) {
        instances.splice(index, 1);
      }
    });

    return instance;
  } as ZoidComponent<P, X>;

  // Attach static properties
  Component.instances = instances;

  Component.isChild = (): boolean => {
    return isChildOfComponent(options.tag);
  };

  Component.xprops = childXProps;

  Component.canRenderTo = async (win: Window): Promise<boolean> => {
    try {
      // Can always render to same-domain windows
      if (isSameDomain(win)) {
        return true;
      }

      // Check if allowed domains specified
      if (options.domain) {
        // For cross-domain, we'd need more complex checks
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  // Register component
  componentRegistry.set(options.tag, Component as ZoidComponent<Record<string, unknown>>);

  return Component;
}

/**
 * Get a registered component by tag
 */
export function getComponent<P extends Record<string, unknown> = Record<string, unknown>, X = unknown>(
  tag: string
): ZoidComponent<P, X> | undefined {
  return componentRegistry.get(tag) as ZoidComponent<P, X> | undefined;
}

/**
 * Destroy a single component instance
 */
export async function destroy<P extends Record<string, unknown>>(
  instance: ZoidComponentInstance<P>
): Promise<void> {
  await instance.close();
}

/**
 * Destroy all instances of a component
 */
export async function destroyComponents(tag: string): Promise<void> {
  const component = componentRegistry.get(tag);
  if (!component) return;

  const instances = [...component.instances];
  await Promise.all(instances.map((instance) => instance.close()));
}

/**
 * Destroy all component instances
 */
export async function destroyAll(): Promise<void> {
  const tags = Array.from(componentRegistry.keys());
  await Promise.all(tags.map((tag) => destroyComponents(tag)));
}

/**
 * Unregister a component (for testing/cleanup)
 */
export function unregisterComponent(tag: string): void {
  componentRegistry.delete(tag);
}

/**
 * Clear all registered components (for testing/cleanup)
 */
export function clearComponents(): void {
  componentRegistry.clear();
}

// Re-export child utilities
export { isChild, getXProps } from './child';
