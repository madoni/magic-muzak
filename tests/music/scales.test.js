import { describe, expect, it } from 'vitest';
import { degreeToMidi, midiToHz, MODES, quantisePosition } from '../../src/music/scales.js';

const DORIAN_D = { root: 2, mode: 'dorian' };

describe('scales', () => {
  it('converts MIDI to frequency', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(57)).toBeCloseTo(220);
  });

  it('maps degrees across octaves, including negative degrees', () => {
    expect(degreeToMidi(DORIAN_D, 0, 60)).toBe(62);
    expect(degreeToMidi(DORIAN_D, 7, 60)).toBe(74);
    expect(degreeToMidi(DORIAN_D, -1, 60)).toBe(60);
  });

  it('quantises positions to notes in the mode', () => {
    const intervals = MODES.dorian;
    for (let i = 0; i <= 20; i += 1) {
      const midi = quantisePosition(i / 20, DORIAN_D);
      const pitchClass = (((midi - 60 - DORIAN_D.root) % 12) + 12) % 12;
      expect(intervals).toContain(pitchClass);
    }
  });

  it('clamps positions outside 0–1 to the range ends', () => {
    expect(quantisePosition(-1, DORIAN_D)).toBe(quantisePosition(0, DORIAN_D));
    expect(quantisePosition(2, DORIAN_D)).toBe(quantisePosition(1, DORIAN_D));
    expect(quantisePosition(1, DORIAN_D)).toBe(62 + 24);
  });
});
