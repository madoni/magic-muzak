// Tracks audio-clock start/end per slot; when every slot is busy the oldest note is stolen.
export function createVoicePool(size) {
  const starts = new Float64Array(size).fill(-Infinity);
  const ends = new Float64Array(size).fill(-Infinity);

  return {
    size,
    acquire(start, end = Infinity) {
      let index = -1;
      let oldest = 0;
      for (let i = 0; i < size; i += 1) {
        if (ends[i] <= start) {
          index = i;
          break;
        }
        if (starts[i] < starts[oldest]) oldest = i;
      }
      if (index === -1) index = oldest;
      starts[index] = start;
      ends[index] = end;
      return index;
    },
    release(index, time) {
      if (time < ends[index]) ends[index] = time;
    },
  };
}
