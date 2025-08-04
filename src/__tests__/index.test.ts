import { useVstate, useVglobal, createVorthainStore, vAction } from '../index';

describe('Package exports', () => {
  it('should export useVstate function', () => {
    expect(typeof useVstate).toBe('function');
  });

  it('should export useVglobal function', () => {
    expect(typeof useVglobal).toBe('function');
  });

  it('should export createVorthainStore function', () => {
    expect(typeof createVorthainStore).toBe('function');
  });

  it('should export vAction function', () => {
    expect(typeof vAction).toBe('function');
  });

  it('should have all main exports available', () => {
    const exports = { useVstate, useVglobal, createVorthainStore, vAction };

    Object.values(exports).forEach((exportedItem) => {
      expect(typeof exportedItem).toBe('function');
    });
  });
});
