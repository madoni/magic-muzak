import { createApp } from './app.js';
import { actionForKey } from './input/keymap.js';
import { createHint } from './ui/hint.js';

const app = createApp({ hint: createHint(document.getElementById('hint')), root: document.body });

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const action = actionForKey(event.code);
  if (!action) return;
  event.preventDefault();
  if (event.repeat && action.type !== 'tempo') return;
  app.dispatch(action);
});

window.addEventListener('pointermove', (event) => {
  app.pointer(
    event.clientX / window.innerWidth,
    1 - event.clientY / window.innerHeight,
    event.timeStamp / 1000,
  );
});
