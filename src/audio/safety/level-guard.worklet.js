// Inline pass-through meter: if this processor ever fails, its output is silence.
class LevelGuardProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const interval = options.processorOptions?.reportInterval ?? 0.05;
    this.reportFrames = Math.max(1, Math.round(sampleRate * interval));
    this.frames = 0;
    this.peak = 0;
    this.sumSquares = 0;
    this.samples = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    for (let channel = 0; channel < output.length; channel += 1) {
      const source = input[channel];
      if (!source) continue;
      output[channel].set(source);
      for (let i = 0; i < source.length; i += 1) {
        const value = source[i];
        const magnitude = value < 0 ? -value : value;
        // NaN fails every comparison, so treat it as an infinite peak.
        if (!(magnitude <= this.peak)) this.peak = magnitude === magnitude ? magnitude : Infinity;
        this.sumSquares += value * value;
      }
      this.samples += source.length;
    }

    this.frames += output[0].length;
    if (this.frames >= this.reportFrames) {
      this.port.postMessage({
        time: currentTime,
        peak: this.peak,
        rms: this.samples > 0 ? Math.sqrt(this.sumSquares / this.samples) : 0,
      });
      this.frames = 0;
      this.peak = 0;
      this.sumSquares = 0;
      this.samples = 0;
    }
    return true;
  }
}

registerProcessor('level-guard', LevelGuardProcessor);
