/** A single cell on the infinite integer grid. */
export interface GridCoordinate {
  col: number;
  row: number;
}

/** Builds the string key used to index the grid Map (e.g. "3,-2"). */
export function gridKey(coord: GridCoordinate): string {
  return `${coord.col},${coord.row}`;
}

/** Parses a grid Map key back into a GridCoordinate. */
export function parseGridKey(key: string): GridCoordinate {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}
