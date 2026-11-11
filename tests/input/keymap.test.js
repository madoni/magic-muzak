import { describe, expect, it } from 'vitest';
import { ACTIONS, actionForKey } from '../../src/input/keymap.js';

describe('keymap', () => {
  it('maps the documented shortcuts', () => {
    expect(actionForKey('Space')).toBe(ACTIONS.toggle);
    expect(actionForKey('KeyM')).toBe(ACTIONS.mute);
    expect(actionForKey('ArrowUp')).toEqual({ type: 'tempo', delta: 1 });
    expect(actionForKey('ArrowDown')).toEqual({ type: 'tempo', delta: -1 });
    expect(actionForKey('Digit3')).toEqual({ type: 'engine', engine: 3 });
  });

  it('ignores unmapped keys', () => {
    expect(actionForKey('KeyQ')).toBeNull();
  });
});
