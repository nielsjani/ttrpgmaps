import { computeBorderSegments } from './fragment-borders';
import { CellFragment } from './cell-fragment';
import { gridKey } from './grid';

function cellsOf(entries: Array<[{ col: number; row: number }, CellFragment[]]>): Map<string, CellFragment[]> {
  const map = new Map<string, CellFragment[]>();
  for (const [coord, fragments] of entries) {
    map.set(gridKey(coord), fragments);
  }
  return map;
}

describe('computeBorderSegments', () => {
  it('draws all 4 sides (as 8 unit pieces) around a single isolated square', () => {
    const cells = cellsOf([[{ col: 0, row: 0 }, [{ shape: 'full', color: 'red' }]]]);
    const segments = computeBorderSegments(cells);
    // Each of the 4 full-length sides is decomposed into 2 atomic
    // half-cell-unit pieces (see splitIntoUnitEdges), so an isolated square
    // yields 8 segments rather than 4.
    expect(segments.length).toBe(8);
  });

  it('suppresses the shared edge between two adjacent same-color squares', () => {
    const cells = cellsOf([
      [{ col: 0, row: 0 }, [{ shape: 'full', color: 'red' }]],
      [{ col: 1, row: 0 }, [{ shape: 'full', color: 'red' }]],
    ]);
    const segments = computeBorderSegments(cells);
    // 14 unique unit-edges total (8 + 8, minus 2 shared); the 2 shared unit
    // pieces (same color) are suppressed, leaving 12.
    expect(segments.length).toBe(12);
  });

  it('keeps the shared edge between two adjacent different-color squares (drawn once)', () => {
    const cells = cellsOf([
      [{ col: 0, row: 0 }, [{ shape: 'full', color: 'red' }]],
      [{ col: 1, row: 0 }, [{ shape: 'full', color: 'blue' }]],
    ]);
    const segments = computeBorderSegments(cells);
    // Same 14 unique unit-edges, but the 2 shared pieces differ in color so
    // are kept (drawn once each, not doubled).
    expect(segments.length).toBe(14);
  });

  it('suppresses internal seams between same-color quarters that together form a full square', () => {
    const cells = cellsOf([
      [
        { col: 0, row: 0 },
        [
          { shape: 'quarter-tl', color: 'green' },
          { shape: 'quarter-tr', color: 'green' },
          { shape: 'quarter-bl', color: 'green' },
          { shape: 'quarter-br', color: 'green' },
        ],
      ],
    ]);
    const segments = computeBorderSegments(cells);
    // Four quarters, each with 4 unit-length edges = 16 total edge
    // instances. Internal seams are shared pairwise (4 shared unit edges ->
    // 8 instances suppressed), leaving the 8 outer half-edges that make up
    // the full cell's perimeter.
    expect(segments.length).toBe(8);
  });

  it('keeps triangle hypotenuse edges distinct from same-color square neighbors', () => {
    const cells = cellsOf([[{ col: 0, row: 0 }, [{ shape: 'triangle-tl', color: 'red' }]]]);
    const segments = computeBorderSegments(cells);
    // The two full-length legs (top, left) are each split into 2 unit
    // pieces (4 total); the diagonal hypotenuse is kept whole (1) -> 5.
    expect(segments.length).toBe(5);
  });

  it('partially merges a quarter with a same-color full square in the adjacent cell, keeping the unmatched half bordered', () => {
    // quarter-tl only covers the left half of cell (0,0)'s top edge; the
    // full square above covers the *entire* width of its bottom edge (the
    // same physical line). Only the overlapping half should merge away.
    const cells = cellsOf([
      [{ col: 0, row: 0 }, [{ shape: 'quarter-tl', color: 'teal' }]],
      [{ col: 0, row: -1 }, [{ shape: 'full', color: 'teal' }]],
    ]);
    const segments = computeBorderSegments(cells);
    const hasSegment = (x1: number, y1: number, x2: number, y2: number) =>
      segments.some(
        s =>
          (s.x1 === x1 && s.y1 === y1 && s.x2 === x2 && s.y2 === y2) ||
          (s.x1 === x2 && s.y1 === y2 && s.x2 === x1 && s.y2 === y1)
      );
    expect(hasSegment(0, 0, 1, 0)).toBe(false); // merged half
    expect(hasSegment(1, 0, 2, 0)).toBe(true); // unmatched half stays bordered
  });

  it('returns no segments for an empty grid', () => {
    expect(computeBorderSegments(new Map())).toEqual([]);
  });
});
