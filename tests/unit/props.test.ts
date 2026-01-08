import { describe, it, expect, vi } from 'vitest';
import {
  normalizeProps,
  validateProps,
  getPropsForChild,
  propsToQueryParams,
} from '../../src/props/normalize';
import { cloneProps } from '../../src/props/serialize';
import { BUILTIN_PROP_DEFINITIONS, getDefaultForType } from '../../src/props/definitions';
import { PROP_TYPE } from '../../src/constants';
import type { PropsDefinition, PropContext } from '../../src/types';

describe('Props Normalization', () => {
  const createContext = <P extends Record<string, unknown>>(
    props: Partial<P> = {}
  ): PropContext<P> => ({
    props: props as P,
    uid: 'test-uid',
    tag: 'test-tag',
    close: vi.fn(),
    focus: vi.fn(),
    resize: vi.fn(),
    onError: vi.fn(),
    event: {
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
    },
  });

  it('should merge user props with defaults', () => {
    const definitions: PropsDefinition<{ name: string; count: number }> = {
      name: { type: PROP_TYPE.STRING, default: 'default-name' },
      count: { type: PROP_TYPE.NUMBER, default: 0 },
    };

    const result = normalizeProps(
      { name: 'custom-name' },
      definitions,
      createContext()
    );

    expect(result.name).toBe('custom-name');
    expect(result.count).toBe(0);
  });

  it('should handle function defaults', () => {
    const definitions: PropsDefinition<{ timestamp: number }> = {
      timestamp: {
        type: PROP_TYPE.NUMBER,
        default: () => 12345,
      },
    };

    const result = normalizeProps({}, definitions, createContext());

    expect(result.timestamp).toBe(12345);
  });

  it('should handle computed values', () => {
    const definitions: PropsDefinition<{ computed: string }> = {
      computed: {
        type: PROP_TYPE.STRING,
        value: (ctx) => `uid:${ctx.uid}`,
      },
    };

    const result = normalizeProps({}, definitions, createContext());

    expect(result.computed).toBe('uid:test-uid');
  });

  it('should handle prop aliases', () => {
    const definitions: PropsDefinition<{ email: string }> = {
      email: {
        type: PROP_TYPE.STRING,
        alias: 'userEmail',
      },
    };

    const result = normalizeProps(
      { userEmail: 'test@example.com' } as Record<string, unknown>,
      definitions,
      createContext()
    );

    expect(result.email).toBe('test@example.com');
  });

  it('should apply decorate function', () => {
    const definitions: PropsDefinition<{ name: string }> = {
      name: {
        type: PROP_TYPE.STRING,
        decorate: ({ value }) => (value as string).toUpperCase(),
      },
    };

    const result = normalizeProps(
      { name: 'hello' },
      definitions,
      createContext()
    );

    expect(result.name).toBe('HELLO');
  });

  it('should include builtin props', () => {
    const result = normalizeProps({}, {}, createContext());

    // Should have builtin props with defaults
    expect(result.dimensions).toBeDefined();
    expect(result.timeout).toBeDefined();
  });
});

describe('Props Validation', () => {
  it('should throw for missing required props', () => {
    const definitions: PropsDefinition<{ email: string }> = {
      email: { type: PROP_TYPE.STRING, required: true },
    };

    expect(() =>
      validateProps({ email: undefined } as unknown as { email: string }, definitions)
    ).toThrow('Prop "email" is required');
  });

  it('should throw for invalid type', () => {
    const definitions: PropsDefinition<{ count: number }> = {
      count: { type: PROP_TYPE.NUMBER },
    };

    expect(() =>
      validateProps({ count: 'not a number' } as unknown as { count: number }, definitions)
    ).toThrow('expected type "number"');
  });

  it('should validate string type', () => {
    const definitions: PropsDefinition<{ name: string }> = {
      name: { type: PROP_TYPE.STRING },
    };

    expect(() => validateProps({ name: 'valid' }, definitions)).not.toThrow();
    expect(() =>
      validateProps({ name: 123 } as unknown as { name: string }, definitions)
    ).toThrow();
  });

  it('should validate boolean type', () => {
    const definitions: PropsDefinition<{ active: boolean }> = {
      active: { type: PROP_TYPE.BOOLEAN },
    };

    expect(() => validateProps({ active: true }, definitions)).not.toThrow();
    expect(() =>
      validateProps({ active: 'yes' } as unknown as { active: boolean }, definitions)
    ).toThrow();
  });

  it('should validate function type', () => {
    const definitions: PropsDefinition<{ callback: () => void }> = {
      callback: { type: PROP_TYPE.FUNCTION },
    };

    expect(() => validateProps({ callback: () => {} }, definitions)).not.toThrow();
    expect(() =>
      validateProps({ callback: 'not a function' } as unknown as { callback: () => void }, definitions)
    ).toThrow();
  });

  it('should validate array type', () => {
    const definitions: PropsDefinition<{ items: string[] }> = {
      items: { type: PROP_TYPE.ARRAY },
    };

    expect(() => validateProps({ items: ['a', 'b'] }, definitions)).not.toThrow();
    expect(() =>
      validateProps({ items: 'not an array' } as unknown as { items: string[] }, definitions)
    ).toThrow();
  });

  it('should validate object type', () => {
    const definitions: PropsDefinition<{ data: Record<string, unknown> }> = {
      data: { type: PROP_TYPE.OBJECT },
    };

    expect(() => validateProps({ data: { key: 'value' } }, definitions)).not.toThrow();
    expect(() =>
      validateProps({ data: [1, 2, 3] } as unknown as { data: Record<string, unknown> }, definitions)
    ).toThrow(); // Arrays should not pass as objects
  });

  it('should call custom validate function', () => {
    const customValidate = vi.fn();
    const definitions: PropsDefinition<{ email: string }> = {
      email: {
        type: PROP_TYPE.STRING,
        validate: customValidate,
      },
    };

    validateProps({ email: 'test@example.com' }, definitions);

    expect(customValidate).toHaveBeenCalledWith({
      value: 'test@example.com',
      props: expect.any(Object),
    });
  });

  it('should skip undefined optional props', () => {
    const definitions: PropsDefinition<{ optional?: string }> = {
      optional: { type: PROP_TYPE.STRING, required: false },
    };

    expect(() =>
      validateProps({ optional: undefined } as { optional?: string }, definitions)
    ).not.toThrow();
  });
});

describe('Props for Child', () => {
  it('should filter props with sendToChild: false', () => {
    const definitions: PropsDefinition<{ visible: string; hidden: string }> = {
      visible: { type: PROP_TYPE.STRING, sendToChild: true },
      hidden: { type: PROP_TYPE.STRING, sendToChild: false },
    };

    const result = getPropsForChild(
      { visible: 'yes', hidden: 'no' },
      definitions,
      'https://child.com',
      false
    );

    expect(result.visible).toBe('yes');
    expect(result.hidden).toBeUndefined();
  });

  it('should filter sameDomain props when cross-domain', () => {
    const definitions: PropsDefinition<{ secret: string }> = {
      secret: { type: PROP_TYPE.STRING, sameDomain: true },
    };

    const crossDomainResult = getPropsForChild(
      { secret: 'sensitive' },
      definitions,
      'https://other.com',
      false
    );

    const sameDomainResult = getPropsForChild(
      { secret: 'sensitive' },
      definitions,
      'https://parent.com',
      true
    );

    expect(crossDomainResult.secret).toBeUndefined();
    expect(sameDomainResult.secret).toBe('sensitive');
  });

  it('should filter by trustedDomains', () => {
    const definitions: PropsDefinition<{ data: string }> = {
      data: {
        type: PROP_TYPE.STRING,
        trustedDomains: ['https://trusted.com', 'https://also-trusted.com'],
      },
    };

    const trustedResult = getPropsForChild(
      { data: 'value' },
      definitions,
      'https://trusted.com',
      false
    );

    const untrustedResult = getPropsForChild(
      { data: 'value' },
      definitions,
      'https://untrusted.com',
      false
    );

    expect(trustedResult.data).toBe('value');
    expect(untrustedResult.data).toBeUndefined();
  });

  it('should apply childDecorate function', () => {
    const definitions: PropsDefinition<{ value: string }> = {
      value: {
        type: PROP_TYPE.STRING,
        childDecorate: ({ value }) => `child:${value}`,
      },
    };

    const result = getPropsForChild(
      { value: 'test' },
      definitions,
      'https://child.com',
      false
    );

    expect(result.value).toBe('child:test');
  });
});

describe('Props to Query Params', () => {
  it('should convert props with queryParam: true', () => {
    const definitions: PropsDefinition<{ token: string; secret: string }> = {
      token: { type: PROP_TYPE.STRING, queryParam: true },
      secret: { type: PROP_TYPE.STRING },
    };

    const params = propsToQueryParams(
      { token: 'abc123', secret: 'hidden' },
      definitions
    );

    expect(params.get('token')).toBe('abc123');
    expect(params.get('secret')).toBeNull();
  });

  it('should use custom param name', () => {
    const definitions: PropsDefinition<{ userId: string }> = {
      userId: { type: PROP_TYPE.STRING, queryParam: 'user_id' },
    };

    const params = propsToQueryParams({ userId: '123' }, definitions);

    expect(params.get('user_id')).toBe('123');
  });

  it('should use custom transform function', () => {
    const definitions: PropsDefinition<{ data: { a: number } }> = {
      data: {
        type: PROP_TYPE.OBJECT,
        queryParam: ({ value }) => btoa(JSON.stringify(value)),
      },
    };

    const params = propsToQueryParams({ data: { a: 1 } }, definitions);

    expect(params.get('data')).toBe(btoa(JSON.stringify({ a: 1 })));
  });

  it('should JSON stringify objects', () => {
    const definitions: PropsDefinition<{ config: Record<string, unknown> }> = {
      config: { type: PROP_TYPE.OBJECT, queryParam: true },
    };

    const params = propsToQueryParams(
      { config: { key: 'value' } },
      definitions
    );

    expect(params.get('config')).toBe(JSON.stringify({ key: 'value' }));
  });

  it('should skip function props', () => {
    const definitions: PropsDefinition<{ callback: () => void }> = {
      callback: { type: PROP_TYPE.FUNCTION, queryParam: true },
    };

    const params = propsToQueryParams({ callback: () => {} }, definitions);

    expect(params.get('callback')).toBeNull();
  });

  it('should skip undefined values', () => {
    const definitions: PropsDefinition<{ optional?: string }> = {
      optional: { type: PROP_TYPE.STRING, queryParam: true },
    };

    const params = propsToQueryParams({ optional: undefined } as { optional?: string }, definitions);

    expect(params.get('optional')).toBeNull();
  });
});

describe('Clone Props', () => {
  it('should deep clone objects', () => {
    const original = {
      data: { nested: { value: 1 } },
      name: 'test',
    };

    const cloned = cloneProps(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.data).not.toBe(original.data);
  });

  it('should preserve function references', () => {
    const fn = () => 'hello';
    const original = { callback: fn };

    const cloned = cloneProps(original);

    expect(cloned.callback).toBe(fn);
  });

  it('should handle primitives', () => {
    const original = {
      str: 'string',
      num: 42,
      bool: true,
      nil: null,
    };

    const cloned = cloneProps(original);

    expect(cloned).toEqual(original);
  });
});

describe('getDefaultForType', () => {
  it('should return correct defaults for each type', () => {
    expect(getDefaultForType(PROP_TYPE.STRING)).toBe('');
    expect(getDefaultForType(PROP_TYPE.NUMBER)).toBe(0);
    expect(getDefaultForType(PROP_TYPE.BOOLEAN)).toBe(false);
    expect(getDefaultForType(PROP_TYPE.ARRAY)).toEqual([]);
    expect(getDefaultForType(PROP_TYPE.OBJECT)).toEqual({});
    expect(getDefaultForType(PROP_TYPE.FUNCTION)).toBeUndefined();
    expect(getDefaultForType('unknown')).toBeUndefined();
  });
});

describe('BUILTIN_PROP_DEFINITIONS', () => {
  it('should have uid prop', () => {
    expect(BUILTIN_PROP_DEFINITIONS.uid).toBeDefined();
    expect(BUILTIN_PROP_DEFINITIONS.uid.type).toBe(PROP_TYPE.STRING);
  });

  it('should have tag prop', () => {
    expect(BUILTIN_PROP_DEFINITIONS.tag).toBeDefined();
    expect(BUILTIN_PROP_DEFINITIONS.tag.type).toBe(PROP_TYPE.STRING);
  });

  it('should have dimensions prop with default', () => {
    expect(BUILTIN_PROP_DEFINITIONS.dimensions).toBeDefined();
    expect(BUILTIN_PROP_DEFINITIONS.dimensions.type).toBe(PROP_TYPE.OBJECT);
    expect(typeof BUILTIN_PROP_DEFINITIONS.dimensions.default).toBe('function');
  });

  it('should have timeout prop with default', () => {
    expect(BUILTIN_PROP_DEFINITIONS.timeout).toBeDefined();
    expect(BUILTIN_PROP_DEFINITIONS.timeout.type).toBe(PROP_TYPE.NUMBER);
    const defaultFn = BUILTIN_PROP_DEFINITIONS.timeout.default as () => number;
    expect(defaultFn()).toBe(10000);
  });

  it('should have lifecycle callbacks', () => {
    const lifecycleProps = [
      'onDisplay',
      'onRendered',
      'onRender',
      'onPrerendered',
      'onPrerender',
      'onClose',
      'onDestroy',
      'onResize',
      'onFocus',
      'onError',
      'onProps',
    ];

    for (const prop of lifecycleProps) {
      expect(BUILTIN_PROP_DEFINITIONS[prop]).toBeDefined();
      expect(BUILTIN_PROP_DEFINITIONS[prop].type).toBe(PROP_TYPE.FUNCTION);
      expect(BUILTIN_PROP_DEFINITIONS[prop].sendToChild).toBe(false);
    }
  });
});
