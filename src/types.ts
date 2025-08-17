/**
 * Base interface for Vorthain stores
 */
export interface VorthainStore {
  [key: string]: any;
}

/**
 * Options for vGrip HOC
 */
export interface VGripOptions {
  /**
   * Enable debug logging for this component
   */
  debug?: boolean;

  /**
   * Custom component name for debugging
   */
  name?: string;

  /**
   * Threshold in ms before considering a render slow
   */
  slowRenderThreshold?: number;
}

/**
 * Stats returned by useVGripStats hook
 */
export interface VGripStats {
  totalTrackers: number;
  aliveTrackers: number;
  totalDependencies: number;
  pendingUpdates: number;
}

/**
 * Type for vGrip wrapped components
 */
export type VGripComponent<P = {}> = React.ComponentType<P>;
