import { useReducer, useEffect, useRef } from 'react';

let currentComponent: (() => void) | null = null;
const propertySubscriptions = new Map<string, Set<() => void>>();
const liveComponents = new WeakSet<() => void>();
const observableCache = new WeakMap<object, object>();
let objectIdCounter = 1;
const objectIds = new WeakMap<object, number>();
const computedDependencies = new Map<object, Map<string | symbol, Set<string>>>();
const computedCache = new Map<object, Map<string | symbol, { value: any; isValid: boolean }>>();
let isBatching = false;
let batchedUpdates = new Set<() => void>();

let vGripNotifier: ((obj: object, prop: string | symbol) => void) | null = null;
let vGripBatchStartFn: (() => void) | null = null;
let vGripBatchEndFn: (() => void) | null = null;
let vGripGetCurrentTracker: (() => any) | null = null;
let vGripTrackDependency:
  | ((tracker: any, obj: object, prop: string | symbol, value: any) => void)
  | null = null;

export function registerVGripNotifier(notifier: (obj: object, prop: string | symbol) => void) {
  vGripNotifier = notifier;
}

export function registerVGripBatchHandlers(startFn: () => void, endFn: () => void) {
  vGripBatchStartFn = startFn;
  vGripBatchEndFn = endFn;
}

export function registerVGripTracking(
  getCurrentTracker: () => any,
  trackDependency: (tracker: any, obj: object, prop: string | symbol, value: any) => void
) {
  vGripGetCurrentTracker = getCurrentTracker;
  vGripTrackDependency = trackDependency;
}

function getObjectId(obj: object): number {
  if (!objectIds.has(obj)) {
    objectIds.set(obj, objectIdCounter++);
  }
  return objectIds.get(obj)!;
}

function getPropertyKey(target: object, prop: string | symbol): string {
  return `${getObjectId(target)}:${String(prop)}`;
}

function isObservable(obj: any): boolean {
  return obj && typeof obj === 'object' && obj.__vorthainReactive === true;
}

export function vAction<T>(actionFn: () => T): T {
  if (isBatching) {
    return actionFn();
  }

  isBatching = true;
  batchedUpdates.clear();

  if (vGripBatchStartFn) {
    vGripBatchStartFn();
  }

  try {
    const result = actionFn();

    batchedUpdates.forEach((updateFn) => {
      if (liveComponents.has(updateFn)) {
        try {
          updateFn();
        } catch (e) {
          console.error('Error in batched update:', e);
        }
      }
    });
    batchedUpdates.clear();

    if (vGripBatchEndFn) {
      vGripBatchEndFn();
    }

    return result;
  } finally {
    isBatching = false;
  }
}

export function makeObservable<T extends object>(target: T): T {
  if (!target || typeof target !== 'object') return target;
  if ((target as any).__vorthainReactive) return target;
  if (observableCache.has(target)) {
    return observableCache.get(target) as T;
  }

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

  observableCache.set(target, target);

  if (Array.isArray(target)) {
    return makeArrayObservable(target);
  } else if (target instanceof Map) {
    return makeMapObservable(target);
  } else if (target instanceof Set) {
    return makeSetObservable(target);
  } else {
    return makeObjectObservable(target);
  }
}

function makeObjectObservable<T extends object>(target: T): T {
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

  allProps.forEach((prop) => {
    if (prop === '__vorthainReactive') return;

    const descriptor = Object.getOwnPropertyDescriptor(target, prop);
    if (!descriptor || !descriptor.configurable) return;

    if (descriptor.get || descriptor.set) {
      makeGetterSetterReactive(target, prop, descriptor);
    } else {
      if (descriptor.value && typeof descriptor.value === 'object') {
        descriptor.value = makeObservable(descriptor.value);
      }
      makePropertyReactive(target, prop, descriptor.value);
    }
  });

  return target;
}

function makePropertyReactive(target: any, prop: string | symbol, initialValue: any) {
  let currentValue = initialValue;

  if (currentValue && typeof currentValue === 'object') {
    currentValue = makeObservable(currentValue);
  }

  Object.defineProperty(target, prop, {
    get() {
      const propKey = getPropertyKey(target, prop);

      if (currentComponent && !vGripGetCurrentTracker?.()) {
        let subscribers = propertySubscriptions.get(propKey);
        if (!subscribers) {
          subscribers = new Set();
          propertySubscriptions.set(propKey, subscribers);
        }
        subscribers.add(currentComponent);
      }

      if (vGripGetCurrentTracker && vGripTrackDependency) {
        const tracker = vGripGetCurrentTracker();
        if (tracker && tracker.isRendering) {
          vGripTrackDependency(tracker, target, prop, currentValue);
        }
      }

      if (currentComputedContext) {
        trackComputedDependency(propKey);
      }

      return currentValue;
    },

    set(newValue) {
      if (currentValue === newValue) return;

      if (newValue && typeof newValue === 'object') {
        newValue = makeObservable(newValue);
      }

      currentValue = newValue;

      invalidateComputedsThatDependOn(target, prop);

      const propKey = getPropertyKey(target, prop);
      notifySubscribers(propKey);

      if (vGripNotifier) {
        vGripNotifier(target, prop);
      }
    },

    enumerable: true,
    configurable: true
  });
}

let currentComputedContext: { target: object; prop: string | symbol } | null = null;

function trackComputedDependency(propKey: string) {
  if (!currentComputedContext) return;

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

function invalidateComputedsThatDependOn(obj: object, prop: string | symbol) {
  const propKey = getPropertyKey(obj, prop);

  computedCache.forEach((cache, target) => {
    cache.forEach((cacheEntry, computedProp) => {
      const deps = computedDependencies.get(target)?.get(computedProp);
      if (deps && deps.has(propKey)) {
        const oldValue = cacheEntry.value;
        cacheEntry.isValid = false;

        if (vGripNotifier) {
          const descriptor = Object.getOwnPropertyDescriptor(target, computedProp);
          if (descriptor && descriptor.get) {
            try {
              const newValue = descriptor.get.call(target);
              if (newValue !== oldValue) {
                vGripNotifier(target, computedProp);
              }
            } catch (e) {
              vGripNotifier(target, computedProp);
            }
          }
        }
      }
    });
  });
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
      if (!originalGet) return undefined;

      if (currentComponent && !vGripGetCurrentTracker?.()) {
        const propKey = getPropertyKey(target, prop);
        let subscribers = propertySubscriptions.get(propKey);
        if (!subscribers) {
          subscribers = new Set();
          propertySubscriptions.set(propKey, subscribers);
        }
        subscribers.add(currentComponent);
      }

      if (!computedCache.has(target)) {
        computedCache.set(target, new Map());
      }

      const cache = computedCache.get(target)!;
      if (!cache.has(prop)) {
        cache.set(prop, { value: undefined, isValid: false });
      }

      const cacheEntry = cache.get(prop)!;
      const tracker = vGripGetCurrentTracker?.();
      const shouldUseCache = cacheEntry.isValid && !currentComponent && !tracker;

      if (shouldUseCache) {
        return cacheEntry.value;
      }

      const prevComponent = currentComponent;
      const prevComputedContext = currentComputedContext;
      currentComputedContext = { target, prop };

      const computedNotifier = () => {
        const propKey = getPropertyKey(target, prop);
        notifySubscribers(propKey);
      };

      if (!tracker) {
        currentComponent = computedNotifier;
      }

      try {
        const result = originalGet.call(target);

        cacheEntry.value = result;
        cacheEntry.isValid = true;

        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, prop, result);
        }

        return result;
      } finally {
        if (!tracker) {
          currentComponent = prevComponent;
        }
        currentComputedContext = prevComputedContext;
      }
    },

    set(newValue) {
      if (!originalSet) return;

      if (newValue && typeof newValue === 'object') {
        newValue = makeObservable(newValue);
      }

      originalSet.call(target, newValue);

      const cache = computedCache.get(target);
      if (cache && cache.has(prop)) {
        cache.get(prop)!.isValid = false;
      }

      const propKey = getPropertyKey(target, prop);
      notifySubscribers(propKey);

      if (vGripNotifier) {
        vGripNotifier(target, prop);
      }
    },

    enumerable: descriptor.enumerable,
    configurable: true
  });
}

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

function makeArrayObservable<T extends any[]>(target: T): T {
  Object.defineProperty(target, '__vorthainReactive', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  for (let i = 0; i < target.length; i++) {
    if (target[i] && typeof target[i] === 'object' && !isObservable(target[i])) {
      target[i] = makeObservable(target[i]);
    }
  }

  const originalMethods: Record<string, Function> = {};
  ARRAY_METHODS.forEach((method) => {
    const fn = target[method as keyof T];
    if (typeof fn === 'function') {
      originalMethods[method] = fn.bind(target);
    }
  });

  const arrayProxy = new Proxy(target, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && ARRAY_METHODS.includes(prop)) {
        return function (this: any, ...args: any[]) {
          const oldLength = target.length;
          const oldItems = [...target];

          let processedArgs = args;
          if (prop === 'push' || prop === 'unshift') {
            processedArgs = args.map((item) =>
              item && typeof item === 'object' ? makeObservable(item) : item
            );
          } else if (prop === 'splice' && args.length > 2) {
            processedArgs = [...args];
            for (let i = 2; i < processedArgs.length; i++) {
              if (processedArgs[i] && typeof processedArgs[i] === 'object') {
                processedArgs[i] = makeObservable(processedArgs[i]);
              }
            }
          }

          const result = originalMethods[prop].apply(target, processedArgs);

          for (let i = 0; i < target.length; i++) {
            if (target[i] && typeof target[i] === 'object' && !isObservable(target[i])) {
              target[i] = makeObservable(target[i]);
            }
          }

          const lengthChanged = target.length !== oldLength;
          const itemsChanged = !oldItems.every((item, i) => target[i] === item);

          if (lengthChanged) {
            const lengthKey = getPropertyKey(target, 'length');
            notifySubscribers(lengthKey);
          }

          if (vGripNotifier) {
            if (lengthChanged) {
              vGripNotifier(target, 'length');
            }

            if (itemsChanged || ['sort', 'reverse'].includes(prop)) {
              const maxLength = Math.max(target.length, oldLength);
              for (let i = 0; i < maxLength; i++) {
                if (i >= target.length || i >= oldItems.length || target[i] !== oldItems[i]) {
                  vGripNotifier(target, i.toString());
                }
              }
            }
          }

          return result;
        };
      }

      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        const index = Number(prop);
        let item = target[index];

        if (item && typeof item === 'object' && !isObservable(item)) {
          item = makeObservable(item);
          target[index] = item;
        }

        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, prop);
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, prop, item);
        }

        return item;
      }

      if (currentComponent && !vGripGetCurrentTracker?.()) {
        const propKey = getPropertyKey(target, prop);
        let subscribers = propertySubscriptions.get(propKey);
        if (!subscribers) {
          subscribers = new Set();
          propertySubscriptions.set(propKey, subscribers);
        }
        subscribers.add(currentComponent);
      }

      const tracker = vGripGetCurrentTracker?.();
      if (tracker && tracker.isRendering && vGripTrackDependency) {
        const value = Reflect.get(target, prop, receiver);
        vGripTrackDependency(tracker, target, prop, value);
        return value;
      }

      return Reflect.get(target, prop, receiver);
    },

    set(target, prop, value, receiver) {
      if (prop === 'length') {
        const oldLength = target.length;
        const newLength = Number(value);

        if (newLength < oldLength) {
          for (let i = newLength; i < oldLength; i++) {
            delete target[i];
          }
        }

        target.length = newLength;

        const propKey = getPropertyKey(target, 'length');
        notifySubscribers(propKey);

        if (vGripNotifier) {
          vGripNotifier(target, 'length');
          for (let i = newLength; i < oldLength; i++) {
            vGripNotifier(target, i.toString());
          }
        }

        return true;
      }

      if (value && typeof value === 'object' && !isObservable(value)) {
        value = makeObservable(value);
      }

      const oldValue = target[prop as any];
      const result = Reflect.set(target, prop, value, receiver);

      if (oldValue !== value) {
        const propKey = getPropertyKey(target, prop);
        notifySubscribers(propKey);

        if (vGripNotifier) {
          vGripNotifier(target, prop);
        }
      }

      return result;
    },

    deleteProperty(target, prop) {
      const result = Reflect.deleteProperty(target, prop);

      if (result) {
        const propKey = getPropertyKey(target, prop);
        notifySubscribers(propKey);

        if (vGripNotifier) {
          vGripNotifier(target, prop);
        }
      }

      return result;
    }
  });

  return arrayProxy as T;
}

function makeMapObservable<T extends Map<any, any>>(target: T): T {
  Object.defineProperty(target, '__vorthainReactive', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  for (const [key, value] of target) {
    if (value && typeof value === 'object' && !isObservable(value)) {
      target.set(key, makeObservable(value));
    }
  }

  const originalGet = target.get.bind(target);
  const originalSet = target.set.bind(target);
  const originalDelete = target.delete.bind(target);
  const originalClear = target.clear.bind(target);
  const originalForEach = target.forEach.bind(target);
  const originalEntries = target.entries.bind(target);
  const originalValues = target.values.bind(target);
  const originalKeys = target.keys.bind(target);

  const mapProxy = new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === 'size') {
        const size = target.size;

        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, 'size');
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, 'size', size);
        }

        return size;
      }

      if (prop === 'get') {
        return function (key: any) {
          const value = originalGet(key);

          if (currentComponent && !vGripGetCurrentTracker?.()) {
            const propKey = getPropertyKey(target, key);
            let subscribers = propertySubscriptions.get(propKey);
            if (!subscribers) {
              subscribers = new Set();
              propertySubscriptions.set(propKey, subscribers);
            }
            subscribers.add(currentComponent);
          }

          const tracker = vGripGetCurrentTracker?.();
          if (tracker && tracker.isRendering && vGripTrackDependency) {
            vGripTrackDependency(tracker, target, key, value);
          }

          if (value && typeof value === 'object' && !isObservable(value)) {
            const reactiveValue = makeObservable(value);
            originalSet(key, reactiveValue);
            return reactiveValue;
          }

          return value;
        };
      }

      if (prop === 'set') {
        return function (key: any, value: any) {
          if (value && typeof value === 'object') {
            value = makeObservable(value);
          }

          const oldValue = originalGet(key);
          const oldSize = target.size;

          const result = originalSet(key, value);

          if (oldValue !== value) {
            const propKey = getPropertyKey(target, key);
            notifySubscribers(propKey);

            if (vGripNotifier) {
              vGripNotifier(target, key);
            }
          }

          if (oldSize !== target.size) {
            const sizeKey = getPropertyKey(target, 'size');
            notifySubscribers(sizeKey);

            if (vGripNotifier) {
              vGripNotifier(target, 'size');
            }
          }

          const iterKey = getPropertyKey(target, Symbol.for('__map_iteration__'));
          notifySubscribers(iterKey);

          if (vGripNotifier) {
            vGripNotifier(target, Symbol.for('__map_iteration__'));
          }

          return result;
        };
      }

      if (prop === 'delete') {
        return function (key: any) {
          const oldSize = target.size;
          const result = originalDelete(key);

          if (result) {
            const propKey = getPropertyKey(target, key);
            notifySubscribers(propKey);

            const iterKey = getPropertyKey(target, Symbol.for('__map_iteration__'));
            notifySubscribers(iterKey);

            if (vGripNotifier) {
              vGripNotifier(target, key);
              vGripNotifier(target, Symbol.for('__map_iteration__'));
            }

            if (oldSize !== target.size) {
              const sizeKey = getPropertyKey(target, 'size');
              notifySubscribers(sizeKey);

              if (vGripNotifier) {
                vGripNotifier(target, 'size');
              }
            }
          }

          return result;
        };
      }

      if (prop === 'clear') {
        return function () {
          const oldSize = target.size;
          const oldKeys = Array.from(target.keys());

          const result = originalClear();

          if (oldSize > 0) {
            oldKeys.forEach((key) => {
              const propKey = getPropertyKey(target, key);
              notifySubscribers(propKey);

              if (vGripNotifier) {
                vGripNotifier(target, key);
              }
            });

            const sizeKey = getPropertyKey(target, 'size');
            notifySubscribers(sizeKey);

            const iterKey = getPropertyKey(target, Symbol.for('__map_iteration__'));
            notifySubscribers(iterKey);

            if (vGripNotifier) {
              vGripNotifier(target, 'size');
              vGripNotifier(target, Symbol.for('__map_iteration__'));
            }
          }

          return result;
        };
      }

      if (prop === 'forEach') {
        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, Symbol.for('__map_iteration__'));
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, Symbol.for('__map_iteration__'), null);
        }

        return function (callback: Function, thisArg?: any) {
          return originalForEach((value: any, key: any, map: Map<any, any>) => {
            if (value && typeof value === 'object' && !isObservable(value)) {
              value = makeObservable(value);
              originalSet(key, value);
            }
            callback.call(thisArg, value, key, map);
          });
        };
      }

      if (prop === 'keys') {
        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, Symbol.for('__map_iteration__'));
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, Symbol.for('__map_iteration__'), null);
        }

        return function* () {
          for (const key of originalKeys()) {
            yield key;
          }
        };
      }

      if (prop === 'entries' || prop === Symbol.iterator) {
        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, Symbol.for('__map_iteration__'));
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, Symbol.for('__map_iteration__'), null);
        }

        return function* () {
          for (const [key, value] of originalEntries()) {
            let reactiveValue = value;
            if (value && typeof value === 'object' && !isObservable(value)) {
              reactiveValue = makeObservable(value);
              originalSet(key, reactiveValue);
            }
            yield [key, reactiveValue];
          }
        };
      }

      if (prop === 'values') {
        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, Symbol.for('__map_iteration__'));
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, Symbol.for('__map_iteration__'), null);
        }

        return function* () {
          for (const value of originalValues()) {
            if (value && typeof value === 'object' && !isObservable(value)) {
              const key = Array.from(originalEntries()).find(([k, v]) => v === value)?.[0];
              if (key !== undefined) {
                const reactiveValue = makeObservable(value);
                originalSet(key, reactiveValue);
                yield reactiveValue;
              } else {
                yield value;
              }
            } else {
              yield value;
            }
          }
        };
      }

      return Reflect.get(target, prop, target);
    }
  });

  return mapProxy as T;
}

function makeSetObservable<T extends Set<any>>(target: T): T {
  Object.defineProperty(target, '__vorthainReactive', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  const existingValues = Array.from(target);
  target.clear();
  existingValues.forEach((value) => {
    if (value && typeof value === 'object' && !isObservable(value)) {
      target.add(makeObservable(value));
    } else {
      target.add(value);
    }
  });

  const originalAdd = target.add.bind(target);
  const originalDelete = target.delete.bind(target);
  const originalClear = target.clear.bind(target);
  const originalForEach = target.forEach.bind(target);
  const originalValues = target.values.bind(target);
  const originalEntries = target.entries.bind(target);
  const originalHas = target.has.bind(target); // Bind the 'has' method

  const setProxy = new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === 'size') {
        const size = target.size;

        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, 'size');
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, 'size', size);
        }

        return size;
      }

      if (prop === 'has') {
        return function (value: any) {
          if (currentComponent && !vGripGetCurrentTracker?.()) {
            const iterKey = getPropertyKey(target, Symbol.for('__set_iteration__'));
            let subscribers = propertySubscriptions.get(iterKey);
            if (!subscribers) {
              subscribers = new Set();
              propertySubscriptions.set(iterKey, subscribers);
            }
            subscribers.add(currentComponent);
          }
          return originalHas(value);
        };
      }

      if (prop === 'add') {
        return function (value: any) {
          if (value && typeof value === 'object') {
            value = makeObservable(value);
          }

          const oldSize = target.size;
          const result = originalAdd(value);

          if (oldSize !== target.size) {
            const sizeKey = getPropertyKey(target, 'size');
            notifySubscribers(sizeKey);

            const iterKey = getPropertyKey(target, Symbol.for('__set_iteration__'));
            notifySubscribers(iterKey);

            if (vGripNotifier) {
              vGripNotifier(target, 'size');
              vGripNotifier(target, Symbol.for('__set_iteration__'));
            }
          }

          return result;
        };
      }

      if (prop === 'delete') {
        return function (value: any) {
          const oldSize = target.size;
          const result = originalDelete(value);

          if (result) {
            const sizeKey = getPropertyKey(target, 'size');
            notifySubscribers(sizeKey);

            const iterKey = getPropertyKey(target, Symbol.for('__set_iteration__'));
            notifySubscribers(iterKey);

            if (vGripNotifier) {
              vGripNotifier(target, 'size');
              vGripNotifier(target, Symbol.for('__set_iteration__'));
            }
          }

          return result;
        };
      }

      if (prop === 'clear') {
        return function () {
          const oldSize = target.size;
          const result = originalClear();

          if (oldSize > 0) {
            const sizeKey = getPropertyKey(target, 'size');
            notifySubscribers(sizeKey);

            const iterKey = getPropertyKey(target, Symbol.for('__set_iteration__'));
            notifySubscribers(iterKey);

            if (vGripNotifier) {
              vGripNotifier(target, 'size');
              vGripNotifier(target, Symbol.for('__set_iteration__'));
            }
          }

          return result;
        };
      }

      if (prop === 'forEach') {
        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, Symbol.for('__set_iteration__'));
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, Symbol.for('__set_iteration__'), null);
        }

        return function (callback: Function, thisArg?: any) {
          return originalForEach((value: any, set: Set<any>) => {
            if (value && typeof value === 'object' && !isObservable(value)) {
              value = makeObservable(value);
            }
            callback.call(thisArg, value, value, set);
          });
        };
      }

      if (prop === 'values' || prop === 'keys' || prop === Symbol.iterator) {
        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, Symbol.for('__set_iteration__'));
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, Symbol.for('__set_iteration__'), null);
        }

        return function* () {
          for (const value of originalValues()) {
            if (value && typeof value === 'object' && !isObservable(value)) {
              yield makeObservable(value);
            } else {
              yield value;
            }
          }
        };
      }

      if (prop === 'entries') {
        if (currentComponent && !vGripGetCurrentTracker?.()) {
          const propKey = getPropertyKey(target, Symbol.for('__set_iteration__'));
          let subscribers = propertySubscriptions.get(propKey);
          if (!subscribers) {
            subscribers = new Set();
            propertySubscriptions.set(propKey, subscribers);
          }
          subscribers.add(currentComponent);
        }

        const tracker = vGripGetCurrentTracker?.();
        if (tracker && tracker.isRendering && vGripTrackDependency) {
          vGripTrackDependency(tracker, target, Symbol.for('__set_iteration__'), null);
        }

        return function* () {
          for (const [value1, value2] of originalEntries()) {
            let reactiveValue = value1;
            if (value1 && typeof value1 === 'object' && !isObservable(value1)) {
              reactiveValue = makeObservable(value1);
            }
            yield [reactiveValue, reactiveValue];
          }
        };
      }

      return Reflect.get(target, prop, target);
    }
  });

  return setProxy as T;
}

function notifySubscribers(propKey: string) {
  const subscribers = propertySubscriptions.get(propKey);
  if (!subscribers || subscribers.size === 0) return;

  const subscriberArray = Array.from(subscribers);

  subscriberArray.forEach((subscriber) => {
    if (liveComponents.has(subscriber)) {
      if (isBatching) {
        batchedUpdates.add(subscriber);
      } else {
        try {
          subscriber();
        } catch (e) {
          console.error('Error in subscriber update:', e);
          liveComponents.delete(subscriber);
          subscribers.delete(subscriber);
        }
      }
    } else {
      subscribers.delete(subscriber);
    }
  });

  if (subscribers.size === 0) {
    propertySubscriptions.delete(propKey);
  }
}

export function useObservableSubscription<T extends object>(observableState: T): T {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const instanceRef = useRef<{
    subscriptions: Set<string>;
    forceUpdate: () => void;
    isCleanedUp: boolean;
  } | null>(null);

  if (!instanceRef.current) {
    instanceRef.current = {
      subscriptions: new Set(),
      forceUpdate,
      isCleanedUp: false
    };
  }

  instanceRef.current.forceUpdate = forceUpdate;

  liveComponents.add(forceUpdate);

  useEffect(() => {
    const instance = instanceRef.current!;

    liveComponents.add(instance.forceUpdate);

    currentComponent = instance.forceUpdate;

    try {
      subscribeToObject(observableState);
    } catch (e) {
      console.warn('Error subscribing to observable:', e);
    } finally {
      currentComponent = null;
    }

    instance.subscriptions.forEach((propKey) => {
      let subscribers = propertySubscriptions.get(propKey);
      if (!subscribers) {
        subscribers = new Set();
        propertySubscriptions.set(propKey, subscribers);
      }
      subscribers.forEach((sub) => {
        if (!liveComponents.has(sub) && sub !== instance.forceUpdate) {
          subscribers!.delete(sub);
        }
      });
      subscribers.add(instance.forceUpdate);
    });

    instance.isCleanedUp = false;

    return () => {
      instance.isCleanedUp = true;

      queueMicrotask(() => {
        if (instance.isCleanedUp) {
          liveComponents.delete(instance.forceUpdate);

          instance.subscriptions.forEach((propKey) => {
            const subscribers = propertySubscriptions.get(propKey);
            if (subscribers) {
              subscribers.delete(instance.forceUpdate);
              if (subscribers.size === 0) {
                propertySubscriptions.delete(propKey);
              }
            }
          });
        }
      });
    };
  }, [observableState]);

  return new Proxy(observableState, {
    get(target, prop, receiver) {
      const instance = instanceRef.current!;

      // Helper function to wrap Map.get return values
      const wrapMapGetResult = (originalGet: Function, target: Map<any, any>) => {
        return function (key: any) {
          const result = originalGet.call(target, key);

          if (result && typeof result === 'object') {
            const proxyKey = Symbol.for('__vorthain_proxy__');
            if ((result as any)[proxyKey]) {
              return result;
            }

            const proxy = new Proxy(result, {
              get(innerTarget, innerProp, innerReceiver) {
                if (innerProp === proxyKey) return true;

                // Recursive handling for nested Maps
                if (typeof (innerTarget as any)[innerProp] === 'function') {
                  if (innerTarget instanceof Map && innerProp === 'get') {
                    return wrapMapGetResult(
                      Reflect.get(innerTarget, innerProp, innerReceiver),
                      innerTarget
                    );
                  }
                  return Reflect.get(innerTarget, innerProp, innerReceiver);
                }

                currentComponent = instance.forceUpdate;
                liveComponents.add(instance.forceUpdate);

                const innerPropKey = getPropertyKey(innerTarget, innerProp);

                if (!instance.subscriptions.has(innerPropKey)) {
                  instance.subscriptions.add(innerPropKey);
                }

                let innerSubscribers = propertySubscriptions.get(innerPropKey);
                if (!innerSubscribers) {
                  innerSubscribers = new Set();
                  propertySubscriptions.set(innerPropKey, innerSubscribers);
                }
                innerSubscribers.add(instance.forceUpdate);

                const value = Reflect.get(innerTarget, innerProp, innerReceiver);

                // Handle nested objects/Maps/Sets
                if (value && typeof value === 'object') {
                  return new Proxy(value, this);
                }

                return value;
              }
            });

            return proxy;
          }

          return result;
        };
      };

      // Handle functions
      if (typeof (target as any)[prop] === 'function') {
        if (target instanceof Map && prop === 'get') {
          return wrapMapGetResult(Reflect.get(target, prop, receiver), target);
        }
        return Reflect.get(target, prop, receiver);
      }

      // Regular property access
      const propKey = getPropertyKey(target, prop);

      if (!instance.subscriptions.has(propKey)) {
        instance.subscriptions.add(propKey);
      }

      let subscribers = propertySubscriptions.get(propKey);
      if (!subscribers) {
        subscribers = new Set();
        propertySubscriptions.set(propKey, subscribers);
      }

      subscribers.add(instance.forceUpdate);

      const prevComponent = currentComponent;
      if (!vGripGetCurrentTracker?.()) {
        currentComponent = instance.forceUpdate;
      }

      try {
        const value = Reflect.get(target, prop, receiver);

        if (value && typeof value === 'object' && !vGripGetCurrentTracker?.()) {
          const proxyKey = Symbol.for('__vorthain_proxy__');
          if ((value as any)[proxyKey]) {
            return value;
          }

          const proxy = new Proxy(value, {
            get(innerTarget, innerProp, innerReceiver) {
              if (innerProp === proxyKey) return true;

              if (typeof (innerTarget as any)[innerProp] === 'function') {
                if (innerTarget instanceof Map && innerProp === 'get') {
                  return wrapMapGetResult(
                    Reflect.get(innerTarget, innerProp, innerReceiver),
                    innerTarget
                  );
                }
                return Reflect.get(innerTarget, innerProp, innerReceiver);
              }

              currentComponent = instance.forceUpdate;
              liveComponents.add(instance.forceUpdate);

              const innerPropKey = getPropertyKey(innerTarget, innerProp);

              if (!instance.subscriptions.has(innerPropKey)) {
                instance.subscriptions.add(innerPropKey);
              }

              let innerSubscribers = propertySubscriptions.get(innerPropKey);
              if (!innerSubscribers) {
                innerSubscribers = new Set();
                propertySubscriptions.set(innerPropKey, innerSubscribers);
              }
              innerSubscribers.add(instance.forceUpdate);

              return Reflect.get(innerTarget, innerProp, innerReceiver);
            }
          });

          return proxy;
        }

        return value;
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
      obj.length;
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
      }
    } else if (obj instanceof Map) {
      obj.size;
    } else if (obj instanceof Set) {
      obj.size;
    } else {
      Object.keys(obj).forEach((key) => {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(obj, key);
          if (descriptor && descriptor.get) {
            return;
          }
          if (typeof obj[key] === 'function') {
            return;
          }
          obj[key];
        } catch (e) {}
      });
    }
  } catch (e) {}
}
