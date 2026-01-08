/**
 * Window utilities for ForgeFrame cross-window communication.
 *
 * @remarks
 * This module provides utilities for working with browser windows in cross-origin
 * contexts. It includes helpers for domain matching, window hierarchy navigation,
 * window name payload encoding/decoding, and window reference management.
 *
 * @packageDocumentation
 */

export {
  getDomain,
  isSameDomain,
  matchDomain,
  isWindowClosed,
  getOpener,
  getParent,
  getTop,
  isIframe,
  isPopup,
  getAncestor,
  getDistanceToParent,
  focusWindow,
  closeWindow,
  getFrames,
} from './helpers';

export {
  buildWindowName,
  parseWindowName,
  isForgeFrameWindow,
  isChildOfComponent,
  createWindowPayload,
  updateWindowName,
  getInitialPayload,
} from './name-payload';

export {
  registerWindow,
  unregisterWindow,
  getWindowByUID,
  createWindowRef,
  resolveWindowRef,
  serializeWindowRef,
  clearWindowRegistry,
} from './proxy';
