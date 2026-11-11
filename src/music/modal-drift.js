import { MODE_ORDER } from './scales.js';

export function createModalDrift({ rng, barsPerChange = 4, root = 2, mode = 'dorian' }) {
  let key = Object.freeze({ root, mode });

  function nextKey() {
    if (rng() < 0.6) {
      const index = MODE_ORDER.indexOf(key.mode);
      let next = index + (rng() < 0.5 ? -1 : 1);
      if (next < 0 || next >= MODE_ORDER.length) next = 2 * index - next;
      return Object.freeze({ root: key.root, mode: MODE_ORDER[next] });
    }
    const interval = rng() < 0.5 ? 7 : 5;
    return Object.freeze({ root: (key.root + interval) % 12, mode: key.mode });
  }

  return {
    get key() {
      return key;
    },
    onBar(bar) {
      if (bar > 0 && bar % barsPerChange === 0) key = nextKey();
      return key;
    },
  };
}
