import { useMemo } from 'react';
import { makeObservable, useObservableSubscription } from './makeObservable';

/**
 * Hook to create local observable state
 */
export function useVstate<T extends object>(initialState: T | (() => T)): T {
  // Create state only once and make it observable
  const state = useMemo(() => {
    const initial = typeof initialState === 'function' ? (initialState as () => T)() : initialState;
    return makeObservable(initial);
  }, []);

  // Subscribe to changes and return the observable state
  return useObservableSubscription(state);
}
