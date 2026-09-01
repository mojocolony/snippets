import { createSheet } from './sheet.js';
import { APP_VERSION } from '../version.js';

export const EDITOR_FONTS = Object.freeze({
  'ia-writer-duo': {
    label: 'iA Writer Duo',
    family: '"iA Writer Duo", "iA Writer Duospace", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
  },
  'open-sans': { label: 'Open Sans', family: '"Open Sans", Arial, sans-serif' },
  literata: { label: 'Literata', family: '"Literata", Georgia, serif' },
  bookerly: { label: 'Bookerly', family: '"Bookerly", Georgia, serif' },
  'ibm-plex-mono': { label: 'IBM Plex Mono', family: '"IBM Plex Mono", ui-monospace, monospace' },
  'roboto-mono': { label: 'Roboto Mono', family: '"Roboto Mono", ui-monospace, monospace' }
});

const RETURN_OPTIONS = [
  ['fresh', 'Immediately'],
  ['30s', '30 seconds'],
  ['60s', '1 minute'],
  ['5m', '5 minutes'],
  ['15m', '15 minutes'],
  ['always', 'Never']
];

export function openAppearanceSheet({ preferences, onChange = async () => preferences, onClose = () => {} } = {}) {
  const sheet = createSheet({ title: 'Appearance', onClose });
  let prefs = { ...preferences };

  const themeLabel = document.createElement('div');
  themeLabel.className = 'sheet-section-label';
  themeLabel.textContent = 'Theme';
  const theme = document.createElement('div');
  theme.className = 'segmented';
  theme.style.width = '100%';
  for (const [value, label] of [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.classList.toggle('is-active', prefs.themeMode === value);
    button.setAttribute('aria-pressed', String(prefs.themeMode === value));
    button.addEventListener('click', async () => {
      prefs = await onChange('themeMode', value);
      openState();
    });
    theme.append(button);
  }

  const fontLabel = document.createElement('div');
  fontLabel.className = 'sheet-section-label';
  fontLabel.textContent = 'Editor font';
  const fontGrid = document.createElement('div');
  fontGrid.className = 'font-grid';
  const fontButtons = new Map();
  for (const [value, font] of Object.entries(EDITOR_FONTS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'font-choice';
    button.textContent = font.label;
    button.style.fontFamily = font.family;
    button.addEventListener('click', async () => {
      prefs = await onChange('editorFont', value);
      openState();
    });
    fontButtons.set(value, button);
    fontGrid.append(button);
  }

  const sizeLabel = document.createElement('div');
  sizeLabel.className = 'sheet-section-label';
  sizeLabel.textContent = 'Editor size';
  const sizeRow = document.createElement('div');
  sizeRow.className = 'size-row';
  const minus = document.createElement('button');
  minus.type = 'button'; minus.textContent = 'A−'; minus.setAttribute('aria-label', 'Decrease font size');
  const sizeValue = document.createElement('div');
  sizeValue.className = 'size-value';
  const plus = document.createElement('button');
  plus.type = 'button'; plus.textContent = 'A+'; plus.setAttribute('aria-label', 'Increase font size');
  minus.addEventListener('click', async () => {
    prefs = await onChange('fontSize', Math.max(14, Number(prefs.fontSize) - 1)); openState();
  });
  plus.addEventListener('click', async () => {
    prefs = await onChange('fontSize', Math.min(26, Number(prefs.fontSize) + 1)); openState();
  });
  sizeRow.append(minus, sizeValue, plus);

  const returnLabel = document.createElement('div');
  returnLabel.className = 'sheet-section-label';
  returnLabel.textContent = 'Time to return to Inbox';
  const select = document.createElement('select');
  select.className = 'settings-select';
  select.setAttribute('aria-label', 'Time to return to Inbox');
  for (const [value, label] of RETURN_OPTIONS) {
    const option = document.createElement('option');
    option.value = value; option.textContent = label;
    select.append(option);
  }
  select.addEventListener('change', async () => { prefs = await onChange('returnWindow', select.value); openState(); });

  const version = document.createElement('div');
  version.className = 'app-version';
  version.textContent = `Snippets v${APP_VERSION}`;

  sheet.body.append(themeLabel, theme, fontLabel, fontGrid, sizeLabel, sizeRow, returnLabel, select, version);

  function openState() {
    [...theme.children].forEach((button, index) => {
      const value = ['system', 'light', 'dark'][index];
      const active = prefs.themeMode === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    for (const [value, button] of fontButtons) button.classList.toggle('is-active', prefs.editorFont === value);
    sizeValue.textContent = `${prefs.fontSize}px`;
    minus.disabled = Number(prefs.fontSize) <= 14;
    plus.disabled = Number(prefs.fontSize) >= 26;
    select.value = prefs.returnWindow;
  }
  openState();
  return sheet;
}
