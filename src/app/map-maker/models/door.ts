import { GridCoordinate } from './grid';

/**
 * Doors sit on grid edges (cell boundaries), not inside cells. A `vertical`
 * door sits on the vertical line `x = col`, separating the cells
 * `(col - 1, row)` (left) and `(col, row)` (right). A `horizontal` door
 * sits on the horizontal line `y = row`, separating `(col, row - 1)` (top)
 * and `(col, row)` (bottom).
 */
export type DoorOrientation = 'vertical' | 'horizontal';

export interface Door {
  orientation: DoorOrientation;
  col: number;
  row: number;
  /** Story 8: whether the DM has designated this door as hidden (design-time flag). */
  hidden: boolean;
  /** Story 8: whether the DM has revealed this hidden door during Play mode. Meaningless while `hidden` is false. */
  revealed: boolean;
}

/** Builds the canonical string key used to index/dedupe doors in a Map (e.g. "v:3,2"). Only needs the edge-identifying fields, not the full `Door` (so callers can build a key from just an orientation/col/row edge before a `Door` object even exists). */
export function doorKey(edge: Pick<Door, 'orientation' | 'col' | 'row'>): string {
  return `${edge.orientation === 'vertical' ? 'v' : 'h'}:${edge.col},${edge.row}`;
}

/** Returns the two grid cells adjacent to (bordering) a potential door edge. */
export function getAdjacentCells(orientation: DoorOrientation, col: number, row: number): [GridCoordinate, GridCoordinate] {
  if (orientation === 'vertical') {
    return [
      { col: col - 1, row },
      { col, row },
    ];
  }
  return [
    { col, row: row - 1 },
    { col, row },
  ];
}
