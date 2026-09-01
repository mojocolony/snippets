function clean(value) { return String(value ?? '').trim(); }

export function captureToSnippet(payload = {}) {
  const mode = clean(payload.mode).toLowerCase();
  const title = clean(payload.title);
  const url = clean(payload.url);
  const text = clean(payload.text);

  if (mode === 'link') {
    if (!url) return null;
    return { markdown: `${title || url}\n\n${url}`, sourceUrl: url };
  }
  if (mode === 'selection') {
    if (!text) return null;
    const source = title ? `Source: ${title}` : 'Source';
    return { markdown: `${text}\n\n${source}${url ? `\n${url}` : ''}`, sourceUrl: url || null };
  }
  if (mode === 'page') {
    if (!text) return null;
    const heading = title ? `${title}\n\n` : '';
    const source = url ? `\n\nSource: ${url}` : '';
    return { markdown: `${heading}${text}${source}`, sourceUrl: url || null };
  }
  return null;
}

export function parseCaptureUrl(input) {
  const url = input instanceof URL ? input : new URL(input);
  const mode = url.searchParams.get('capture');
  if (!mode) return null;
  return captureToSnippet({
    mode,
    title: url.searchParams.get('title'),
    url: url.searchParams.get('url'),
    text: url.searchParams.get('text')
  });
}

export function isCaptureMessage(data, expectedNonce) {
  return Boolean(
    data && data.type === 'snippets-capture' && expectedNonce &&
    data.nonce === expectedNonce && ['link', 'selection', 'page'].includes(data.mode)
  );
}

export function clearCaptureParameters(input) {
  const url = input instanceof URL ? new URL(input.href) : new URL(input);
  for (const key of ['capture', 'title', 'url', 'text', 'captureSession']) url.searchParams.delete(key);
  return url;
}
