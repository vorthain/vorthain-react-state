import { makeObservable, vAction } from '../makeObservable';

describe('makeObservable - Additional Edge Cases', () => {
  describe('Property descriptor edge cases', () => {
    it('should handle properties with only getter', () => {
      const obj = {
        _value: 42,
        get readOnly() {
          return this._value;
        }
      };

      const reactive = makeObservable(obj);
      expect(reactive.readOnly).toBe(42);

      reactive._value = 100;
      expect(reactive.readOnly).toBe(100);
    });

    it('should handle properties with only setter', () => {
      let _value = 0;
      const obj = {
        set writeOnly(val: number) {
          _value = val;
        }
      };

      const reactive = makeObservable(obj);
      reactive.writeOnly = 42;
      expect(_value).toBe(42);
    });

    it('should handle properties with custom descriptors', () => {
      const obj: any = {};
      Object.defineProperty(obj, 'customProp', {
        get() {
          return 'custom';
        },
        set(val) {
          /* do nothing */
        },
        enumerable: false,
        configurable: true
      });

      const reactive = makeObservable(obj);
      expect(reactive.customProp).toBe('custom');
    });
  });

  describe('Array edge cases', () => {
    it('should handle array methods with no arguments', () => {
      const arr = [1, 2, 3];
      const reactive = makeObservable(arr);

      const sorted = reactive.sort();
      expect(sorted).toBe(reactive);

      const reversed = reactive.reverse();
      expect(reversed).toBe(reactive);
    });

    it('should handle fill method', () => {
      const arr = [1, 2, 3, 4, 5];
      const reactive = makeObservable(arr);

      reactive.fill(0, 1, 3);
      expect(Array.from(reactive)).toEqual([1, 0, 0, 4, 5]);
    });

    it('should handle copyWithin method', () => {
      const arr = [1, 2, 3, 4, 5];
      const reactive = makeObservable(arr);

      reactive.copyWithin(0, 3);
      expect(reactive[0]).toBe(4);
      expect(reactive[1]).toBe(5);
    });

    it('should handle array with undefined elements', () => {
      const arr = [1, undefined, 3];
      const reactive = makeObservable(arr);

      expect(reactive[1]).toBeUndefined();
      reactive[1] = 2;
      expect(reactive[1]).toBe(2);
    });
  });

  describe('Map/Set edge cases', () => {
    it('should handle Map.clear()', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2]
      ]);
      const reactive = makeObservable(map);

      expect(reactive.size).toBe(2);
      reactive.clear();
      expect(reactive.size).toBe(0);
    });

    it('should handle Set.clear()', () => {
      const set = new Set([1, 2, 3]);
      const reactive = makeObservable(set);

      expect(reactive.size).toBe(3);
      reactive.clear();
      expect(reactive.size).toBe(0);
    });

    it('should handle Map with object keys', () => {
      const key1 = { id: 1 };
      const key2 = { id: 2 };
      const map = new Map([
        [key1, 'value1'],
        [key2, 'value2']
      ]);
      const reactive = makeObservable(map);

      expect(reactive.get(key1)).toBe('value1');
      expect(reactive.get(key2)).toBe('value2');
    });

    it('should handle Set with object values', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const set = new Set([obj1, obj2]);
      const reactive = makeObservable(set);

      expect(reactive.has(obj1)).toBe(true);
      expect(reactive.has(obj2)).toBe(true);
    });
  });

  describe('vAction edge cases', () => {
    it('should handle vAction with no return value', () => {
      let executed = false;
      vAction(() => {
        executed = true;
      });

      expect(executed).toBe(true);
    });

    it('should handle vAction returning null', () => {
      const result = vAction(() => null);
      expect(result).toBe(null);
    });

    it('should handle vAction returning undefined', () => {
      const result = vAction(() => undefined);
      expect(result).toBe(undefined);
    });

    it('should handle vAction with async operations (sync part)', () => {
      let counter = 0;
      const result = vAction(() => {
        counter++;
        // Simulate sync part of async operation
        return Promise.resolve(counter);
      });

      expect(result).toBeInstanceOf(Promise);
      expect(counter).toBe(1);
    });
  });

  describe('Object property assignment edge cases', () => {
    it('should handle assigning same value', () => {
      const obj = { value: 42 };
      const reactive = makeObservable(obj);

      // Assigning same value should not trigger notifications
      reactive.value = 42;
      expect(reactive.value).toBe(42);
    });

    it('should handle deep nested assignment', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };

      const reactive = makeObservable(obj);
      reactive.level1.level2.level3.value = 'updated';
      expect(reactive.level1.level2.level3.value).toBe('updated');
    });

    it('should handle property deletion', () => {
      const obj: any = { a: 1, b: 2 };
      const reactive = makeObservable(obj);

      delete reactive.b;
      expect(reactive.b).toBeUndefined();
      expect('b' in reactive).toBe(false);
    });

    it('should handle adding new properties', () => {
      const obj: any = { existing: 'value' };
      const reactive = makeObservable(obj);

      reactive.newProp = 'new value';
      expect(reactive.newProp).toBe('new value');
    });
  });

  describe('Type coercion and primitive handling', () => {
    it('should handle number to string coercion', () => {
      const obj = { value: 42 };
      const reactive = makeObservable(obj);

      reactive.value = '42' as any;
      expect(reactive.value).toBe('42');
      expect(typeof reactive.value).toBe('string');
    });

    it('should handle boolean values', () => {
      const obj = { flag: true };
      const reactive = makeObservable(obj);

      reactive.flag = false;
      expect(reactive.flag).toBe(false);
    });

    it('should handle NaN values', () => {
      const obj = { value: 0 };
      const reactive = makeObservable(obj);

      reactive.value = NaN;
      expect(Number.isNaN(reactive.value)).toBe(true);
    });

    it('should handle Infinity values', () => {
      const obj = { value: 0 };
      const reactive = makeObservable(obj);

      reactive.value = Infinity;
      expect(reactive.value).toBe(Infinity);
    });
  });

  describe('WeakMap and WeakSet behavior', () => {
    it('should handle objects going out of scope', () => {
      let obj: any = { value: 42 };
      const reactive = makeObservable(obj);

      expect((reactive as any).__vorthainReactive).toBe(true);

      // Simulate object going out of scope
      obj = null;

      // The reactive object should still work
      expect(reactive.value).toBe(42);
    });
  });

  describe('Constructor and prototype handling', () => {
    it('should handle objects with custom constructors', () => {
      class CustomClass {
        value: number;
        constructor(value: number) {
          this.value = value;
        }

        getValue() {
          return this.value;
        }
      }

      const instance = new CustomClass(42);
      const reactive = makeObservable(instance);

      expect(reactive.getValue()).toBe(42);
      reactive.value = 100;
      expect(reactive.getValue()).toBe(100);
    });

    it('should handle inherited properties', () => {
      class Base {
        baseValue = 'base';
      }

      class Derived extends Base {
        derivedValue = 'derived';
      }

      const instance = new Derived();
      const reactive = makeObservable(instance);

      expect(reactive.baseValue).toBe('base');
      expect(reactive.derivedValue).toBe('derived');

      reactive.baseValue = 'updated base';
      expect(reactive.baseValue).toBe('updated base');
    });
  });

  describe('Error boundary cases', () => {
    it('should handle objects with getters that throw', () => {
      const obj = {
        get throwingGetter() {
          throw new Error('Getter error');
        }
      };

      const reactive = makeObservable(obj);
      expect(() => reactive.throwingGetter).toThrow('Getter error');
    });

    it('should handle objects with setters that throw', () => {
      const obj = {
        _value: 0,
        get value() {
          return this._value;
        },
        set value(val: number) {
          throw new Error('Setter error');
        }
      };

      const reactive = makeObservable(obj);
      expect(() => {
        reactive.value = 42;
      }).toThrow('Setter error');
    });
  });
});
