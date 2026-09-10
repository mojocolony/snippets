import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chooseLaunchTarget } from '../../src/domain/launchPolicy.js';
import {
  readRefreshEditorSession,
  writeRefreshEditorSession
} from '../../src/domain/refreshSession.js';

const snippet = (id, updatedAt, pinned = false, deletedAt = null) => ({ id, updatedAt, pinned, deletedAt });

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test('a recent saved editor session resumes the exact snippet even when startup is not classified as reload', () => {
  const result = chooseLaunchTarget({
    snippets: [snippet('wrong-pinned', 99_000, true), snippet('actual-open', 80_000)],
    now: 100_000,
    returnWindow: '60s',
    isReload: false,
    refreshSession: { screen: 'editor', snippetId: 'actual-open', activeAt: 99_500 }
  });
  assert.deepEqual(result, { type: 'snippet', id: 'actual-open' });
});

test('a stale saved editor session falls back to the normal pinned launch rule', () => {
  const result = chooseLaunchTarget({
    snippets: [snippet('pinned', 99_000, true), snippet('old-open', 80_000)],
    now: 200_000,
    returnWindow: '60s',
    isReload: false,
    refreshSession: { screen: 'editor', snippetId: 'old-open', activeAt: 100_000 }
  });
  assert.deepEqual(result, { type: 'snippet', id: 'pinned' });
});

test('refresh-session storage can persist a synchronous active timestamp', () => {
  const storage = fakeStorage();
  writeRefreshEditorSession(storage, 'abc', 123_456);
  assert.deepEqual(readRefreshEditorSession(storage), {
    screen: 'editor',
    snippetId: 'abc',
    activeAt: 123_456
  });
});


test('an existing v0.4.25 session record can be migrated with the current startup timestamp', () => {
  const storage = fakeStorage();
  storage.setItem('snippets.refreshEditor.v1', JSON.stringify({ screen: 'editor', snippetId: 'legacy-open' }));
  assert.deepEqual(readRefreshEditorSession(storage, 500_000), {
    screen: 'editor',
    snippetId: 'legacy-open',
    activeAt: 500_000
  });
});

const appSource = await readFile(new URL('../../src/app.js', import.meta.url), 'utf8');

test('the app mirrors editor resume state into localStorage and refreshes it before hide', () => {
  assert.match(appSource, /const localStorageRef\s*=\s*\(\(\)\s*=>/);
  assert.match(appSource, /writeRefreshEditorSession\(localStorageRef,\s*state\.currentSnippet\?\.id\s*\?\?\s*null,\s*activeAt\)/);
  assert.match(appSource, /function touchRefreshEditorSession\(/);
  assert.match(appSource, /const startupAt\s*=\s*Date\.now\(\)/);
  assert.match(appSource, /readRefreshEditorSession\(sessionStorageRef,\s*startupAt\)/);
  assert.match(appSource, /const flushOnHide\s*=\s*\(\)\s*=>\s*\{[\s\S]*?touchRefreshEditorSession\(\)/);
});


const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');

test('v0.4.26 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.26');
  assert.equal(packageLock.version, '0.4.26');
  assert.equal(packageLock.packages[''].version, '0.4.26');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.26['"]/);
  assert.match(swSource, /snippets-r4-26/);
});
