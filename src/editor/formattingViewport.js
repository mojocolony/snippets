const DEFAULT_KEYBOARD_THRESHOLD = 120;


const SELECTED_TEXT_FORMATTING_ACTIONS = Object.freeze(['todo', 'heading', 'bold', 'italic', 'strike', 'highlight', 'link']);

export function formattingActionsForLayout() {
  return [...SELECTED_TEXT_FORMATTING_ACTIONS];
}

function number(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function shouldUseKeyboardFormattingBar({ maxTouchPoints = 0 } = {}) {
  return number(maxTouchPoints) > 0;
}

export function shouldAnchorFormattingBarToKeyboard({
  touchLayout = false,
  baselineHeight = 0,
  viewportHeight = 0,
  threshold = DEFAULT_KEYBOARD_THRESHOLD
} = {}) {
  if (!touchLayout) return false;
  return number(baselineHeight) - number(viewportHeight) >= Math.max(0, number(threshold, DEFAULT_KEYBOARD_THRESHOLD));
}

export function keyboardAccessoryGeometry(viewport, { toolbarHeight = 48 } = {}) {
  const offsetLeft = number(viewport?.offsetLeft);
  const offsetTop = number(viewport?.offsetTop);
  const width = Math.max(0, number(viewport?.width));
  const height = Math.max(0, number(viewport?.height));
  const barHeight = Math.max(0, number(toolbarHeight, 48));
  return {
    left: offsetLeft + width / 2,
    top: Math.max(offsetTop, offsetTop + height - barHeight),
    width
  };
}
