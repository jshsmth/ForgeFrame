import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateUID,
  generateShortUID,
  isValidUID,
} from '../../src/utils/uid';
import { CleanupManager } from '../../src/utils/cleanup';
import {
  createDeferred,
  promiseTimeout,
  delay,
} from '../../src/utils/promise';

describe('UID Utils', () => {
  it('should generate unique UIDs', () => {
    const uid1 = generateUID();
    const uid2 = generateUID();

    expect(uid1).not.toBe(uid2);
    expect(uid1).toMatch(/^[a-z0-9]+_[a-z0-9]+$/);
  });

  it('should generate short UIDs', () => {
    const uid = generateShortUID();
    expect(uid.length).toBeGreaterThan(0);
    expect(uid.length).toBeLessThan(15);
  });

  it('should validate UIDs correctly', () => {
    expect(isValidUID('abc123_xyz789')).toBe(true);
    expect(isValidUID('invalid')).toBe(false);
    expect(isValidUID('')).toBe(false);
  });
});

describe('CleanupManager', () => {
  it('should execute cleanup tasks in reverse order', async () => {
    const manager = new CleanupManager();
    const order: number[] = [];

    manager.register(() => order.push(1));
    manager.register(() => order.push(2));
    manager.register(() => order.push(3));

    await manager.cleanup();

    expect(order).toEqual([3, 2, 1]);
  });

  it('should handle async cleanup tasks', async () => {
    const manager = new CleanupManager();
    const results: string[] = [];

    manager.register(async () => {
      await delay(10);
      results.push('async');
    });
    manager.register(() => results.push('sync'));

    await manager.cleanup();

    expect(results).toEqual(['sync', 'async']);
  });

  it('should only cleanup once', async () => {
    const manager = new CleanupManager();
    let count = 0;

    manager.register(() => count++);

    await manager.cleanup();
    await manager.cleanup();

    expect(count).toBe(1);
    expect(manager.isCleaned()).toBe(true);
  });

  it('should execute immediate cleanup if already cleaned', async () => {
    const manager = new CleanupManager();
    const executed = vi.fn();

    await manager.cleanup();
    manager.register(executed);

    expect(executed).toHaveBeenCalled();
  });
});

describe('Promise Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('createDeferred should create resolvable promise', async () => {
    const deferred = createDeferred<number>();

    setTimeout(() => deferred.resolve(42), 10);
    vi.advanceTimersByTime(10);

    const result = await deferred.promise;
    expect(result).toBe(42);
  });

  it('createDeferred should create rejectable promise', async () => {
    const deferred = createDeferred<number>();

    setTimeout(() => deferred.reject(new Error('test error')), 10);
    vi.advanceTimersByTime(10);

    await expect(deferred.promise).rejects.toThrow('test error');
  });

  it('promiseTimeout should resolve before timeout', async () => {
    const promise = delay(10).then(() => 'success');
    vi.advanceTimersByTime(10);

    const result = await promiseTimeout(promise, 100);
    expect(result).toBe('success');
  });

  it('promiseTimeout should reject after timeout', async () => {
    const promise = delay(100).then(() => 'success');
    const timeoutPromise = promiseTimeout(promise, 10);

    vi.advanceTimersByTime(10);

    await expect(timeoutPromise).rejects.toThrow('timed out');
  });

  it('delay should wait specified time', async () => {
    const callback = vi.fn();
    delay(50).then(callback);

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    await Promise.resolve(); // flush microtasks

    expect(callback).toHaveBeenCalled();
  });
});
