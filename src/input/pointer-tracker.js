const clamp01 = (value) => Math.min(1, Math.max(0, value));

// Positions are normalised 0–1 with y = 1 at the top; times are in seconds.
export function createPointerTracker({
  maxSpeed = 1.5,
  smoothing = 0.25,
  idleAfter = 1.5,
  idleFade = 4,
} = {}) {
  let x = 0.5;
  let y = 0.5;
  let speed = 0;
  let lastTime = -Infinity;
  const state = { x, y, speed, idle: true, idleAmount: 1 };

  return {
    update(nextX, nextY, time) {
      const dt = time - lastTime;
      if (dt > 0 && Number.isFinite(dt)) {
        const instant = Math.min(1, Math.hypot(nextX - x, nextY - y) / dt / maxSpeed);
        const keep = Math.exp(-dt / smoothing);
        speed = speed * keep + instant * (1 - keep);
      }
      x = clamp01(nextX);
      y = clamp01(nextY);
      lastTime = time;
    },
    // Returns a shared object to avoid allocating on every scheduler step.
    sample(time) {
      const since = Math.max(0, time - lastTime);
      const moved = Number.isFinite(since);
      state.x = x;
      state.y = y;
      state.speed = moved ? speed * Math.exp(-since / smoothing) : 0;
      state.idle = !(since < idleAfter);
      state.idleAmount = moved ? clamp01((since - idleAfter) / idleFade) : 1;
      return state;
    },
  };
}
