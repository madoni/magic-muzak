import { describe, expect, it } from 'vitest';
import { buildChord, MAX_VOICES, MIN_VOICES } from '../../src/music/harmony.js';
import { MODES } from '../../src/music/scales.js';

const KEY = { root: 0, mode: 'ionian' };

describe('harmony', () => {
  it('grows from sparse to dense voicings with density', () => {
    expect(buildChord(KEY, 0, 0)).toHaveLength(MIN_VOICES);
    expect(buildChord(KEY, 0, 1)).toHaveLength(MAX_VOICES);
  });

  it('builds a root-position triad-like chord at low density', () => {
    expect(buildChord(KEY, 0, 0)).toEqual([48, 52]);
  });

  it('inverts by lifting lower notes an octave', () => {
    const chord = buildChord(KEY, 0, 0.5);
    expect(chord).toEqual([...chord].sort((a, b) => a - b));
    expect(chord[0]).toBeGreaterThan(48);
  });

  it('keeps every note in the mode', () => {
    for (let degree = 0; degree < 7; degree += 1) {
      for (const midi of buildChord(KEY, degree, 1)) {
        expect(MODES.ionian).toContain(midi % 12);
      }
    }
  });
});
