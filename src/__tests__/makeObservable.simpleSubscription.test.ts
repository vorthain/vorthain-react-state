import { makeObservable, useObservableSubscription } from '../makeObservable';

// Mock React hooks
jest.mock('react', () => ({
  useReducer: jest.fn(() => [0, jest.fn()]),
  useEffect: jest.fn((effect) => {
    const cleanup = effect();
    return cleanup;
  })
}));

describe('makeObservable - Simple Subscription Tests', () => {
  test('useObservableSubscription should work with basic objects', () => {
    const obj = { count: 0, nested: { value: 'test' } };
    const reactive = makeObservable(obj);
    const subscription = useObservableSubscription(reactive);

    expect(subscription.count).toBe(0);
    expect(subscription.nested.value).toBe('test');

    subscription.count = 5;
    expect(subscription.count).toBe(5);
  });

  test('useObservableSubscription should work with arrays', () => {
    const arr = [1, 2, 3];
    const reactive = makeObservable(arr);
    const subscription = useObservableSubscription(reactive);

    expect(subscription.length).toBe(3);
    expect(subscription[0]).toBe(1);

    subscription.push(4);
    expect(subscription.length).toBe(4);
  });

  test('useObservableSubscription should work with complex nested structures', () => {
    const complex = {
      data: { items: [{ id: 1 }, { id: 2 }] },
      metadata: { count: 2 }
    };
    const reactive = makeObservable(complex);
    const subscription = useObservableSubscription(reactive);

    expect(subscription.data.items.length).toBe(2);
    expect(subscription.data.items[0].id).toBe(1);
    expect(subscription.metadata.count).toBe(2);

    subscription.data.items.push({ id: 3 });
    expect(subscription.data.items.length).toBe(3);
  });
});
