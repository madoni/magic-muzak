const CROSSFADE = 0.3;
const CURVE_LENGTH = 64;
const fadeInCurve = new Float32Array(CURVE_LENGTH);
const fadeOutCurve = new Float32Array(CURVE_LENGTH);
for (let i = 0; i < CURVE_LENGTH; i += 1) {
  const angle = ((i / (CURVE_LENGTH - 1)) * Math.PI) / 2;
  fadeInCurve[i] = Math.sin(angle);
  fadeOutCurve[i] = Math.cos(angle);
}

export function createEngineSwitcher(ctx, destination, factories) {
  let active = null;
  // Overlapping value curves on one param throw, so switches are refused mid-crossfade.
  let busyUntil = 0;

  return {
    get engine() {
      return active?.engine ?? null;
    },
    get number() {
      return active?.number ?? 0;
    },
    async select(number, time = ctx.currentTime) {
      const factory = factories[number];
      if (!factory || number === active?.number || time < busyUntil) return false;
      busyUntil = Infinity;

      const fade = new GainNode(ctx, { gain: 0 });
      fade.connect(destination);
      const engine = await factory(ctx, { output: fade });
      const start = Math.max(time, ctx.currentTime);
      fade.gain.setValueCurveAtTime(fadeInCurve, start, CROSSFADE);

      const previous = active;
      if (previous) {
        previous.fade.gain.setValueCurveAtTime(fadeOutCurve, start, CROSSFADE);
        setTimeout(() => {
          previous.engine.dispose();
          previous.fade.disconnect();
        }, (start - ctx.currentTime + CROSSFADE + 0.1) * 1000);
      }

      active = { number, engine, fade };
      busyUntil = start + CROSSFADE + 0.01;
      return true;
    },
    dispose() {
      if (!active) return;
      active.engine.dispose();
      active.fade.disconnect();
      active = null;
      busyUntil = 0;
    },
  };
}
