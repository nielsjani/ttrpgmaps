import { CellFragment } from './cell-fragment';
import { Door } from './door';
import { TextElement } from './text-element';
import { ArtElement } from './art-element';
import { HiddenArea } from './hidden-area';

/**
 * A plain-object, structurally-cloneable mirror of all design-time map data
 * (drawn fragments, doors, text, art, and hidden areas) — used by
 * `MapMakerSyncService` to hand the whole map to a freshly-opened
 * player-view window over a `BroadcastChannel` (which can only carry
 * structured-cloneable data, not class instances or `Map`s directly, hence
 * `cells` being an array of entries rather than a `Map`). Hidden areas are
 * included here (not just in the save-file payload) since the player-view
 * needs their boundaries/letters/`revealed` state to render its fog of war.
 */
export interface MapSnapshot {
  cells: Array<[string, CellFragment[]]>;
  doors: Door[];
  texts: TextElement[];
  artElements: ArtElement[];
  hiddenAreas: HiddenArea[];
}
