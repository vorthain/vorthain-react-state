import { makeObservable, vAction } from '../makeObservable';

describe('Basic functionality', () => {
  test('should make objects reactive', () => {
    const obj = makeObservable({ count: 0 });
    expect(obj.count).toBe(0);

    obj.count = 5;
    expect(obj.count).toBe(5);
  });

  test('should handle nested objects', () => {
    const obj = makeObservable({
      user: { name: 'John' }
    });

    expect(obj.user.name).toBe('John');
    obj.user.name = 'Jane';
    expect(obj.user.name).toBe('Jane');
  });

  test('should handle arrays', () => {
    const obj = makeObservable({
      items: [1, 2, 3]
    });

    obj.items.push(4);
    expect(obj.items[3]).toBe(4);
    expect(obj.items.length).toBe(4);
  });

  test('should handle computed properties', () => {
    const obj = makeObservable({
      count: 0,
      get doubled() {
        return this.count * 2;
      }
    });

    expect(obj.doubled).toBe(0);
    obj.count = 5;
    expect(obj.doubled).toBe(10);
  });

  test('vAction should work', () => {
    const obj = makeObservable({ count: 0, name: '' });

    vAction(() => {
      obj.count = 1;
      obj.name = 'test';
    });

    expect(obj.count).toBe(1);
    expect(obj.name).toBe('test');
  });
});
