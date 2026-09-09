import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseLaunchTarget } from '../../src/domain/launchPolicy.js';

const snippet = (id, updatedAt, pinned = false, deletedAt = null) => ({ id, updatedAt, pinned, deletedAt });

test('a reload resumes the exact open snippet before pinned or return-window launch rules', () => {
  const result = chooseLaunchTarget({
    snippets: [snippet('pinned', 90_000, true), snippet('open', 10_000)],
    now: 100_000,
    returnWindow: 'fresh',
    isReload: true,
    refreshSession: { screen: 'editor', snippetId: 'open' }
  });
  assert.deepEqual(result, { type: 'snippet', id: 'open' });
});

test('a reload of a blank editor resumes a blank editor', () => {
  assert.deepEqual(chooseLaunchTarget({
    snippets: [snippet('pinned', 90_000, true)],
    isReload: true,
    refreshSession: { screen: 'editor', snippetId: null }
  }), { type: 'blank' });
});

test('a stale reload target falls back to the normal launch policy', () => {
  assert.deepEqual(chooseLaunchTarget({
    snippets: [snippet('pinned', 90_000, true), snippet('gone', 10_000, false, 20_000)],
    isReload: true,
    refreshSession: { screen: 'editor', snippetId: 'gone' }
  }), { type: 'snippet', id: 'pinned' });
});

test('a genuine fresh launch ignores prior session editor state', () => {
  assert.deepEqual(chooseLaunchTarget({
    snippets: [snippet('pinned', 90_000, true), snippet('open', 10_000)],
    isReload: false,
    refreshSession: { screen: 'editor', snippetId: 'open' }
  }), { type: 'snippet', id: 'pinned' });
});

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test('refresh editor session stores, reads and clears the exact open snippet id', async () => {
  const moduleUrl = new URL('../../src/domain/refreshSession.js', import.meta.url);
  assert.equal(existsSync(fileURLToPath(moduleUrl)), true, 'refreshSession module should exist');
  const {
    REFRESH_EDITOR_SESSION_KEY,
    readRefreshEditorSession,
    writeRefreshEditorSession,
    clearRefreshEditorSession
  } = await import(moduleUrl);
  const storage = fakeStorage();
  writeRefreshEditorSession(storage, 'abc');
  assert.equal(storage.getItem(REFRESH_EDITOR_SESSION_KEY), JSON.stringify({ screen: 'editor', snippetId: 'abc' }));
  assert.deepEqual(readRefreshEditorSession(storage), { screen: 'editor', snippetId: 'abc' });
  writeRefreshEditorSession(storage, null);
  assert.deepEqual(readRefreshEditorSession(storage), { screen: 'editor', snippetId: null });
  clearRefreshEditorSession(storage);
  assert.equal(readRefreshEditorSession(storage), null);
});

test('reload detection uses modern navigation timing and legacy fallback', async () => {
  const { isReloadNavigation } = await import('../../src/domain/refreshSession.js');
  assert.equal(isReloadNavigation({ getEntriesByType: () => [{ type: 'reload' }] }), true);
  assert.equal(isReloadNavigation({ getEntriesByType: () => [{ type: 'navigate' }] }), false);
  assert.equal(isReloadNavigation({ getEntriesByType: () => [], navigation: { type: 1 } }), true);
  assert.equal(isReloadNavigation({ getEntriesByType: () => [], navigation: { type: 0 } }), false);
});

import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../../src/app.js', import.meta.url), 'utf8');

test('the app records the current editor session, clears it when leaving, and only resumes it on reload', () => {
  assert.match(appSource, /from ['"]\.\/domain\/refreshSession\.js['"]/);
  assert.match(appSource, /writeRefreshEditorSession\(sessionStorageRef,\s*state\.currentSnippet\?\.id\s*\?\?\s*null\)/);
  assert.match(appSource, /clearRefreshEditorSession\(sessionStorageRef\)/);
  assert.match(appSource, /const isReload = isReloadNavigation\(performance\)/);
  assert.match(appSource, /refreshSession:\s*isReload\s*\?\s*readRefreshEditorSession\(sessionStorageRef\)\s*:\s*null/);
});

test('creating a snippet from a blank editor updates the refresh session to the new saved id', () => {
  const createAt = appSource.indexOf('state.currentSnippet = await createSnippet(markdown)');
  assert.ok(createAt >= 0);
  const nearby = appSource.slice(createAt, createAt + 500);
  assert.match(nearby, /writeRefreshEditorSession\(sessionStorageRef,\s*state\.currentSnippet\?\.id\s*\?\?\s*null\)/);
});

const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');

test('v0.4.25 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.25');
  assert.equal(packageLock.version, '0.4.25');
  assert.equal(packageLock.packages[''].version, '0.4.25');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.25['"]/);
  assert.match(swSource, /snippets-r4-25/);
});
