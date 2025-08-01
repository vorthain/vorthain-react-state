import { makeObservable, useObservableSubscription } from './makeObservable';

// Store the instance and constructor reference
let globalRootStore: any = null;
let StoreConstructor: any = null;

/**
 * Create store with type registration
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
 * Hook with automatic type inference
 */
export function useVglobal(): InstanceType<typeof StoreConstructor> {
  if (!globalRootStore) {
    throw new Error('Global store not initialized. Call createVorthainStore() first.');
  }

  return useObservableSubscription(globalRootStore);
}
