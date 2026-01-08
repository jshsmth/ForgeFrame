# Vitest API Reference

Quick reference for Vitest documentation. Each URL includes a brief summary of what you'll find there.

---

## Getting Started

- **[Why Vitest](https://vitest.dev/guide/why.html)** - Motivation and benefits of using Vitest
- **[Getting Started](https://vitest.dev/guide/)** - Installation and basic setup
- **[Features](https://vitest.dev/guide/features.html)** - Overview of Vitest capabilities

---

## Browser Mode

- **[Why Browser Mode](https://vitest.dev/guide/browser/why.html)** - Benefits of running tests in real browsers
- **[Browser Mode Guide](https://vitest.dev/guide/browser/)** - Setup and configuration for browser testing
- **[Multiple Setups](https://vitest.dev/guide/browser/multiple-setups.html)** - Running tests across different browser configurations
- **[Component Testing](https://vitest.dev/guide/browser/component-testing.html)** - Testing UI components in browsers
- **[Visual Regression Testing](https://vitest.dev/guide/browser/visual-regression-testing.html)** - Capturing and comparing visual snapshots
- **[Trace View](https://vitest.dev/guide/browser/trace-view.html)** - Debugging with browser traces

---

## Core Concepts

- **[CLI](https://vitest.dev/guide/cli.html)** - Command-line interface options and flags
- **[Filtering](https://vitest.dev/guide/filtering.html)** - Running specific tests by pattern or name
- **[Test Context](https://vitest.dev/guide/test-context.html)** - Sharing data between test hooks and functions
- **[Environment](https://vitest.dev/guide/environment.html)** - Configuring test environments (node, jsdom, etc.)
- **[Snapshot Testing](https://vitest.dev/guide/snapshot.html)** - Capturing and comparing test snapshots

---

## Mocking

- **[Mocking Overview](https://vitest.dev/guide/mocking.html)** - Introduction to mocking in Vitest
- **[Dates](https://vitest.dev/guide/mocking/dates.html)** - Mocking Date objects and time
- **[Functions](https://vitest.dev/guide/mocking/functions.html)** - Creating and using mock functions (spies, stubs)
- **[Globals](https://vitest.dev/guide/mocking/globals.html)** - Mocking global variables and objects
- **[Modules](https://vitest.dev/guide/mocking/modules.html)** - Mocking ES modules and dependencies
- **[File System](https://vitest.dev/guide/mocking/file-system.html)** - Mocking file system operations
- **[Requests](https://vitest.dev/guide/mocking/requests.html)** - Mocking network requests and APIs
- **[Timers](https://vitest.dev/guide/mocking/timers.html)** - Mocking setTimeout, setInterval, etc.
- **[Classes](https://vitest.dev/guide/mocking/classes.html)** - Mocking class constructors and instances

---

## Advanced Features

- **[Parallelism](https://vitest.dev/guide/parallelism.html)** - Running tests in parallel for better performance
- **[Projects](https://vitest.dev/guide/projects.html)** - Managing multiple test configurations in one workspace
- **[Reporters](https://vitest.dev/guide/reporters.html)** - Customizing test output and results
- **[Coverage](https://vitest.dev/guide/coverage.html)** - Measuring code coverage with v8 or istanbul
- **[Testing Types](https://vitest.dev/guide/testing-types.html)** - Type-level testing with TypeScript
- **[Common Errors](https://vitest.dev/guide/common-errors.html)** - Troubleshooting common issues
- **[Extending Matchers](https://vitest.dev/guide/extending-matchers.html)** - Creating custom expect matchers
- **[Test Annotations](https://vitest.dev/guide/test-annotations.html)** - Using .skip, .only, .todo, .fails, etc.

---

## Usage in This Project

See `vitest.config.ts` for our Vitest configuration and test setup.

Key patterns:

- Unit tests: `*.test.ts` files colocated with source code
- Integration tests: `src/lib/tests/` directory
- Server route tests: Test server endpoints with mock API responses
- Property-based tests: Using fast-check for generative testing
