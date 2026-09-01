export function chooseNextVisibleSnippet(items = [], removedId = null) {
  const list = Array.isArray(items) ? items : [];
  const index = list.findIndex(item => item?.id === removedId);
  if (index < 0) return list[0]?.id ?? null;
  return list[index + 1]?.id ?? list[index - 1]?.id ?? null;
}
