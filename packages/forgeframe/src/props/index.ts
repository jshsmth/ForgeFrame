/**
 * @packageDocumentation
 * Props handling module for ForgeFrame.
 *
 * @remarks
 * This module handles prop normalization, validation, serialization, and
 * deserialization for cross-domain component communication.
 */

export {
  BUILTIN_PROP_DEFINITIONS,
  getDefaultForType,
  type BuiltinProps,
} from './definitions';

export {
  normalizeProps,
  validateProps,
  getPropsForChild,
  propsToQueryParams,
} from './normalize';

export {
  serializeProps,
  deserializeProps,
  cloneProps,
} from './serialize';
