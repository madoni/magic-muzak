const action = (value) => Object.freeze(value);

export const ACTIONS = Object.freeze({
  toggle: action({ type: 'toggle' }),
  mute: action({ type: 'mute' }),
  tempoUp: action({ type: 'tempo', delta: 1 }),
  tempoDown: action({ type: 'tempo', delta: -1 }),
  engine1: action({ type: 'engine', engine: 1 }),
  engine2: action({ type: 'engine', engine: 2 }),
  engine3: action({ type: 'engine', engine: 3 }),
  engine4: action({ type: 'engine', engine: 4 }),
});

const KEYMAP = new Map([
  ['Space', ACTIONS.toggle],
  ['KeyM', ACTIONS.mute],
  ['ArrowUp', ACTIONS.tempoUp],
  ['ArrowDown', ACTIONS.tempoDown],
  ['Digit1', ACTIONS.engine1],
  ['Digit2', ACTIONS.engine2],
  ['Digit3', ACTIONS.engine3],
  ['Digit4', ACTIONS.engine4],
]);

export const actionForKey = (code) => KEYMAP.get(code) ?? null;
