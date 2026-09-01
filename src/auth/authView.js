import { featherIconMarkup } from '../ui/brandIcon.js';

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderAuthView(root, { onRequestCode, onVerify } = {}) {
  let email = '';
  let mode = 'email';
  let busy = false;
  let errorMessage = '';

  function render() {
    root.replaceChildren();
    const main = element('main', 'auth-screen');
    const panel = element('section', 'auth-panel');
    const wordmark = element('div', 'auth-wordmark brand-lockup');
    wordmark.innerHTML = `${featherIconMarkup('brand-feather')}<span>Snippets</span>`;
    panel.append(wordmark);

    const title = element('h1', 'auth-title', mode === 'email' ? 'Sign in' : 'Check your email');
    panel.append(title);

    const copy = element('p', 'auth-copy', mode === 'email'
      ? 'Enter your email to open your snippets.'
      : `Enter the 6-digit code sent to ${email}. If your email contains a sign-in link instead, that works too.`);
    panel.append(copy);

    const form = element('form', 'auth-form');
    const input = document.createElement('input');
    input.className = 'auth-input';
    input.autocomplete = mode === 'email' ? 'email' : 'one-time-code';
    input.spellcheck = false;

    if (mode === 'email') {
      input.type = 'email';
      input.name = 'email';
      input.placeholder = 'Email';
      input.value = email;
    } else {
      input.type = 'text';
      input.name = 'code';
      input.placeholder = '000000';
      input.inputMode = 'numeric';
      input.maxLength = 6;
      input.pattern = '[0-9]{6}';
      input.classList.add('auth-code-input');
    }

    const button = element('button', 'auth-submit', busy ? 'Working…' : (mode === 'email' ? 'Continue' : 'Sign in'));
    button.type = 'submit';
    button.disabled = busy;
    form.append(input, button);

    if (errorMessage) form.append(element('p', 'auth-error', errorMessage));

    if (mode === 'code') {
      const back = element('button', 'auth-back', 'Use a different email');
      back.type = 'button';
      back.addEventListener('click', () => { mode = 'email'; errorMessage = ''; render(); });
      form.append(back);
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      errorMessage = '';
      busy = true;
      button.disabled = true;
      button.textContent = 'Working…';
      try {
        if (mode === 'email') {
          email = input.value.trim();
          if (!email) throw new Error('Enter an email address.');
          await onRequestCode?.(email);
          mode = 'code';
          busy = false;
          render();
          return;
        }
        const token = input.value.replace(/\D/g, '').slice(0, 6);
        if (token.length !== 6) throw new Error('Enter the 6-digit code.');
        await onVerify?.(email, token);
      } catch (error) {
        errorMessage = error?.message || 'Could not sign in.';
      } finally {
        busy = false;
        if (root.contains(button)) {
          button.disabled = false;
          button.textContent = mode === 'email' ? 'Continue' : 'Sign in';
        } else if (errorMessage) render();
      }
    });

    panel.append(form);
    main.append(panel);
    root.append(main);
    requestAnimationFrame(() => input.focus());
  }

  render();
  return { setMode(nextMode) { mode = nextMode; render(); } };
}
