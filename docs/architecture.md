# magik-muzak Architecture

Current implementation, as of delivery increment 1 ([spec](spec.md)): the subtractive engine
working end to end, both guardrails in place, no canvas yet.

## System diagram

Control flow — DOM events through state into scheduled sound.

```mermaid
flowchart TB
  subgraph browser["Browser events"]
    KD["keydown"]
    PM["pointermove"]
  end

  subgraph input["Input · src/input"]
    KM["keymap.js<br/>code to action"]
    PT["pointer-tracker.js<br/>x, y, speed, idle"]
  end

  subgraph shell["Shell · src/app.js, main.js"]
    APP["createApp<br/>state machine: idle, running,<br/>stopped, tripped, error<br/>serialised task queue"]
    HINT["ui/hint.js<br/>#hint text"]
  end

  subgraph music["Music · src/music (pure)"]
    CLK["clock.js<br/>BPM, 16 steps per bar"]
    SCH["scheduler.js<br/>25 ms tick, 100 ms lookahead"]
    CMP["composer.js<br/>steps + pointer to notes"]
    DRIFT["modal-drift.js<br/>key change every 4 bars"]
    SCALES["scales.js · harmony.js"]
    RNG["random.js<br/>seeded mulberry32"]
  end

  subgraph audio["Audio · src/audio"]
    SW["engine-switcher.js<br/>300 ms equal-power crossfade"]
    ENG["engines/subtractive.js"]
    MB["master-bus.js"]
    GUARD["safety/level-guard.js"]
    DET["safety/level-detector.js<br/>pure"]
  end

  KD --> KM --> APP
  PM --> PT
  APP -->|dispatch| HINT
  APP -->|"Space: start, stop"| SCH
  APP -->|"1-4"| SW
  APP -->|"arrows: tempo"| CLK
  APP -->|"M: mute"| MB

  SCH -->|ctx.currentTime + lookahead| CLK
  CLK -->|"onStep(step, time)"| CMP
  PT -->|sample| CMP
  RNG --> CMP
  RNG --> DRIFT
  DRIFT --> CMP
  SCALES --> CMP

  CMP -->|"sink: note, harmony,<br/>brightness, drone, pulse"| SW
  SW --> ENG --> MB
  MB -->|audio| GUARD
  GUARD -->|"peak, rms every 50 ms"| DET
  DET -->|trip reason| APP
  APP -->|"fade 100 ms, stop, suspend"| MB
```

The composer never touches Web Audio directly. It calls a `sink` object that `app.js` forwards to
whichever engine is active, which is what makes `src/music` unit-testable without an `AudioContext`.

Timers only decide *when to schedule*. Every sound event is placed on the audio clock via
`AudioParam` automation at an explicit `time`, so `setTimeout` jitter never reaches the output.

## Signal flow diagram

Every box is a live `AudioNode`. Nodes are created once and reused; notes only automate params.

```mermaid
flowchart LR
  subgraph engine["Subtractive engine — per voice: 2 detuned saws"]
    direction TB
    MV["11 melody voices<br/>saw x2 to lowpass 1200 Hz<br/>to amp to panner"]
    PV["5 pad voices<br/>saw x2 to lowpass 600 Hz<br/>to amp to panner"]
    MBUS["melodyBus"]
    PBUS["padBus 0.5"]
    PULSE["pulseGain<br/>rhythmic ducking"]
    MV --> MBUS
    PV --> PBUS --> PULSE
  end

  FADE["engine fade gain<br/>equal-power crossfade"]
  IN["master input"]
  PAN["StereoPanner"]
  LFO["Osc 0.05 Hz"]
  DEPTH["gain 0.25"]

  DRY["dry 0.8"]
  DS["delaySend 0.22"]
  DLY["Delay<br/>dotted 8th of tempo"]
  TONE["lowpass 2200 Hz"]
  FB["feedback 0.35"]
  RS["reverbSend 0.35"]
  REV["Convolver<br/>generated IR, 3 s"]

  LIM["DynamicsCompressor limiter<br/>-18 dB, ratio 12"]
  MUTE["muteGain<br/>M key"]
  MASTER["masterGain<br/>ceiling 0.5"]
  GUARDN["level-guard AudioWorklet<br/>pass-through meter"]
  ANA["Analyser 2048<br/>unused until phase 3"]
  DEST["destination"]

  MBUS --> FADE
  PULSE --> FADE
  FADE --> IN --> PAN
  LFO --> DEPTH --> PAN

  PAN --> DRY --> LIM
  PAN --> DS --> DLY --> TONE --> LIM
  TONE --> FB --> DLY
  PAN --> RS --> REV --> LIM

  LIM --> MUTE --> MASTER --> GUARDN --> ANA --> DEST
```

Note the ordering of the last stage: **mute and master gain sit before the guard**, so the guard
measures exactly what reaches the speakers — a muted or faded-out signal reads as quiet, and the
0.5 ceiling is inside the measured path.

## Safety chain

```mermaid
sequenceDiagram
  participant W as level-guard worklet<br/>(audio thread)
  participant G as createLevelGuard<br/>(main thread)
  participant D as createLevelDetector<br/>(pure)
  participant A as app.js

  loop every ~50 ms
    W->>G: postMessage {time, peak, rms}
    G->>D: push(time, peak, rms)
    D-->>G: null or reason
  end
  G->>A: onTrip(reason)
  A->>A: root.dataset.trip = reason
  A->>A: fade 100 ms, stop scheduler, ctx.suspend()
  A->>A: hint: "Auto-stopped for safety"
```

Measurement runs on the audio thread so it keeps working when animation frames are throttled — a
backgrounded tab still gets metered. The detector itself is pure and synchronous, which is why it
can be unit-tested against synthetic level traces.

Four trip reasons, all thresholds in `src/audio/safety/safety-config.js`:

| Reason | Condition |
|---|---|
| `peak` | Sample peak above 0.95, or NaN |
| `jump` | RMS up 12 dB or more within 200 ms, above a -16 dBFS floor |
| `sustained` | RMS above -10 dBFS for more than 300 ms |
| `creep` | RMS mean rising across all 5 bins of a 5 s window, ending above -16 dBFS |

## State

`app.js` holds all mutable state; everything under `src/music` and `src/input` is a pure factory.

- **States:** `idle` → `running` ⇄ `stopped`, plus terminal-ish `tripped` and `error`. Mirrored to
  `document.body.dataset.state`, which is what the E2E tests assert on.
- **Serialised queue:** `enqueue` chains async transitions onto one promise, so a fast
  Space-Space-Space can't interleave `ctx.resume()` with a fade-out.
- **Lazy `AudioContext`:** constructed inside the first `toggle`, satisfying Chrome's autoplay
  policy. `initAudio` also awaits `audioWorklet.addModule` before anything can make sound.
- **Crossfade interlock:** `engine-switcher.js` refuses a switch while `busyUntil` is in the
  future, because overlapping `setValueCurveAtTime` calls on one param throw.

## Not yet built

Engines 2–4 (`ENGINES` holds only `1`), the reactive canvas, and `prefers-reduced-motion`
handling. The `analyser` node is wired and ready for the canvas but nothing reads from it today.
