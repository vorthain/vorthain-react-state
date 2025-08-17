import { makeObservable, useObservableSubscription } from './makeObservable';
import { getCurrentRenderingTracker, createSmartProxy } from './vGrip';

let globalRootStore: any = null;
let StoreConstructor: any = null;

const vGripGlobalProxyCache = new WeakMap<any, any>();

/**
 * Create global store with type registration
 */
export function createVorthainStore<T extends object>(RootStoreClass: new () => T): T {
  if (!globalRootStore) {
    const rootInstance = new RootStoreClass();
    globalRootStore = makeObservable(rootInstance);
    StoreConstructor = RootStoreClass;
  }
  return globalRootStore;
}

/**
 * Hook to access global store
 * Automatically integrates with vGrip when used inside a vGrip component
 */
export function useVglobal(): InstanceType<typeof StoreConstructor> {
  if (!globalRootStore) {
    throw new Error('Global store not initialized. Call createVorthainStore() first.');
  }

  const currentTracker = getCurrentRenderingTracker();

  if (currentTracker && currentTracker.isRendering) {
    if (vGripGlobalProxyCache.has(currentTracker)) {
      return vGripGlobalProxyCache.get(currentTracker);
    }

    const proxy = createSmartProxy(globalRootStore, currentTracker, 'globalStore');
    vGripGlobalProxyCache.set(currentTracker, proxy);

    currentTracker.globalStore = globalRootStore;

    return proxy;
  }

  return useObservableSubscription(globalRootStore);
}

/**
 * Resets the Vorthain global store singleton.
 * This function is intended for use in testing environments (e.g., Jest)
 * to ensure that each test runs in isolation without state leaking from previous tests.
 * Call this in a `beforeEach` block.
 * @internal
 */
export function _resetVorthainStore() {
  globalRootStore = null;
  StoreConstructor = null;
}
