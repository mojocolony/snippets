import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path) { return readFile(new URL(`../../${path}`, import.meta.url), 'utf8').catch(() => ''); }

const manifest = await text('manifest.webmanifest');
const sw = await text('sw.js');
const index = await text('index.html');
const build = await text('scripts/build.js');

test('production site declares installable PWA assets for GitHub Pages subpath', () => {
  assert.match(manifest, /"name"\s*:\s*"Snippets"/);
  assert.match(manifest, /"start_url"\s*:\s*"\.\/"/);
  assert.match(manifest, /"display"\s*:\s*"standalone"/);
  assert.match(index, /manifest\.webmanifest/);
  assert.match(index, /apple-touch-icon/);
});

test('service worker uses relative scope and offline navigation fallback', () => {
  assert.match(sw, /Snippets|snippets/i);
  assert.match(sw, /\.\/index\.html/);
  assert.match(sw, /addEventListener\(['"]fetch['"]/);
});

test('build copies production root assets and retains Supabase CDN import in standalone', () => {
  assert.match(build, /manifest\.webmanifest/);
  assert.match(build, /bookmarklets\.html/);
  assert.match(build, /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/);
});

test('Revision 1 uses the Lucide Feather mark for app branding and install icons', async () => {
  const icon = await text('assets/icon.svg');
  const editor = await text('src/ui/editorView.js');
  const auth = await text('src/auth/authView.js');
  const brand = await text('src/ui/brandIcon.js');
  assert.match(icon, /M20\.24 12\.24a6 6 0 0 0-8\.49-8\.49L5 10\.5V19h8\.5z/);
  assert.match(icon, /x1="16"[^>]*x2="2"[^>]*y1="8"[^>]*y2="22"/);
  assert.match(brand, /featherIconMarkup/);
  assert.match(editor, /featherIconMarkup/);
  assert.match(auth, /featherIconMarkup/);
});
