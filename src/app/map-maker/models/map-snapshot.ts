import { CellFragment } from './cell-fragment';
import { Door } from './door';
import { Wall } from './wall';
import { TextElement } from './text-element';
import { ArtElement } from './art-element';
import { HiddenArea } from './hidden-area';

/**
 * A plain-object, structurally-cloneable mirror of all design-time map data
 * (drawn fragments, doors, walls, text, art, and hidden areas) — used by
 * `MapMakerSyncService` to hand the whole map to a freshly-opened
 * player-view window over a `BroadcastChannel` (which can only carry
 * structured-cloneable data, not class instances or `Map`s directly, hence
 * `cells` being an array of entries rather than a `Map`). Hidden areas are
 * included here (not just in the save-file payload) since the player-view
 * needs their boundaries/letters/`revealed` state to render its fog of war.
 * Walls (Story 15) are likewise included since they must render identically
 * on both the DM and player-view canvases, but — unlike doors/art/hidden
 * areas — never change once Play mode has started, so they need no
 * separate live-update message type (see `MapMakerSyncService`).
 */
export interface MapSnapshot {
  cells: Array<[string, CellFragment[]]>;
  doors: Door[];
  walls: Wall[];
  texts: TextElement[];
  artElements: ArtElement[];
  hiddenAreas: HiddenArea[];
}
