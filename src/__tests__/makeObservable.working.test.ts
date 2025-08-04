import { makeObservable, vAction } from '../makeObservable';

describe('makeObservable - Working Coverage Tests', () => {
  describe('Core functionality', () => {
    test('handles primitives correctly', () => {
      expect(makeObservable(null as any)).toBe(null);
      expect(makeObservable(undefined as any)).toBe(undefined);
      expect(makeObservable(42 as any)).toBe(42);
      expect(makeObservable('string' as any)).toBe('string');
      expect(makeObservable(true as any)).toBe(true);
    });

    test('makes objects reactive', () => {
      const obj = { value: 42 };
      const reactive = makeObservable(obj);
      expect((reactive as any).__vorthainReactive).toBe(true);
      expect(reactive.value).toBe(42);
    });

    test('handles nested objects', () => {
      const obj = { nested: { deep: { value: 'test' } } };
      const reactive = makeObservable(obj);
      expect((reactive.nested as any).__vorthainReactive).toBe(true);
      expect((reactive.nested.deep as any).__vorthainReactive).toBe(true);
      expect(reactive.nested.deep.value).toBe('test');
    });

    test('does not double-wrap reactive objects', () => {
      const obj = { value: 1 };
      const reactive1 = makeObservable(obj);
      const reactive2 = makeObservable(reactive1);
      expect(reactive1).toBe(reactive2);
    });
  });

  describe('Special object types', () => {
    test('does not make Date reactive', () => {
      const date = new Date();
      const result = makeObservable(date);
      expect(result).toBe(date);
      expect((result as any).__vorthainReactive).toBeUndefined();
    });

    test('does not make RegExp reactive', () => {
      const regex = /test/g;
      const result = makeObservable(regex);
      expect(result).toBe(regex);
      expect((result as any).__vorthainReactive).toBeUndefined();
    });

    test('does not make File reactive', () => {
      const file = new File(['content'], 'test.txt');
      const result = makeObservable(file);
      expect(result).toBe(file);
      expect((result as any).__vorthainReactive).toBeUndefined();
    });

    test('does not make ArrayBuffer reactive', () => {
      const buffer = new ArrayBuffer(8);
      const result = makeObservable(buffer);
      expect(result).toBe(buffer);
      expect((result as any).__vorthainReactive).toBeUndefined();
    });

    test('does not make TypedArray reactive', () => {
      const uint8 = new Uint8Array([1, 2, 3]);
      const result = makeObservable(uint8);
      expect(result).toBe(uint8);
      expect((result as any).__vorthainReactive).toBeUndefined();
    });
  });

  describe('Arrays', () => {
    test('makes arrays reactive', () => {
      const arr = [1, 2, 3];
      const reactive = makeObservable(arr);
      expect((reactive as any).__vorthainReactive).toBe(true);
      expect(reactive.length).toBe(3);
    });

    test('makes array items reactive if they are objects', () => {
      const arr = [{ a: 1 }, { b: 2 }];
      const reactive = makeObservable(arr);
      expect((reactive[0] as any).__vorthainReactive).toBe(true);
      expect((reactive[1] as any).__vorthainReactive).toBe(true);
    });

    test('handles large arrays with lightweight reactivity', () => {
      const largeArray = new Array(150).fill(0).map((_, i) => i);
      const reactive = makeObservable(largeArray);
      expect((reactive as any).__vorthainReactive).toBe(true);
      expect(reactive.length).toBe(150);
    });

    test('handles array method calls', () => {
      const arr = [1, 2, 3];
      const reactive = makeObservable(arr);

      reactive.push(4);
      expect(reactive.length).toBe(4);
      expect(reactive[3]).toBe(4);

      const popped = reactive.pop();
      expect(popped).toBe(4);
      expect(reactive.length).toBe(3);
    });

    test('handles array length assignment', () => {
      const arr = [1, 2, 3, 4, 5];
      const reactive = makeObservable(arr);

      reactive.length = 3;
      expect(reactive.length).toBe(3);

      reactive.length = 0;
      expect(reactive.length).toBe(0);
    });

    test('handles splice operations', () => {
      const arr = [1, 2, 3, 4, 5];
      const reactive = makeObservable(arr);

      const removed = reactive.splice(1, 2, 99, 100);
      expect(removed).toEqual([2, 3]);
      expect(reactive[1]).toBe(99);
      expect(reactive[2]).toBe(100);
    });

    test('handles unshift with objects', () => {
      const arr: any[] = [1, 2, 3]; // <- Add : any[] here
      const reactive = makeObservable(arr);

      const obj = { id: 'new' };
      reactive.unshift(obj);
      expect((reactive[0] as any).__vorthainReactive).toBe(true);
    });

    test('handles fill method', () => {
      const arr = [1, 2, 3];
      const reactive = makeObservable(arr);

      reactive.fill(0);
      expect(reactive[0]).toBe(0);
      expect(reactive[1]).toBe(0);
      expect(reactive[2]).toBe(0);
    });

    test('handles sort and reverse', () => {
      const arr = [3, 1, 2];
      const reactive = makeObservable(arr);

      reactive.sort();
      expect(reactive[0]).toBe(1);
      expect(reactive[1]).toBe(2);
      expect(reactive[2]).toBe(3);

      reactive.reverse();
      expect(reactive[0]).toBe(3);
      expect(reactive[1]).toBe(2);
      expect(reactive[2]).toBe(1);
    });
  });

  describe('Maps', () => {
    test('makes Map reactive', () => {
      const map = new Map([['key', 'value']]);
      const reactive = makeObservable(map);
      expect((reactive as any).__vorthainReactive).toBe(true);
    });

    test('handles Map operations', () => {
      const map = new Map();
      const reactive = makeObservable(map);

      reactive.set('key', 'value');
      expect(reactive.get('key')).toBe('value');
      expect(reactive.size).toBe(1);

      reactive.delete('key');
      expect(reactive.has('key')).toBe(false);
      expect(reactive.size).toBe(0);

      reactive.set('a', 1);
      reactive.set('b', 2);
      reactive.clear();
      expect(reactive.size).toBe(0);
    });

    test('makes Map values reactive if they are objects', () => {
      const map = new Map();
      const reactive = makeObservable(map);

      const objValue = { nested: 'data' };
      reactive.set('obj', objValue);

      const retrievedValue = reactive.get('obj');
      expect((retrievedValue as any).__vorthainReactive).toBe(true);
    });
  });

  describe('Sets', () => {
    test('makes Set reactive', () => {
      const set = new Set([1, 2, 3]);
      const reactive = makeObservable(set);
      expect((reactive as any).__vorthainReactive).toBe(true);
    });

    test('handles Set operations', () => {
      const set = new Set();
      const reactive = makeObservable(set);

      reactive.add('value');
      expect(reactive.has('value')).toBe(true);
      expect(reactive.size).toBe(1);

      reactive.delete('value');
      expect(reactive.has('value')).toBe(false);
      expect(reactive.size).toBe(0);

      reactive.add(1);
      reactive.add(2);
      reactive.clear();
      expect(reactive.size).toBe(0);
    });

    test('makes Set values reactive if they are objects', () => {
      const set = new Set();
      const reactive = makeObservable(set);

      const objValue = { nested: 'data' };
      reactive.add(objValue);

      const values = Array.from(reactive.values());
      expect((values[0] as any).__vorthainReactive).toBe(true);
    });
  });

  describe('Getters and setters', () => {
    test('handles computed properties', () => {
      const obj = {
        a: 1,
        b: 2,
        get sum() {
          return this.a + this.b;
        }
      };

      const reactive = makeObservable(obj);
      expect(reactive.sum).toBe(3);

      reactive.a = 5;
      expect(reactive.sum).toBe(7);
    });

    test('handles setters', () => {
      let _value = 0;
      const obj = {
        get value() {
          return _value;
        },
        set value(newValue: number) {
          _value = newValue;
        }
      };

      const reactive = makeObservable(obj);
      expect(reactive.value).toBe(0);

      reactive.value = 42;
      expect(reactive.value).toBe(42);
      expect(_value).toBe(42);
    });

    test('handles read-only properties', () => {
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
  });

  describe('vAction', () => {
    test('executes function and returns result', () => {
      const result = vAction(() => 42);
      expect(result).toBe(42);
    });

    test('handles nested vActions', () => {
      const result = vAction(() => {
        return vAction(() => 'nested');
      });
      expect(result).toBe('nested');
    });

    test('propagates errors', () => {
      expect(() => {
        vAction(() => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    test('handles void return', () => {
      let executed = false;
      const result = vAction(() => {
        executed = true;
      });
      expect(executed).toBe(true);
      expect(result).toBeUndefined();
    });
  });

  describe('Property changes', () => {
    test('handles property assignments', () => {
      const obj = { count: 0 };
      const reactive = makeObservable(obj);

      reactive.count = 5;
      expect(reactive.count).toBe(5);
    });

    test('handles same value assignments', () => {
      const obj = { value: 42 };
      const reactive = makeObservable(obj);

      reactive.value = 42; // Same value
      expect(reactive.value).toBe(42);
    });

    test('makes new object values reactive', () => {
      const obj: any = { ref: null };
      const reactive = makeObservable(obj);

      reactive.ref = { nested: 'value' };
      expect((reactive.ref as any).__vorthainReactive).toBe(true);
    });

    test('handles null and undefined assignments', () => {
      const obj: any = { value: 'initial' };
      const reactive = makeObservable(obj);

      reactive.value = null;
      expect(reactive.value).toBe(null);

      reactive.value = undefined;
      expect(reactive.value).toBe(undefined);
    });
  });

  describe('Edge cases', () => {
    test('handles objects with symbol properties', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'symbol value', regular: 'regular value' };

      const reactive = makeObservable(obj);
      expect(reactive[sym]).toBe('symbol value');
      expect(reactive.regular).toBe('regular value');
    });

    test('handles non-configurable properties', () => {
      const obj = {};
      Object.defineProperty(obj, 'nonConfigurable', {
        value: 42,
        writable: false,
        enumerable: true,
        configurable: false
      });

      expect(() => makeObservable(obj)).not.toThrow();
    });

    test('handles circular references', () => {
      const obj1: any = { name: 'obj1' };
      const obj2: any = { name: 'obj2' };

      obj1.ref = obj2;
      obj2.ref = obj1;

      expect(() => makeObservable(obj1)).not.toThrow();
      const reactive = makeObservable(obj1);
      expect(reactive.ref.ref).toBe(reactive);
    });

    test('handles empty objects and arrays', () => {
      const emptyObj = {};
      const reactiveObj = makeObservable(emptyObj);
      expect((reactiveObj as any).__vorthainReactive).toBe(true);

      const emptyArr: any[] = [];
      const reactiveArr = makeObservable(emptyArr);
      expect((reactiveArr as any).__vorthainReactive).toBe(true);
      expect(reactiveArr.length).toBe(0);
    });

    test('handles property deletion', () => {
      const obj: any = { a: 1, b: 2 };
      const reactive = makeObservable(obj);

      delete reactive.b;
      expect(reactive.b).toBeUndefined();
      expect('b' in reactive).toBe(false);
    });

    test('handles adding new properties', () => {
      const obj: any = { existing: 'value' };
      const reactive = makeObservable(obj);

      reactive.newProp = 'new value';
      expect(reactive.newProp).toBe('new value');
    });
  });
});
