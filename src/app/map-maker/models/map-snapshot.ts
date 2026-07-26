import { CellFragment } from './cell-fragment';
import { Door } from './door';
import { TextElement } from './text-element';
import { ArtElement } from './art-element';

/**
 * A plain-object, structurally-cloneable mirror of all design-time map data
 * (drawn fragments, doors, text, and art) — used by `MapMakerSyncService` to
 * hand the whole map to a freshly-opened player-view window over a
 * `BroadcastChannel` (which can only carry structured-cloneable data, not
 * class instances or `Map`s directly, hence `cells` being an array of
 * entries rather than a `Map`).
 */
export interface MapSnapshot {
  cells: Array<[string, CellFragment[]]>;
  doors: Door[];
  texts: TextElement[];
  artElements: ArtElement[];
}
