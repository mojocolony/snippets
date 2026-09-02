import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sheetSource = fs.readFileSync(new URL('../../src/ui/sheet.js', import.meta.url), 'utf8');
const captureSource = fs.readFileSync(new URL('../../src/ui/webCaptureSheet.js', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../../src/styles/app.css', import.meta.url), 'utf8');

test('Web Capture replaces More without fading the backdrop from transparent', () => {
  assert.match(sheetSource, /animateBackdrop\s*=\s*true/);
  assert.match(sheetSource, /sheet-backdrop-no-fade/);
  assert.match(captureSource, /createSheet\(\{[^}]*animateBackdrop:\s*false/s);
  assert.match(cssSource, /\.sheet-backdrop\.sheet-backdrop-no-fade\s*\{[^}]*opacity:\s*1[^}]*animation:\s*none/s);
});
