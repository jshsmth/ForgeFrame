export {
  createIframe,
  createPrerenderIframe,
  destroyIframe,
  resizeIframe,
  showIframe,
  hideIframe,
  focusIframe,
  getIframeContentDimensions,
  type IframeOptions,
} from './iframe';

export {
  openPopup,
  closePopup,
  focusPopup,
  isPopupBlocked,
  watchPopupClose,
  resizePopup,
  PopupOpenError,
  type PopupOptions,
} from './popup';

export {
  defaultContainerTemplate,
  defaultPrerenderTemplate,
  applyDimensions,
  createStyleElement,
  fadeIn,
  fadeOut,
  swapPrerenderContent,
} from './templates';
