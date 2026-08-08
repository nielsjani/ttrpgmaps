import { CellFragment } from './cell-fragment';
import { Door } from './door';
import { Wall } from './wall';
import { TextElement } from './text-element';
import { ArtElement } from './art-element';
import { PartyIcon } from './party-icon';
import { PlayerIcon } from './player-icon';
import { HiddenArea } from './hidden-area';

/**
 * The full, versioned payload persisted to/restored from a `.json` save
 * file (Story 6 — Save and load). Unlike `MapSnapshot` (which only mirrors
 * design-time data for the DM/player-view sync handshake), this also
 * includes play-mode data (party/player icons) and color preferences, since
 * the story requires "all data from both design and play mode" to survive
 * a save/load round-trip.
 *
 * `version` is bumped whenever the shape of this interface changes in a
 * backwards-incompatible way, so `MapMakerFileService`/`importSaveData()`
 * can branch on it in the future. Optional/added fields should otherwise be
 * tolerated with sensible defaults when loading older files.
 */
export interface MapMakerSaveData {
  version: 1;
  /** User-provided name of the dungeon, as typed (unsanitized) — also used, sanitized, as the downloaded/loaded file's name. */
  dungeonName: string;
  cells: Array<[string, CellFragment[]]>;
  doors: Door[];
  walls: Wall[];
  texts: TextElement[];
  artElements: ArtElement[];
  hiddenAreas: HiddenArea[];
  partyIcon: PartyIcon | null;
  playerIcons: PlayerIcon[];
  paletteColors: string[];
  activeColor: string;
  playModeColor: string;
}
