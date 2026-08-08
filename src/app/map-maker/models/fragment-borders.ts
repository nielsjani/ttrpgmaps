import { CellFragment } from './cell-fragment';
import { FRAGMENT_POLYGONS, LocalPoint } from './fragment-shape';
import { GridCoordinate, parseGridKey } from './grid';

/**
 * A single boundary edge to stroke, expressed in "half-cell" grid units —
 * i.e. world coordinates multiplied by 2, so that fragment vertices (which
 * only ever sit at local fractions 0, 0.5 or 1 within a cell — see
 * FRAGMENT_POLYGONS) become exact integers. This avoids floating point
 * mismatches when comparing edges from different fragments/cells for
 * equality.
 */
export interface BorderSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type HalfCellPoint = [number, number];

function toHalfCellPoint(coord: GridCoordinate, point: LocalPoint): HalfCellPoint {
  return [coord.col * 2 + point[0] * 2, coord.row * 2 + point[1] * 2];
}

/** Canonical key for a segment, independent of which fragment/direction it was traversed from. */
function segmentKey(a: HalfCellPoint, b: HalfCellPoint): string {
  const [p1, p2] = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? [a, b] : [b, a];
  return `${p1[0]},${p1[1]}|${p2[0]},${p2[1]}`;
}

interface EdgeContributor {
  color: string;
  a: HalfCellPoint;
  b: HalfCellPoint;
}

/**
 * Splits an edge into atomic 1-half-cell-unit pieces so that edges of
 * different lengths (e.g. a full square's full-length side vs. a quarter's
 * half-length side) can be compared, and partially merged, at a consistent
 * resolution. Diagonal (triangle hypotenuse) edges are never partially
 * shared with anything else in our shape set, so they're kept whole.
 */
function splitIntoUnitEdges(a: HalfCellPoint, b: HalfCellPoint): Array<[HalfCellPoint, HalfCellPoint]> {
  if (a[0] !== b[0] && a[1] !== b[1]) {
    // Diagonal edge — always kept whole.
    return [[a, b]];
  }
  const pieces: Array<[HalfCellPoint, HalfCellPoint]> = [];
  if (a[0] === b[0]) {
    // Vertical edge.
    const x = a[0];
    const [y1, y2] = a[1] < b[1] ? [a[1], b[1]] : [b[1], a[1]];
    for (let y = y1; y < y2; y++) {
      pieces.push([[x, y], [x, y + 1]]);
    }
  } else {
    // Horizontal edge.
    const y = a[1];
    const [x1, x2] = a[0] < b[0] ? [a[0], b[0]] : [b[0], a[0]];
    for (let x = x1; x < x2; x++) {
      pieces.push([[x, y], [x + 1, y]]);
    }
  }
  return pieces;
}

/**
 * Computes the set of fragment-polygon edges that should be stroked with a
 * black border to outline contiguous same-color drawn regions. An edge is
 * included unless it is shared by exactly two fragments (in the same or an
 * adjacent cell) that have the *same* color — such edges are internal seams
 * of a merged region and are skipped, so adjacent same-color shapes read as
 * one bigger shape. Edges bordering empty space, or a differently-colored
 * fragment, are always included.
 *
 * Axis-aligned edges are decomposed into atomic 1-half-cell-unit pieces
 * before comparison (see splitIntoUnitEdges), so a shape with a full-length
 * side (e.g. a full square) can partially merge with a same-color
 * shorter-sided neighbor (e.g. a quarter or half occupying only part of the
 * adjoining cell), rather than only merging when both sides match exactly.
 */
function buildEdgeContributors(cells: ReadonlyMap<string, CellFragment[]>): Map<string, EdgeContributor[]> {
  const contributors = new Map<string, EdgeContributor[]>();

  for (const [key, fragments] of cells) {
    const coord = parseGridKey(key);
    for (const fragment of fragments) {
      const polygon = FRAGMENT_POLYGONS[fragment.shape];
      for (let i = 0; i < polygon.length; i++) {
        const a = toHalfCellPoint(coord, polygon[i]);
        const b = toHalfCellPoint(coord, polygon[(i + 1) % polygon.length]);
        for (const [pa, pb] of splitIntoUnitEdges(a, b)) {
          const key2 = segmentKey(pa, pb);
          const list = contributors.get(key2) ?? [];
          list.push({ color: fragment.color, a: pa, b: pb });
          contributors.set(key2, list);
        }
      }
    }
  }

  return contributors;
}

export function computeBorderSegments(cells: ReadonlyMap<string, CellFragment[]>): BorderSegment[] {
  const contributors = buildEdgeContributors(cells);

  const segments: BorderSegment[] = [];
  for (const list of contributors.values()) {
    const isMergedSeam = list.length >= 2 && list.every(entry => entry.color === list[0].color);
    if (!isMergedSeam) {
      const { a, b } = list[0];
      segments.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
    }
  }
  return segments;
}

/**
 * Returns the canonical keys of every atomic unit-edge that would be
 * stroked as a visible black border (see `computeBorderSegments`) — i.e.
 * every unit-edge that either borders empty space or is shared by
 * differently-colored fragments. Used by `MapMakerStateService` to treat a
 * visible color-boundary border between two differently-colored drawn
 * areas as an impassable boundary for connectivity purposes (Story 7's
 * hidden-area flood fill), the same way an explicit wall or door already
 * is — without needing to materialize an actual `Wall` object for it.
 */
export function computeBorderSegmentKeySet(cells: ReadonlyMap<string, CellFragment[]>): Set<string> {
  const contributors = buildEdgeContributors(cells);
  const keys = new Set<string>();
  for (const [key, list] of contributors) {
    const isMergedSeam = list.length >= 2 && list.every(entry => entry.color === list[0].color);
    if (!isMergedSeam) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * Returns the canonical keys of the (up to two) atomic unit-edge pieces
 * that together make up one whole cell-to-cell edge (the same edges used
 * by doors/walls — see `DoorOrientation`/`getAdjacentCells`), so they can
 * be looked up in the set returned by `computeBorderSegmentKeySet`.
 */
export function wholeCellEdgeUnitKeys(orientation: 'vertical' | 'horizontal', col: number, row: number): string[] {
  if (orientation === 'vertical') {
    const x = col * 2;
    const y = row * 2;
    return [segmentKey([x, y], [x, y + 1]), segmentKey([x, y + 1], [x, y + 2])];
  }
  const x = col * 2;
  const y = row * 2;
  return [segmentKey([x, y], [x + 1, y]), segmentKey([x + 1, y], [x + 2, y])];
}
