// cancelAndHoldAtTime keeps the value the param will actually have at `time`, so ramps never jump.
export function rampTo(param, value, time, timeConstant) {
  param.cancelAndHoldAtTime(time);
  param.setTargetAtTime(value, time, timeConstant);
}

export function linearFade(param, value, time, duration) {
  param.cancelAndHoldAtTime(time);
  param.linearRampToValueAtTime(value, time + duration);
}
