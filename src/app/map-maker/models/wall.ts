import { DoorOrientation } from './door';

/**
 * Walls (Story 15) sit on grid edges (cell boundaries), exactly like doors —
 * see `DoorOrientation`'s doc comment on `door.ts` for the vertical/
 * horizontal edge convention. Unlike doors, a wall has no non-empty-cell
 * placement constraint (it can be drawn on any grid edge, whether or not
 * either neighboring cell has been drawn on) and no hidden/revealed state —
 * it's always a plain, always-visible black border in both Design and Play
 * mode.
 */
export interface Wall {
  orientation: DoorOrientation;
  col: number;
  row: number;
}

/** Builds the canonical string key used to index/dedupe walls in a Map (e.g. "v:3,2"). Mirrors `doorKey()`. */
export function wallKey(edge: Wall): string {
  return `${edge.orientation === 'vertical' ? 'v' : 'h'}:${edge.col},${edge.row}`;
}
