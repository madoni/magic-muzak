import { describe, expect, it } from 'vitest';
import { createVoicePool } from '../../src/audio/voice-pool.js';

describe('voice pool', () => {
  it('uses free slots before stealing', () => {
    const pool = createVoicePool(3);
    expect([pool.acquire(0), pool.acquire(1), pool.acquire(2)]).toEqual([0, 1, 2]);
  });

  it('steals the oldest note when full', () => {
    const pool = createVoicePool(3);
    pool.acquire(2);
    pool.acquire(0);
    pool.acquire(1);
    expect(pool.acquire(3)).toBe(1);
  });

  it('reuses a slot once its note has been released', () => {
    const pool = createVoicePool(2);
    pool.acquire(0);
    pool.acquire(0.5);
    pool.release(1, 1);
    expect(pool.acquire(0.9)).toBe(0);
    expect(pool.acquire(1.2)).toBe(1);
  });
});
