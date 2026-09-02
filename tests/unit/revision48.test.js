import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authSource = await readFile(new URL('../../src/auth/authView.js', import.meta.url), 'utf8');
const versionSource = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');

test('installed-app auth no longer depends on instructing users to tap a magic link', () => {
  assert.doesNotMatch(authSource, /sign-in link instead/i);
  assert.match(authSource, /password|6-digit/i);
});

test('v0.4.8 or later stays on the r4 patch release and cache family', () => {
  const match = versionSource.match(/APP_VERSION\s*=\s*['"]0\.4\.(\d+)['"]/);
  assert.ok(match);
  assert.ok(Number(match[1]) >= 8);
  assert.match(swSource, /snippets-r4-/);
});
