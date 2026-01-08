/**
 * @packageDocumentation
 * Core module for ForgeFrame component creation and lifecycle management.
 *
 * @remarks
 * This module provides the primary API for creating, managing, and destroying
 * cross-domain components. It includes both parent-side (host page) and
 * child-side (embedded page) functionality.
 */

export {
  create,
  getComponent,
  destroy,
  destroyComponents,
  destroyAll,
  unregisterComponent,
  clearComponents,
  isChild,
  getXProps,
} from './component';

export { ParentComponent } from './parent';
export { ChildComponent, initChild, getChild } from './child';
