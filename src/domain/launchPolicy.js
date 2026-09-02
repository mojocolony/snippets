export const RETURN_WINDOWS = Object.freeze({
  fresh: 0,
  '30s': 30_000,
  '60s': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  always: Number.POSITIVE_INFINITY
});

export function chooseLaunchTarget({ snippets = [], now = Date.now(), returnWindow = '60s', captureFirst = false } = {}) {
  const live = snippets.filter(snippet => snippet && snippet.deletedAt == null);
  const pinned = live.find(snippet => snippet.pinned);
  if (pinned) return { type: 'snippet', id: pinned.id };
  if (captureFirst) return { type: 'blank' };

  const latest = [...live].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (!latest) return { type: 'blank' };

  const windowMs = RETURN_WINDOWS[returnWindow] ?? RETURN_WINDOWS['60s'];
  if (windowMs === 0) return { type: 'inbox' };
  return now - latest.updatedAt <= windowMs
    ? { type: 'snippet', id: latest.id }
    : { type: 'inbox' };
}
