import { FragmentShape } from './fragment-shape';

/** The shape family selected in the sidebar for the square (draw) tool. */
export type ShapeOption = 'square' | 'half' | 'quarter' | 'triangle';

/** Tools available in the sidebar. Panning is handled separately, via the right mouse button, regardless of the active tool. */
export type MapMakerTool = 'square' | 'delete' | 'text' | 'door' | 'art' | 'hidden-area' | 'wall';

/**
 * Determines the concrete FragmentShape to place, given the selected shape
 * option and where within the cell (fx, fy in [0,1)) the user clicked.
 * - 'square' always yields a full-cell fragment.
 * - 'half' picks the half whose edge (top/bottom/left/right) is nearest the click.
 * - 'quarter' picks the quarter whose corner is nearest the click.
 * - 'triangle' picks the corner-triangle whose corner is nearest the click.
 */
export function pickFragmentShape(option: ShapeOption, fx: number, fy: number): FragmentShape {
  switch (option) {
    case 'square':
      return 'full';
    case 'half': {
      const distances: Array<[FragmentShape, number]> = [
        ['half-top', fy],
        ['half-bottom', 1 - fy],
        ['half-left', fx],
        ['half-right', 1 - fx],
      ];
      return nearest(distances);
    }
    case 'quarter': {
      const corner = nearestCorner(fx, fy);
      return `quarter-${corner}` as FragmentShape;
    }
    case 'triangle': {
      const corner = nearestCorner(fx, fy);
      return `triangle-${corner}` as FragmentShape;
    }
  }
}

function nearest(distances: Array<[FragmentShape, number]>): FragmentShape {
  return distances.reduce((best, current) => (current[1] < best[1] ? current : best))[0];
}

function nearestCorner(fx: number, fy: number): 'tl' | 'tr' | 'bl' | 'br' {
  const vertical = fy < 0.5 ? 't' : 'b';
  const horizontal = fx < 0.5 ? 'l' : 'r';
  return `${vertical}${horizontal}` as 'tl' | 'tr' | 'bl' | 'br';
}
