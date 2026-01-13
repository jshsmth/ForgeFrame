/**
 * @packageDocumentation
 * Core module for ForgeFrame component creation and lifecycle management.
 *
 * @remarks
 * This module provides the primary API for creating, managing, and destroying
 * cross-domain components. It includes both consumer-side (embedding app) and
 * host-side (embedded page) functionality.
 */

export {
  create,
  getComponent,
  destroy,
  destroyByTag,
  destroyAll,
  unregisterComponent,
  clearComponents,
} from './component';

export { ConsumerComponent } from './consumer';
export {
  HostComponent,
  initHost,
  getHost,
  isHost,
  isEmbedded,
  getHostProps,
} from './host';
