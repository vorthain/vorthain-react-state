export { makeObservable, vAction } from './makeObservable';
export { useVglobal, createVorthainStore, _resetVorthainStore } from './useVglobal';
export { useVstate } from './useVstate';
export { vGrip, VGripDebugger, useVGripStats, default as vGripDefault } from './vGrip';
export type { VorthainStore } from './types';

import {
  registerVGripNotifier,
  registerVGripBatchHandlers,
  registerVGripTracking
} from './makeObservable';
import {
  vGripBatchStart,
  vGripBatchEnd,
  notifyVGripOfChange,
  vGripGetCurrentTracker,
  vGripTrackDependency
} from './vGrip';

registerVGripBatchHandlers(vGripBatchStart, vGripBatchEnd);
registerVGripNotifier(notifyVGripOfChange);
registerVGripTracking(vGripGetCurrentTracker, vGripTrackDependency);
