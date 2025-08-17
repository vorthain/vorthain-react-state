import React, { useRef, useEffect, useReducer } from 'react';

interface VGripTracker {
  id: string;
  componentName: string;
  forceUpdate: () => void;
  isAlive: boolean;
  generation: number;
  dependencies: Map<
    string,
    {
      object: object;
      property: string | symbol;
      value: any;
      path: string;
    }
  >;
  propsProxy: any;
  localStates: Map<number, any>;
  globalStore: any;
  isRendering: boolean;
  renderCount: number;
  lastRenderTime: number;
}

const vGripTrackers = new Map<string, VGripTracker>();
const objectToTrackers = new Map<object, Map<string, Set<VGripTracker>>>();
let currentRenderingTracker: VGripTracker | null = null;
let insideVActionBatch = false;
const vActionBatchedTrackers = new Set<VGripTracker>();
const pendingTrackerUpdates = new Set<VGripTracker>();
let updateFlushScheduled = false;
let nextTrackerId = 0;
let nextObjectId = 0;
const objectIds = new WeakMap<object, string>();

export function getCurrentRenderingTracker(): VGripTracker | null {
  return currentRenderingTracker;
}

export function vGripGetCurrentTracker(): VGripTracker | null {
  return currentRenderingTracker;
}

function getObjectId(obj: object): string {
  if (!objectIds.has(obj)) {
    objectIds.set(obj, `obj_${++nextObjectId}`);
  }
  return objectIds.get(obj)!;
}

function createDependencyKey(obj: object, prop: string | symbol): string {
  return `${getObjectId(obj)}::${String(prop)}`;
}

export function vGripTrackDependency(
  tracker: VGripTracker,
  obj: object,
  prop: string | symbol,
  value: any,
  path: string = ''
) {
  if (tracker !== currentRenderingTracker || !tracker.isRendering) {
    return;
  }

  if (typeof value === 'function') {
    return;
  }

  const key = createDependencyKey(obj, prop);

  tracker.dependencies.set(key, {
    object: obj,
    property: prop,
    value: value,
    path: path || `${getObjectId(obj)}.${String(prop)}`
  });

  if (!objectToTrackers.has(obj)) {
    objectToTrackers.set(obj, new Map());
  }

  const objTrackers = objectToTrackers.get(obj)!;
  const propKey = String(prop);

  if (!objTrackers.has(propKey)) {
    objTrackers.set(propKey, new Set());
  }

  objTrackers.get(propKey)!.add(tracker);
}

const trackerProxyCache = new WeakMap<VGripTracker, WeakMap<object, any>>();

function getOrCreateTrackerCache(tracker: VGripTracker): WeakMap<object, any> {
  if (!trackerProxyCache.has(tracker)) {
    trackerProxyCache.set(tracker, new WeakMap());
  }
  return trackerProxyCache.get(tracker)!;
}

export function createSmartProxy<T extends object>(
  target: T,
  tracker: VGripTracker,
  path: string = 'root'
): T {
  if (target == null || typeof target !== 'object') return target;

  if (React.isValidElement(target)) return target;
  if (target instanceof HTMLElement) return target;
  if (target instanceof Date || target instanceof RegExp) return target;
  if (target instanceof Promise) return target;
  if (target instanceof Error) return target;
  if (target instanceof Event) return target;
  if (Object.isFrozen(target) || Object.isSealed(target)) return target;

  if ((target as any).__vorthainReactive) {
    return target;
  }

  const cache = getOrCreateTrackerCache(tracker);

  if (cache.has(target)) {
    return cache.get(target);
  }

  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      if (
        prop === '__vGripProxied' ||
        prop === '__vorthainReactive' ||
        prop === '__vGripTracker' ||
        prop === '__vorthainObjectId' ||
        prop === '__vGripObjectId' ||
        prop === 'Symbol(Symbol.toPrimitive)' ||
        prop === '$typeof' ||
        prop === '_owner' ||
        prop === '_store' ||
        prop === 'ref' ||
        prop === 'key' ||
        prop === Symbol.toStringTag ||
        prop === Symbol.iterator ||
        prop === Symbol.for('nodejs.util.inspect.custom') ||
        prop === 'constructor' ||
        prop === 'then' ||
        typeof prop === 'symbol'
      ) {
        return Reflect.get(obj, prop, receiver);
      }

      const value = Reflect.get(obj, prop, receiver);
      const fullPath = `${path}.${String(prop)}`;

      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      const isGetter = !!(descriptor && descriptor.get);

      if (typeof value === 'function') {
        return function (...args: any[]) {
          const prevTracker = currentRenderingTracker;
          currentRenderingTracker = null;
          try {
            return value.apply(obj, args);
          } finally {
            currentRenderingTracker = prevTracker;
          }
        };
      }

      if (tracker === currentRenderingTracker && tracker.isRendering) {
        vGripTrackDependency(tracker, obj, prop, value, fullPath);

        if (value && typeof value === 'object' && !React.isValidElement(value)) {
          return createSmartProxy(value, tracker, fullPath);
        }
      } else if (value && typeof value === 'object' && !React.isValidElement(value)) {
        return createSmartProxy(value, tracker, fullPath);
      }

      return value;
    },

    set(obj, prop, newValue, receiver) {
      const oldValue = obj[prop as keyof T];
      const result = Reflect.set(obj, prop, newValue, receiver);

      if (oldValue !== newValue) {
        notifyVGripOfChange(obj, prop);
      }

      return result;
    },

    has(obj, prop) {
      if (tracker === currentRenderingTracker && tracker.isRendering) {
        const fullPath = `${path}.${String(prop)}`;
        vGripTrackDependency(tracker, obj, prop, prop in obj, fullPath);
      }
      return Reflect.has(obj, prop);
    },

    deleteProperty(obj, prop) {
      const result = Reflect.deleteProperty(obj, prop);
      if (result) {
        notifyVGripOfChange(obj, prop);
      }
      return result;
    }
  });

  cache.set(target, proxy);

  return proxy;
}

export function notifyVGripOfChange(obj: object, prop: string | symbol) {
  const objTrackers = objectToTrackers.get(obj);
  const trackersToUpdate = new Set<VGripTracker>();

  if (objTrackers) {
    const propTrackers = objTrackers.get(String(prop));
    if (propTrackers && propTrackers.size > 0) {
      const key = createDependencyKey(obj, prop);
      propTrackers.forEach((tracker) => {
        if (!tracker.isAlive) return;

        const dep = tracker.dependencies.get(key);
        if (dep) {
          const currentValue = (obj as any)[prop];
          if (currentValue !== dep.value) {
            dep.value = currentValue;
            trackersToUpdate.add(tracker);
          }
        }
      });
    }
  }

  vGripTrackers.forEach((tracker) => {
    if (!tracker.isAlive) return;

    const key = createDependencyKey(obj, prop);
    const dep = tracker.dependencies.get(key);

    if (dep) {
      const currentValue = (obj as any)[prop];
      if (currentValue !== dep.value) {
        dep.value = currentValue;
        trackersToUpdate.add(tracker);
      }
    }
  });

  trackersToUpdate.forEach((tracker) => scheduleTrackerUpdate(tracker));
}

export function vGripBatchStart() {
  insideVActionBatch = true;
  vActionBatchedTrackers.clear();
}

export function vGripBatchEnd() {
  insideVActionBatch = false;

  if (vActionBatchedTrackers.size > 0) {
    const trackers = Array.from(vActionBatchedTrackers);
    vActionBatchedTrackers.clear();

    queueMicrotask(() => {
      const trackersToUpdate = trackers.filter((t) => t.isAlive);

      if (trackersToUpdate.length > 0) {
        requestAnimationFrame(() => {
          trackersToUpdate.forEach((tracker) => {
            if (tracker.isAlive) {
              tracker.generation++;
              tracker.renderCount++;
              tracker.lastRenderTime = Date.now();
              tracker.forceUpdate();
            }
          });
        });
      }
    });
  }
}

function scheduleTrackerUpdate(tracker: VGripTracker) {
  if (!tracker.isAlive) return;

  if (insideVActionBatch) {
    vActionBatchedTrackers.add(tracker);
  } else {
    pendingTrackerUpdates.add(tracker);
    scheduleUpdateFlush();
  }
}

function scheduleUpdateFlush() {
  if (updateFlushScheduled) return;
  updateFlushScheduled = true;

  queueMicrotask(() => {
    updateFlushScheduled = false;
    flushTrackerUpdates();
  });
}

function flushTrackerUpdates() {
  if (pendingTrackerUpdates.size === 0) return;

  const trackers = Array.from(pendingTrackerUpdates);
  pendingTrackerUpdates.clear();

  const trackersToUpdate = trackers.filter((t) => t.isAlive);

  if (trackersToUpdate.length > 0) {
    requestAnimationFrame(() => {
      trackersToUpdate.forEach((tracker) => {
        if (tracker.isAlive) {
          tracker.generation++;
          tracker.renderCount++;
          tracker.lastRenderTime = Date.now();
          tracker.forceUpdate();
        }
      });
    });
  }
}

export function vGrip<P extends object>(Component: React.ComponentType<P>): React.ComponentType<P> {
  const componentName = Component.displayName || Component.name || 'Component';

  const VGripWrapper = (props: P) => {
    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    const trackerRef = useRef<VGripTracker>(null);

    if (!trackerRef.current) {
      const trackerId = `${componentName}_${++nextTrackerId}`;

      trackerRef.current = {
        id: trackerId,
        componentName: componentName,
        forceUpdate,
        isAlive: false,
        generation: 0,
        dependencies: new Map(),
        propsProxy: null,
        localStates: new Map(),
        globalStore: null,
        isRendering: false,
        lastRenderTime: Date.now(),
        renderCount: 0
      };
    }

    const tracker = trackerRef.current;
    tracker.forceUpdate = forceUpdate;

    useEffect(() => {
      tracker.isAlive = true;
      vGripTrackers.set(tracker.id, tracker);

      tracker.dependencies.forEach((dep) => {
        if (!objectToTrackers.has(dep.object)) {
          objectToTrackers.set(dep.object, new Map());
        }
        const objTrackers = objectToTrackers.get(dep.object)!;
        const propKey = String(dep.property);
        if (!objTrackers.has(propKey)) {
          objTrackers.set(propKey, new Set());
        }
        objTrackers.get(propKey)!.add(tracker);
      });

      return () => {
        tracker.isAlive = false;
        vGripTrackers.delete(tracker.id);

        tracker.dependencies.forEach((dep) => {
          const objTrackers = objectToTrackers.get(dep.object);
          if (objTrackers) {
            const propTrackers = objTrackers.get(String(dep.property));
            if (propTrackers) {
              propTrackers.delete(tracker);
              if (propTrackers.size === 0) {
                objTrackers.delete(String(dep.property));
              }
            }
            if (objTrackers.size === 0) {
              objectToTrackers.delete(dep.object);
            }
          }
        });

        // don't clear dependencies - they will be cleared when component is truly destroyed (GC)
      };
    }, []);

    // Always clear previous render object tracking before new render
    if (tracker.isAlive) {
      objectToTrackers.forEach((propMap) => {
        propMap.forEach((trackerSet) => {
          trackerSet.delete(tracker);
        });
      });
    }

    const prevTracker = currentRenderingTracker;
    currentRenderingTracker = tracker;
    tracker.isRendering = true;
    tracker.renderCount++;

    const proxiedProps = createSmartProxy(props, tracker, 'props');

    let result;
    try {
      result = (Component as React.FC<P>)(proxiedProps as P);
    } finally {
      currentRenderingTracker = prevTracker;
      tracker.isRendering = false;
    }

    return result;
  };

  const MemoizedWrapper = React.memo(VGripWrapper);
  MemoizedWrapper.displayName = `vGrip(${componentName})`;
  return MemoizedWrapper;
}

export function useVGripStats() {
  const [stats, setStats] = React.useState({
    totalTrackers: 0,
    aliveTrackers: 0,
    totalDependencies: 0,
    pendingUpdates: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      let totalDeps = 0;
      let alive = 0;

      vGripTrackers.forEach((tracker) => {
        if (tracker.isAlive) alive++;
        totalDeps += tracker.dependencies.size;
      });

      setStats({
        totalTrackers: vGripTrackers.size,
        aliveTrackers: alive,
        totalDependencies: totalDeps,
        pendingUpdates: pendingTrackerUpdates.size
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

export const VGripDebugger: React.FC<{ show?: boolean }> = ({ show = true }) => {
  const stats = useVGripStats();

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999
      }}>
      <div>vGrip Stats</div>
      <div>
        Trackers: {stats.aliveTrackers}/{stats.totalTrackers}
      </div>
      <div>Dependencies: {stats.totalDependencies}</div>
      <div>Pending: {stats.pendingUpdates}</div>
    </div>
  );
};

export default vGrip;
