import { describe, expect, it } from 'vitest';
import { createModalDrift } from '../../src/music/modal-drift.js';
import { createRng } from '../../src/music/random.js';
import { MODE_ORDER, MODES } from '../../src/music/scales.js';

function keysOver(seed, bars) {
  const drift = createModalDrift({ rng: createRng(seed) });
  return Array.from({ length: bars }, (_, bar) => drift.onBar(bar));
}

describe('modal drift', () => {
  it('only changes key on change boundaries', () => {
    const keys = keysOver(7, 16);
    for (let bar = 1; bar < keys.length; bar += 1) {
      if (bar % 4 !== 0) expect(keys[bar]).toBe(keys[bar - 1]);
    }
  });

  it('is reproducible for the same seed', () => {
    expect(keysOver(42, 64)).toEqual(keysOver(42, 64));
  });

  it('moves to a neighbouring mode or by a fourth/fifth', () => {
    const keys = keysOver(3, 200);
    for (let bar = 4; bar < keys.length; bar += 4) {
      const before = keys[bar - 1];
      const after = keys[bar];
      expect(MODES[after.mode]).toBeDefined();
      if (after.mode !== before.mode) {
        expect(after.root).toBe(before.root);
        const distance = Math.abs(MODE_ORDER.indexOf(after.mode) - MODE_ORDER.indexOf(before.mode));
        expect(distance).toBe(1);
      } else {
        expect([5, 7]).toContain((after.root - before.root + 12) % 12);
      }
    }
  });
});
