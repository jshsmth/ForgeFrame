/**
 * ForgeFrame Driver Module
 *
 * @remarks
 * This module provides framework-specific drivers for integrating ForgeFrame
 * components with popular UI frameworks like React. Drivers handle the lifecycle
 * management, prop synchronization, and rendering of cross-domain components
 * within the target framework's component model.
 *
 * @example
 * ```typescript
 * import { createReactDriver, withReactDriver } from 'forgeframe/drivers';
 * import type { ReactDriverOptions, ReactComponentProps } from 'forgeframe/drivers';
 * ```
 *
 * @packageDocumentation
 */

export {
  createReactDriver,
  withReactDriver,
  type ReactDriverOptions,
  type ReactComponentProps,
  type ReactComponentType,
} from './react';
