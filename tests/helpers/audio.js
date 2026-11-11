export const SAMPLE_RATE = 44100;

export function createOffline(seconds) {
  return new OfflineAudioContext({
    numberOfChannels: 2,
    length: Math.ceil(seconds * SAMPLE_RATE),
    sampleRate: SAMPLE_RATE,
  });
}

// Mirrors the level-guard worklet's report blocks.
export function measureBlocks(buffer, blockSeconds = 0.05) {
  const size = Math.round(buffer.sampleRate * blockSeconds);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const blocks = [];
  for (let start = 0; start + size <= buffer.length; start += size) {
    let peak = 0;
    let sumSquares = 0;
    for (const data of channels) {
      for (let i = start; i < start + size; i += 1) {
        const value = data[i];
        peak = Math.max(peak, Math.abs(value));
        sumSquares += value * value;
      }
    }
    blocks.push({
      time: (start + size) / buffer.sampleRate,
      peak,
      rms: Math.sqrt(sumSquares / (size * channels.length)),
    });
  }
  return blocks;
}

export const toDb = (value) => 20 * Math.log10(Math.max(value, 1e-9));
