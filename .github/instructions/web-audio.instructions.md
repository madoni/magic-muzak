---
name: Web Audio JavaScript
description: "Use when implementing, reviewing, or testing this project's JavaScript Web Audio API features, including audio graph design, browser lifecycle, performance, linting, and automated tests."
applyTo: "**/*.js"
---
# Web Audio JavaScript Instructions

- Use the [MDN Web Audio API guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) as the primary reference. Check the relevant API's behavior and browser support; do not assume every capability is available everywhere.
- Prefer native Web Audio APIs and clear, modular modern JavaScript. Keep the audio graph and state transitions easy to follow, and avoid unnecessary abstraction or repeated work in performance-sensitive paths.
- Create or resume an `AudioContext` in response to an appropriate user gesture when browser autoplay policies require it. Handle suspended or unavailable audio gracefully, and disconnect or close resources when their lifecycle ends.
- Follow existing project conventions and configured lint rules. Keep changes small, avoid suppressing lint findings without a specific reason, and run the relevant lint and test scripts when available.
- Add focused automated tests for behavior and edge cases, including graph setup and controls, scheduling or state changes, errors, and cleanup where applicable. Mock browser audio APIs at clear boundaries for deterministic unit tests; use browser-level tests for behavior that mocks cannot verify.
- Keep tests independent of implementation details. Account for browser timing and autoplay restrictions, and do not claim real audio output is validated by mocked tests alone.
