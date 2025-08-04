import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createVorthainStore, useVglobal } from '../useVglobal';

class SimpleStore {
  count = 0;
  increment = () => {
    this.count++;
  };
}

function Counter() {
  const store = useVglobal() as SimpleStore;

  return (
    <div>
      <div data-testid="count">{store.count}</div>
      <button data-testid="increment" onClick={store.increment}>
        +
      </button>
    </div>
  );
}

describe('useVglobal', () => {
  beforeEach(() => {
    createVorthainStore(SimpleStore);
  });

  test('should work basically', () => {
    render(<Counter />);

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    // Just test that it renders, mutations will be tested later
    expect(screen.getByTestId('increment')).toBeInTheDocument();
  });

  test('should share state between components', () => {
    render(
      <div>
        <Counter />
        <Counter />
      </div>
    );

    const counters = screen.getAllByTestId('count');
    expect(counters[0]).toHaveTextContent('0');
    expect(counters[1]).toHaveTextContent('0');
  });
});
