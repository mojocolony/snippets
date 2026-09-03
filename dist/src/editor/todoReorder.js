export function moveLine(doc, fromIndex, toIndex) {
  const lines = String(doc).split('\n');
  if (fromIndex < 0 || fromIndex >= lines.length || toIndex < 0 || toIndex >= lines.length || fromIndex === toIndex) {
    return String(doc);
  }
  const [moved] = lines.splice(fromIndex, 1);
  lines.splice(toIndex, 0, moved);
  return lines.join('\n');
}

export function dropIndicatorEdge(fromIndex, toIndex) {
  if (toIndex < fromIndex) return 'before';
  if (toIndex > fromIndex) return 'after';
  return null;
}
