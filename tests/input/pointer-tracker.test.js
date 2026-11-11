import { describe, expect, it } from 'vitest';
import { createPointerTracker } from '../../src/input/pointer-tracker.js';

describe('pointer tracker', () => {
  it('starts idle and centred', () => {
    const state = createPointerTracker().sample(10);
    expect(state).toMatchObject({ x: 0.5, y: 0.5, speed: 0, idle: true, idleAmount: 1 });
  });

  it('reports speed while moving and clamps positions', () => {
    const tracker = createPointerTracker();
    for (let i = 0; i <= 30; i += 1) tracker.update(i / 20, 0.5, i / 60);
    const state = tracker.sample(0.5);
    expect(state.x).toBe(1);
    expect(state.speed).toBeGreaterThan(0.5);
    expect(state.idle).toBe(false);
  });

  it('decays speed and fades into idle after stopping', () => {
    const tracker = createPointerTracker({ idleAfter: 1, idleFade: 2 });
    for (let i = 0; i <= 30; i += 1) tracker.update(i / 60, 0.5, i / 60);
    expect(tracker.sample(1).speed).toBeLessThan(tracker.sample(0.5).speed);
    expect(tracker.sample(1.4).idle).toBe(false);
    expect(tracker.sample(2.5).idleAmount).toBeCloseTo(0.5);
    expect(tracker.sample(10).idleAmount).toBe(1);
  });

  it('reuses one state object', () => {
    const tracker = createPointerTracker();
    expect(tracker.sample(0)).toBe(tracker.sample(1));
  });
});
