import { useMemo } from 'react';
import { makeObservable, useObservableSubscription } from './makeObservable';
import { getCurrentRenderingTracker, createSmartProxy } from './vGrip';

const vGripProxyCache = new WeakMap<object, WeakMap<any, any>>();

/**
 * Hook to create local observable state
 * Automatically integrates with vGrip when used inside a vGrip component
 */

export function useVstate<T extends object>(initialState: T | (() => T)): T {
  const state = useMemo(() => {
    const initial =
      typeof initialState === 'function' ? (initialState as () => T)() : (initialState as T);
    return makeObservable(initial);
  }, []);

  const currentTracker = getCurrentRenderingTracker();

  if (currentTracker && currentTracker.isRendering) {
    if (!vGripProxyCache.has(state)) {
      vGripProxyCache.set(state, new WeakMap());
    }

    const stateCache = vGripProxyCache.get(state)!;

    if (stateCache.has(currentTracker)) {
      return stateCache.get(currentTracker);
    }

    const proxy = createSmartProxy(state, currentTracker, 'localState');

    stateCache.set(currentTracker, proxy);

    currentTracker.localStates.set(currentTracker.localStates.size, state);

    return proxy;
  }

  return useObservableSubscription(state);
}
