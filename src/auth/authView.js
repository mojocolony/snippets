import { featherIconMarkup } from '../ui/brandIcon.js';

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderAuthView(root, { onPasswordSignIn, onRequestLink, initialError = '' } = {}) {
  let email = '';
  let mode = 'password';
  let busy = false;
  let errorMessage = initialError;

  function setBusy(next, ...controls) {
    busy = next;
    controls.filter(Boolean).forEach(control => { control.disabled = next; });
  }

  function renderPasswordForm(panel) {
    const title = element('h1', 'auth-title', 'Sign in');
    const copy = element('p', 'auth-copy', 'Use your email and password to open your snippets.');
    panel.append(title, copy);

    const form = element('form', 'auth-form');
    const emailInput = document.createElement('input');
    emailInput.className = 'auth-input';
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.placeholder = 'Email';
    emailInput.autocomplete = 'email';
    emailInput.spellcheck = false;
    emailInput.value = email;

    const passwordInput = document.createElement('input');
    passwordInput.className = 'auth-input';
    passwordInput.type = 'password';
    passwordInput.name = 'password';
    passwordInput.placeholder = 'Password';
    passwordInput.autocomplete = 'current-password';

    const submit = element('button', 'auth-submit', busy ? 'Working…' : 'Sign in');
    submit.type = 'submit';
    submit.disabled = busy;

    const link = element('button', 'auth-back', 'Email me a sign-in link');
    link.type = 'button';
    link.disabled = busy;

    if (errorMessage) form.append(emailInput, passwordInput, submit, element('p', 'auth-error', errorMessage), link);
    else form.append(emailInput, passwordInput, submit, link);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      email = emailInput.value.trim();
      const password = passwordInput.value;
      errorMessage = '';
      if (!email) { errorMessage = 'Enter an email address.'; render(); return; }
      if (!password) { errorMessage = 'Enter your password.'; render(); return; }
      setBusy(true, submit, link);
      submit.textContent = 'Working…';
      try {
        await onPasswordSignIn?.(email, password);
      } catch (error) {
        errorMessage = error?.message || 'Could not sign in.';
        setBusy(false, submit, link);
        render();
      }
    });

    link.addEventListener('click', async () => {
      if (busy) return;
      email = emailInput.value.trim();
      errorMessage = '';
      if (!email) { errorMessage = 'Enter an email address.'; render(); return; }
      setBusy(true, submit, link);
      try {
        await onRequestLink?.(email);
        mode = 'link-sent';
        busy = false;
        render();
      } catch (error) {
        errorMessage = error?.message || 'Could not send the sign-in link.';
        setBusy(false, submit, link);
        render();
      }
    });

    panel.append(form);
    requestAnimationFrame(() => (email ? passwordInput : emailInput).focus());
  }

  function renderLinkSent(panel) {
    panel.append(
      element('h1', 'auth-title', 'Check your email'),
      element('p', 'auth-copy', `We sent a sign-in link to ${email}. Open it to finish signing in in a browser.`)
    );
    const back = element('button', 'auth-back', 'Use email and password');
    back.type = 'button';
    back.addEventListener('click', () => {
      mode = 'password';
      errorMessage = '';
      render();
    });
    panel.append(back);
  }

  function render() {
    root.replaceChildren();
    const main = element('main', 'auth-screen');
    const panel = element('section', 'auth-panel');
    const wordmark = element('div', 'auth-wordmark brand-lockup');
    wordmark.innerHTML = `${featherIconMarkup('brand-feather')}<span>Snippets</span>`;
    panel.append(wordmark);

    if (mode === 'password') renderPasswordForm(panel);
    else renderLinkSent(panel);

    main.append(panel);
    root.append(main);
  }

  render();
  return { setMode(nextMode) { mode = nextMode; render(); } };
}
