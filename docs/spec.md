# magik-muzak Phase 1 Specification

An interactive, browser-based generative audio instrument built on the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). There is no conventional UI: the keyboard controls transport and engines, mouse movement shapes the music, and a minimal canvas reacts to the sound.

## Goals

- Generate complex, evolving audio textures: ambient/drone pads, shimmering clouds, and rhythmic pulsing.
- Use several synthesis techniques, selectable at runtime.
- Use the Web Audio API efficiently and keep output levels safe at all times.

## Platform

- Google Chrome desktop (latest) only for now. Touch and mobile are out of scope.
- Node version pinned in [.nvmrc](../.nvmrc).
- Tooling: Vite, Vitest in browser mode (Playwright provider), Playwright E2E, and ESLint flat config. Tests use the installed Chrome (`channel: 'chrome'`), so no browser download is needed.

## Controls

| Input | Action |
|---|---|
| Space | Start/stop. The `AudioContext` is created on the first press and resumed/suspended afterwards. |
| M | Mute/unmute with a ~50 ms ramp. Scheduling continues while muted. |
| 1–4 | Switch engine with a ~300 ms equal-power crossfade. |
| ArrowUp / ArrowDown | Tempo ±5 BPM, clamped to 40–180, default 90. |
| Mouse X | Melody pitch, quantised to the current mode with portamento glides. |
| Mouse Y | Harmony: chord voicing density and inversion. |
| Mouse velocity | Dynamics and filter brightness. |
| Mouse idle | Texture decays toward a sustained drone. |

Clicks do nothing. Space and arrow keys must not scroll the page.

## Musical behaviour

- Harmony drifts automatically between modes and roots, changing only on bar boundaries. Drift is seeded so it can be reproduced in tests.
- A tempo clock drives melody, harmony changes, and rhythmic pulses.
- "Shimmer" is produced by detuned additive partials with modulated delay and reverb; there is no granular engine.

## Synthesis engines

All engines share one contract:

```js
createEngine(ctx, { output }) => {
  noteOn(freq, velocity, time), noteOff(id, time),
  setHarmony(chord, time), setBrightness(value, time), setDrone(level, time),
  dispose(),
}
```

1. Subtractive: oscillators → filter → envelope.
2. Additive: `PeriodicWave` plus detuned partials.
3. FM / AM / ring modulation.
4. Physical modelling: Karplus-Strong in an `AudioWorkletProcessor`, loaded once.

## Audio graph

```
engine(s) → engine switcher (crossfade) → stereo panner/width
          → dry + delay send (filtered feedback) + reverb send (generated IR)
          → DynamicsCompressor limiter → mute gain → master gain (ceiling 0.5)
          → level guard (AudioWorklet) → analyser → destination
```

## Safety guardrails

### Volume guard

- Every audible gain change uses `setTargetAtTime` or linear ramps of at least ~50 ms; never instant jumps.
- The master gain is hard-capped at 0.5.
- A level-guard `AudioWorkletProcessor` measures peak and RMS on the audio thread and reports roughly every 50 ms, so detection works even when animation frames are throttled.
- A pure detector module trips on any of:
  - Sudden jump: short-term RMS rises by more than ~12 dB within ~200 ms, above a noise floor.
  - Creeping rise: RMS keeps rising for ~5 s and exceeds the target ceiling.
  - Absolute: peak above ~0.95, or RMS above the ceiling for more than ~300 ms.
- All thresholds live in a single config module.
- When tripped: fade to silence over 100 ms, stop scheduling, suspend the context, and show "Auto-stopped for safety – press Space to restart". Restarting resets the detector.

### Mute

- M toggles a dedicated mute gain placed before the master gain and guard.
- Unmuting ramps in gradually so it never trips the guard. The hint shows "Muted" while muted.

## Performance

- At most 16 voices; when full, the oldest voice is stolen.
- Prefer long-lived nodes; avoid allocation in hot paths such as animation frames and scheduler ticks.
- Schedule sound with `AudioParam` automation; use JavaScript timers only for the lookahead scheduler (~25 ms tick, ~100 ms schedule-ahead, based on `ctx.currentTime`).
- The canvas animates only while running, reuses its analyser buffer, and respects `prefers-reduced-motion`.

## Testing

All tests run in the installed Google Chrome.

- Unit tests for pure modules: scales, modal drift, harmony, mapping, scheduler math, voice pool, level detector.
- Graph tests: engines and master bus connect correctly, respect the voice cap, and disconnect on `dispose`.
- Offline render tests with `OfflineAudioContext`: each engine is non-silent and peaks stay at or below 1.0.
- Safety tests: the detector trips on jumps, creeping rises, and excessive levels, but not on normal envelopes, crossfades, or unmuting. A loud ramp fed through the guard triggers auto-stop.
- E2E (Playwright): Space toggles playback, M toggles mute, 1–4 switch engines, arrows change tempo, and no console errors occur.

## Delivery increments

1. Scaffold, pure music/input modules, audio infrastructure including both guardrails, and the subtractive engine working end to end.
2. Additive, FM/AM/ring, and physical-modelling engines with crossfade switching.
3. Reactive canvas and listening/performance polish.

## Out of scope

Touch/mobile, MIDI, recording or export, sample loading, granular synthesis, persistent settings, and visible UI controls.
