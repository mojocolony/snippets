import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLibraryItem, formatModified } from '../../src/domain/libraryItem.js';

test('library item uses first two meaningful lines and preserves tags', () => {
  const item = makeLibraryItem({
    id: '1', content: '# Title\n\nSecond line\nThird', tags: ['macbeth', 'teaching'], updatedAt: Date.UTC(2026, 7, 29, 15, 27), starred: true, archived: false
  });
  assert.equal(item.title, 'Title');
  assert.equal(item.preview, 'Second line');
  assert.deepEqual(item.tags, ['macbeth', 'teaching']);
  assert.equal(item.starred, true);
});

test('formatModified produces a compact date/time string', () => {
  const result = formatModified(Date.UTC(2026, 7, 29, 15, 27), new Date(Date.UTC(2026, 8, 1, 12, 0)), 'en-CA', 'UTC');
  assert.match(result, /Aug/);
  assert.match(result, /29/);
  assert.match(result, /3:27|15:27/);
});
