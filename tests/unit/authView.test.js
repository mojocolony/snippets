import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authSource = await readFile(new URL('../../src/auth/authView.js', import.meta.url), 'utf8').catch(() => '');
const mainSource = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../../src/app.js', import.meta.url), 'utf8');

test('production auth view supports email request and six-digit code verification', () => {
  assert.match(authSource, /type\s*=\s*['"]email['"]/);
  assert.match(authSource, /inputMode\s*=\s*['"]numeric['"]/);
  assert.match(authSource, /maxLength\s*=\s*6/);
  assert.match(authSource, /onRequestCode/);
  assert.match(authSource, /onVerify/);
});

test('main gates Snippets behind persisted Supabase session', () => {
  assert.match(mainSource, /auth\.getSession/);
  assert.match(mainSource, /signInWithOtp/);
  assert.match(mainSource, /verifyOtp/);
  assert.match(mainSource, /initialCloudSync/);
});

test('More menu exposes an unobtrusive sign out action when provided', () => {
  assert.match(appSource, /onSignOut/);
  assert.match(appSource, /Sign out/);
});
