import type { ZoidComponent, ZoidComponentInstance } from '../types';
import type { ContextType } from '../constants';

/**
 * React types (peer dependency - not bundled)
 * These are minimal type definitions to avoid requiring @types/react
 */
interface ReactLike {
  createElement: (
    type: unknown,
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ) => unknown;
  useRef: <T>(initial: T | null) => { current: T | null };
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => void;
  useState: <T>(initial: T) => [T, (v: T) => void];
  forwardRef: <T, P>(
    render: (props: P, ref: { current: T | null } | null) => unknown
  ) => unknown;
}

/**
 * Props for the generated React component
 */
export interface ReactComponentProps<_P = unknown> {
  /**
   * Callback when component is rendered
   */
  onRendered?: () => void;

  /**
   * Callback when component encounters an error
   */
  onError?: (error: Error) => void;

  /**
   * Callback when component is closed
   */
  onClose?: () => void;

  /**
   * Rendering context (iframe or popup)
   */
  context?: ContextType;

  /**
   * CSS class name for the container
   */
  className?: string;

  /**
   * Inline styles for the container
   */
  style?: Record<string, string | number>;
}

/**
 * Full props type including component props
 */
type FullReactComponentProps<P> = ReactComponentProps<P> & Partial<P>;

/**
 * Options for creating a React driver
 */
export interface ReactDriverOptions {
  /**
   * React library instance
   */
  React: ReactLike;
}

/**
 * Generic React component type
 */
export interface ReactComponentType<P> {
  (props: P): unknown;
  displayName?: string;
}

/**
 * Create a React component wrapper for a ForgeFrame component
 *
 * @example
 * ```tsx
 * import React from 'react';
 * import ForgeFrame from 'forgeframe';
 * import { createReactDriver } from 'forgeframe/drivers/react';
 *
 * const LoginComponent = ForgeFrame.create({
 *   tag: 'login-component',
 *   url: 'https://example.com/login',
 *   props: {
 *     onLogin: { type: ForgeFrame.PROP_TYPE.FUNCTION },
 *   },
 * });
 *
 * const LoginReact = createReactDriver(LoginComponent, { React });
 *
 * // Usage in JSX:
 * <LoginReact onLogin={(user) => console.log(user)} />
 * ```
 */
export function createReactDriver<P extends Record<string, unknown>, X = unknown>(
  Component: ZoidComponent<P, X>,
  options: ReactDriverOptions
): ReactComponentType<FullReactComponentProps<P>> {
  const { React } = options;
  const { createElement, useRef, useEffect, useState, forwardRef } = React;

  const ReactComponent = forwardRef<HTMLDivElement, FullReactComponentProps<P>>(
    function ForgeFrameComponent(props, ref) {
      const {
        onRendered,
        onError,
        onClose,
        context,
        className,
        style,
        ...componentProps
      } = props;

      const containerRef = useRef<HTMLDivElement>(null);
      const instanceRef = useRef<ZoidComponentInstance<P, X> | null>(null);
      const [error, setError] = useState<Error | null>(null);

      // Initialize and render
      useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Create instance
        const instance = Component(componentProps as P);
        instanceRef.current = instance;

        // Setup event listeners
        if (onRendered) {
          instance.event.once('rendered', onRendered);
        }

        if (onClose) {
          instance.event.once('close', onClose);
        }

        if (onError) {
          instance.event.on('error', onError);
        }

        // Render
        instance.render(container, context).catch((err: Error) => {
          setError(err);
          onError?.(err);
        });

        // Cleanup
        return () => {
          instance.close().catch(() => {
            // Ignore close errors during cleanup
          });
          instanceRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Only run on mount

      // Update props when they change
      useEffect(() => {
        const instance = instanceRef.current;
        if (!instance) return;

        instance.updateProps(componentProps as Partial<P>).catch((err: Error) => {
          onError?.(err);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [JSON.stringify(componentProps)]); // Compare props by value

      // Handle ref forwarding
      useEffect(() => {
        if (ref && typeof ref === 'object' && containerRef.current) {
          ref.current = containerRef.current;
        }
      }, [ref]);

      // Render error state
      if (error) {
        return createElement(
          'div',
          {
            className,
            style: { color: 'red', padding: '16px', ...style },
          },
          `Error: ${error.message}`
        );
      }

      // Render container div
      return createElement('div', {
        ref: containerRef,
        className,
        style: {
          display: 'inline-block',
          ...style,
        },
      });
    }
  );

  // Set display name for DevTools
  const displayName = `ForgeFrame(${(Component as { name?: string }).name || 'Component'})`;
  (ReactComponent as ReactComponentType<FullReactComponentProps<P>>).displayName = displayName;

  return ReactComponent as ReactComponentType<FullReactComponentProps<P>>;
}

/**
 * Higher-order component to add a React driver to a ForgeFrame component
 *
 * @example
 * ```tsx
 * const LoginComponent = ForgeFrame.create({ ... });
 * const createDriver = withReactDriver(React);
 *
 * const LoginReact = createDriver(LoginComponent);
 * ```
 */
export function withReactDriver(React: ReactLike) {
  return function driver<P extends Record<string, unknown>, X = unknown>(
    Component: ZoidComponent<P, X>
  ): ReactComponentType<FullReactComponentProps<P>> {
    return createReactDriver(Component, { React });
  };
}

export default createReactDriver;
