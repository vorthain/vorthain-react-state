import { makeObservable, useObservableSubscription, vAction } from '../makeObservable';

// Mock React hooks to trigger subscription paths
jest.mock('react', () => ({
  useReducer: jest.fn(() => [0, jest.fn()]),
  useEffect: jest.fn((effect) => {
    const cleanup = effect();
    return cleanup;
  })
}));

describe('makeObservable - Final Branch Coverage', () => {
  test('should trigger subscription cleanup paths', () => {
    const obj = {
      items: [] as any[],
      map: new Map(),
      set: new Set(),
      nested: { deep: { value: 'test' } }
    };
    const reactive = makeObservable(obj);
    const subscription = useObservableSubscription(reactive);

    // Access all types to create subscriptions
    subscription.items.length;
    subscription.map.size;
    subscription.set.size;
    subscription.nested.deep.value;

    // Add items to collections to trigger handleNewItemsAdded
    subscription.items.push({ id: 1, data: { nested: 'value' } });
    subscription.items.push({ id: 2, data: { nested: 'value2' } });

    // This should trigger cleanup paths
    expect(subscription.items.length).toBe(2);
  });

  test('should handle complex subscription scenarios', () => {
    const complex = {
      arrays: [[{ nested: { deep: 'array1' } }], [{ nested: { deep: 'array2' } }]],
      objects: {
        level1: {
          level2: {
            items: [{ value: 1 }, { value: 2 }]
          }
        }
      }
    };

    const reactive = makeObservable(complex);
    const subscription = useObservableSubscription(reactive);

    // Deep access to trigger all subscription paths
    subscription.arrays.forEach((arr, i) => {
      arr.forEach((item) => {
        expect(item.nested.deep).toBe(`array${i + 1}`);
      });
    });

    subscription.objects.level1.level2.items.forEach((item) => {
      expect(typeof item.value).toBe('number');
    });

    // Modify arrays to trigger notification paths
    subscription.arrays[0].push({ nested: { deep: 'new' } });
    subscription.objects.level1.level2.items.push({ value: 3 });
  });

  test('should handle batching with subscriptions', () => {
    const state = {
      counter: 0,
      items: [] as any[],
      metadata: { total: 0, updated: false }
    };

    const reactive = makeObservable(state);
    const subscription = useObservableSubscription(reactive);

    // Batched operations that should trigger multiple paths
    vAction(() => {
      subscription.counter++;
      subscription.items.push({ id: subscription.counter });
      subscription.items.push({ id: subscription.counter + 1 });
      subscription.metadata.total = subscription.items.length;
      subscription.metadata.updated = true;
    });

    expect(subscription.counter).toBe(1);
    expect(subscription.items.length).toBe(2);
    expect(subscription.metadata.total).toBe(2);
    expect(subscription.metadata.updated).toBe(true);
  });

  test('should handle subscription errors gracefully', () => {
    const problematic = {
      _shouldThrow: false,
      get dangerous() {
        if (this._shouldThrow) {
          throw new Error('Subscription error');
        }
        return 'safe';
      },
      set dangerous(val: string) {
        if (val === 'throw') {
          this._shouldThrow = true;
        }
      }
    };

    const reactive = makeObservable(problematic);
    const subscription = useObservableSubscription(reactive);

    // Normal access should work
    expect(subscription.dangerous).toBe('safe');

    // Set up error condition
    subscription.dangerous = 'throw';

    // This should trigger error handling paths
    expect(() => subscription.dangerous).toThrow('Subscription error');
  });

  test('should handle large array operations with subscriptions', () => {
    const largeArray = new Array(200).fill(0).map((_, i) => ({ id: i, data: `item${i}` }));
    const reactive = makeObservable(largeArray);
    const subscription = useObservableSubscription(reactive);

    // Access to trigger lightweight array paths
    expect(subscription.length).toBe(200);
    expect(subscription[0].id).toBe(0);
    expect(subscription[199].id).toBe(199);

    // Operations on large array
    subscription.push({ id: 200, data: 'new' });
    subscription.pop();
    subscription.splice(100, 1, { id: 100, data: 'replaced' });
  });

  test('should handle additional subscription scenarios', () => {
    const state = {
      data: [] as any[],
      nested: { values: [1, 2, 3] }
    };

    const reactive = makeObservable(state);
    const subscription = useObservableSubscription(reactive);

    // Access to trigger subscription paths
    expect(subscription.data.length).toBe(0);
    expect(subscription.nested.values.length).toBe(3);

    // Modify to trigger notification paths
    subscription.data.push({ id: 1 });
    subscription.nested.values.push(4);

    expect(subscription.data.length).toBe(1);
    expect(subscription.nested.values.length).toBe(4);
  });

  test('should trigger all notification and cleanup paths', () => {
    const state = {
      data: [] as any[],
      computed: 0,
      get total() {
        return this.data.length + this.computed;
      },
      set total(val: number) {
        this.computed = val - this.data.length;
      }
    };

    const reactive = makeObservable(state);
    const subscription = useObservableSubscription(reactive);

    // Multiple operations to trigger different notification paths
    subscription.data.push({ item: 1 });
    subscription.data.push({ item: 2 });
    subscription.computed = 5;

    // Access computed property to trigger getter paths
    const totalBefore = subscription.total;

    // Modify through setter
    subscription.total = 10;

    const totalAfter = subscription.total;

    expect(totalBefore).toBe(7); // 2 items + 5 computed
    expect(totalAfter).toBe(10);
  });

  test('should handle concurrent subscription operations', () => {
    const shared = {
      values: [] as number[],
      objects: [] as any[]
    };

    const reactive = makeObservable(shared);

    // Multiple subscriptions to same object
    const sub1 = useObservableSubscription(reactive);
    const sub2 = useObservableSubscription(reactive);

    // Operations through different subscriptions
    sub1.values.push(1, 2, 3);
    sub2.objects.push({ id: 1 }, { id: 2 });

    // Verify both subscriptions see changes
    expect(sub1.values.length).toBe(3);
    expect(sub2.values.length).toBe(3);
    expect(sub1.objects.length).toBe(2);
    expect(sub2.objects.length).toBe(2);
  });
});
