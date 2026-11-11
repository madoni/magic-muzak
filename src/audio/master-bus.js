import { createImpulseResponse } from './effects/reverb.js';
import { linearFade, rampTo } from './params.js';
import { SAFETY } from './safety/safety-config.js';

const MAX_DELAY = 2;

export function createMasterBus(ctx, { guardNode = null, rng = Math.random, muted = false } = {}) {
  const input = new GainNode(ctx);
  const panner = new StereoPannerNode(ctx);
  const panLfo = new OscillatorNode(ctx, { frequency: 0.05 });
  const panDepth = new GainNode(ctx, { gain: 0.25 });

  const dry = new GainNode(ctx, { gain: 0.8 });
  const delaySend = new GainNode(ctx, { gain: 0.22 });
  const delay = new DelayNode(ctx, { maxDelayTime: MAX_DELAY, delayTime: 0.5 });
  const delayTone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 2200 });
  const feedback = new GainNode(ctx, { gain: 0.35 });
  const reverbSend = new GainNode(ctx, { gain: 0.35 });
  const reverb = new ConvolverNode(ctx, { buffer: createImpulseResponse(ctx, { rng }) });

  const limiter = new DynamicsCompressorNode(ctx, {
    threshold: -18,
    knee: 6,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
  });
  const muteGain = new GainNode(ctx, { gain: muted ? 0 : 1 });
  const masterGain = new GainNode(ctx, { gain: 0 });
  const analyser = new AnalyserNode(ctx, { fftSize: 2048, smoothingTimeConstant: 0.8 });

  panLfo.connect(panDepth).connect(panner.pan);
  input.connect(panner);
  panner.connect(dry).connect(limiter);
  panner.connect(delaySend).connect(delay).connect(delayTone).connect(limiter);
  delayTone.connect(feedback).connect(delay);
  panner.connect(reverbSend).connect(reverb).connect(limiter);
  limiter.connect(muteGain).connect(masterGain);
  (guardNode ? masterGain.connect(guardNode) : masterGain).connect(analyser).connect(ctx.destination);
  panLfo.start();

  return {
    input,
    analyser,
    setDelayTime(seconds, time) {
      rampTo(delay.delayTime, Math.min(MAX_DELAY, seconds), time, 0.1);
    },
    fadeIn(time) {
      rampTo(masterGain.gain, SAFETY.masterCeiling, time, SAFETY.startTimeConstant);
    },
    fadeOut(time, duration) {
      linearFade(masterGain.gain, 0, time, duration);
    },
    setMuted(isMuted, time) {
      const timeConstant = isMuted ? SAFETY.muteTimeConstant : SAFETY.unmuteTimeConstant;
      rampTo(muteGain.gain, isMuted ? 0 : 1, time, timeConstant);
    },
    dispose() {
      panLfo.stop();
      input.disconnect();
      masterGain.disconnect();
      analyser.disconnect();
    },
  };
}
