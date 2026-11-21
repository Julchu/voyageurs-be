/** Shortest name that may match inside a longer one ("Louvre" in "Musée du Louvre"). */
const MIN_PARTIAL_MATCH_LENGTH = 5;

/** Strip accents, case, punctuation and spaces for cross-provider matching ("Café de Flore" → "cafedeflore"). */
export const normalizePlaceName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]/gu, "");

/** Same place across providers: equal names, or the shorter one is distinctive and inside the longer. */
export const namesMatch = (first: string, second: string) => {
  const a = normalizePlaceName(first);
  const b = normalizePlaceName(second);
  if (!a || !b) return false;
  if (a === b) return true;

  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return shorter.length >= MIN_PARTIAL_MATCH_LENGTH && longer.includes(shorter);
};
