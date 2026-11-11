import { describe, expect, it } from 'vitest';
import { clampTempo, createClock, TEMPO } from '../../src/music/clock.js';

describe('clock', () => {
  it('clamps tempo to the allowed range', () => {
    expect(clampTempo(10)).toBe(TEMPO.min);
    expect(clampTempo(500)).toBe(TEMPO.max);
    expect(createClock().bpm).toBe(90);
  });

  it('emits every step due before the lookahead horizon', () => {
    const clock = createClock(120);
    const steps = [];
    clock.start(1);
    clock.advance(2, (step, time) => steps.push([step, time]));
    expect(steps).toHaveLength(8);
    expect(steps[0]).toEqual([0, 1]);
    expect(steps[7][1]).toBeCloseTo(1 + 7 * 0.125);
  });

  it('continues from where it left off and applies tempo changes', () => {
    const clock = createClock(120);
    const times = [];
    clock.start(0);
    clock.advance(0.25, (_, time) => times.push(time));
    clock.setTempo(60);
    clock.advance(0.75, (_, time) => times.push(time));
    expect(times).toEqual([0, 0.125, 0.25, 0.5]);
  });
});
