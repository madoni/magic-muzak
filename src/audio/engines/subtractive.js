import { rampTo } from '../params.js';
import { createVoicePool } from '../voice-pool.js';

// 11 melody + 5 pad voices keeps the engine within the 16-voice budget.
const MELODY_VOICES = 11;
const PAD_VOICES = 5;
const MELODY_LEVEL = 0.08;
const PAD_LEVEL = 0.04;
const GLIDE_TIME = 0.06;

function createVoice(ctx, destination, { detune, pan, cutoff }) {
  const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: cutoff, Q: 1.5 });
  const amp = new GainNode(ctx, { gain: 0 });
  const panner = new StereoPannerNode(ctx, { pan });
  const oscillators = [
    new OscillatorNode(ctx, { type: 'sawtooth', detune: -detune }),
    new OscillatorNode(ctx, { type: 'sawtooth', detune }),
  ];
  for (const oscillator of oscillators) {
    oscillator.connect(filter);
    oscillator.start();
  }
  filter.connect(amp).connect(panner).connect(destination);
  return { oscillators, filter, amp, panner };
}

const spread = (index, count, width) => -width + (2 * width * index) / (count - 1);

// Oscillators run for the engine's lifetime; notes only automate gain, pitch and filter.
export function createSubtractiveEngine(ctx, { output }) {
  const melodyBus = new GainNode(ctx);
  const padBus = new GainNode(ctx, { gain: 0.5 });
  const pulseGain = new GainNode(ctx);
  melodyBus.connect(output);
  padBus.connect(pulseGain).connect(output);

  const melody = Array.from({ length: MELODY_VOICES }, (_, i) =>
    createVoice(ctx, melodyBus, { detune: 6, pan: spread(i, MELODY_VOICES, 0.6), cutoff: 1200 }),
  );
  const pad = Array.from({ length: PAD_VOICES }, (_, i) =>
    createVoice(ctx, padBus, { detune: 12, pan: spread(i, PAD_VOICES, 0.8), cutoff: 600 }),
  );
  const pool = createVoicePool(MELODY_VOICES);
  const tokens = new Uint32Array(MELODY_VOICES);
  let melodyCutoff = 1200;

  return {
    noteOn(freq, velocity, time, glideFrom = 0) {
      const index = pool.acquire(time);
      tokens[index] += 1;
      const voice = melody[index];

      for (const { frequency } of voice.oscillators) {
        frequency.cancelAndHoldAtTime(time);
        if (glideFrom > 0) {
          frequency.setValueAtTime(glideFrom, time);
          frequency.exponentialRampToValueAtTime(freq, time + GLIDE_TIME);
        } else {
          frequency.setValueAtTime(freq, time);
        }
      }

      const cutoff = voice.filter.frequency;
      cutoff.cancelAndHoldAtTime(time);
      cutoff.setTargetAtTime(melodyCutoff * 2, time, 0.005);
      cutoff.setTargetAtTime(melodyCutoff, time + 0.02, 0.15);

      rampTo(voice.amp.gain, MELODY_LEVEL * velocity, time, 0.01);
      return index + tokens[index] * MELODY_VOICES;
    },
    noteOff(id, time) {
      const index = id % MELODY_VOICES;
      if (Math.floor(id / MELODY_VOICES) !== tokens[index]) return;
      pool.release(index, time);
      rampTo(melody[index].amp.gain, 0, time, 0.12);
    },
    setHarmony(freqs, time) {
      for (let i = 0; i < PAD_VOICES; i += 1) {
        const voice = pad[i];
        if (i < freqs.length) {
          for (const { frequency } of voice.oscillators) rampTo(frequency, freqs[i], time, 0.08);
          rampTo(voice.amp.gain, PAD_LEVEL, time, 0.4);
        } else {
          rampTo(voice.amp.gain, 0, time, 0.4);
        }
      }
    },
    setBrightness(value, time) {
      melodyCutoff = 300 * 2 ** (value * 5);
      const padCutoff = 250 * 2 ** (value * 3);
      for (const voice of pad) rampTo(voice.filter.frequency, padCutoff, time, 0.3);
    },
    setDrone(level, time) {
      rampTo(padBus.gain, level, time, 0.8);
    },
    pulse(time, depth, duration) {
      const { gain } = pulseGain;
      gain.cancelAndHoldAtTime(time);
      gain.setTargetAtTime(1 - depth, time, duration * 0.08);
      gain.setTargetAtTime(1, time + duration * 0.35, duration * 0.2);
    },
    dispose() {
      for (const voice of [...melody, ...pad]) {
        for (const oscillator of voice.oscillators) oscillator.stop();
        voice.panner.disconnect();
      }
      melodyBus.disconnect();
      pulseGain.disconnect();
    },
  };
}
