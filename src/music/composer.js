import { STEPS_PER_BAR, STEPS_PER_BEAT } from './clock.js';
import { buildChord } from './harmony.js';
import { midiToHz, quantisePosition } from './scales.js';

const CHORD_DEGREES = Object.freeze([0, 3, 4, 5, 2]);
const MELODY_RANGE = Object.freeze({ baseMidi: 60, octaves: 2 });
const GLIDE_WINDOW_STEPS = 4;

function sameNotes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

// Turns clock steps plus pointer state into calls on a sink (usually the active engine).
export function createComposer({ rng, drift }) {
  let key = drift.key;
  let chordDegree = 0;
  let chord = null;
  let lastMelodyStep = -Infinity;
  let lastMelodyFreq = 0;

  function updateHarmony(input, time, sink) {
    const next = buildChord(key, chordDegree, input.y);
    if (chord && sameNotes(chord, next)) return;
    chord = next;
    sink.harmony(chord.map(midiToHz), time);
  }

  return {
    get key() {
      return key;
    },
    step(step, time, input, stepDuration, sink) {
      if (step % STEPS_PER_BAR === 0) {
        const bar = step / STEPS_PER_BAR;
        key = drift.onBar(bar);
        if (bar > 0) chordDegree = CHORD_DEGREES[Math.floor(rng() * CHORD_DEGREES.length)];
        chord = null;
      }

      if (step % STEPS_PER_BEAT === 0) {
        updateHarmony(input, time, sink);
        sink.brightness(0.15 + 0.85 * input.speed, time);
        sink.drone(0.35 + 0.65 * input.idleAmount, time);
        const depth = 0.6 * (1 - input.idleAmount) * (0.3 + 0.7 * input.speed);
        sink.pulse(time, depth, stepDuration * STEPS_PER_BEAT);
      }

      if (input.idle) return;
      const division = input.speed > 0.6 ? 1 : input.speed > 0.25 ? 2 : 4;
      if (step % division !== 0) return;

      const freq = midiToHz(quantisePosition(input.x, key, MELODY_RANGE));
      const glideFrom = step - lastMelodyStep <= GLIDE_WINDOW_STEPS ? lastMelodyFreq : 0;
      sink.note(freq, 0.35 + 0.65 * input.speed, time, division * stepDuration * 0.9, glideFrom);
      lastMelodyStep = step;
      lastMelodyFreq = freq;
    },
  };
}
