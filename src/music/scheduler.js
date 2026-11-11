// Timers only decide *when to schedule*; all sound timing comes from ctx.currentTime.
export function createScheduler(ctx, clock, onStep, { intervalMs = 25, lookahead = 0.1 } = {}) {
  let timer = null;

  const tick = () => {
    clock.advance(ctx.currentTime + lookahead, onStep);
    timer = setTimeout(tick, intervalMs);
  };

  return {
    get running() {
      return timer !== null;
    },
    start(time) {
      if (timer !== null) return;
      clock.start(time);
      tick();
    },
    stop() {
      clearTimeout(timer);
      timer = null;
    },
  };
}
