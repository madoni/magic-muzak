import { createEngineSwitcher } from './audio/engine-switcher.js';
import { ENGINE_NAMES, ENGINES } from './audio/engines/index.js';
import { createMasterBus } from './audio/master-bus.js';
import { createLevelGuard, loadLevelGuard } from './audio/safety/level-guard.js';
import { SAFETY } from './audio/safety/safety-config.js';
import { createPointerTracker } from './input/pointer-tracker.js';
import { createClock, TEMPO } from './music/clock.js';
import { createComposer } from './music/composer.js';
import { createModalDrift } from './music/modal-drift.js';
import { createRng } from './music/random.js';
import { createScheduler } from './music/scheduler.js';

const MESSAGES = Object.freeze({
  paused: 'Paused – press Space to resume',
  tripped: 'Auto-stopped for safety – press Space to restart',
  muted: 'Muted',
  unavailable: 'Audio is unavailable in this browser',
});

// Echoes of the delay land on a dotted eighth.
const DELAY_STEPS = 3;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createApp({ hint, root, now = () => performance.now() / 1000, seed = Date.now() }) {
  const rng = createRng(seed);
  const tracker = createPointerTracker();
  const clock = createClock();
  const composer = createComposer({ rng, drift: createModalDrift({ rng }) });

  let audio = null;
  let state = 'idle';
  let muted = false;
  let engineNumber = 1;
  let queue = Promise.resolve();

  const sink = {
    note(freq, velocity, time, duration, glideFrom) {
      const engine = audio.switcher.engine;
      if (!engine) return;
      engine.noteOff(engine.noteOn(freq, velocity, time, glideFrom), time + duration);
    },
    harmony: (freqs, time) => audio.switcher.engine?.setHarmony(freqs, time),
    brightness: (value, time) => audio.switcher.engine?.setBrightness(value, time),
    drone: (level, time) => audio.switcher.engine?.setDrone(level, time),
    pulse: (time, depth, duration) => audio.switcher.engine?.pulse(time, depth, duration),
  };

  const onStep = (step, time) =>
    composer.step(step, time, tracker.sample(now()), clock.stepDuration, sink);

  function setState(next) {
    state = next;
    root.dataset.state = next;
  }

  function fail(error) {
    console.error(error);
    setState('error');
    hint.set(MESSAGES.unavailable);
  }

  const enqueue = (task) => {
    queue = queue.then(task).catch(fail);
    return queue;
  };

  async function initAudio() {
    const ctx = new AudioContext({ latencyHint: 'balanced' });
    await loadLevelGuard(ctx);
    const guard = createLevelGuard(ctx, { onTrip: (reason) => enqueue(() => trip(reason)) });
    const master = createMasterBus(ctx, { guardNode: guard.node, rng, muted });
    const switcher = createEngineSwitcher(ctx, master.input, ENGINES);
    const scheduler = createScheduler(ctx, clock, onStep);
    return { ctx, guard, master, switcher, scheduler };
  }

  async function start() {
    audio ??= await initAudio();
    const { ctx, guard, master, switcher, scheduler } = audio;
    await ctx.resume();
    guard.detector.reset();
    delete root.dataset.trip;

    const time = ctx.currentTime + 0.05;
    await switcher.select(engineNumber, time);
    master.setDelayTime(clock.stepDuration * DELAY_STEPS, time);
    master.fadeIn(time);
    scheduler.start(time);
    setState('running');
    hint.set(muted ? MESSAGES.muted : '');
  }

  async function stop(nextState, message, fade) {
    const { ctx, master, scheduler } = audio;
    scheduler.stop();
    master.fadeOut(ctx.currentTime, fade);
    setState(nextState);
    hint.set(message);
    await wait((fade + 0.05) * 1000);
    await ctx.suspend();
  }

  function trip(reason) {
    if (state !== 'running') return undefined;
    root.dataset.trip = reason;
    return stop('tripped', MESSAGES.tripped, SAFETY.tripFade);
  }

  function toggle() {
    enqueue(() => {
      if (state === 'error') return undefined;
      return state === 'running' ? stop('stopped', MESSAGES.paused, 0.15) : start();
    });
  }

  function toggleMute() {
    muted = !muted;
    root.dataset.muted = String(muted);
    if (audio) audio.master.setMuted(muted, audio.ctx.currentTime);
    if (state === 'running') hint.set(muted ? MESSAGES.muted : '');
    else hint.show(muted ? MESSAGES.muted : 'Unmuted');
  }

  function selectEngine(number) {
    if (!ENGINES[number]) {
      hint.show(`${ENGINE_NAMES[number]} engine is not available yet`);
      return;
    }
    engineNumber = number;
    root.dataset.engine = String(number);
    hint.show(ENGINE_NAMES[number]);
    if (state === 'running') enqueue(() => audio.switcher.select(number, audio.ctx.currentTime));
  }

  function changeTempo(delta) {
    const bpm = clock.setTempo(clock.bpm + delta * TEMPO.step);
    root.dataset.tempo = String(bpm);
    hint.show(`${bpm} BPM`);
    if (state === 'running') {
      audio.master.setDelayTime(clock.stepDuration * DELAY_STEPS, audio.ctx.currentTime);
    }
  }

  setState(state);
  root.dataset.muted = String(muted);
  root.dataset.engine = String(engineNumber);
  root.dataset.tempo = String(clock.bpm);

  return {
    dispatch(action) {
      switch (action.type) {
        case 'toggle':
          return toggle();
        case 'mute':
          return toggleMute();
        case 'engine':
          return selectEngine(action.engine);
        case 'tempo':
          return changeTempo(action.delta);
        default:
          return undefined;
      }
    },
    pointer(x, y, time) {
      tracker.update(x, y, time);
    },
  };
}
