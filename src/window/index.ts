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
