# ForgeFrame

A modern, TypeScript-first cross-domain component framework for embedding iframes and popups with seamless communication. Zero dependencies, ~15KB gzipped.

## Why ForgeFrame?

ForgeFrame lets you embed components from different domains while passing data and callbacks seamlessly - something iframes alone can't do elegantly. Perfect for:

- **Payment forms** - Embed secure payment fields from a payment provider
- **Authentication widgets** - Login forms hosted on your auth domain
- **Third-party integrations** - Embed partner components in your app
- **Micro-frontends** - Isolated components across different teams/domains

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Step-by-Step Guide](#step-by-step-guide)
  - [1. Define a Component](#1-define-a-component-consumer)
  - [2. Create the Host Page](#2-create-the-host-page)
  - [3. Render the Component](#3-render-the-component)
  - [4. Handle Events](#4-handle-events)
- [Props System](#props-system)
- [Host Window API (xprops)](#host-window-api-xprops)
- [Templates](#templates)
- [React Integration](#react-integration)
- [Advanced Features](#advanced-features)
- [API Reference](#api-reference)
- [TypeScript](#typescript)
- [Browser Support](#browser-support)

---

## Installation

```bash
npm install forgeframe
```

```bash
yarn add forgeframe
```

```bash
pnpm add forgeframe
```

---

## Quick Start

### Consumer Page (your app)

```typescript
import ForgeFrame from 'forgeframe';

// 1. Define the component
const PaymentForm = ForgeFrame.create({
  tag: 'payment-form',
  url: 'https://payments.example.com/form',
  dimensions: { width: 400, height: 300 },
  props: {
    amount: { type: ForgeFrame.PROP_TYPE.NUMBER },
    onSuccess: { type: ForgeFrame.PROP_TYPE.FUNCTION },
  },
});

// 2. Create instance and render
const payment = PaymentForm({
  amount: 99.99,
  onSuccess: (txn) => console.log('Payment complete:', txn),
});

await payment.render('#payment-container');
```

### Host Page (embedded iframe)

```typescript
// The host automatically receives props via window.xprops
const { amount, onSuccess, close } = window.xprops;

// Use the props
document.getElementById('total').textContent = `$${amount}`;

// Call consumer callbacks
document.getElementById('pay-btn').onclick = async () => {
  await onSuccess({ transactionId: 'TXN_123' });
  await close();
};
```

That's it! ForgeFrame handles all the cross-domain communication automatically.

---

## Step-by-Step Guide

### 1. Define a Component (Consumer)

Components are defined using `ForgeFrame.create()`. This creates a reusable component factory.

```typescript
import ForgeFrame from 'forgeframe';

// Define your props interface (TypeScript)
interface LoginProps {
  email?: string;
  onLogin: (user: { id: number; name: string }) => void;
  onCancel?: () => void;
}

// Create the component
const LoginForm = ForgeFrame.create<LoginProps>({
  // Required: unique identifier
  tag: 'login-form',

  // Required: URL of the host page
  url: 'https://auth.example.com/login',

  // Optional: dimensions
  dimensions: { width: 400, height: 350 },

  // Optional: prop definitions with types and validation
  props: {
    email: {
      type: ForgeFrame.PROP_TYPE.STRING,
    },
    onLogin: {
      type: ForgeFrame.PROP_TYPE.FUNCTION,
      required: true,
    },
    onCancel: {
      type: ForgeFrame.PROP_TYPE.FUNCTION,
    },
  },
});
```

### 2. Create the Host Page

The host page runs inside the iframe. It receives props via `window.xprops`.

```html
<!-- https://auth.example.com/login -->
<!DOCTYPE html>
<html>
<head>
  <title>Login</title>
</head>
<body>
  <form id="login-form">
    <input type="email" id="email" placeholder="Email" />
    <input type="password" id="password" placeholder="Password" />
    <button type="submit">Login</button>
    <button type="button" id="cancel">Cancel</button>
  </form>

  <script type="module">
    // window.xprops is automatically available in ForgeFrame hosts
    const { email, onLogin, onCancel, close } = window.xprops;

    // Pre-fill email if provided
    if (email) {
      document.getElementById('email').value = email;
    }

    // Handle form submission
    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();

      // Call the consumer's callback
      await onLogin({
        id: 1,
        name: 'John Doe',
        email: document.getElementById('email').value,
      });

      // Close the component
      await close();
    };

    // Handle cancel
    document.getElementById('cancel').onclick = async () => {
      await onCancel?.();
      await close();
    };
  </script>
</body>
</html>
```

### 3. Render the Component

Create an instance with props and render it.

```typescript
// Create an instance with props
const login = LoginForm({
  email: 'user@example.com',
  onLogin: (user) => {
    console.log('User logged in:', user);
    // Update your app state, redirect, etc.
  },
  onCancel: () => {
    console.log('Login cancelled');
  },
});

// Render into a container (CSS selector or HTMLElement)
await login.render('#login-container');

// Or render as a popup window
await login.render(document.body, 'popup');
```

### 4. Handle Events

Subscribe to lifecycle events for better control.

```typescript
const instance = LoginForm({ /* props */ });

// Component finished rendering
instance.event.on('rendered', () => {
  console.log('Login form is ready');
});

// Component was closed
instance.event.on('close', () => {
  console.log('Login form closed');
});

// An error occurred
instance.event.on('error', (err) => {
  console.error('Error:', err);
});

// Component was resized
instance.event.on('resize', (dimensions) => {
  console.log('New size:', dimensions);
});

await instance.render('#container');
```

**Available Events:**

| Event | Description |
|-------|-------------|
| `render` | Rendering started |
| `rendered` | Fully rendered and initialized |
| `prerender` | Prerender (loading) started |
| `prerendered` | Prerender complete |
| `display` | Component became visible |
| `close` | Component is closing |
| `destroy` | Component destroyed |
| `error` | An error occurred |
| `props` | Props were updated |
| `resize` | Component was resized |
| `focus` | Component received focus |

---

## Props System

### Defining Props

Props define what data can be passed to your component.

```typescript
const MyComponent = ForgeFrame.create({
  tag: 'my-component',
  url: '/component',
  props: {
    // Basic types
    name: { type: ForgeFrame.PROP_TYPE.STRING },
    count: { type: ForgeFrame.PROP_TYPE.NUMBER },
    enabled: { type: ForgeFrame.PROP_TYPE.BOOLEAN },
    config: { type: ForgeFrame.PROP_TYPE.OBJECT },
    items: { type: ForgeFrame.PROP_TYPE.ARRAY },

    // Functions (automatically serialized for cross-domain calls)
    onSubmit: { type: ForgeFrame.PROP_TYPE.FUNCTION },

    // Required props
    userId: {
      type: ForgeFrame.PROP_TYPE.STRING,
      required: true,
    },

    // Default values
    theme: {
      type: ForgeFrame.PROP_TYPE.STRING,
      default: 'light',
    },

    // Validation
    email: {
      type: ForgeFrame.PROP_TYPE.STRING,
      validate: ({ value }) => {
        if (!value.includes('@')) {
          throw new Error('Invalid email');
        }
      },
    },

    // Query parameters (added to URL)
    locale: {
      type: ForgeFrame.PROP_TYPE.STRING,
      queryParam: true,  // Adds ?locale=value to URL
    },

    // Same-domain only (security)
    authToken: {
      type: ForgeFrame.PROP_TYPE.STRING,
      sameDomain: true,  // Only sent if same origin
    },
  },
});
```

### Prop Types

| Type | Constant | Description |
|------|----------|-------------|
| String | `ForgeFrame.PROP_TYPE.STRING` | Text values |
| Number | `ForgeFrame.PROP_TYPE.NUMBER` | Numeric values |
| Boolean | `ForgeFrame.PROP_TYPE.BOOLEAN` | True/false |
| Object | `ForgeFrame.PROP_TYPE.OBJECT` | Plain objects |
| Array | `ForgeFrame.PROP_TYPE.ARRAY` | Arrays |
| Function | `ForgeFrame.PROP_TYPE.FUNCTION` | Callbacks (serialized) |

### Updating Props

Props can be updated after rendering.

```typescript
const instance = MyComponent({ name: 'Initial' });
await instance.render('#container');

// Update props
await instance.updateProps({ name: 'Updated' });
```

The host receives updates via `onProps`:

```typescript
// In host
window.xprops.onProps((newProps) => {
  console.log('Props updated:', newProps);
  // Re-render your UI with new props
});
```

---

## Host Window API (xprops)

In host windows, `window.xprops` provides access to props and control methods.

### TypeScript Setup

```typescript
import { type HostProps } from 'forgeframe';

// Define your props interface
interface MyProps {
  email: string;
  onLogin: (user: { id: number }) => void;
}

// Type window.xprops
declare global {
  interface Window {
    xprops?: HostProps<MyProps>;
  }
}

// Now fully typed!
const { email, onLogin, close, resize } = window.xprops!;
```

### Available Methods

```typescript
const xprops = window.xprops;

// Your custom props
xprops.email;              // Props you defined
xprops.onLogin(user);      // Callbacks you defined

// Built-in identifiers
xprops.uid;                // Unique instance ID
xprops.tag;                // Component tag name

// Control methods
await xprops.close();                          // Close the component
await xprops.focus();                          // Focus (popup only)
await xprops.resize({ width: 500, height: 400 }); // Resize
await xprops.show();                           // Show if hidden
await xprops.hide();                           // Hide

// Communication
xprops.onProps((props) => { /* handle updates */ });
xprops.onError(new Error('Something failed'));
await xprops.export({ validate: () => true }); // Export to consumer

// Consumer access
xprops.getConsumer();        // Consumer window reference
xprops.getConsumerDomain();  // Consumer origin
xprops.parent.props;         // Consumer's props (parent in window hierarchy)
xprops.parent.export(data);  // Export to consumer component

// Siblings
const siblings = await xprops.getSiblings();
```

### Exporting Data to Consumer

Host components can export methods/data for the consumer to use.

**Host:**
```typescript
// Export methods to consumer
window.xprops.export({
  validate: () => {
    const form = document.getElementById('form');
    return form.checkValidity();
  },
  getFormData: () => {
    return { email: document.getElementById('email').value };
  },
});
```

**Consumer:**
```typescript
const instance = MyComponent({ /* props */ });
await instance.render('#container');

// Access exports
console.log(instance.exports);  // { validate: fn, getFormData: fn }

// Call exported methods
const isValid = await instance.exports.validate();
const data = await instance.exports.getFormData();
```

---

## Templates

### Container Template

Customize how the component container is rendered. Perfect for modals.

```typescript
const ModalComponent = ForgeFrame.create({
  tag: 'modal',
  url: '/modal',
  dimensions: { width: 500, height: 400 },

  containerTemplate: ({ doc, frame, prerenderFrame, close, uid }) => {
    // Create overlay
    const overlay = doc.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000',
    });

    // Close on backdrop click
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    // Create modal
    const modal = doc.createElement('div');
    Object.assign(modal.style, {
      background: 'white',
      borderRadius: '8px',
      overflow: 'hidden',
    });

    // Add close button
    const closeBtn = doc.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.onclick = () => close();
    modal.appendChild(closeBtn);

    // Add frame elements
    const body = doc.createElement('div');
    if (prerenderFrame) body.appendChild(prerenderFrame);
    if (frame) body.appendChild(frame);
    modal.appendChild(body);

    overlay.appendChild(modal);
    return overlay;
  },
});
```

### Prerender Template

Customize the loading state shown while the host loads.

```typescript
const MyComponent = ForgeFrame.create({
  tag: 'my-component',
  url: '/component',

  prerenderTemplate: ({ doc, dimensions }) => {
    const loader = doc.createElement('div');
    loader.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${dimensions.width}px;
        height: ${dimensions.height}px;
        background: #f5f5f5;
      ">
        <span>Loading...</span>
      </div>
    `;
    return loader.firstElementChild as HTMLElement;
  },
});
```

---

## React Integration

### Basic Usage

```tsx
import React from 'react';
import ForgeFrame, { createReactDriver } from 'forgeframe';

// 1. Create ForgeFrame component
const LoginComponent = ForgeFrame.create({
  tag: 'login',
  url: 'https://auth.example.com/login',
  dimensions: { width: 400, height: 350 },
  props: {
    email: { type: ForgeFrame.PROP_TYPE.STRING },
    onLogin: { type: ForgeFrame.PROP_TYPE.FUNCTION },
  },
});

// 2. Create React wrapper
const Login = createReactDriver(LoginComponent, { React });

// 3. Use in your app
function App() {
  const [user, setUser] = useState(null);

  return (
    <div>
      <h1>My App</h1>

      <Login
        email="user@example.com"
        onLogin={(loggedInUser) => setUser(loggedInUser)}
        onRendered={() => console.log('Ready')}
        onError={(err) => console.error(err)}
        onClose={() => console.log('Closed')}
        className="login-frame"
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
}
```

### React Props

The React component accepts all your component props plus:

| Prop | Type | Description |
|------|------|-------------|
| `onRendered` | `() => void` | Called when component is ready |
| `onError` | `(err: Error) => void` | Called on error |
| `onClose` | `() => void` | Called when closed |
| `context` | `'iframe' \| 'popup'` | Render mode |
| `className` | `string` | Container CSS class |
| `style` | `CSSProperties` | Container inline styles |

### Factory Pattern

For multiple components, use `withReactDriver`:

```tsx
import { withReactDriver } from 'forgeframe';

const createDriver = withReactDriver(React);

const LoginReact = createDriver(LoginComponent);
const PaymentReact = createDriver(PaymentComponent);
const ProfileReact = createDriver(ProfileComponent);
```

---

## Advanced Features

### Popup Windows

Render as a popup instead of iframe.

```typescript
// Render as popup
await instance.render('#container', 'popup');

// Or set as default
const PopupComponent = ForgeFrame.create({
  tag: 'popup-component',
  url: '/popup',
  defaultContext: 'popup',
});
```

### Auto-Resize

Automatically resize based on host content.

```typescript
const AutoResizeComponent = ForgeFrame.create({
  tag: 'auto-resize',
  url: '/component',
  autoResize: {
    height: true,
    width: false,
    element: '.content', // Observe this element
  },
});
```

### Domain Security

Restrict which domains can embed or communicate.

```typescript
const SecureComponent = ForgeFrame.create({
  tag: 'secure',
  url: 'https://secure.example.com/widget',

  // Only allow these consumer domains to embed
  allowedConsumerDomains: [
    'https://myapp.com',
    'https://*.myapp.com',
    /^https:\/\/.*\.trusted\.com$/,
  ],

  // Specify the actual domain if URL redirects
  domain: 'https://secure.example.com',
});
```

### Eligibility Checks

Conditionally allow rendering.

```typescript
const FeatureComponent = ForgeFrame.create({
  tag: 'feature',
  url: '/feature',

  eligible: ({ props }) => {
    if (!props.userId) {
      return { eligible: false, reason: 'User must be logged in' };
    }
    return { eligible: true };
  },
});

// Check before rendering
if (instance.isEligible()) {
  await instance.render('#container');
}
```

### Nested Components

Define nested components that can be rendered from within the host.

```typescript
const ContainerComponent = ForgeFrame.create({
  tag: 'container',
  url: '/container',
  children: () => ({
    CardField: CardFieldComponent,
    CVVField: CVVFieldComponent,
  }),
});

// In the container's host page:
const { children } = window.xprops;
children.CardField({ onValid: () => {} }).render('#card-container');
```

---

## API Reference

### ForgeFrame Object

```typescript
import ForgeFrame from 'forgeframe';

ForgeFrame.create(options)        // Create a component
ForgeFrame.destroy(instance)      // Destroy an instance
ForgeFrame.destroyComponents(tag) // Destroy all instances of a tag
ForgeFrame.destroyAll()           // Destroy all instances
ForgeFrame.isHost()               // Check if in host context
ForgeFrame.getXProps()            // Get xprops in host

ForgeFrame.PROP_TYPE              // Prop type constants
ForgeFrame.CONTEXT                // Context constants (IFRAME, POPUP)
ForgeFrame.EVENT                  // Event name constants
ForgeFrame.VERSION                // Library version
```

### Component Options

```typescript
interface ComponentOptions<P> {
  // Required
  tag: string;                              // Unique identifier
  url: string | ((props: P) => string);     // Host page URL

  // Dimensions
  dimensions?: { width?: number | string; height?: number | string };
  autoResize?: { width?: boolean; height?: boolean; element?: string };

  // Props
  props?: PropsDefinition<P>;

  // Rendering
  defaultContext?: 'iframe' | 'popup';
  containerTemplate?: (ctx: TemplateContext) => HTMLElement;
  prerenderTemplate?: (ctx: TemplateContext) => HTMLElement;

  // Security
  domain?: string;
  allowedConsumerDomains?: Array<string | RegExp>;

  // Validation
  eligible?: (opts: { props: P }) => { eligible: boolean; reason?: string };
  validate?: (opts: { props: P }) => void;

  // Iframe attributes
  attributes?: IframeAttributes;
  style?: CSSProperties;
  timeout?: number;

  // Nested components
  children?: () => Record<string, ForgeFrameComponent>;
}
```

### Instance Methods

```typescript
const instance = MyComponent(props);

await instance.render(container?, context?)  // Render
await instance.renderTo(window, container?)  // Render to another window
await instance.close()                       // Close and destroy
await instance.focus()                       // Focus
await instance.resize({ width, height })     // Resize
await instance.show()                        // Show
await instance.hide()                        // Hide
await instance.updateProps(newProps)         // Update props
instance.clone()                             // Clone with same props
instance.isEligible()                        // Check eligibility

instance.uid                                 // Unique ID
instance.event                               // Event emitter
instance.state                               // Mutable state
instance.exports                             // Host exports
```

---

## TypeScript

ForgeFrame is written in TypeScript and exports all types.

```typescript
import ForgeFrame, {
  type ComponentOptions,
  type ForgeFrameComponent,
  type ForgeFrameComponentInstance,
  type HostProps,
  type PropDefinition,
  type PropsDefinition,
  type TemplateContext,
  type Dimensions,
  type EventHandler,
} from 'forgeframe';
```

### Typing Host xprops

```typescript
import { type HostProps } from 'forgeframe';

interface MyProps {
  name: string;
  onSubmit: (data: FormData) => void;
}

declare global {
  interface Window {
    xprops?: HostProps<MyProps>;
  }
}

// Fully typed
window.xprops!.name;      // string
window.xprops!.onSubmit;  // (data: FormData) => void
window.xprops!.close;     // () => Promise<void>
window.xprops!.resize;    // (dims: Dimensions) => Promise<void>
```

---

## Browser Support

ForgeFrame requires modern browser features (ES2022+).

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 14+ |
| Edge | 80+ |

**Note:** Internet Explorer is not supported. For IE support, use [Zoid](https://github.com/krakenjs/zoid).

---

## License

MIT
