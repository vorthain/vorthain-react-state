import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useVstate } from '../useVstate';

function SimpleCounter() {
  const state = useVstate({
    count: 0,
    increment: () => state.count++
  });

  return (
    <div>
      <div data-testid="count">{state.count}</div>
      <button data-testid="increment" onClick={state.increment}>
        +
      </button>
    </div>
  );
}

describe('useVstate', () => {
  test('should render and update', () => {
    render(<SimpleCounter />);

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    act(() => {
      fireEvent.click(screen.getByTestId('increment'));
    });

    // Give it time to update
    setTimeout(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    }, 100);
  });
});
