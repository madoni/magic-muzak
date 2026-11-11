import { describe, expect, it } from 'vitest';
import { createSubtractiveEngine } from '../../src/audio/engines/subtractive.js';
import { createMasterBus } from '../../src/audio/master-bus.js';
import { createLevelDetector } from '../../src/audio/safety/level-detector.js';
import { createClock } from '../../src/music/clock.js';
import { createComposer } from '../../src/music/composer.js';
import { createModalDrift } from '../../src/music/modal-drift.js';
import { createRng } from '../../src/music/random.js';
import { createOffline, measureBlocks, toDb } from '../helpers/audio.js';

function engineSink(engine) {
  return {
    note(freq, velocity, time, duration, glideFrom) {
      engine.noteOff(engine.noteOn(freq, velocity, time, glideFrom), time + duration);
    },
    harmony: (freqs, time) => engine.setHarmony(freqs, time),
    brightness: (value, time) => engine.setBrightness(value, time),
    drone: (level, time) => engine.setDrone(level, time),
    pulse: (time, depth, duration) => engine.pulse(time, depth, duration),
  };
}

describe('subtractive engine (offline render)', () => {
  it('produces audible, bounded output', async () => {
    const ctx = createOffline(2);
    const engine = createSubtractiveEngine(ctx, { output: ctx.destination });
    engine.setDrone(1, 0);
    engine.setHarmony([110, 165, 220], 0);
    engine.noteOff(engine.noteOn(440, 1, 0.1), 1);

    const blocks = measureBlocks(await ctx.startRendering());
    expect(Math.max(...blocks.map((b) => b.rms))).toBeGreaterThan(0.01);
    expect(Math.max(...blocks.map((b) => b.peak))).toBeLessThanOrEqual(1);
  });

  it('is silent after dispose', async () => {
    const ctx = createOffline(1);
    const engine = createSubtractiveEngine(ctx, { output: ctx.destination });
    engine.setHarmony([220], 0);
    engine.noteOn(440, 1, 0);
    engine.dispose();

    const blocks = measureBlocks(await ctx.startRendering());
    expect(Math.max(...blocks.map((b) => b.peak))).toBe(0);
  });

  it('caps polyphony when flooded with overlapping notes', async () => {
    const ctx = createOffline(1);
    const engine = createSubtractiveEngine(ctx, { output: ctx.destination });
    for (let i = 0; i < 64; i += 1) engine.noteOn(220 + i * 10, 1, i * 0.005);

    const blocks = measureBlocks(await ctx.startRendering());
    expect(Math.max(...blocks.map((b) => b.peak))).toBeLessThanOrEqual(1);
  });
});

describe('full chain (offline render)', () => {
  it('busy playing, muting and unmuting stays within safe levels', async () => {
    const duration = 12;
    const ctx = createOffline(duration);
    const master = createMasterBus(ctx, { rng: createRng(1) });
    const engine = createSubtractiveEngine(ctx, { output: master.input });
    const sink = engineSink(engine);
    const composer = createComposer({
      rng: createRng(2),
      drift: createModalDrift({ rng: createRng(3) }),
    });
    const clock = createClock(180);
    const input = { x: 0, y: 0, speed: 1, idle: false, idleAmount: 0 };

    master.fadeIn(0);
    master.setDelayTime(clock.stepDuration * 3, 0);
    master.setMuted(true, 6);
    master.setMuted(false, 7.5);
    clock.start(0.05);
    clock.advance(duration - 0.5, (step, time) => {
      input.x = (step * 0.137) % 1;
      input.y = (step * 0.031) % 1;
      composer.step(step, time, input, clock.stepDuration, sink);
    });

    const blocks = measureBlocks(await ctx.startRendering());
    const detector = createLevelDetector();
    const trips = blocks.map((b) => detector.push(b.time, b.peak, b.rms)).filter(Boolean);
    const loudest = Math.max(...blocks.map((b) => b.rms));

    expect(trips, `loudest block ${toDb(loudest).toFixed(1)} dBFS`).toEqual([]);
    expect(toDb(loudest)).toBeGreaterThan(-40);
  });
});
