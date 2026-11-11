export const TEMPO = Object.freeze({ min: 40, max: 180, initial: 90, step: 5 });
export const STEPS_PER_BEAT = 4;
export const STEPS_PER_BAR = STEPS_PER_BEAT * 4;

export const clampTempo = (bpm) => Math.min(TEMPO.max, Math.max(TEMPO.min, bpm));

export function createClock(bpm = TEMPO.initial) {
  let tempo = clampTempo(bpm);
  let step = 0;
  let nextTime = 0;

  return {
    get bpm() {
      return tempo;
    },
    get stepDuration() {
      return 60 / tempo / STEPS_PER_BEAT;
    },
    setTempo(value) {
      tempo = clampTempo(value);
      return tempo;
    },
    start(time) {
      step = 0;
      nextTime = time;
    },
    advance(until, onStep) {
      while (nextTime < until) {
        onStep(step, nextTime);
        step += 1;
        nextTime += 60 / tempo / STEPS_PER_BEAT;
      }
    },
  };
}
