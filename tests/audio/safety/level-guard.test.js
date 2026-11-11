import { describe, expect, it } from 'vitest';
import { createLevelGuard, loadLevelGuard } from '../../../src/audio/safety/level-guard.js';
import { createOffline, measureBlocks } from '../../helpers/audio.js';

// Worklet port messages are delivered after rendering resolves.
const drainMessages = () => new Promise((resolve) => setTimeout(resolve, 100));

async function renderThroughGuard(seconds, connectSource) {
  const ctx = createOffline(seconds);
  await loadLevelGuard(ctx);
  const trips = [];
  const guard = createLevelGuard(ctx, { onTrip: (reason) => trips.push(reason) });
  guard.node.connect(ctx.destination);
  connectSource(ctx, guard.node);
  const buffer = await ctx.startRendering();
  await drainMessages();
  return { buffer, trips };
}

describe('level guard worklet', () => {
  it('passes a safe signal through unchanged without tripping', async () => {
    const { buffer, trips } = await renderThroughGuard(1, (ctx, node) => {
      const source = new OscillatorNode(ctx, { frequency: 220 });
      source.connect(new GainNode(ctx, { gain: 0.1 })).connect(node);
      source.start();
    });
    const peaks = measureBlocks(buffer).map((b) => b.peak);
    expect(Math.max(...peaks)).toBeCloseTo(0.1, 2);
    expect(trips).toEqual([]);
  });

  it('trips when a signal ramps up to unsafe levels', async () => {
    const { trips } = await renderThroughGuard(3, (ctx, node) => {
      const source = new OscillatorNode(ctx, { frequency: 220 });
      const gain = new GainNode(ctx, { gain: 0.01 });
      gain.gain.linearRampToValueAtTime(0.99, 2);
      source.connect(gain).connect(node);
      source.start();
    });
    expect(trips).toHaveLength(1);
  });
});
