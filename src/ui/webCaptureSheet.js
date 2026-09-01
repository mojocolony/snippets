import { createSheet } from './sheet.js';
import { BOOKMARKLET_OPTIONS, createBookmarkletCode, resolveSnippetsAppUrl } from '../capture/bookmarklets.js';

export function openWebCaptureSheet({ appUrl = resolveSnippetsAppUrl(window.location.href) } = {}) {
  const sheet = createSheet({ title: 'Web Capture', className: 'web-capture-sheet' });

  const intro = document.createElement('p');
  intro.className = 'web-capture-intro';
  intro.textContent = 'On desktop, drag one of these capture buttons to your bookmarks bar.';
  sheet.body.append(intro);

  const options = document.createElement('div');
  options.className = 'web-capture-options';
  const hint = document.createElement('p');
  hint.className = 'web-capture-hint';
  hint.textContent = 'Drag a capture button to your bookmarks bar.';

  for (const option of BOOKMARKLET_OPTIONS) {
    const link = document.createElement('a');
    link.className = 'web-capture-bookmarklet';
    link.href = createBookmarkletCode(option.mode, appUrl);
    link.draggable = true;
    link.setAttribute('aria-label', `${option.label}: drag to bookmarks bar`);

    const label = document.createElement('span');
    label.className = 'web-capture-label';
    label.textContent = option.label;
    const description = document.createElement('span');
    description.className = 'web-capture-description';
    description.textContent = option.description;
    link.append(label, description);

    link.addEventListener('click', event => {
      event.preventDefault();
      hint.textContent = `Drag “${option.label}” to your bookmarks bar.`;
    });
    options.append(link);
  }
  sheet.body.append(options, hint);

  const mobile = document.createElement('p');
  mobile.className = 'web-capture-mobile-note';
  mobile.textContent = 'On iPhone or iPad, bookmarklets are awkward to install. Use the setup page from a desktop browser for now; a Share Sheet route can come later.';
  sheet.body.append(mobile);

  const setup = document.createElement('a');
  setup.className = 'web-capture-setup menu-row';
  setup.href = './bookmarklets.html';
  setup.target = '_blank';
  setup.rel = 'noopener';
  setup.textContent = 'Open Web Capture Setup';
  sheet.body.append(setup);

  return sheet;
}
