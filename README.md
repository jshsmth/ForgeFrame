# ForgeFrame

A modern, TypeScript-first cross-domain iframe/popup component framework. A minimal alternative to [zoid](https://github.com/krakenjs/zoid) with zero dependencies.

## Features

- **Zero Dependencies** - No external runtime dependencies
- **TypeScript First** - Full type safety out of the box
- **API Compatible** - Similar API to zoid for easy migration
- **Modern** - Uses ES2022+ features, native Promises
- **Small Bundle** - ~15KB gzipped
- **React Driver** - Optional React integration included

## Installation

```bash
npm install forgeframe
```

## Quick Start

### Parent Page (host)

```typescript
import ForgeFrame from 'forgeframe';

// Define a component
const LoginComponent = ForgeFrame.create({
  tag: 'login-component',
  url: 'https://auth.example.com/login',
  props: {
    email: { type: ForgeFrame.PROP_TYPE.STRING },
    onLogin: { type: ForgeFrame.PROP_TYPE.FUNCTION },
  },
  dimensions: { width: 400, height: 300 },
});

// Render it
const instance = LoginComponent({
  email: 'user@example.com',
  onLogin: (user) => {
    console.log('User logged in:', user);
  },
});

await instance.render('#container');
```

### Child Page (embedded)

```typescript
// The child page automatically has access to window.xprops
const { email, onLogin, close, resize, parent, getSiblings } = window.xprops;

// Use the passed props
console.log('Email:', email);

// Call parent callbacks
await onLogin({ id: 1, name: 'John' });

// Control the frame
await resize({ width: 500, height: 400 });
await close();
```

---

## API Reference

### Default Export: `ForgeFrame`

The main ForgeFrame object provides all core functionality:

```typescript
import ForgeFrame from 'forgeframe';
```

| Property | Type | Description |
|----------|------|-------------|
| `create` | `function` | Create a new component definition |
| `destroy` | `function` | Destroy a single component instance |
| `destroyComponents` | `function` | Destroy all instances of a component by tag |
| `destroyAll` | `function` | Destroy all ForgeFrame component instances |
| `isChild` | `function` | Check if current window is a child context |
| `getXProps` | `function` | Get xprops from child window |
| `PROP_TYPE` | `object` | Prop type constants |
| `PROP_SERIALIZATION` | `object` | Serialization strategy constants |
| `CONTEXT` | `object` | Rendering context constants |
| `EVENT` | `object` | Lifecycle event constants |
| `PopupOpenError` | `class` | Error thrown when popup fails to open |
| `VERSION` | `string` | Library version |

---

### `ForgeFrame.create(options)`

Creates a new component definition.

```typescript
const MyComponent = ForgeFrame.create<MyProps>({
  tag: 'my-component',
  url: 'https://example.com/component',
  props: {
    name: { type: ForgeFrame.PROP_TYPE.STRING, required: true },
    onSubmit: { type: ForgeFrame.PROP_TYPE.FUNCTION },
  },
  dimensions: { width: 400, height: 300 },
});
```

#### `ComponentOptions<P>`

```typescript
interface ComponentOptions<P> {
  // Required
  tag: string;                              // Unique component identifier (lowercase, hyphens allowed)
  url: string | ((props: P) => string);     // URL of the child page

  // Optional
  props?: PropsDefinition<P>;               // Prop type definitions
  dimensions?: Dimensions | ((props: P) => Dimensions);  // Default size
  defaultContext?: 'iframe' | 'popup';      // Default: 'iframe'
  timeout?: number;                         // Init timeout in ms (default: 10000)

  // Security
  domain?: DomainMatcher;                   // Allowed child domains
  allowedParentDomains?: DomainMatcher;     // Restrict parent domains

  // Auto-resize
  autoResize?: AutoResizeOptions;           // { width?: boolean, height?: boolean, element?: string }

  // Templates
  containerTemplate?: ContainerTemplate<P>; // Custom container element
  prerenderTemplate?: PrerenderTemplate<P>; // Custom loading element

  // Validation
  eligible?: (opts: { props: P }) => EligibilityResult;
  validate?: (opts: { props: P }) => void;

  // Iframe attributes
  attributes?: IframeAttributes | ((props: P) => IframeAttributes);

  // Nested components
  children?: (props: { props: P }) => Record<string, ZoidComponent>;
}
```

---

### `ForgeFrame.destroy(instance)`

Destroys a single component instance.

```typescript
const instance = MyComponent({ name: 'test' });
await instance.render('#container');

// Later...
await ForgeFrame.destroy(instance);
```

---

### `ForgeFrame.destroyComponents(tag)`

Destroys all instances of a specific component.

```typescript
await ForgeFrame.destroyComponents('my-component');
```

---

### `ForgeFrame.destroyAll()`

Destroys all ForgeFrame component instances.

```typescript
// Clean up on page unload
window.addEventListener('beforeunload', () => {
  ForgeFrame.destroyAll();
});
```

---

### `ForgeFrame.isChild()`

Checks if the current window is running inside a ForgeFrame iframe/popup.

```typescript
if (ForgeFrame.isChild()) {
  console.log('Running in ForgeFrame child context');
}
```

---

### `ForgeFrame.getXProps<P>()`

Gets the xprops object from the child window.

```typescript
const xprops = ForgeFrame.getXProps<MyProps>();
if (xprops) {
  console.log('Props:', xprops);
}
```

---

## Constants

### `ForgeFrame.PROP_TYPE`

Prop type constants for defining component props.

```typescript
ForgeFrame.PROP_TYPE.STRING    // 'string'
ForgeFrame.PROP_TYPE.NUMBER    // 'number'
ForgeFrame.PROP_TYPE.BOOLEAN   // 'boolean'
ForgeFrame.PROP_TYPE.FUNCTION  // 'function' (serialized for cross-domain)
ForgeFrame.PROP_TYPE.OBJECT    // 'object'
ForgeFrame.PROP_TYPE.ARRAY     // 'array'
```

### `ForgeFrame.PROP_SERIALIZATION`

Serialization strategies for cross-domain prop transfer.

```typescript
ForgeFrame.PROP_SERIALIZATION.JSON     // Default JSON serialization
ForgeFrame.PROP_SERIALIZATION.BASE64   // Base64 encoding for binary/large data
ForgeFrame.PROP_SERIALIZATION.DOTIFY   // Dot notation (e.g., "a.b.c=value")
```

### `ForgeFrame.CONTEXT`

Rendering context types.

```typescript
ForgeFrame.CONTEXT.IFRAME  // 'iframe'
ForgeFrame.CONTEXT.POPUP   // 'popup'
```

### `ForgeFrame.EVENT`

Lifecycle event names for subscribing via `instance.event.on()`.

```typescript
ForgeFrame.EVENT.RENDER       // Rendering started
ForgeFrame.EVENT.RENDERED     // Component fully rendered
ForgeFrame.EVENT.PRERENDER    // Prerender started
ForgeFrame.EVENT.PRERENDERED  // Prerender complete
ForgeFrame.EVENT.DISPLAY      // Component visible
ForgeFrame.EVENT.ERROR        // Error occurred
ForgeFrame.EVENT.CLOSE        // Component closing
ForgeFrame.EVENT.DESTROY      // Component destroyed
ForgeFrame.EVENT.PROPS        // Props updated
ForgeFrame.EVENT.RESIZE       // Size changed
ForgeFrame.EVENT.FOCUS        // Component focused
```

---

## Prop Definition

Define individual props with type checking, validation, and serialization options.

```typescript
interface PropDefinition<T, P = Record<string, unknown>> {
  // Type & Requirement
  type: PropType;                    // STRING, NUMBER, BOOLEAN, FUNCTION, OBJECT, ARRAY
  required?: boolean;                // Whether prop is required
  default?: T | ((ctx: PropContext<P>) => T);  // Default value
  value?: (ctx: PropContext<P>) => T;          // Computed value

  // Cross-domain settings
  sendToChild?: boolean;             // Send to child (default: true)
  sameDomain?: boolean;              // Only send if same domain
  trustedDomains?: DomainMatcher[];  // Trusted domains for this prop

  // Serialization
  serialization?: SerializationType; // JSON, BASE64, or DOTIFY
  queryParam?: boolean | string | ((opts: { value: T }) => string);

  // Validation & Transformation
  validate?: (opts: { value: T; props: P }) => void;
  decorate?: (opts: { value: T; props: P }) => T;      // Transform in parent
  childDecorate?: (opts: { value: T; props: P }) => T; // Transform in child

  // Aliasing
  alias?: string;  // Alternative name for the prop
}
```

### Example Prop Definitions

```typescript
const MyComponent = ForgeFrame.create({
  tag: 'my-component',
  url: '/component.html',
  props: {
    // Simple string prop
    name: {
      type: ForgeFrame.PROP_TYPE.STRING,
      required: true,
    },

    // Number with default
    count: {
      type: ForgeFrame.PROP_TYPE.NUMBER,
      default: 0,
    },

    // Function callback
    onSubmit: {
      type: ForgeFrame.PROP_TYPE.FUNCTION,
      required: true,
    },

    // Object with custom serialization
    config: {
      type: ForgeFrame.PROP_TYPE.OBJECT,
      serialization: ForgeFrame.PROP_SERIALIZATION.DOTIFY,
    },

    // Query param prop
    theme: {
      type: ForgeFrame.PROP_TYPE.STRING,
      queryParam: true,  // Adds ?theme=value to URL
    },

    // Validated prop
    email: {
      type: ForgeFrame.PROP_TYPE.STRING,
      validate: ({ value }) => {
        if (!value.includes('@')) {
          throw new Error('Invalid email address');
        }
      },
    },

    // Same-domain only prop
    secretToken: {
      type: ForgeFrame.PROP_TYPE.STRING,
      sameDomain: true,
    },
  },
});
```

---

## Component Instance

When you call a component factory, you get a component instance with these methods:

```typescript
const instance = MyComponent({ name: 'World' });
```

### Instance Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `render` | `(container?, context?) => Promise<void>` | Render into a container |
| `renderTo` | `(win, container?, context?) => Promise<void>` | Render into another window |
| `close` | `() => Promise<void>` | Close and destroy |
| `focus` | `() => Promise<void>` | Focus the component |
| `resize` | `(dimensions) => Promise<void>` | Resize the component |
| `show` | `() => Promise<void>` | Show if hidden |
| `hide` | `() => Promise<void>` | Hide the component |
| `updateProps` | `(props) => Promise<void>` | Update props |
| `clone` | `() => ZoidComponentInstance` | Clone with same props |
| `isEligible` | `() => boolean` | Check eligibility |

### Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `uid` | `string` | Unique instance identifier |
| `event` | `EventEmitterInterface` | Event emitter for lifecycle events |
| `state` | `Record<string, unknown>` | Mutable state object |
| `exports` | `X \| undefined` | Data exported by child via `xprops.export()` |

### Example Usage

```typescript
const instance = MyComponent({ name: 'World' });

// Subscribe to events
instance.event.on('rendered', () => {
  console.log('Component is ready!');
});

instance.event.on('error', (err) => {
  console.error('Error:', err);
});

// Render
await instance.render('#container');

// Update props
await instance.updateProps({ name: 'Updated' });

// Resize
await instance.resize({ width: 600, height: 400 });

// Access exports from child
console.log('Child exports:', instance.exports);

// Close
await instance.close();
```

---

## Component Factory (ZoidComponent)

The return value of `ForgeFrame.create()` is both a callable function and an object with static methods:

```typescript
interface ZoidComponent<P, X> {
  // Call to create instance
  (props?: P): ZoidComponentInstance<P, X>;

  // Static properties
  isChild(): boolean;              // Check if in child context
  xprops?: ChildProps<P>;          // Access xprops in child
  canRenderTo(win: Window): Promise<boolean>;  // Check render permission
  instances: ZoidComponentInstance<P, X>[];    // All active instances
}
```

### Example

```typescript
const LoginComponent = ForgeFrame.create({
  tag: 'login',
  url: '/login.html',
});

// Check if we're in child context
if (LoginComponent.isChild()) {
  const { email, onLogin } = LoginComponent.xprops!;
  // ... child logic
} else {
  // Parent logic
  const instance = LoginComponent({ email: 'user@example.com' });
  await instance.render('#login-container');
}
```

---

## Child Window API (xprops)

In child windows, `window.xprops` provides access to props and control methods.

### `ChildProps<P>`

```typescript
interface ChildProps<P> {
  // Identifiers
  uid: string;
  tag: string;

  // User-defined props
  ...yourCustomProps;

  // Control methods
  close: () => Promise<void>;
  focus: () => Promise<void>;
  resize: (dimensions: Dimensions) => Promise<void>;
  show: () => Promise<void>;
  hide: () => Promise<void>;

  // Communication
  onProps: (handler: (props: P) => void) => { cancel: () => void };
  onError: (err: Error) => Promise<void>;
  export: <X>(exports: X) => Promise<void>;

  // Parent access
  getParent: () => Window;
  getParentDomain: () => string;
  parent: ParentNamespace<P>;

  // Sibling discovery
  getSiblings: (options?: GetSiblingsOptions) => Promise<SiblingInfo[]>;

  // Nested components
  children?: Record<string, ZoidComponent>;
}
```

### Example Child Implementation

```typescript
// child.html
const {
  email,
  onLogin,
  close,
  resize,
  parent,
  getSiblings,
  export: exportData,
} = window.xprops;

// Use props
console.log('Email:', email);

// Call parent callback
document.getElementById('login-btn').onclick = async () => {
  await onLogin({ id: 1, name: 'John Doe' });
  await close();
};

// Subscribe to prop updates
const subscription = window.xprops.onProps((newProps) => {
  console.log('Props updated:', newProps);
});

// Later: subscription.cancel();

// Export data to parent
exportData({
  getFormData: () => ({ email: document.getElementById('email').value }),
});

// Resize based on content
await resize({ height: document.body.scrollHeight });

// Access parent's props
console.log('Parent props:', parent.props);

// Get sibling components
const siblings = await getSiblings();
console.log('Siblings:', siblings);
```

---

## Parent Namespace

The `parent` property in xprops provides bidirectional communication:

```typescript
interface ParentNamespace<P> {
  props: P;                              // Parent's current props
  export: <T>(data: T) => Promise<void>; // Export to parent
}
```

### Example

```typescript
// Access parent's props from child
const { parent } = window.xprops;
console.log('Parent email:', parent.props.email);

// Export data back to parent
await parent.export({
  userPreferences: { theme: 'dark' },
});
```

---

## Sibling Discovery

Child components can discover sibling instances on the same parent page:

```typescript
interface SiblingInfo {
  uid: string;
  tag: string;
  exports?: unknown;
}

interface GetSiblingsOptions {
  anyParent?: boolean;  // Get siblings from any parent (default: false)
}
```

### Example

```typescript
// Get siblings with the same tag
const siblings = await window.xprops.getSiblings();

for (const sibling of siblings) {
  console.log(`Sibling ${sibling.uid}:`, sibling.exports);
}
```

---

## Nested Components (Children)

Components can define child components for nested composition:

```typescript
const ParentComponent = ForgeFrame.create({
  tag: 'parent-component',
  url: '/parent.html',
  children: ({ props }) => ({
    ChildA: ChildAComponent,
    ChildB: ChildBComponent,
  }),
});

// In parent.html (child window)
const { children } = window.xprops;
const { ChildA, ChildB } = children;

// Render nested component
ChildA({ nestedProp: 'value' }).render('#nested-container');
```

---

## React Integration

### `createReactDriver(Component, options)`

Creates a React wrapper component.

```typescript
import React from 'react';
import ForgeFrame, { createReactDriver } from 'forgeframe';

const LoginComponent = ForgeFrame.create({
  tag: 'login-react',
  url: 'https://example.com/login',
  props: {
    email: { type: ForgeFrame.PROP_TYPE.STRING },
    onLogin: { type: ForgeFrame.PROP_TYPE.FUNCTION },
  },
});

const LoginReact = createReactDriver(LoginComponent, { React });

function App() {
  return (
    <LoginReact
      email="user@example.com"
      onLogin={(user) => console.log(user)}
      onRendered={() => console.log('Ready!')}
      onError={(err) => console.error(err)}
      style={{ border: '1px solid #ccc' }}
      className="login-frame"
    />
  );
}
```

### `withReactDriver(React)`

Alternative factory pattern for multiple components:

```typescript
import { withReactDriver } from 'forgeframe';

const createDriver = withReactDriver(React);

const LoginReact = createDriver(LoginComponent);
const CheckoutReact = createDriver(CheckoutComponent);
```

### React Component Props

```typescript
interface ReactComponentProps<P> {
  // Your component props
  ...P;

  // Lifecycle callbacks
  onRendered?: () => void;
  onError?: (err: Error) => void;
  onClose?: () => void;

  // Container styling
  style?: React.CSSProperties;
  className?: string;

  // Rendering context
  context?: 'iframe' | 'popup';

  // Forward ref to container div
  containerRef?: React.Ref<HTMLDivElement>;
}
```

---

## TypeScript Types

All types are exported for TypeScript users:

```typescript
import type {
  // Component types
  ComponentOptions,
  ZoidComponent,
  ZoidComponentInstance,
  ChildProps,

  // Props types
  PropDefinition,
  PropsDefinition,
  PropContext,

  // Template types
  TemplateContext,
  ContainerTemplate,
  PrerenderTemplate,

  // Utility types
  Dimensions,
  DomainMatcher,
  AutoResizeOptions,
  IframeAttributes,
  EligibilityResult,

  // Event types
  EventHandler,
  EventEmitterInterface,

  // Constant types
  PropType,
  ContextType,
  EventType,
  SerializationType,

  // React types
  ReactDriverOptions,
  ReactComponentProps,
  ReactComponentType,

  // Advanced types
  ParentNamespace,
  SiblingInfo,
  GetSiblingsOptions,
  ChildrenDefinition,
} from 'forgeframe';
```

---

## Named Exports

For tree-shaking, all functions and constants are also available as named exports:

```typescript
import {
  // Functions
  create,
  destroy,
  destroyComponents,
  destroyAll,
  isChild,
  getXProps,

  // Constants
  PROP_TYPE,
  PROP_SERIALIZATION,
  CONTEXT,
  EVENT,
  VERSION,

  // Errors
  PopupOpenError,

  // React
  createReactDriver,
  withReactDriver,
} from 'forgeframe';
```

---

## Migration from Zoid

```typescript
// Zoid
import zoid from 'zoid';
const Component = zoid.create({ tag: 'my-comp', url: '...' });

// ForgeFrame
import ForgeFrame from 'forgeframe';
const Component = ForgeFrame.create({ tag: 'my-comp', url: '...' });
```

### Key Differences

| Feature | Zoid | ForgeFrame |
|---------|------|------------|
| Prop types | `'string'` | `ForgeFrame.PROP_TYPE.STRING` |
| React driver | `.driver('react', React)` | `createReactDriver(Component, { React })` |
| Bridge URL | Required for IE10 | Not supported (modern browsers only) |
| Event names | `zoid-rendered` | `rendered` |

### Event Name Mapping

| Zoid Event | ForgeFrame Event |
|------------|------------------|
| `zoid-render` | `render` |
| `zoid-rendered` | `rendered` |
| `zoid-prerender` | `prerender` |
| `zoid-prerendered` | `prerendered` |
| `zoid-display` | `display` |
| `zoid-close` | `close` |
| `zoid-destroy` | `destroy` |
| `zoid-error` | `error` |
| `zoid-props` | `props` |
| `zoid-resize` | `resize` |
| `zoid-focus` | `focus` |

```typescript
// Zoid
instance.event.on('zoid-rendered', () => console.log('ready'));

// ForgeFrame
instance.event.on('rendered', () => console.log('ready'));
```

---

## Browser Support

ForgeFrame requires ES2022+ features and does not support IE. Supported browsers:

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

---

## License

MIT
