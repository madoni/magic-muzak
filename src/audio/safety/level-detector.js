import { SAFETY } from './safety-config.js';

const toDb = (value, floor) => (value > 0 ? Math.max(floor, 20 * Math.log10(value)) : floor);

// Pure level analysis: feed periodic peak/RMS reports, get a trip reason or null.
export function createLevelDetector(config = SAFETY) {
  const capacity = Math.ceil(config.creepWindow / config.reportInterval) * 2 + 4;
  const times = new Float64Array(capacity);
  const levels = new Float64Array(capacity);
  const binSums = new Float64Array(config.creepBins);
  const binCounts = new Uint16Array(config.creepBins);
  let head = 0;
  let count = 0;
  let overSince = null;
  let tripped = null;

  const newest = (offset) => (head - 1 - offset + capacity) % capacity;

  function record(time, db) {
    times[head] = time;
    levels[head] = db;
    head = (head + 1) % capacity;
    if (count < capacity) count += 1;
  }

  function jumped(time, db) {
    if (db < config.jumpFloorDb) return false;
    for (let i = 0; i < count; i += 1) {
      const j = newest(i);
      if (time - times[j] > config.jumpWindow) break;
      if (db - levels[j] >= config.jumpDb) return true;
    }
    return false;
  }

  function crept(time) {
    if (count === 0 || times[newest(count - 1)] > time - config.creepWindow + config.reportInterval) {
      return false;
    }
    binSums.fill(0);
    binCounts.fill(0);
    const binWidth = config.creepWindow / config.creepBins;
    for (let i = 0; i < count; i += 1) {
      const j = newest(i);
      const age = time - times[j];
      if (age >= config.creepWindow) break;
      const bin = config.creepBins - 1 - Math.floor(age / binWidth);
      binSums[bin] += levels[j];
      binCounts[bin] += 1;
    }
    let previous = -Infinity;
    for (let bin = 0; bin < config.creepBins; bin += 1) {
      if (binCounts[bin] === 0) return false;
      const mean = binSums[bin] / binCounts[bin];
      if (mean - previous < config.creepStepDb) return false;
      previous = mean;
    }
    return previous > config.creepCeilingDb;
  }

  return {
    get tripped() {
      return tripped;
    },
    reset() {
      head = 0;
      count = 0;
      overSince = null;
      tripped = null;
    },
    push(time, peak, rms) {
      if (tripped) return null;
      const db = toDb(rms, config.floorDb);
      let reason = null;

      if (!(peak <= config.peakLimit)) reason = 'peak';
      else if (jumped(time, db)) reason = 'jump';
      record(time, db);

      if (!reason) {
        if (db > config.rmsCeilingDb) {
          overSince ??= time;
          if (time - overSince >= config.sustainTime) reason = 'sustained';
        } else {
          overSince = null;
        }
      }
      if (!reason && crept(time)) reason = 'creep';

      tripped = reason;
      return reason;
    },
  };
}
