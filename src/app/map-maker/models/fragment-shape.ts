/**
 * All possible shapes a single fragment (piece of color) placed inside a
 * grid cell can take. Coordinates for each shape are defined in "local" unit
 * space where the cell spans from (0,0) top-left to (1,1) bottom-right.
 */
export type FragmentShape =
  | 'full'
  | 'half-top'
  | 'half-bottom'
  | 'half-left'
  | 'half-right'
  | 'quarter-tl'
  | 'quarter-tr'
  | 'quarter-bl'
  | 'quarter-br'
  | 'triangle-tl'
  | 'triangle-tr'
  | 'triangle-bl'
  | 'triangle-br';

/** A point in the cell's local unit space, (0,0) = top-left, (1,1) = bottom-right. */
export type LocalPoint = [number, number];

/**
 * Polygon (list of vertices, in order) describing the area each fragment
 * shape covers within a unit cell. Used both for rendering (scaled to
 * world/screen space) and for point-in-shape / overlap tests.
 */
export const FRAGMENT_POLYGONS: Record<FragmentShape, LocalPoint[]> = {
  full: [[0, 0], [1, 0], [1, 1], [0, 1]],
  'half-top': [[0, 0], [1, 0], [1, 0.5], [0, 0.5]],
  'half-bottom': [[0, 0.5], [1, 0.5], [1, 1], [0, 1]],
  'half-left': [[0, 0], [0.5, 0], [0.5, 1], [0, 1]],
  'half-right': [[0.5, 0], [1, 0], [1, 1], [0.5, 1]],
  'quarter-tl': [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]],
  'quarter-tr': [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]],
  'quarter-bl': [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]],
  'quarter-br': [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]],
  // Right-triangles named after the corner holding the right angle; the
  // hypotenuse runs along the opposite diagonal.
  'triangle-tl': [[0, 0], [1, 0], [0, 1]],
  'triangle-tr': [[0, 0], [1, 0], [1, 1]],
  'triangle-bl': [[0, 0], [1, 1], [0, 1]],
  'triangle-br': [[1, 0], [1, 1], [0, 1]],
};

/** Ray-casting point-in-polygon test, operating in local unit space. */
export function polygonContainsPoint(polygon: LocalPoint[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

/** Whether the given local-space point (fx, fy) in [0,1) falls within a fragment shape. */
export function shapeContainsPoint(shape: FragmentShape, fx: number, fy: number): boolean {
  return polygonContainsPoint(FRAGMENT_POLYGONS[shape], fx, fy);
}

const OVERLAP_SAMPLE_RESOLUTION = 8;

/**
 * Approximates whether two fragment shapes (within the same cell) overlap by
 * sampling a grid of points across the unit cell and checking whether both
 * shapes claim any common point. Good enough for placement conflict
 * resolution without needing full polygon clipping.
 */
export function shapesOverlap(a: FragmentShape, b: FragmentShape): boolean {
  const polyA = FRAGMENT_POLYGONS[a];
  const polyB = FRAGMENT_POLYGONS[b];
  for (let i = 0; i < OVERLAP_SAMPLE_RESOLUTION; i++) {
    for (let j = 0; j < OVERLAP_SAMPLE_RESOLUTION; j++) {
      const x = (i + 0.5) / OVERLAP_SAMPLE_RESOLUTION;
      const y = (j + 0.5) / OVERLAP_SAMPLE_RESOLUTION;
      if (polygonContainsPoint(polyA, x, y) && polygonContainsPoint(polyB, x, y)) {
        return true;
      }
    }
  }
  return false;
}
