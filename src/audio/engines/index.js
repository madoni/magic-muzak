import { createSubtractiveEngine } from './subtractive.js';

export const ENGINES = Object.freeze({ 1: createSubtractiveEngine });

export const ENGINE_NAMES = Object.freeze({
  1: 'Subtractive',
  2: 'Additive',
  3: 'FM / AM / Ring',
  4: 'Physical modelling',
});
