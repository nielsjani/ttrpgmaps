import { FragmentShape } from './fragment-shape';

/** A single colored piece of fill placed within a grid cell. */
export interface CellFragment {
  shape: FragmentShape;
  color: string;
}
