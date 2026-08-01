/**
 * A designated "hidden area" — a connected group of drawn cells the DM has
 * marked as not shown to players until revealed (Story 7). `cellKeys` is a
 * frozen snapshot (an array of `gridKey()` strings) captured at the moment
 * the area was designated via `MapMakerStateService.toggleHiddenAreaAt()` —
 * it is not continuously recomputed as the map is edited, mirroring how
 * doors/fragments are each independently-tracked pieces of state elsewhere
 * in this module. `letter` is the auto-assigned, stable identifier (used to
 * pick the next free letter when a new area is created); `name` starts out
 * equal to `letter` but can be freely overridden by the user without
 * affecting letter re-use.
 */
export interface HiddenArea {
  id: string;
  letter: string;
  name: string;
  cellKeys: string[];
  revealed: boolean;
}

let nextHiddenAreaId = 1;

/** Generates a simple, unique-within-this-session id for a new HiddenArea. */
export function generateHiddenAreaId(): string {
  return `hidden-area-${nextHiddenAreaId++}`;
}

/**
 * Spreadsheet-column-style base-26 letter sequence: 0 -> "A", 1 -> "B", …,
 * 25 -> "Z", 26 -> "AA", 27 -> "AB", … — so there's no hard cap on the
 * number of hidden areas a map can have.
 */
export function letterForIndex(index: number): string {
  let n = index;
  let result = '';
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

/** Returns the smallest unused letter (per `letterForIndex`'s ordering) given the currently existing hidden areas, so deleting an area frees its letter for reuse. */
export function nextAvailableLetter(existing: HiddenArea[]): string {
  const used = new Set(existing.map(area => area.letter));
  let index = 0;
  let letter = letterForIndex(index);
  while (used.has(letter)) {
    index++;
    letter = letterForIndex(index);
  }
  return letter;
}
