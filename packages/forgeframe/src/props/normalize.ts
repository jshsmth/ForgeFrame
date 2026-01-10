/**
 * @packageDocumentation
 * Props normalization and validation module.
 *
 * @remarks
 * This module handles merging user props with defaults, validating prop
 * types, and filtering props for sending to host components.
 */

import type {
  PropDefinition,
  PropsDefinition,
  PropContext,
  DomainMatcher,
} from '../types';
import { PROP_TYPE } from '../constants';
import { BUILTIN_PROP_DEFINITIONS } from './definitions';
import { matchDomain } from '../window/helpers';
import { isStandardSchema, validateWithSchema } from './schema';

/**
 * Merges user props with defaults and computes derived values.
 *
 * @typeParam P - The props type
 * @param userProps - Props provided by the user
 * @param definitions - Prop definitions from component config
 * @param context - Context for computed props
 * @returns Normalized props object
 *
 * @public
 */
export function normalizeProps<P extends Record<string, unknown>>(
  userProps: Partial<P>,
  definitions: PropsDefinition<P>,
  context: PropContext<P>
): P {
  const allDefs = {
    ...BUILTIN_PROP_DEFINITIONS,
    ...definitions,
  } as PropsDefinition<P>;

  const result = {} as P;

  for (const [key, def] of Object.entries(allDefs)) {
    const definition = def as PropDefinition<unknown, P>;
    let value: unknown;

    const aliasKey = definition.alias;
    const hasValue = key in userProps;
    const hasAliasValue = aliasKey && aliasKey in userProps;

    if (hasValue) {
      value = userProps[key as keyof P];
    } else if (hasAliasValue) {
      value = userProps[aliasKey as keyof P];
    } else if (definition.value) {
      value = definition.value(context);
    } else if (definition.default !== undefined) {
      value =
        typeof definition.default === 'function'
          ? (definition.default as (ctx: PropContext<P>) => unknown)(context)
          : definition.default;
    }

    if (value !== undefined && definition.decorate) {
      value = definition.decorate({ value, props: result as P });
    }

    (result as Record<string, unknown>)[key] = value;
  }

  return result;
}

/**
 * Validates props against their definitions.
 *
 * @typeParam P - The props type
 * @param props - Props to validate
 * @param definitions - Prop definitions to validate against
 * @throws Error if a required prop is missing or type is invalid
 *
 * @public
 */
export function validateProps<P extends Record<string, unknown>>(
  props: P,
  definitions: PropsDefinition<P>
): void {
  const allDefs = {
    ...BUILTIN_PROP_DEFINITIONS,
    ...definitions,
  } as PropsDefinition<P>;

  for (const [key, def] of Object.entries(allDefs)) {
    const definition = def as PropDefinition<unknown, P>;
    let value: unknown = props[key as keyof P];

    if (definition.required && value === undefined) {
      throw new Error(`Prop "${key}" is required but was not provided`);
    }

    if (value === undefined) continue;

    if (definition.schema && isStandardSchema(definition.schema)) {
      value = validateWithSchema(definition.schema, value, key);
      (props as Record<string, unknown>)[key] = value;
    } else if (definition.type && !validateType(value, definition.type)) {
      throw new Error(
        `Prop "${key}" expected type "${definition.type}" but got "${typeof value}"`
      );
    }

    if (definition.validate) {
      definition.validate({ value, props });
    }
  }
}

/**
 * Validates a value against a prop type.
 * @internal
 */
function validateType(value: unknown, type: string): boolean {
  switch (type) {
    case PROP_TYPE.STRING:
      return typeof value === 'string';
    case PROP_TYPE.NUMBER:
      return typeof value === 'number';
    case PROP_TYPE.BOOLEAN:
      return typeof value === 'boolean';
    case PROP_TYPE.FUNCTION:
      return typeof value === 'function';
    case PROP_TYPE.ARRAY:
      return Array.isArray(value);
    case PROP_TYPE.OBJECT:
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Filters props for sending to the host component.
 *
 * @remarks
 * Respects sendToHost, sameDomain, and trustedDomains settings.
 *
 * @typeParam P - The props type
 * @param props - All props
 * @param definitions - Prop definitions
 * @param hostDomain - The host's domain
 * @param isSameDomain - Whether host is same domain as consumer
 * @returns Filtered props for the host
 *
 * @public
 */
export function getPropsForHost<P extends Record<string, unknown>>(
  props: P,
  definitions: PropsDefinition<P>,
  hostDomain: string,
  isSameDomain: boolean
): Partial<P> {
  const allDefs = {
    ...BUILTIN_PROP_DEFINITIONS,
    ...definitions,
  } as PropsDefinition<P>;

  const result: Partial<P> = {};

  for (const [key, def] of Object.entries(allDefs)) {
    const definition = def as PropDefinition<unknown, P>;
    const value = props[key as keyof P];

    if (definition.sendToHost === false) continue;
    if (definition.sameDomain && !isSameDomain) continue;

    if (definition.trustedDomains) {
      const trusted = definition.trustedDomains as DomainMatcher;
      if (!matchDomain(trusted, hostDomain)) continue;
    }

    let finalValue = value;
    if (definition.hostDecorate && value !== undefined) {
      finalValue = definition.hostDecorate({ value, props }) as P[keyof P];
    }

    (result as Record<string, unknown>)[key] = finalValue;
  }

  return result;
}

/**
 * Builds URL query parameters from props with queryParam option.
 *
 * @typeParam P - The props type
 * @param props - Props to convert
 * @param definitions - Prop definitions
 * @returns URLSearchParams with query parameters
 *
 * @public
 */
export function propsToQueryParams<P extends Record<string, unknown>>(
  props: P,
  definitions: PropsDefinition<P>
): URLSearchParams {
  const params = new URLSearchParams();
  const allDefs = {
    ...BUILTIN_PROP_DEFINITIONS,
    ...definitions,
  } as PropsDefinition<P>;

  for (const [key, def] of Object.entries(allDefs)) {
    const definition = def as PropDefinition<unknown, P>;
    const value = props[key as keyof P];

    if (value === undefined) continue;
    if (definition.type === PROP_TYPE.FUNCTION) continue;
    if (!definition.queryParam) continue;

    const paramName =
      typeof definition.queryParam === 'string' ? definition.queryParam : key;

    let paramValue: string;
    if (typeof definition.queryParam === 'function') {
      paramValue = definition.queryParam({ value });
    } else if (typeof value === 'object') {
      paramValue = JSON.stringify(value);
    } else {
      paramValue = String(value);
    }

    params.set(paramName, paramValue);
  }

  return params;
}
