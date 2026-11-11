export const MODES = Object.freeze({
  lydian: Object.freeze([0, 2, 4, 6, 7, 9, 11]),
  ionian: Object.freeze([0, 2, 4, 5, 7, 9, 11]),
  mixolydian: Object.freeze([0, 2, 4, 5, 7, 9, 10]),
  dorian: Object.freeze([0, 2, 3, 5, 7, 9, 10]),
  aeolian: Object.freeze([0, 2, 3, 5, 7, 8, 10]),
  phrygian: Object.freeze([0, 1, 3, 5, 7, 8, 10]),
});

// Ordered brightest to darkest so neighbouring modes differ by one note.
export const MODE_ORDER = Object.freeze([
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
]);

export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export function degreeToMidi(key, degree, baseMidi) {
  const intervals = MODES[key.mode];
  const octave = Math.floor(degree / intervals.length);
  const index = degree - octave * intervals.length;
  return baseMidi + key.root + octave * 12 + intervals[index];
}

export function quantisePosition(position, key, { baseMidi = 60, octaves = 2 } = {}) {
  const steps = MODES[key.mode].length * octaves;
  const clamped = Math.min(1, Math.max(0, position));
  return degreeToMidi(key, Math.round(clamped * steps), baseMidi);
}
