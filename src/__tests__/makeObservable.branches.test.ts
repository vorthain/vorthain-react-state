import { makeObservable, vAction } from '../makeObservable';

describe('makeObservable - Branch Coverage', () => {
  test('should handle all array method branches', () => {
    const arr = [1, 2, 3];
    const reactive = makeObservable(arr);

    // Test all array methods to hit branches
    reactive.shift();
    expect(reactive.length).toBe(2);

    reactive.unshift(0);
    expect(reactive[0]).toBe(0);

    reactive.splice(1, 1, 1.5);
    expect(reactive[1]).toBe(1.5);

    reactive.sort();
    reactive.reverse();
    reactive.fill(9);
    reactive.copyWithin(0, 1);
  });

  test('should handle Map/Set method branches', () => {
    const map = new Map();
    const reactive = makeObservable(map);

    reactive.set('test', { value: 1 });
    reactive.delete('test');
    reactive.clear();

    const set = new Set();
    const reactiveSet = makeObservable(set);

    reactiveSet.add({ value: 1 });
    reactiveSet.delete({ value: 1 });
    reactiveSet.clear();
  });

  test('should handle property descriptor branches', () => {
    const obj: any = {};

    // Test writable property
    Object.defineProperty(obj, 'writable', {
      value: 1,
      writable: true,
      enumerable: true,
      configurable: true
    });

    // Test non-writable property
    Object.defineProperty(obj, 'readonly', {
      value: 2,
      writable: false,
      enumerable: true,
      configurable: true
    });

    const reactive = makeObservable(obj);
    reactive.writable = 5;
    expect(reactive.writable).toBe(5);
  });

  test('should handle error branches in vAction', () => {
    let errorThrown = false;

    try {
      vAction(() => {
        throw new Error('test error');
      });
    } catch (e) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);
  });

  test('should handle different object types in makeObservable', () => {
    // Test HTMLElement branch
    const mockElement = document.createElement('div');
    expect(makeObservable(mockElement)).toBe(mockElement);

    // Test various special objects
    expect(makeObservable(new Date())).toBeInstanceOf(Date);
    expect(makeObservable(/test/)).toBeInstanceOf(RegExp);
    expect(makeObservable(new ArrayBuffer(8))).toBeInstanceOf(ArrayBuffer);
  });

  test('should handle assignment branches', () => {
    const obj = { value: null as any };
    const reactive = makeObservable(obj);

    // Test null assignment
    reactive.value = null;
    expect(reactive.value).toBe(null);

    // Test undefined assignment
    reactive.value = undefined;
    expect(reactive.value).toBe(undefined);

    // Test object assignment
    reactive.value = { nested: 'test' };
    expect(reactive.value.nested).toBe('test');
  });

  test('should handle nested vAction calls', () => {
    const obj = { count: 0 };
    const reactive = makeObservable(obj);

    const result = vAction(() => {
      reactive.count = 1;
      return vAction(() => {
        reactive.count = 2;
        return vAction(() => {
          reactive.count = 3;
          return reactive.count;
        });
      });
    });

    expect(result).toBe(3);
    expect(reactive.count).toBe(3);
  });
});
