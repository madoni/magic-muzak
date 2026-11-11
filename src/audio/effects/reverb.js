// -60 dB (≈ ln(1000)) is reached after `decaySeconds`.
const DECAY_TO_MINUS_60_DB = Math.log(1000);

export function fillImpulse(data, sampleRate, decaySeconds, rng) {
  for (let i = 0; i < data.length; i += 1) {
    const envelope = Math.exp((-DECAY_TO_MINUS_60_DB * i) / (sampleRate * decaySeconds));
    data[i] = (rng() * 2 - 1) * envelope;
  }
}

export function createImpulseResponse(ctx, { duration = 3, decay = 2.8, rng = Math.random } = {}) {
  const buffer = ctx.createBuffer(2, Math.round(duration * ctx.sampleRate), ctx.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    fillImpulse(buffer.getChannelData(channel), ctx.sampleRate, decay, rng);
  }
  return buffer;
}
