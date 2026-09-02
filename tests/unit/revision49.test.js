import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const authSource = fs.readFileSync(new URL('../../src/auth/authView.js', import.meta.url), 'utf8');
const mainSource = fs.readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
const appearanceSource = fs.readFileSync(new URL('../../src/ui/appearanceSheet.js', import.meta.url), 'utf8');
const editorSource = fs.readFileSync(new URL('../../src/editor/markdownEditor.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');
const versionSource = fs.readFileSync(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));

let passwordModule = {};
try {
  passwordModule = await import('../../src/auth/passwordChange.js');
} catch {
  passwordModule = {};
}

test('signed-out auth is password-first with magic link as a secondary fallback', () => {
  assert.match(authSource, /type\s*=\s*['"]password['"]/);
  assert.match(authSource, /onPasswordSignIn/);
  assert.match(authSource, /onRequestLink/);
  assert.match(authSource, /Email me a sign-in link/);
  assert.match(authSource, /Sign in/);
  assert.match(mainSource, /signInWithPassword/);
  assert.match(mainSource, /signInWithOtp/);
});

test('password change validation rejects blank or mismatched values and accepts a matching password', () => {
  assert.equal(typeof passwordModule.validatePasswordChange, 'function');
  assert.deepEqual(passwordModule.validatePasswordChange('', ''), { ok: false, error: 'Enter a new password.' });
  assert.deepEqual(passwordModule.validatePasswordChange('alpha', 'beta'), { ok: false, error: 'Passwords do not match.' });
  assert.deepEqual(passwordModule.validatePasswordChange('alpha', 'alpha'), { ok: true });
});

test('Settings exposes an Account password action wired through app to Supabase updateUser', () => {
  assert.match(appearanceSource, /Account/);
  assert.match(appearanceSource, /Set\/Change Password/);
  assert.match(appearanceSource, /onChangePassword/);
  assert.match(appSource, /onChangePassword/);
  assert.match(mainSource, /auth\.updateUser\(\{\s*password\s*\}\)/);
});

test('editor owns one text-only contenteditable surface and a sibling noneditable control gutter', () => {
  assert.match(editorSource, /className\s*=\s*['"]editor-text-surface['"]/);
  assert.match(editorSource, /className\s*=\s*['"]editor-control-gutter['"]/);
  assert.match(editorSource, /surface\.contentEditable\s*=\s*['"]true['"]/);
  assert.doesNotMatch(editorSource, /host\.contentEditable\s*=\s*['"]true['"]/);
  assert.match(editorSource, /gutter\.replaceChildren/);
  assert.match(editorSource, /dataset\.lineIndex\s*=\s*String\(index\)/);
});

test('todo and bullet controls are created for the gutter rather than appended to the editable surface', () => {
  assert.match(editorSource, /editor-gutter-item/);
  assert.match(editorSource, /todo-handle/);
  assert.match(editorSource, /todo-check/);
  assert.match(editorSource, /bullet-marker/);
  assert.doesNotMatch(editorSource, /surface\.append\(handle\)/);
  assert.doesNotMatch(editorSource, /surface\.append\(check/);
  assert.doesNotMatch(editorSource, /surface\.append\(bullet/);
});

test('editor CSS keeps the gutter nonselectable and outside text selection geometry', () => {
  assert.match(css, /\.markdown-editor\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.editor-control-gutter\s*\{[^}]*position:\s*absolute[^}]*pointer-events:\s*none[^}]*user-select:\s*none/s);
  assert.match(css, /\.todo-handle[^}]*pointer-events:\s*auto/s);
  assert.match(css, /\.todo-check[^}]*pointer-events:\s*auto/s);
  assert.match(css, /\.editor-line-text\.editor-line--todo\s*\{[^}]*padding-left:/s);
  assert.match(css, /\.editor-line-text\.editor-line--bullet\s*\{[^}]*padding-left:/s);
});

test('tag assignment rows are more compact while checkbox controls remain explicit', () => {
  assert.match(css, /\.tag-sheet-list \.sheet-row\s*\{[^}]*min-height:\s*34px[^}]*padding:\s*2px 11px/s);
  assert.match(css, /\.tag-sheet-list \.sheet-row \+ \.sheet-row\s*\{[^}]*margin-top:\s*0/s);
  assert.match(css, /\.tag-sheet-list input\[type="checkbox"\]\s*\{[^}]*width:\s*20px[^}]*height:\s*20px/s);
});

test('v0.4.9 publishes matching app, package and PWA cache versions', () => {
  assert.equal(packageJson.version, '0.4.9');
  assert.equal(packageLock.version, '0.4.9');
  assert.equal(packageLock.packages[''].version, '0.4.9');
  assert.match(versionSource, /APP_VERSION\s*=\s*['"]0\.4\.9['"]/);
  assert.match(swSource, /snippets-r4-9/);
});
