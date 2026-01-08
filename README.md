# ForgeFrame

A modern, TypeScript-first cross-domain iframe/popup component framework. A minimal alternative to [zoid](https://github.com/krakenjs/zoid) with zero dependencies.

## Features

- **Zero Dependencies** - No external runtime dependencies
- **TypeScript First** - Full type safety out of the box
- **API Compatible** - Similar API to zoid for easy migration
- **Modern** - Uses ES2022+ features, native Promises
- **Small Bundle** - ~10KB gzipped
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
LoginComponent({
  email: 'user@example.com',
  onLogin: (user) => {
    console.log('User logged in:', user);
  },
}).render('#container');
```

### Child Page (embedded)

```typescript
// The child page automatically has access to window.xprops
const { email, onLogin, close, resize } = window.xprops;

// Use the passed props
console.log('Email:', email);

// Call parent callbacks
onLogin({ id: 1, name: 'John' });

// Control the frame
resize({ width: 500, height: 400 });
close();
```

## API Reference

### `ForgeFrame.create(options)`

Creates a new component definition.

```typescript
interface ComponentOptions<P> {
  tag: string;                    // Unique component identifier
  url: string | ((props: P) => string);  // URL of the child page

  // Optional
  props?: PropsDefinition<P>;     // Prop type definitions
  dimensions?: Dimensions;        // Default { width, height }
  defaultContext?: 'iframe' | 'popup';  // Default: 'iframe'
  autoResize?: AutoResizeOptions;
  containerTemplate?: ContainerTemplate;
  prerenderTemplate?: PrerenderTemplate;
  eligible?: (opts: { props: P }) => EligibilityResult;
  validate?: (opts: { props: P }) => void;
  attributes?: IframeAttributes;
  timeout?: number;               // Initialization timeout (ms)
}
```

### Prop Types

```typescript
ForgeFrame.PROP_TYPE.STRING    // string
ForgeFrame.PROP_TYPE.NUMBER    // number
ForgeFrame.PROP_TYPE.BOOLEAN   // boolean
ForgeFrame.PROP_TYPE.FUNCTION  // function (serialized for cross-domain)
ForgeFrame.PROP_TYPE.OBJECT    // object
ForgeFrame.PROP_TYPE.ARRAY     // array
```

### Prop Definition

```typescript
interface PropDefinition<T> {
  type: PropType;
  required?: boolean;
  default?: T | (() => T);
  sendToChild?: boolean;       // Send to child (default: true)
  sameDomain?: boolean;        // Only send if same domain
  queryParam?: boolean | string;  // Pass via URL query param
  validate?: (opts: { value: T }) => void;
}
```

### Component Instance Methods

```typescript
const instance = MyComponent(props);

// Rendering
await instance.render(container, context?);
await instance.renderTo(window, container, context?);

// Lifecycle
await instance.close();
await instance.focus();
await instance.resize({ width, height });
await instance.show();
await instance.hide();
await instance.updateProps(newProps);

// Utilities
instance.clone();
instance.isEligible();
instance.event.on('rendered', () => {});
```

### Child Window (xprops)

```typescript
window.xprops = {
  // Your custom props
  ...customProps,

  // Built-in methods
  uid: string,
  tag: string,
  close: () => Promise<void>,
  focus: () => Promise<void>,
  resize: (dims: Dimensions) => Promise<void>,
  show: () => Promise<void>,
  hide: () => Promise<void>,
  onProps: (handler) => { cancel: () => void },
  onError: (error) => Promise<void>,
  getParent: () => Window,
  getParentDomain: () => string,
  export: (data) => Promise<void>,
};
```

## React Integration

```tsx
import React from 'react';
import ForgeFrame, { createReactDriver } from 'forgeframe';

// Create the component
const LoginComponent = ForgeFrame.create({
  tag: 'login-react',
  url: 'https://example.com/login',
  props: {
    onLogin: { type: ForgeFrame.PROP_TYPE.FUNCTION },
  },
});

// Create React wrapper
const LoginReact = createReactDriver(LoginComponent, { React });

// Use in JSX
function App() {
  return (
    <LoginReact
      onLogin={(user) => console.log(user)}
      onRendered={() => console.log('Ready!')}
      onError={(err) => console.error(err)}
      style={{ border: '1px solid #ccc' }}
    />
  );
}
```

## Events

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

## Comparison with Zoid

| Feature | Zoid | ForgeFrame |
|---------|------|------------|
| Dependencies | 4+ packages | 0 |
| Bundle Size | ~40KB | ~10KB |
| TypeScript | Flow types | Native TS |
| React/Vue/Angular drivers | Built-in | React only |
| IE10 support | Yes | No |
| Modern browsers | Yes | Yes |

## Migration from Zoid

```typescript
// Zoid
import zoid from 'zoid';
const Component = zoid.create({ tag: 'my-comp', url: '...' });

// ForgeFrame
import ForgeFrame from 'forgeframe';
const Component = ForgeFrame.create({ tag: 'my-comp', url: '...' });
```

Most APIs are compatible. Key differences:
- Use `ForgeFrame.PROP_TYPE.STRING` instead of `'string'`
- No `bridgeUrl` option (IE10 not supported)
- React driver via `createReactDriver()` instead of `.driver('react', React)`

## License

MIT
