import { describe, expect, it } from 'vitest';
import { createComposer } from '../../src/music/composer.js';
import { createModalDrift } from '../../src/music/modal-drift.js';
import { createRng } from '../../src/music/random.js';
import { MODES } from '../../src/music/scales.js';

const STEP = 0.125;

function createSink() {
  const calls = { note: [], harmony: [], brightness: [], drone: [], pulse: [] };
  return {
    calls,
    note: (...args) => calls.note.push(args),
    harmony: (...args) => calls.harmony.push(args),
    brightness: (...args) => calls.brightness.push(args),
    drone: (...args) => calls.drone.push(args),
    pulse: (...args) => calls.pulse.push(args),
  };
}

function run(input, steps) {
  const composer = createComposer({
    rng: createRng(1),
    drift: createModalDrift({ rng: createRng(2) }),
  });
  const sink = createSink();
  for (let step = 0; step < steps; step += 1) composer.step(step, step * STEP, input, STEP, sink);
  return { composer, calls: sink.calls };
}

const moving = (speed) => ({ x: 0.5, y: 0.5, speed, idle: false, idleAmount: 0 });

describe('composer', () => {
  it('plays no melody when idle and raises the drone', () => {
    const { calls } = run({ x: 0.5, y: 0.5, speed: 0, idle: true, idleAmount: 1 }, 32);
    expect(calls.note).toHaveLength(0);
    expect(calls.drone.every(([level]) => level === 1)).toBe(true);
    expect(calls.pulse.every(([, depth]) => depth === 0)).toBe(true);
  });

  it('scales melodic density with movement speed', () => {
    expect(run(moving(1), 16).calls.note).toHaveLength(16);
    expect(run(moving(0.4), 16).calls.note).toHaveLength(8);
    expect(run(moving(0.1), 16).calls.note).toHaveLength(4);
  });

  it('glides between consecutive melody notes', () => {
    const { calls } = run(moving(1), 3);
    expect(calls.note[0][4]).toBe(0);
    expect(calls.note[1][4]).toBe(calls.note[0][0]);
  });

  it('refreshes harmony on every bar', () => {
    const { calls } = run(moving(0.5), 64);
    const times = calls.harmony.map(([, time]) => time);
    for (const bar of [0, 1, 2, 3]) expect(times).toContain(bar * 16 * STEP);
  });

  it('keeps melody notes in the current key', () => {
    const input = moving(1);
    const composer = createComposer({
      rng: createRng(5),
      drift: createModalDrift({ rng: createRng(6) }),
    });
    const sink = createSink();
    for (let step = 0; step < 256; step += 1) {
      input.x = (step * 0.37) % 1;
      composer.step(step, step * STEP, input, STEP, sink);
      const note = sink.calls.note.at(-1);
      const midi = Math.round(69 + 12 * Math.log2(note[0] / 440));
      const { root, mode } = composer.key;
      expect(MODES[mode]).toContain((((midi - root) % 12) + 12) % 12);
    }
  });
});
