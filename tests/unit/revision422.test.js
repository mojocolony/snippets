import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const iconSvg = await readFile(new URL('../../assets/icon.svg', import.meta.url), 'utf8');

function pngInfo(buffer) {
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25]
  };
}

test('v0.4.22 or later keeps the approved light-grey/black app icon treatment', () => {
  assert.match(iconSvg, /fill=["']#E5E7EB["']/i);
  assert.match(iconSvg, /stroke=["']#000000["']/i);
  assert.match(iconSvg, /translate\(12 12\)\s*scale\(0\.82\)\s*translate\(-12 -12\)/);
});

test('iOS and PWA PNG icons are full-square opaque images', async () => {
  const cases = [
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512]
  ];
  for (const [name, size] of cases) {
    const buffer = await readFile(new URL(`../../assets/${name}`, import.meta.url));
    const info = pngInfo(buffer);
    assert.equal(info.width, size, `${name} width`);
    assert.equal(info.height, size, `${name} height`);
    assert.equal(info.colorType, 2, `${name} must be RGB with no alpha channel`);
  }
});

const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const versionSource = await readFile(new URL('../../src/version.js', import.meta.url), 'utf8');
const swSource = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');

test('v0.4.22 or later keeps matching app, package and PWA cache versions', () => {
  const patch = Number(packageJson.version.split('.').at(-1));
  assert.ok(patch >= 22);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.match(versionSource, new RegExp(`APP_VERSION\\s*=\\s*['\"]${packageJson.version.replaceAll('.', '\\.') }['\"]`));
  assert.match(swSource, /snippets-r4-\d+/);
});
