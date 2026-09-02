import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authSource = await readFile(new URL('../../src/auth/authView.js', import.meta.url), 'utf8').catch(() => '');
const mainSource = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../../src/app.js', import.meta.url), 'utf8');
const moreSource = await readFile(new URL('../../src/ui/moreMenu.js', import.meta.url), 'utf8');

test('production auth view supports password sign-in with a secondary email-link fallback', () => {
  assert.match(authSource, /type\s*=\s*['"]email['"]/);
  assert.match(authSource, /type\s*=\s*['"]password['"]/);
  assert.match(authSource, /onPasswordSignIn/);
  assert.match(authSource, /onRequestLink/);
  assert.match(authSource, /Email me a sign-in link/);
});

test('main gates Snippets behind persisted Supabase session and supports both password and magic-link auth', () => {
  assert.match(mainSource, /auth\.getSession/);
  assert.match(mainSource, /signInWithPassword/);
  assert.match(mainSource, /signInWithOtp/);
  assert.match(mainSource, /initialCloudSync/);
});

test('More menu exposes an unobtrusive sign out action when provided', () => {
  assert.match(appSource, /onSignOut/);
  assert.match(moreSource, /Sign out/);
});
