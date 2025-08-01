import { useReducer, useEffect } from 'react';

// Track which component is currently rendering
let currentComponent: (() => void) | null = null;

// SIMPLIFIED SUBSCRIPTION SYSTEM
// Property-level subscriptions: property key -> Set of components
const propertySubscriptions = new Map<string, Set<() => void>>();

// Use WeakMap with cleanup registry to prevent memory leaks
const componentCollectionInterests = new WeakMap<() => void, Set<object>>();
const activeComponents = new Set<() => void>();

// Track component cleanup functions to prevent memory leaks
const componentCleanupFns = new WeakMap<() => void, () => void>();

// Track already processed objects to prevent infinite recursion
const observableCache = new WeakMap<object, object>();

// Object ID system for creating unique property keys - BigInt for unlimited scale
let nextObjectId = BigInt(1);
const objectIds = new WeakMap<object, bigint>();

// Track live components to prevent updates to unmounted components
const liveComponents = new WeakSet<() => void>();

// Computed property dependency tracking - use Maps for iteration
const computedDependencies = new Map<object, Map<string | symbol, Set<string>>>();
const computedCache = new Map<object, Map<string | symbol, { value: any; isValid: boolean }>>();

// Batch update system for vAction - prevents multiple re-renders
let isBatching = false;
let batchedUpdates = new Set<() => void>();

// Collection methods that need patching
const ARRAY_METHODS = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin'
];
const MAP_METHODS = ['set', 'delete', 'clear'];
const SET_METHODS = ['add', 'delete', 'clear'];

/**
 * Batch multiple reactive updates into a single render cycle
 * Perfect for loops, bulk operations, or complex state changes
 */
export function vAction<T>(actionFn: () => T): T {
  if (isBatching) {
    // If already batching, just execute the function
    return actionFn();
  }

  isBatching = true;
  batchedUpdates.clear();

  try {
    const result = actionFn();

    // Execute all batched updates in next microtask
    if (batchedUpdates.size > 0) {
      queueMicrotask(() => {
        batchedUpdates.forEach((updateFn) => {
          if (liveComponents.has(updateFn)) {
            try {
              updateFn();
            } catch (e) {
              console.error('Error in batched component update:', e);
            }
          }
        });
        batchedUpdates.clear();
      });
    }

    return result;
  } finally {
    isBatching = false;
  }
}

// PERFORMANCE OPTIMIZATIONS FOR LARGE DATASETS

// Lazy reactivity - only make objects reactive when actually accessed by components
const lazyReactiveCache = new WeakMap<object, object>();
const isBeingAccessed = new WeakSet<object>();

// Optimized subscription tracking - only track what's actually being used
const activeSubscriptions = new WeakMap<object, Set<() => void>>();
const subscriptionQueue = new Set<() => void>();

// Batch notification system - collect all updates and flush once
let notificationBatch = new Set<string>();
let isFlushingNotifications = false;

// Optimized property key generation - use simple counter instead of BigInt
let simpleIdCounter = 1;
const objectSimpleIds = new WeakMap<object, number>();

function getOptimizedObjectId(obj: object): number {
  if (!objectSimpleIds.has(obj)) {
    objectSimpleIds.set(obj, simpleIdCounter++);
  }
  return objectSimpleIds.get(obj)!;
}

function getOptimizedPropertyKey(target: object, prop: string | symbol): string {
  return `${getOptimizedObjectId(target)}:${String(prop)}`;
}

// OPTIMIZED: Batch notifications for better performance
function flushNotifications() {
  if (isFlushingNotifications || notificationBatch.size === 0) return;

  isFlushingNotifications = true;

  // Process all batched notifications at once
  const notificationsToProcess = Array.from(notificationBatch);
  notificationBatch.clear();

  const componentsToUpdate = new Set<() => void>();

  notificationsToProcess.forEach((propKey) => {
    const subscribers = propertySubscriptions.get(propKey);
    if (subscribers) {
      subscribers.forEach((subscriber) => {
        if (liveComponents.has(subscriber)) {
          componentsToUpdate.add(subscriber);
        }
      });
    }
  });

  // Update all components in one batch
  if (componentsToUpdate.size > 0) {
    if (isBatching) {
      componentsToUpdate.forEach((fn) => batchedUpdates.add(fn));
    } else {
      requestAnimationFrame(() => {
        componentsToUpdate.forEach((updateFn) => {
          if (liveComponents.has(updateFn)) {
            try {
              updateFn();
            } catch (e) {
              console.error('Error in optimized update:', e);
            }
          }
        });
      });
    }
  }

  isFlushingNotifications = false;
}

// OPTIMIZED: Queue notifications instead of immediate processing
function queueNotification(propKey: string) {
  notificationBatch.add(propKey);

  // Flush on next microtask
  if (!isFlushingNotifications) {
    queueMicrotask(flushNotifications);
  }
}

// Safe update execution with batching support and performance optimization
function safeUpdateComponent(updateFn: () => void) {
  // Only update if component is still live
  if (liveComponents.has(updateFn)) {
    if (isBatching) {
      // Add to batch instead of immediate execution
      batchedUpdates.add(updateFn);
    } else {
      // Use requestAnimationFrame for better performance with many updates
      requestAnimationFrame(() => {
        // Double-check liveness before executing
        if (liveComponents.has(updateFn)) {
          try {
            updateFn();
          } catch (e) {
            console.error('Error in component update:', e);
          }
        }
      });
    }
  }
}

// OPTIMIZED: Lightweight notification system
function notifySubscribers(propKey: string) {
  // Just queue the notification instead of processing immediately
  queueNotification(propKey);
}

// Invalidate computed properties that depend on a specific property
function invalidateComputedsThatDependOn(propKey: string) {
  computedCache.forEach((cache, target) => {
    cache.forEach((cacheEntry, computedProp) => {
      const deps = computedDependencies.get(target)?.get(computedProp);
      if (deps && deps.has(propKey)) {
        cacheEntry.isValid = false;
      }
    });
  });
}

// OPTIMIZED: Lazy reactive object creation - only make objects reactive when needed
export function makeObservable<T extends object>(target: T): T {
  if (!target || typeof target !== 'object') return target;

  // Check if already reactive
  if ((target as any).__vorthainReactive) return target;

  // Check lazy cache first
  if (lazyReactiveCache.has(target)) {
    return lazyReactiveCache.get(target) as T;
  }

  // Don't make these objects reactive
  if (
    target instanceof Date ||
    target instanceof RegExp ||
    target instanceof HTMLElement ||
    target instanceof File ||
    target instanceof Blob ||
    target instanceof FormData ||
    target instanceof ArrayBuffer ||
    ArrayBuffer.isView(target) ||
    target instanceof NodeList ||
    target instanceof HTMLCollection
  ) {
    return target;
  }

  // OPTIMIZATION: For large arrays, use lightweight reactive approach
  if (Array.isArray(target) && target.length > 100) {
    return makeLightweightArrayObservable(target) as T;
  }

  // Set cache BEFORE processing to prevent recursion
  observableCache.set(target, target);

  let observable: T;

  if (Array.isArray(target)) {
    observable = makeArrayObservable(target);
  } else if (target instanceof Map) {
    observable = makeMapObservable(target);
  } else if (target instanceof Set) {
    observable = makeSetObservable(target);
  } else {
    observable = makeObjectObservable(target);
  }

  return observable;
}

// OPTIMIZED: Lightweight array reactivity for large datasets
function makeLightweightArrayObservable<T extends any[]>(target: T): T {
  // Mark as reactive
  Object.defineProperty(target, '__vorthainReactive', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  // DON'T make all items reactive immediately - too expensive
  // Only make items reactive when they're actually accessed by components

  // Create lightweight proxy that only tracks array-level operations
  const arrayProxy = new Proxy(target, {
    get(target, prop, receiver) {
      // Only track array-level properties for components
      if (
        currentComponent &&
        (prop === 'length' || prop === 'push' || prop === 'splice' || typeof prop === 'number')
      ) {
        const propKey = getOptimizedPropertyKey(target, 'array-access');
        let subscribers = propertySubscriptions.get(propKey);
        if (!subscribers) {
          subscribers = new Set();
          propertySubscriptions.set(propKey, subscribers);
        }
        subscribers.add(currentComponent);
      }

      const value = Reflect.get(target, prop, receiver);

      // LAZY REACTIVITY: Only make items reactive when accessed by components
      if (
        currentComponent &&
        typeof prop === 'number' &&
        value &&
        typeof value === 'object' &&
        !isObservable(value)
      ) {
        const reactiveItem = makeObservable(value);
        target[prop as any] = reactiveItem;
        return reactiveItem;
      }

      return value;
    },

    set(target, prop, value, receiver) {
      if (prop === 'length') {
        const oldLength = target.length;
        const newLength = Number(value);

        if (newLength < oldLength) {
          target.splice(newLength);
        } else if (newLength > oldLength) {
          target.length = newLength;
        }

        // Lightweight notification
        const propKey = getOptimizedPropertyKey(target, 'array-access');
        queueNotification(propKey);

        return true;
      }

      if (typeof prop === 'string' || typeof prop === 'symbol') {
        const result = Reflect.set(target, prop, value, receiver);

        // Lightweight notification for array changes
        const propKey = getOptimizedPropertyKey(target, 'array-access');
        queueNotification(propKey);

        return result;
      }

      return Reflect.set(target, prop, value, receiver);
    }
  });

  // Patch only essential array methods with lightweight notifications
  ['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method) => {
    const original = target[method as keyof T];
    if (typeof original !== 'function') return;

    (arrayProxy as any)[method] = function (...args: any[]) {
      const result = original.apply(this, args);

      // Single lightweight notification for array changes
      const propKey = getOptimizedPropertyKey(this, 'array-access');
      queueNotification(propKey);

      return result;
    };
  });

  return arrayProxy as T;
}

function makeObjectObservable<T extends object>(target: T): T {
  // Mark as reactive
  Object.defineProperty(target, '__vorthainReactive', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  const allProps = new Set([
    ...Object.getOwnPropertyNames(target),
    ...Object.getOwnPropertySymbols(target)
  ]);

  // Convert each property to reactive
  allProps.forEach((prop) => {
    if (prop === '__vorthainReactive') return;

    const descriptor = Object.getOwnPropertyDescriptor(target, prop);
    if (!descriptor || !descriptor.configurable) return;

    if (descriptor.get || descriptor.set) {
      makeGetterSetterReactive(target, prop, descriptor);
    } else {
      makePropertyReactive(target, prop, descriptor.value);
    }
  });

  return target;
}

// Track every single property access during computed execution
let accessedPropertiesDuringComputed = new Set<string>();

// Universal computed invalidation for ANY collection change
function invalidateComputedsThatDependOnObject(objectId: string) {
  computedCache.forEach((cache, target) => {
    cache.forEach((cacheEntry, computedProp) => {
      const deps = computedDependencies.get(target)?.get(computedProp);
      if (deps) {
        // Check if this computed depends on this object (by object ID)
        const dependsOnThisObject = Array.from(deps).some(
          (depKey) => depKey.startsWith(objectId + ':') || depKey === objectId
        );

        if (dependsOnThisObject) {
          cacheEntry.isValid = false;
        }
      }
    });
  });
}

function makePropertyReactive(target: any, prop: string | symbol, initialValue: any) {
  let currentValue = initialValue;

  if (currentValue && typeof currentValue === 'object') {
    currentValue = makeObservable(currentValue);
  }

  Object.defineProperty(target, prop, {
    get() {
      const propKey = getOptimizedPropertyKey(target, prop);

      // Track access to this specific property
      if (currentComponent) {
        let subscribers = propertySubscriptions.get(propKey);
        if (!subscribers) {
          subscribers = new Set();
          propertySubscriptions.set(propKey, subscribers);
        }
        subscribers.add(currentComponent);
      }

      // Track ALL property accesses during computed execution
      if (currentComputedContext) {
        accessedPropertiesDuringComputed.add(propKey);
      }

      // Track dependency for computed properties
      trackComputedDependency(propKey);

      if (currentValue && typeof currentValue === 'object' && !isObservable(currentValue)) {
        currentValue = makeObservable(currentValue);
      }

      return currentValue;
    },

    set(newValue) {
      if (currentValue === newValue) return;

      if (newValue && typeof newValue === 'object') {
        newValue = makeObservable(newValue);
      }

      const oldValue = currentValue;
      currentValue = newValue;

      const propKey = getOptimizedPropertyKey(target, prop);

      // When ANY property changes, invalidate ALL computeds that depend on this object
      const objectId = String(getOptimizedObjectId(target));
      invalidateComputedsThatDependOnObject(objectId);

      // Use optimized notification
      queueNotification(propKey);
    },

    enumerable: true,
    configurable: true
  });
}

// Track computed dependencies during getter execution
let currentComputedContext: { target: object; prop: string | symbol } | null = null;

function trackComputedDependency(propKey: string) {
  if (currentComputedContext) {
    const { target, prop } = currentComputedContext;

    if (!computedDependencies.has(target)) {
      computedDependencies.set(target, new Map());
    }

    const targetDeps = computedDependencies.get(target)!;
    if (!targetDeps.has(prop)) {
      targetDeps.set(prop, new Set());
    }

    targetDeps.get(prop)!.add(propKey);
  }
}

function makeGetterSetterReactive(
  target: any,
  prop: string | symbol,
  descriptor: PropertyDescriptor
) {
  const originalGet = descriptor.get;
  const originalSet = descriptor.set;

  Object.defineProperty(target, prop, {
    get() {
      // Track access to the computed property itself
      if (currentComponent) {
        const propKey = getOptimizedPropertyKey(target, prop);
        let subscribers = propertySubscriptions.get(propKey);
        if (!subscribers) {
          subscribers = new Set();
          propertySubscriptions.set(propKey, subscribers);
        }
        subscribers.add(currentComponent);
      }

      if (originalGet) {
        // Smart caching for computed properties
        if (!computedCache.has(target)) {
          computedCache.set(target, new Map());
        }

        const cache = computedCache.get(target)!;
        if (!cache.has(prop)) {
          cache.set(prop, { value: undefined, isValid: false });
        }

        const cacheEntry = cache.get(prop)!;

        // Don't use cache for cross-boundary getters - always re-execute to get fresh values
        const shouldUseCache = cacheEntry.isValid && !currentComponent;

        if (shouldUseCache) {
          return cacheEntry.value;
        }

        const prevComponent = currentComponent;
        const prevComputedContext = currentComputedContext;

        // Set up computed dependency tracking
        currentComputedContext = { target, prop };

        const dependencyNotifier = () => {
          const propKey = getOptimizedPropertyKey(target, prop);
          queueNotification(propKey);
        };

        currentComponent = dependencyNotifier;

        try {
          const result = originalGet.call(this);

          // Always cache the result
          cacheEntry.value = result;
          cacheEntry.isValid = true;

          if (result && typeof result === 'object' && !isObservable(result)) {
            const observableResult = makeObservable(result);
            cacheEntry.value = observableResult;
            return observableResult;
          }

          return result;
        } finally {
          currentComponent = prevComponent;
          currentComputedContext = prevComputedContext;
        }
      }
    },

    set(newValue) {
      if (originalSet) {
        if (newValue && typeof newValue === 'object') {
          newValue = makeObservable(newValue);
        }
        originalSet.call(this, newValue);

        // Invalidate cache
        const cache = computedCache.get(target);
        if (cache && cache.has(prop)) {
          cache.get(prop)!.isValid = false;
        }

        const propKey = getOptimizedPropertyKey(target, prop);
        queueNotification(propKey);
      }
    },

    enumerable: descriptor.enumerable,
    configurable: true
  });
}

function makeArrayObservable<T extends any[]>(target: T): T {
  // Mark as reactive
  Object.defineProperty(target, '__vorthainReactive', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  // Make all existing items reactive immediately
  for (let i = 0; i < target.length; i++) {
    if (target[i] && typeof target[i] === 'object' && !isObservable(target[i])) {
      target[i] = makeObservable(target[i]);
    }
  }

  // Create proxy to intercept array operations including length setter
  const arrayProxy = new Proxy(target, {
    get(target, prop, receiver) {
      // Track property access for reactivity
      if (currentComponent) {
        const propKey = getOptimizedPropertyKey(target, prop);
        let subscribers = propertySubscriptions.get(propKey);
        if (!subscribers) {
          subscribers = new Set();
          propertySubscriptions.set(propKey, subscribers);
        }
        subscribers.add(currentComponent);
      }

      return Reflect.get(target, prop, receiver);
    },

    set(target, prop, value, receiver) {
      if (prop === 'length') {
        const oldLength = target.length;
        const newLength = Number(value);

        // Handle array truncation (including length = 0)
        if (newLength < oldLength) {
          // Remove elements from the end using splice to trigger reactivity
          target.splice(newLength);
        } else if (newLength > oldLength) {
          // Extend array with undefined values
          target.length = newLength;
        }

        // Notify length subscribers
        const lengthPropKey = getOptimizedPropertyKey(target, 'length');
        queueNotification(lengthPropKey);

        // Notify all array subscribers about the change
        notifyArraySubscribers(target, oldLength);

        return true;
      }

      // Handle regular property setting
      if (typeof prop === 'string' || typeof prop === 'symbol') {
        const oldValue = target[prop as any];

        // Make new value reactive if it's an object
        if (value && typeof value === 'object') {
          value = makeObservable(value);
        }

        const result = Reflect.set(target, prop, value, receiver);

        // Notify subscribers if value changed
        if (oldValue !== value) {
          const propKey = getOptimizedPropertyKey(target, prop);
          queueNotification(propKey);
        }

        return result;
      }

      return Reflect.set(target, prop, value, receiver);
    }
  });

  // Patch array methods on the proxy
  ARRAY_METHODS.forEach((method) => {
    const original = target[method as keyof T];
    if (typeof original !== 'function') return;

    (arrayProxy as any)[method] = function (...args: any[]) {
      const oldLength = this.length;

      // Make new items reactive
      if (method === 'push' || method === 'unshift') {
        args = args.map((item) => (item && typeof item === 'object' ? makeObservable(item) : item));
      } else if (method === 'splice' && args.length > 2) {
        for (let i = 2; i < args.length; i++) {
          if (args[i] && typeof args[i] === 'object') {
            args[i] = makeObservable(args[i]);
          }
        }
      }

      const result = original.apply(this, args);

      // Handle new items being added
      if (['push', 'unshift', 'splice'].includes(method)) {
        handleNewItemsAdded(this, method, args, oldLength);
      }

      // Notify all array subscribers - use optimized notifications
      notifyArraySubscribers(this, oldLength);

      // Also notify using property-based approach
      const arrayId = String(getOptimizedObjectId(this));
      propertySubscriptions.forEach((subscribers, propKey) => {
        if (propKey.includes(arrayId)) {
          subscribers.forEach((subscriber) => {
            if (liveComponents.has(subscriber)) {
              if (isBatching) {
                batchedUpdates.add(subscriber);
              } else {
                requestAnimationFrame(() => {
                  if (liveComponents.has(subscriber)) {
                    try {
                      subscriber();
                    } catch (e) {
                      console.error('Error in array update:', e);
                    }
                  }
                });
              }
            }
          });
        }
      });

      return result;
    };
  });

  return arrayProxy as T;
}

function makeMapObservable<T extends Map<any, any>>(target: T): T {
  const reactive = makeObjectObservable(target);

  MAP_METHODS.forEach((method) => {
    const original = (reactive as any)[method];
    if (typeof original !== 'function') return;

    (reactive as any)[method] = function (...args: any[]) {
      if (method === 'set' && args[1] && typeof args[1] === 'object') {
        args[1] = makeObservable(args[1]);
      }

      const result = original.apply(this, args);

      // Handle new items being added
      if (method === 'set') {
        handleNewItemsAdded(this, method, args);
      }

      // Notify subscribers
      notifyMapSetSubscribers(this, method, args);

      return result;
    };
  });

  return reactive;
}

function makeSetObservable<T extends Set<any>>(target: T): T {
  const reactive = makeObjectObservable(target);

  SET_METHODS.forEach((method) => {
    const original = (reactive as any)[method];
    if (typeof original !== 'function') return;

    (reactive as any)[method] = function (...args: any[]) {
      if (method === 'add' && args[0] && typeof args[0] === 'object') {
        args[0] = makeObservable(args[0]);
      }

      const result = original.apply(this, args);

      // Handle new items being added
      if (method === 'add') {
        handleNewItemsAdded(this, method, args);
      }

      // Notify subscribers
      notifyMapSetSubscribers(this, method, args);

      return result;
    };
  });

  return reactive;
}

// Safer collection interest tracking
function handleNewItemsAdded(collection: any, method: string, args: any[], oldLength?: number) {
  // Find all components interested in this collection
  const interestedComponents = new Set<() => void>();

  // Iterate through active components and check their interests
  activeComponents.forEach((component) => {
    const collections = componentCollectionInterests.get(component);
    if (collections && collections.has(collection)) {
      interestedComponents.add(component);
    }
  });

  if (interestedComponents.size === 0) return;

  // Determine new items based on collection type and method
  let newItems: any[] = [];

  if (Array.isArray(collection)) {
    if (method === 'push') {
      newItems = args;
    } else if (method === 'unshift') {
      newItems = args;
    } else if (method === 'splice' && args.length > 2) {
      newItems = args.slice(2);
    }
  } else if (collection instanceof Map && method === 'set') {
    if (args[1] && typeof args[1] === 'object') {
      newItems = [args[1]];
    }
  } else if (collection instanceof Set && method === 'add') {
    if (args[0] && typeof args[0] === 'object') {
      newItems = [args[0]];
    }
  }

  // Subscribe all interested components to new items
  if (newItems.length > 0) {
    newItems.forEach((newItem) => {
      if (newItem && typeof newItem === 'object') {
        interestedComponents.forEach((component) => {
          subscribeComponentToNewObject(component, newItem);
        });
      }
    });
  }
}

// Subscribe a component to all properties of a new object recursively
function subscribeComponentToNewObject(component: () => void, newObject: any, visited = new Set()) {
  if (!newObject || typeof newObject !== 'object' || visited.has(newObject)) return;
  visited.add(newObject);

  const prevComponent = currentComponent;
  currentComponent = component;

  try {
    if (Array.isArray(newObject)) {
      // Access length and all items
      newObject.length;
      for (let i = 0; i < newObject.length; i++) {
        subscribeComponentToNewObject(component, newObject[i], visited);
      }
    } else if (newObject instanceof Map) {
      newObject.size;
      for (const [key, value] of newObject) {
        subscribeComponentToNewObject(component, value, visited);
      }
    } else if (newObject instanceof Set) {
      newObject.size;
      for (const value of newObject) {
        subscribeComponentToNewObject(component, value, visited);
      }
    } else {
      // Access all object properties to set up subscriptions
      Object.keys(newObject).forEach((key) => {
        try {
          const value = newObject[key]; // Triggers getter and sets up subscription
          subscribeComponentToNewObject(component, value, visited);
        } catch (e) {
          // Skip problematic properties
        }
      });
    }
  } finally {
    currentComponent = prevComponent;
  }
}

// Notify array subscribers
function notifyArraySubscribers(array: any[], oldLength: number) {
  // Notify length subscribers if length changed
  if (array.length !== oldLength) {
    const lengthPropKey = getOptimizedPropertyKey(array, 'length');
    queueNotification(lengthPropKey);
  }

  // Fallback: notify any subscribers to array-related properties
  const arrayId = String(getOptimizedObjectId(array));
  propertySubscriptions.forEach((subscribers, propKey) => {
    if (propKey.includes(arrayId)) {
      subscribers.forEach((subscriber) => {
        if (liveComponents.has(subscriber)) {
          if (isBatching) {
            batchedUpdates.add(subscriber);
          } else {
            requestAnimationFrame(() => {
              if (liveComponents.has(subscriber)) {
                try {
                  subscriber();
                } catch (e) {
                  console.error('Error in array notification:', e);
                }
              }
            });
          }
        }
      });
    }
  });
}

// Notify Map/Set subscribers
function notifyMapSetSubscribers(
  collection: Map<any, any> | Set<any>,
  method: string,
  args: any[]
) {
  if (method === 'set' || method === 'add' || method === 'delete' || method === 'clear') {
    const sizePropKey = getOptimizedPropertyKey(collection, 'size');
    queueNotification(sizePropKey);
  }
}

function isObservable(obj: any): boolean {
  return obj && typeof obj === 'object' && obj.__vorthainReactive === true;
}

/**
 * Hook that subscribes components to accessed properties
 */
export function useObservableSubscription<T extends object>(observableState: T): T {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    // Mark component as live
    liveComponents.add(forceUpdate);
    activeComponents.add(forceUpdate);

    currentComponent = forceUpdate;

    try {
      subscribeToObject(observableState);
    } catch (e) {
      console.warn('Error subscribing to observable:', e);
    } finally {
      currentComponent = null;
    }

    // Set up cleanup function for memory management
    const cleanup = () => {
      cleanupSubscriptions(forceUpdate);
    };

    componentCleanupFns.set(forceUpdate, cleanup);

    return cleanup;
  }, [observableState]);

  // Create a proxy that ensures currentComponent is set during property access
  return new Proxy(observableState, {
    get(target, prop, receiver) {
      const prevComponent = currentComponent;
      currentComponent = forceUpdate;

      try {
        return Reflect.get(target, prop, receiver);
      } finally {
        currentComponent = prevComponent;
      }
    }
  });
}

function subscribeToObject(obj: any, visited = new WeakSet()) {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
  visited.add(obj);

  try {
    if (Array.isArray(obj)) {
      // Track that current component is interested in this array
      if (currentComponent) {
        trackComponentInterest(currentComponent, obj);
      }

      // Subscribe to length and all items
      obj.length;
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        if (item && typeof item === 'object') {
          subscribeToObject(item, visited);
        }
      }
    } else if (obj instanceof Map) {
      if (currentComponent) {
        trackComponentInterest(currentComponent, obj);
      }

      obj.size;
      for (const [key, value] of obj) {
        if (value && typeof value === 'object') {
          subscribeToObject(value, visited);
        }
      }
    } else if (obj instanceof Set) {
      if (currentComponent) {
        trackComponentInterest(currentComponent, obj);
      }

      obj.size;
      for (const value of obj) {
        if (value && typeof value === 'object') {
          subscribeToObject(value, visited);
        }
      }
    } else {
      Object.keys(obj).forEach((key) => {
        try {
          const value = obj[key];
          if (value && typeof value === 'object') {
            subscribeToObject(value, visited);
          }
        } catch (e) {
          // Skip problematic properties
        }
      });
    }
  } catch (e) {
    // Skip problematic objects
  }
}

function trackComponentInterest(component: () => void, collection: object) {
  if (!componentCollectionInterests.has(component)) {
    componentCollectionInterests.set(component, new Set());
  }
  componentCollectionInterests.get(component)!.add(collection);
}

function cleanupSubscriptions(updateFn: () => void) {
  // Mark component as no longer live
  liveComponents.delete(updateFn);
  activeComponents.delete(updateFn);

  // Remove from property subscriptions
  let cleanedCount = 0;
  propertySubscriptions.forEach((subscribers, propKey) => {
    if (subscribers.has(updateFn)) {
      subscribers.delete(updateFn);
      cleanedCount++;
    }
    if (subscribers.size === 0) {
      propertySubscriptions.delete(propKey);
    }
  });

  // WeakMap will handle collection interests cleanup automatically
  // Remove cleanup function reference
  componentCleanupFns.delete(updateFn);
}
