import { describe, it, expect, afterEach } from 'vitest';
import { create, clearComponents } from '../../src/core/component';
import { PROP_TYPE, CONTEXT } from '../../src/constants';

describe('Component Creation', () => {
  afterEach(() => {
    clearComponents();
  });

  it('should create a component with basic options', () => {
    const MyComponent = create({
      tag: 'my-component',
      url: 'https://example.com/component',
    });

    expect(MyComponent).toBeDefined();
    expect(typeof MyComponent).toBe('function');
    expect(MyComponent.isChild()).toBe(false);
    expect(MyComponent.instances).toEqual([]);
  });

  it('should create a component with props definition', () => {
    const MyComponent = create({
      tag: 'my-component-with-props',
      url: 'https://example.com/component',
      props: {
        email: { type: PROP_TYPE.STRING, required: true },
        onLogin: { type: PROP_TYPE.FUNCTION },
      },
    });

    expect(MyComponent).toBeDefined();
  });

  it('should throw error for invalid tag', () => {
    expect(() =>
      create({
        tag: 'Invalid-Tag',
        url: 'https://example.com',
      })
    ).toThrow('Invalid component tag');
  });

  it('should throw error for missing tag', () => {
    expect(() =>
      create({
        tag: '',
        url: 'https://example.com',
      })
    ).toThrow('Component tag is required');
  });

  it('should throw error for missing url', () => {
    expect(() =>
      create({
        tag: 'my-component',
        url: '',
      })
    ).toThrow('Component url is required');
  });

  it('should throw error for duplicate tag', () => {
    create({
      tag: 'duplicate-tag',
      url: 'https://example.com',
    });

    expect(() =>
      create({
        tag: 'duplicate-tag',
        url: 'https://example.com',
      })
    ).toThrow('already registered');
  });

  it('should create an instance when called', () => {
    const MyComponent = create({
      tag: 'test-instance',
      url: 'https://example.com',
    });

    const instance = MyComponent({ customProp: 'value' });

    expect(instance).toBeDefined();
    expect(typeof instance.render).toBe('function');
    expect(typeof instance.close).toBe('function');
    expect(typeof instance.updateProps).toBe('function');
    expect(instance.event).toBeDefined();
    expect(MyComponent.instances.length).toBe(1);
  });

  it('should support custom dimensions', () => {
    const MyComponent = create({
      tag: 'sized-component',
      url: 'https://example.com',
      dimensions: { width: 400, height: 300 },
    });

    expect(MyComponent).toBeDefined();
  });

  it('should support default context', () => {
    const PopupComponent = create({
      tag: 'popup-component',
      url: 'https://example.com',
      defaultContext: CONTEXT.POPUP,
    });

    expect(PopupComponent).toBeDefined();
  });
});

describe('Component Instance', () => {
  afterEach(() => {
    clearComponents();
  });

  it('should check eligibility', () => {
    const MyComponent = create<{ allowed: boolean }>({
      tag: 'eligible-component',
      url: 'https://example.com',
      props: {
        allowed: { type: PROP_TYPE.BOOLEAN, required: true },
      },
      eligible: ({ props }) => ({
        eligible: props.allowed === true,
        reason: 'Not allowed',
      }),
    });

    const eligibleInstance = MyComponent({ allowed: true });
    const ineligibleInstance = MyComponent({ allowed: false });

    expect(eligibleInstance.isEligible()).toBe(true);
    expect(ineligibleInstance.isEligible()).toBe(false);
  });

  it('should clone an instance', () => {
    const MyComponent = create({
      tag: 'clone-test',
      url: 'https://example.com',
    });

    const instance = MyComponent({ value: 42 });
    const cloned = instance.clone();

    expect(cloned).toBeDefined();
    expect(cloned).not.toBe(instance);
  });
});
