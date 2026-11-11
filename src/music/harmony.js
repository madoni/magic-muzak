import { degreeToMidi } from './scales.js';

export const MIN_VOICES = 2;
export const MAX_VOICES = 5;

// Density (0–1) sets both the number of stacked thirds and how far the voicing is inverted.
export function buildChord(key, chordDegree, density, baseMidi = 48) {
  const amount = Math.min(1, Math.max(0, density));
  const count = MIN_VOICES + Math.round(amount * (MAX_VOICES - MIN_VOICES));
  const inversion = Math.min(count - 1, Math.floor(amount * 3));
  const notes = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const midi = degreeToMidi(key, chordDegree + i * 2, baseMidi);
    notes[i] = i < inversion ? midi + 12 : midi;
  }
  return notes.sort((a, b) => a - b);
}
