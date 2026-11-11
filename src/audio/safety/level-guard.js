import workletUrl from './level-guard.worklet.js?url';
import { createLevelDetector } from './level-detector.js';
import { SAFETY } from './safety-config.js';

export const loadLevelGuard = (ctx) => ctx.audioWorklet.addModule(workletUrl);

export function createLevelGuard(ctx, { onTrip, config = SAFETY }) {
  const node = new AudioWorkletNode(ctx, 'level-guard', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    channelCount: 2,
    channelCountMode: 'explicit',
    processorOptions: { reportInterval: config.reportInterval },
  });
  const detector = createLevelDetector(config);

  node.port.onmessage = ({ data }) => {
    const reason = detector.push(data.time, data.peak, data.rms);
    if (reason) onTrip(reason);
  };

  return {
    node,
    detector,
    dispose() {
      node.port.onmessage = null;
      node.disconnect();
    },
  };
}
