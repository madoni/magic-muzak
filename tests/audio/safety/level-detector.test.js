import { describe, expect, it } from 'vitest';
import { createLevelDetector } from '../../../src/audio/safety/level-detector.js';
import { SAFETY } from '../../../src/audio/safety/safety-config.js';

const dbToGain = (db) => 10 ** (db / 20);

// levelAt(t) returns [peak, rmsDb]; reports arrive every SAFETY.reportInterval like the worklet.
function feed(levelAt, duration, detector = createLevelDetector()) {
  for (let t = 0; t <= duration; t += SAFETY.reportInterval) {
    const [peak, rmsDb] = levelAt(t);
    const reason = detector.push(t, peak, dbToGain(rmsDb));
    if (reason) return { reason, time: t, detector };
  }
  return { reason: null, detector };
}

describe('level detector', () => {
  describe('does not trip on normal playing', () => {
    it('steady level', () => {
      expect(feed(() => [0.3, -24], 20).reason).toBeNull();
    });

    it('musical swells and envelopes', () => {
      expect(feed((t) => [0.4, -26 + 6 * Math.sin(t * 3)], 30).reason).toBeNull();
    });

    it('a note starting from silence', () => {
      expect(feed((t) => (t < 2 ? [0, -100] : [0.35, -20]), 5).reason).toBeNull();
    });

    it('a gradual unmute', () => {
      const unmute = (t) => {
        if (t < 3) return [0, -100];
        const gain = 1 - Math.exp(-(t - 3) / SAFETY.unmuteTimeConstant);
        return [0.35 * gain, 20 * Math.log10(0.1 * gain + 1e-9)];
      };
      expect(feed(unmute, 10).reason).toBeNull();
    });

    it('a 300 ms crossfade between engines', () => {
      const crossfade = (t) => (t >= 2 && t < 2.3 ? [0.3, -23] : [0.3, -24]);
      expect(feed(crossfade, 6).reason).toBeNull();
    });
  });

  describe('trips on unsafe levels', () => {
    it('peaks above the limit', () => {
      expect(feed((t) => [t > 1 ? 0.97 : 0.3, -24], 3).reason).toBe('peak');
    });

    it('non-finite samples', () => {
      expect(feed((t) => [t > 1 ? Infinity : 0.3, -24], 3).reason).toBe('peak');
    });

    it('a sudden jump', () => {
      const { reason, time } = feed((t) => (t < 2 ? [0.1, -40] : [0.5, -12]), 4);
      expect(reason).toBe('jump');
      expect(time).toBeCloseTo(2, 1);
    });

    it('a sustained excessive level', () => {
      const ramp = (t) => [0.6, Math.min(-6, -20 + 12 * t)];
      expect(feed(ramp, 4).reason).toBe('sustained');
    });

    it('a level that keeps creeping up', () => {
      const { reason, time } = feed((t) => [0.4, -30 + t], 30);
      expect(reason).toBe('creep');
      expect(time).toBeGreaterThan(SAFETY.creepWindow);
    });
  });

  it('latches the first trip until reset', () => {
    const detector = createLevelDetector();
    expect(detector.push(0, 0.99, 0.1)).toBe('peak');
    expect(detector.push(0.05, 0.1, 0.01)).toBeNull();
    expect(detector.tripped).toBe('peak');
    detector.reset();
    expect(detector.tripped).toBeNull();
    expect(detector.push(0.1, 0.1, 0.01)).toBeNull();
  });
});
