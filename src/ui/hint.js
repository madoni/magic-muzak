export function createHint(element) {
  let timer = 0;
  let persistent = element.textContent;

  function render(text) {
    element.textContent = text;
    element.hidden = text === '';
  }

  return {
    // Persistent text stays until replaced; transient text reverts to it.
    set(text) {
      persistent = text;
      clearTimeout(timer);
      render(text);
    },
    show(text, duration = 1500) {
      clearTimeout(timer);
      render(text);
      timer = setTimeout(() => render(persistent), duration);
    },
  };
}
