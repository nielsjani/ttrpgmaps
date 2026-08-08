import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CellFragment } from '../models/cell-fragment';
import { GridCoordinate, gridKey } from '../models/grid';
import { MapMakerTool, ShapeOption, pickFragmentShape } from '../models/pick-shape';
import { FragmentShape, shapeContainsPoint, shapesOverlap } from '../models/fragment-shape';
import { TextElement, generateTextId } from '../models/text-element';
import { Door, DoorOrientation, doorKey, getAdjacentCells } from '../models/door';
import { Wall, wallKey } from '../models/wall';
import { ArtAsset, artAssetPath, buildArtAssets } from '../models/art-asset';
import { ART_ASSET_MANIFEST } from '../models/art-asset-data';
import { ArtElement, generateArtId } from '../models/art-element';
import { PartyIcon } from '../models/party-icon';
import { PlayerIcon, generatePlayerIconId } from '../models/player-icon';
import { MapSnapshot } from '../models/map-snapshot';
import { MapMakerSaveData } from '../models/map-save-data';
import { HiddenArea, generateHiddenAreaId, nextAvailableLetter } from '../models/hidden-area';
import { computeBorderSegmentKeySet, wholeCellEdgeUnitKeys } from '../models/fragment-borders';

export const DEFAULT_COLORS: string[] = [
  '#e63946', // red
  '#f1a208', // orange
  '#ffd166', // yellow
  '#06d6a0', // green
  '#118ab2', // blue
  '#7209b7', // purple
  '#495057', // grey
  '#ffffff', // white
];

const PALETTE_STORAGE_KEY = 'map-maker.palette-colors';

/** Reads a previously-saved custom palette from localStorage, if present and valid. */
function loadStoredPalette(): string[] | null {
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(entry => typeof entry === 'string')) {
      return parsed;
    }
  } catch {
    // Ignore malformed storage / storage access errors (e.g. private browsing).
  }
  return null;
}

export const BASE_CELL_SIZE = 40;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

/** Defaults for a newly-created text element (all in world-space units). */
export const DEFAULT_TEXT_WIDTH = BASE_CELL_SIZE * 4;
export const DEFAULT_TEXT_HEIGHT = BASE_CELL_SIZE;
export const DEFAULT_TEXT_FONT_SIZE = 16;
export const MIN_TEXT_FONT_SIZE = 6;
export const MAX_TEXT_FONT_SIZE = 200;
export const MIN_TEXT_SIZE = 10;

/** Default size (world-space units) for a newly-placed art element's longer side; the other side is scaled to preserve the source image's aspect ratio. */
export const DEFAULT_ART_LONG_SIDE = BASE_CELL_SIZE * 2;
/** Fallback square size (world-space units) used only if an art element is placed before its image has finished loading (so its natural aspect ratio isn't known yet). */
export const DEFAULT_ART_FALLBACK_SIZE = BASE_CELL_SIZE * 2;
export const MIN_ART_SIZE = 8;

/** World-space offset (in each axis) applied when splitting a new player icon off from the party icon's current position, so it doesn't land exactly on top of the party icon. */
export const PLAYER_ICON_SPLIT_OFFSET = BASE_CELL_SIZE * 0.6;
/** Default fallback position (world-space) for a party icon placed before any placement has ever occurred, only used as a splitPlayerIcon() fallback if no party icon exists yet. */
export const DEFAULT_ICON_POSITION = { x: 0, y: 0 };


export interface PanOffset {
  x: number;
  y: number;
}

/**
 * Holds all shared, in-memory state for the dungeon-builder drawing tool:
 * the grid of drawn fragments, free-floating text elements, the active
 * tool/shape/color, the color palette, and the current pan/zoom of the
 * canvas. The grid of fragments and text elements are not persisted (story
 * 1/2 have no map save/load yet), but the color palette *is* persisted to
 * localStorage so a user's custom swatches survive page reloads.
 */
@Injectable()
export class MapMakerStateService {
  private readonly cells = new Map<string, CellFragment[]>();
  private readonly doors = new Map<string, Door>();
  /** Story 15: walls, keyed by wallKey(). Unlike doors, a wall has no non-empty-cell placement constraint and no hidden/revealed state. */
  private readonly walls = new Map<string, Wall>();

  /** Hidden areas designated by the DM (Story 7). See models/hidden-area.ts. */
  hiddenAreas: HiddenArea[] = [];

  activeTool: MapMakerTool = 'square';
  activeShapeOption: ShapeOption = 'square';

  /** All free-floating text elements placed on the map (world-space units, see TextElement). */
  texts: TextElement[] = [];
  /** The id of the currently-selected text element (shows move/resize/scale handles), or null. */
  selectedTextId: string | null = null;

  /** The full browsable list of art assets (built once from the static manifest). */
  readonly artAssets: ArtAsset[] = buildArtAssets(ART_ASSET_MANIFEST);
  private readonly artAssetsById = new Map<string, ArtAsset>(this.artAssets.map(a => [a.id, a]));
  /** Lazily-loaded/cached <img> elements for each art asset, keyed by fileName, shared by the sidebar preview and the canvas renderer. */
  private readonly artImageCache = new Map<string, HTMLImageElement>();

  /** All placed art elements (world-space units, see ArtElement). */
  artElements: ArtElement[] = [];
  /** The id of the currently-selected placed art element (shows move/scale/rotate handles), or null. */
  selectedArtId: string | null = null;
  /** The fileName of the asset currently chosen in the sidebar's Art panel for the *next* placement click, or null if none is selected. Stays selected across placements so the user can stamp multiple copies. */
  selectedArtAssetFileName: string | null = null;

  /**
   * 'design' (the default) enables the drawing tools (square/delete/text/
   * door/art); 'play' disables all of them (only pan/zoom + party/player
   * icon placement and dragging remain active). Switching modes does not
   * clear any drawn/placed content, including party/player icons, so a DM
   * can freely pause and resume a play session.
   */
  mode: 'design' | 'play' = 'design';

  /** The single shared "party" marker shown in Play mode, or null if not yet placed. */
  partyIcon: PartyIcon | null = null;
  /** Individual player markers split off from the party icon. */
  playerIcons: PlayerIcon[] = [];
  /** When true, the *next* canvas click in Play mode places (or re-places) the party icon there, using `playModeColor`, instead of being interpreted as a drag-start. Set by the sidebar's "Place/Move Party" button; auto-cleared once the placement happens. */
  armPartyPlacement = false;

  /**
   * When true (Story 8), clicking/dragging over an edge with the Door tool
   * active no longer adds/removes doors — instead it toggles the `hidden`
   * flag of whichever existing door sits on that edge (no-op on edges with
   * no door). Armed/disarmed by the sidebar's "Mark Hidden" toggle button,
   * purely local UI state (each window arms it independently, like
   * `armPartyPlacement`).
   */
  armHiddenDoorMode = false;

  /** The user-customizable default color swatches shown in the sidebar, persisted to localStorage. */
  paletteColors: string[] = loadStoredPalette() ?? [...DEFAULT_COLORS];
  activeColor: string = this.paletteColors[0];
  /** The color currently selected in the Play-mode sidebar panel, used for the next party placement or player split. */
  playModeColor: string = this.paletteColors[0];

  pan: PanOffset = { x: 0, y: 0 };
  zoom = 1;

  /** User-provided name of the dungeon being worked on (Story 6). Shown in a header text input; also used, sanitized, as the downloaded save file's name. */
  dungeonName = '';

  /**
   * Emits whenever any state changes that should trigger a canvas re-render
   * (fragments, pan, or zoom) — including changes made from outside the
   * canvas itself, e.g. the sidebar's zoom slider.
   */
  readonly changed$ = new Subject<void>();

  /**
   * Emits only when the party icon or a player icon is placed, moved,
   * recolored, renamed, added, or removed *locally* (not when applied via
   * `applyRemoteIcons`, to avoid an echo loop). `MapMakerSyncService`
   * subscribes to this to know when to broadcast a lightweight
   * icons-only update to the other window, instead of re-sending the whole
   * map on every drag frame.
   */
  readonly iconsChanged$ = new Subject<void>();

  /**
   * Emits only when a hidden area is designated, renamed, removed, or has
   * its `revealed` flag toggled *locally* (not when applied via
   * `applyRemoteHiddenAreas`, to avoid an echo loop). `MapMakerSyncService`
   * subscribes to this so a DM revealing/hiding an area *while already in
   * Play mode* is broadcast to the player-view window — unlike the rest of
   * the design-time map, hidden-area `revealed` state can legitimately
   * change after Play mode has started.
   */
  readonly hiddenAreasChanged$ = new Subject<void>();

  /**
   * Story 8: emits whenever a door is added, removed, or has its
   * `hidden`/`revealed` flag toggled *locally* (not when applied via
   * `applyRemoteDoors`, to avoid an echo loop). `MapMakerSyncService`
   * subscribes to this so a DM revealing a hidden door *while already in
   * Play mode* is broadcast to the player-view window — like hidden areas,
   * this can legitimately change after the initial Play-mode handshake.
   */
  readonly doorsChanged$ = new Subject<void>();

  /**
   * Story 8: emits whenever an art element is added, removed, transformed,
   * or has its `hidden`/`revealed` flag toggled *locally* (not when applied
   * via `applyRemoteArt`, to avoid an echo loop). `MapMakerSyncService`
   * subscribes to this so a DM revealing a hidden art asset *while already
   * in Play mode* is broadcast to the player-view window.
   */
  readonly artChanged$ = new Subject<void>();

  /** Returns the fragments currently occupying a cell (empty array if none). */
  getFragments(coord: GridCoordinate): CellFragment[] {
    return this.cells.get(gridKey(coord)) ?? [];
  }

  /** Returns all non-empty cells, keyed by their grid-key string. */
  getAllCells(): ReadonlyMap<string, CellFragment[]> {
    return this.cells;
  }

  /**
   * Places a fragment at the given cell, at the sub-position implied by
   * (fx, fy) (fractional position within the cell, each in [0,1)) and the
   * currently active shape option. Any existing fragments in that cell that
   * geometrically overlap the new fragment are removed first, so shapes
   * never overlap within a cell.
   */
  placeFragment(coord: GridCoordinate, fx: number, fy: number): void {
    const shape = pickFragmentShape(this.activeShapeOption, fx, fy);
    const key = gridKey(coord);
    const existing = this.cells.get(key) ?? [];
    const remaining = existing.filter(fragment => !shapesOverlap(fragment.shape, shape));
    remaining.push({ shape, color: this.activeColor });
    this.cells.set(key, remaining);
    this.changed$.next();
  }

  /**
   * Fills every cell in the inclusive rectangle spanning
   * (colMin, rowMin)..(colMax, rowMax) with a single full-square fragment in
   * the currently active color, replacing any existing fragments in those
   * cells (mirroring how a single full-square `placeFragment` call always
   * ends up as the sole fragment in a cell). Corner arguments are normalized
   * internally, so either corner order works. Used by the Square tool's
   * Ctrl-drag "large square" gesture (Story 9); emits `changed$` only once
   * after the whole rectangle has been written.
   */
  placeFullSquareRect(colMin: number, rowMin: number, colMax: number, rowMax: number): void {
    const minCol = Math.min(colMin, colMax);
    const maxCol = Math.max(colMin, colMax);
    const minRow = Math.min(rowMin, rowMax);
    const maxRow = Math.max(rowMin, rowMax);
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = gridKey({ col, row });
        this.cells.set(key, [{ shape: 'full', color: this.activeColor }]);
      }
    }
    this.changed$.next();
  }

  /**
   * Removes whichever single fragment (if any) occupies the sub-position
   * (fx, fy) within the given cell. Other fragments in the cell are left
   * untouched, so a merged-looking group of same-color shapes splits apart
   * as pieces are individually deleted. If this empties the cell entirely,
   * any doors on edges touching that cell are removed too, since a door
   * requires both of its neighboring cells to be non-empty.
   */
  removeFragmentAt(coord: GridCoordinate, fx: number, fy: number): void {
    const key = gridKey(coord);
    const existing = this.cells.get(key);
    if (!existing || existing.length === 0) {
      return;
    }
    const remaining = existing.filter(fragment => !shapeContainsPoint(fragment.shape, fx, fy));
    if (remaining.length === 0) {
      this.cells.delete(key);
      this.removeDoorsTouchingCell(coord);
      this.removeHiddenAreaCell(coord);
    } else {
      this.cells.set(key, remaining);
    }
    this.changed$.next();
  }

  setTool(tool: MapMakerTool): void {
    this.activeTool = tool;
    if (tool !== 'text') {
      this.selectedTextId = null;
    }
    if (tool !== 'art') {
      this.selectedArtId = null;
    }
    if (tool !== 'door') {
      this.armHiddenDoorMode = false;
    }
  }

  /** Switches between Design and Play mode. Never clears any drawn/placed content (including party/player icons), so a DM can freely pause and resume a play session. */
  setMode(mode: 'design' | 'play'): void {
    this.mode = mode;
    this.changed$.next();
  }

  setShapeOption(option: ShapeOption): void {
    this.activeShapeOption = option;
  }

  setColor(color: string): void {
    this.activeColor = color;
  }

  /** Overwrites a single palette swatch (by index) with a new color and persists the palette to localStorage. */
  setPaletteColor(index: number, color: string): void {
    if (index < 0 || index >= this.paletteColors.length) {
      return;
    }
    const updated = [...this.paletteColors];
    updated[index] = color;
    this.paletteColors = updated;
    this.persistPalette();
  }

  /** Restores the palette to its original default swatches and persists that. */
  resetPalette(): void {
    this.paletteColors = [...DEFAULT_COLORS];
    this.persistPalette();
  }

  private persistPalette(): void {
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(this.paletteColors));
    } catch {
      // Ignore storage errors (e.g. private browsing / quota exceeded).
    }
  }

  setPan(pan: PanOffset): void {
    this.pan = pan;
    this.changed$.next();
  }

  setZoom(zoom: number): void {
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    this.changed$.next();
  }

  /** Clears every drawn fragment (used mainly for tests). */
  clear(): void {
    this.cells.clear();
    this.doors.clear();
    this.walls.clear();
    this.artElements = [];
    this.selectedArtId = null;
    this.texts = [];
    this.selectedTextId = null;
    this.hiddenAreas = [];
    this.mode = 'design';
    this.partyIcon = null;
    this.playerIcons = [];
    this.armPartyPlacement = false;
    this.armHiddenDoorMode = false;
    this.changed$.next();
  }

  // --- Doors --------------------------------------------------------------

  /** Returns all placed doors, keyed by their canonical door-key string. */
  getAllDoors(): ReadonlyMap<string, Door> {
    return this.doors;
  }

  /** True if a door already exists on the given edge. */
  hasDoorAt(orientation: DoorOrientation, col: number, row: number): boolean {
    return this.doors.has(doorKey({ orientation, col, row }));
  }

  /** True if a door could legally be placed on the given edge — i.e. both of its neighboring cells currently have at least one drawn fragment. */
  canPlaceDoorAt(orientation: DoorOrientation, col: number, row: number): boolean {
    const [a, b] = getAdjacentCells(orientation, col, row);
    return this.getFragments(a).length > 0 && this.getFragments(b).length > 0;
  }

  /**
   * Toggles a door on the given edge: removes it if one is already there;
   * otherwise adds one, but only if `canPlaceDoorAt` allows it (silently
   * does nothing if the edge doesn't border two non-empty cells).
   */
  toggleDoorAt(orientation: DoorOrientation, col: number, row: number): void {
    const key = doorKey({ orientation, col, row });
    if (this.doors.has(key)) {
      this.doors.delete(key);
      this.changed$.next();
      this.doorsChanged$.next();
      return;
    }
    if (!this.canPlaceDoorAt(orientation, col, row)) {
      return;
    }
    this.doors.set(key, { orientation, col, row, hidden: false, revealed: false });
    this.changed$.next();
    this.doorsChanged$.next();
  }

  /** Arms (or disarms) "Mark Hidden" mode for the Door tool (Story 8): see `armHiddenDoorMode`. */
  setArmHiddenDoorMode(armed: boolean): void {
    this.armHiddenDoorMode = armed;
    this.changed$.next();
  }

  /**
   * Story 8: flips the `hidden` flag of the door (if any) on the given
   * edge — a no-op if there's no door there. Also resets `revealed` to
   * `false`, so re-marking a door in design mode never carries over a
   * stale Play-mode reveal state.
   */
  toggleDoorHidden(orientation: DoorOrientation, col: number, row: number): void {
    const key = doorKey({ orientation, col, row });
    const door = this.doors.get(key);
    if (!door) {
      return;
    }
    this.doors.set(key, { ...door, hidden: !door.hidden, revealed: false });
    this.changed$.next();
    this.doorsChanged$.next();
  }

  /** Story 8: flips the `revealed` flag of the door (if any) on the given edge — called when the DM clicks a hidden door's icon in Play mode. A no-op if there's no door there. */
  toggleDoorRevealed(orientation: DoorOrientation, col: number, row: number): void {
    const key = doorKey({ orientation, col, row });
    const door = this.doors.get(key);
    if (!door) {
      return;
    }
    this.doors.set(key, { ...door, revealed: !door.revealed });
    this.changed$.next();
    this.doorsChanged$.next();
  }

  /** Removes any doors on edges touching the given cell (used when a cell becomes empty, since a door requires both neighbors to be non-empty). */
  private removeDoorsTouchingCell(coord: GridCoordinate): void {
    for (const [key, door] of this.doors) {
      const [a, b] = getAdjacentCells(door.orientation, door.col, door.row);
      if ((a.col === coord.col && a.row === coord.row) || (b.col === coord.col && b.row === coord.row)) {
        this.doors.delete(key);
      }
    }
  }

  // --- Story 15: walls ------------------------------------------------------

  /** Returns all placed walls, keyed by their canonical wall-key string. */
  getAllWalls(): ReadonlyMap<string, Wall> {
    return this.walls;
  }

  /** True if a wall already exists on the given edge. */
  hasWallAt(orientation: DoorOrientation, col: number, row: number): boolean {
    return this.walls.has(wallKey({ orientation, col, row }));
  }

  /**
   * Toggles a wall on the given edge: removes it if one is already there;
   * otherwise adds one. Unlike doors, there is no non-empty-cell
   * constraint — a wall can be drawn on any grid edge, whether or not
   * either neighboring cell has been drawn on, since it's a purely
   * structural/design element independent of floor color.
   */
  toggleWallAt(orientation: DoorOrientation, col: number, row: number): void {
    const key = wallKey({ orientation, col, row });
    if (this.walls.has(key)) {
      this.walls.delete(key);
    } else {
      this.walls.set(key, { orientation, col, row });
    }
    this.changed$.next();
  }

  // --- Story 7: hidden areas -----------------------------------------------

  /**
   * Flood-fills from `coord` across orthogonally-adjacent non-empty cells,
   * stopping at any edge that either borders an empty cell, has a door on
   * it, has an explicit wall on it (both act as an area's boundary, per
   * the story: "separated to the empty grid by a border or door(s)"), or
   * is a visible color-boundary border between two differently-colored (or
   * otherwise non-merging) drawn fragments — e.g. where a large-square fill
   * of one color overlaps part of a differently-colored area, the black
   * border rendered at that seam (see `computeBorderSegmentKeySet`) counts
   * as a boundary too, even though no explicit `Wall` was placed there.
   * Returns an empty set if the starting cell itself has no fragments.
   */
  computeConnectedCells(coord: GridCoordinate): Set<string> {
    const visited = new Set<string>();
    if (this.getFragments(coord).length === 0) {
      return visited;
    }
    const borderKeys = computeBorderSegmentKeySet(this.cells);
    const queue: GridCoordinate[] = [coord];
    const neighbors: Array<{ orientation: DoorOrientation; col: number; row: number; next: GridCoordinate }> = [];
    while (queue.length > 0) {
      const current = queue.pop()!;
      const key = gridKey(current);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      neighbors.length = 0;
      // Left neighbor: vertical edge at x = current.col.
      neighbors.push({ orientation: 'vertical', col: current.col, row: current.row, next: { col: current.col - 1, row: current.row } });
      // Right neighbor: vertical edge at x = current.col + 1.
      neighbors.push({ orientation: 'vertical', col: current.col + 1, row: current.row, next: { col: current.col + 1, row: current.row } });
      // Top neighbor: horizontal edge at y = current.row.
      neighbors.push({ orientation: 'horizontal', col: current.col, row: current.row, next: { col: current.col, row: current.row - 1 } });
      // Bottom neighbor: horizontal edge at y = current.row + 1.
      neighbors.push({ orientation: 'horizontal', col: current.col, row: current.row + 1, next: { col: current.col, row: current.row + 1 } });

      for (const { orientation, col, row, next } of neighbors) {
        const nextKey = gridKey(next);
        if (visited.has(nextKey)) {
          continue;
        }
        if (this.getFragments(next).length === 0) {
          continue;
        }
        if (this.hasDoorAt(orientation, col, row)) {
          continue;
        }
        if (this.hasWallAt(orientation, col, row)) {
          continue;
        }
        if (wholeCellEdgeUnitKeys(orientation, col, row).some(key => borderKeys.has(key))) {
          continue;
        }
        queue.push(next);
      }
    }
    return visited;
  }

  /** Returns the hidden area (if any) that the given cell belongs to. */
  getHiddenAreaAt(coord: GridCoordinate): HiddenArea | undefined {
    const key = gridKey(coord);
    return this.hiddenAreas.find(area => area.cellKeys.includes(key));
  }

  /**
   * Toggles the hidden-area designation for the region containing `coord`:
   * if that cell already belongs to a hidden area, the whole area is
   * removed; otherwise (provided the cell is non-empty) a new hidden area
   * is created covering `computeConnectedCells(coord)`, with the next free
   * letter as both its `letter` and initial `name`. No-op if the cell is
   * empty and not already part of an area.
   */
  toggleHiddenAreaAt(coord: GridCoordinate): void {
    const existing = this.getHiddenAreaAt(coord);
    if (existing) {
      this.removeHiddenArea(existing.id);
      return;
    }
    const cells = this.computeConnectedCells(coord);
    if (cells.size === 0) {
      return;
    }
    const letter = nextAvailableLetter(this.hiddenAreas);
    this.hiddenAreas = [
      ...this.hiddenAreas,
      { id: generateHiddenAreaId(), letter, name: letter, cellKeys: Array.from(cells), revealed: false },
    ];
    this.changed$.next();
    this.hiddenAreasChanged$.next();
  }

  /** Overrides the display name of a hidden area (its `letter` — used for re-assignment ordering — is unaffected). */
  renameHiddenArea(id: string, name: string): void {
    const area = this.hiddenAreas.find(a => a.id === id);
    if (!area) {
      return;
    }
    area.name = name;
    this.changed$.next();
    this.hiddenAreasChanged$.next();
  }

  /** Deletes a hidden area outright, freeing its letter for reuse by the next newly-designated area. */
  removeHiddenArea(id: string): void {
    this.hiddenAreas = this.hiddenAreas.filter(a => a.id !== id);
    this.changed$.next();
    this.hiddenAreasChanged$.next();
  }

  /** Flips a hidden area's `revealed` flag — called when the DM clicks its letter badge in Play mode. */
  toggleHiddenAreaRevealed(id: string): void {
    const area = this.hiddenAreas.find(a => a.id === id);
    if (!area) {
      return;
    }
    area.revealed = !area.revealed;
    this.changed$.next();
    this.hiddenAreasChanged$.next();
  }

  /** Strips the given cell's key out of every hidden area's membership (called when that cell's last fragment is deleted), deleting any area that becomes empty as a result. */
  private removeHiddenAreaCell(coord: GridCoordinate): void {
    const key = gridKey(coord);
    this.hiddenAreas = this.hiddenAreas
      .map(area => (area.cellKeys.includes(key) ? { ...area, cellKeys: area.cellKeys.filter(k => k !== key) } : area))
      .filter(area => area.cellKeys.length > 0);
  }

  /** Returns the TextElement with the given id, if any. */
  getText(id: string): TextElement | undefined {
    return this.texts.find(t => t.id === id);
  }

  /**
   * Creates a new, empty text element at the given world-space position with
   * default size/font-size, selects it, and returns it so the caller (the
   * canvas) can immediately enter inline-edit mode on it.
   */
  addText(x: number, y: number): TextElement {
    const text: TextElement = {
      id: generateTextId(),
      x,
      y,
      width: DEFAULT_TEXT_WIDTH,
      height: DEFAULT_TEXT_HEIGHT,
      fontSize: DEFAULT_TEXT_FONT_SIZE,
      text: '',
    };
    this.texts = [...this.texts, text];
    this.selectedTextId = text.id;
    this.changed$.next();
    return text;
  }

  /**
   * Updates a text element's content. If the new content is blank/
   * whitespace-only, the element is removed entirely instead, so users never
   * end up with invisible empty text boxes left on the map.
   */
  updateTextContent(id: string, content: string): void {
    if (content.trim().length === 0) {
      this.removeText(id);
      return;
    }
    this.texts = this.texts.map(t => (t.id === id ? { ...t, text: content } : t));
    this.changed$.next();
  }

  /** Moves a text element to a new world-space top-left position. */
  moveText(id: string, x: number, y: number): void {
    this.texts = this.texts.map(t => (t.id === id ? { ...t, x, y } : t));
    this.changed$.next();
  }

  /** Resizes a text element's wrapping box (width/height only; font size is unchanged), clamped to a sane minimum. */
  resizeText(id: string, width: number, height: number): void {
    const clampedWidth = Math.max(MIN_TEXT_SIZE, width);
    const clampedHeight = Math.max(MIN_TEXT_SIZE, height);
    this.texts = this.texts.map(t => (t.id === id ? { ...t, width: clampedWidth, height: clampedHeight } : t));
    this.changed$.next();
  }

  /**
   * Uniformly scales a text element's font size and box size together by
   * `factor` (e.g. 1.1 to grow 10%), clamped so the font size stays within
   * [MIN_TEXT_FONT_SIZE, MAX_TEXT_FONT_SIZE].
   */
  scaleText(id: string, factor: number): void {
    this.texts = this.texts.map(t => {
      if (t.id !== id) {
        return t;
      }
      const targetFontSize = t.fontSize * factor;
      const clampedFontSize = Math.min(MAX_TEXT_FONT_SIZE, Math.max(MIN_TEXT_FONT_SIZE, targetFontSize));
      const appliedFactor = clampedFontSize / t.fontSize;
      return {
        ...t,
        fontSize: clampedFontSize,
        width: Math.max(MIN_TEXT_SIZE, t.width * appliedFactor),
        height: Math.max(MIN_TEXT_SIZE, t.height * appliedFactor),
      };
    });
    this.changed$.next();
  }

  /**
   * Directly overwrites the given absolute geometry fields of a text element
   * (position/size/font-size), clamped to sane bounds. Used by the canvas
   * during move/resize/scale drags, where each mousemove computes the
   * intended absolute values from a fixed drag-start snapshot (avoiding the
   * compounding errors that would result from repeatedly applying a
   * relative delta to state that has itself already changed).
   */
  setTextBox(id: string, box: Partial<Pick<TextElement, 'x' | 'y' | 'width' | 'height' | 'fontSize'>>): void {
    this.texts = this.texts.map(t => {
      if (t.id !== id) {
        return t;
      }
      const next = { ...t, ...box };
      next.width = Math.max(MIN_TEXT_SIZE, next.width);
      next.height = Math.max(MIN_TEXT_SIZE, next.height);
      next.fontSize = Math.min(MAX_TEXT_FONT_SIZE, Math.max(MIN_TEXT_FONT_SIZE, next.fontSize));
      return next;
    });
    this.changed$.next();
  }

  /** Removes a text element entirely, deselecting it if it was selected. */
  removeText(id: string): void {
    this.texts = this.texts.filter(t => t.id !== id);
    if (this.selectedTextId === id) {
      this.selectedTextId = null;
    }
    this.changed$.next();
  }

  /** Selects (or deselects, when passed null) a text element for showing move/resize/scale handles. */
  setSelectedText(id: string | null): void {
    this.selectedTextId = id;
    this.changed$.next();
  }

  // --- Art assets -----------------------------------------------------------

  /** Returns the browsable list of art assets, optionally filtered by a case-insensitive name substring and/or an exact category. */
  getArtAssets(filter?: { search?: string; category?: string }): ArtAsset[] {
    const search = filter?.search?.trim().toLowerCase();
    const category = filter?.category;
    return this.artAssets.filter(asset => {
      if (category && asset.category !== category) {
        return false;
      }
      if (search && !asset.name.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });
  }

  /** All distinct categories present in the art asset manifest (used to populate the sidebar's category filter). */
  getArtCategories(): string[] {
    return Array.from(new Set(this.artAssets.map(a => a.category)));
  }

  /**
   * Returns the (lazily created, cached, and shared) `<img>` element for the
   * given art asset file name, kicking off its network load the first time
   * it's requested. Once loaded, `changed$` is emitted so the canvas
   * re-renders (needed both to actually draw the image and, for a
   * just-placed element, to pick up the image's real aspect ratio).
   */
  getArtImage(fileName: string): HTMLImageElement {
    let img = this.artImageCache.get(fileName);
    if (!img) {
      const asset = this.artAssetsById.get(fileName);
      img = new Image();
      img.src = artAssetPath(asset?.category ?? '2minutetabletop', fileName);
      img.onload = () => this.changed$.next();
      this.artImageCache.set(fileName, img);
    }
    return img;
  }

  /** Selects (or deselects, when passed null) which art asset the next canvas click will stamp. Stays selected across multiple placements. */
  setSelectedArtAsset(fileName: string | null): void {
    this.selectedArtAssetFileName = fileName;
    if (fileName) {
      // Warm the image cache so the aspect ratio is likely already known by
      // the time the user clicks the canvas to place it.
      this.getArtImage(fileName);
    }
  }

  /** Returns the ArtElement with the given id, if any. */
  getArt(id: string): ArtElement | undefined {
    return this.artElements.find(a => a.id === id);
  }

  /**
   * Places a new instance of the given asset centered at the given
   * world-space point, sized to preserve the source image's aspect ratio
   * (its longer side set to DEFAULT_ART_LONG_SIDE), selects it, and returns
   * it. Falls back to a small square if the image hasn't loaded yet.
   */
  addArt(assetFileName: string, centerX: number, centerY: number): ArtElement {
    const img = this.getArtImage(assetFileName);
    let width = DEFAULT_ART_FALLBACK_SIZE;
    let height = DEFAULT_ART_FALLBACK_SIZE;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const aspect = img.naturalWidth / img.naturalHeight;
      if (aspect >= 1) {
        width = DEFAULT_ART_LONG_SIDE;
        height = DEFAULT_ART_LONG_SIDE / aspect;
      } else {
        height = DEFAULT_ART_LONG_SIDE;
        width = DEFAULT_ART_LONG_SIDE * aspect;
      }
    }
    const art: ArtElement = {
      id: generateArtId(),
      assetFileName,
      centerX,
      centerY,
      width,
      height,
      rotation: 0,
      hidden: false,
      revealed: false,
    };
    this.artElements = [...this.artElements, art];
    this.selectedArtId = art.id;
    this.changed$.next();
    this.artChanged$.next();
    return art;
  }

  /**
   * Directly overwrites the given absolute geometry fields of an art
   * element (center position/size/rotation), clamped to a sane minimum
   * size. Used by the canvas during move/scale/rotate drags, where each
   * mousemove computes the intended absolute values from a fixed
   * drag-start snapshot (same idiom as `setTextBox`).
   */
  setArtTransform(id: string, transform: Partial<Pick<ArtElement, 'centerX' | 'centerY' | 'width' | 'height' | 'rotation'>>): void {
    this.artElements = this.artElements.map(a => {
      if (a.id !== id) {
        return a;
      }
      const next = { ...a, ...transform };
      next.width = Math.max(MIN_ART_SIZE, next.width);
      next.height = Math.max(MIN_ART_SIZE, next.height);
      return next;
    });
    this.changed$.next();
    this.artChanged$.next();
  }

  /** Removes an art element entirely, deselecting it if it was selected. */
  removeArt(id: string): void {
    this.artElements = this.artElements.filter(a => a.id !== id);
    if (this.selectedArtId === id) {
      this.selectedArtId = null;
    }
    this.changed$.next();
    this.artChanged$.next();
  }

  /** Selects (or deselects, when passed null) a placed art element for showing move/scale/rotate handles. */
  setSelectedArt(id: string | null): void {
    this.selectedArtId = id;
    this.changed$.next();
  }

  /**
   * Story 8: sets the `hidden` flag of a placed art element (design-time
   * designation, driven by the sidebar's "Hidden" checkbox for the
   * currently-selected element). Also resets `revealed` to `false`, so
   * re-marking an element in design mode never carries over a stale
   * Play-mode reveal state. No-op if the element doesn't exist.
   */
  setArtHidden(id: string, hidden: boolean): void {
    this.artElements = this.artElements.map(a => (a.id === id ? { ...a, hidden, revealed: false } : a));
    this.changed$.next();
    this.artChanged$.next();
  }

  /** Story 8: flips the `revealed` flag of a placed art element — called when the DM clicks a hidden art element in Play mode. No-op if the element doesn't exist. */
  toggleArtRevealed(id: string): void {
    this.artElements = this.artElements.map(a => (a.id === id ? { ...a, revealed: !a.revealed } : a));
    this.changed$.next();
    this.artChanged$.next();
  }

  // --- Play mode: party/player icons ----------------------------------------

  /** Places (or re-places) the single party icon at the given world-space position with the given color. */
  placePartyIcon(x: number, y: number, color: string): void {
    this.partyIcon = { x, y, color };
    this.changed$.next();
    this.iconsChanged$.next();
  }

  /** Moves the party icon to a new world-space position (no-op if no party icon exists yet). */
  movePartyIcon(x: number, y: number): void {
    if (!this.partyIcon) {
      return;
    }
    this.partyIcon = { ...this.partyIcon, x, y };
    this.changed$.next();
    this.iconsChanged$.next();
  }

  /** Changes the party icon's color (no-op if no party icon exists yet). */
  setPartyColor(color: string): void {
    if (!this.partyIcon) {
      return;
    }
    this.partyIcon = { ...this.partyIcon, color };
    this.changed$.next();
    this.iconsChanged$.next();
  }

  /** Arms (or disarms) placement of the party icon: the next canvas click in Play mode will place/move it there. Purely local UI state (not synced across the BroadcastChannel — each window arms its own placement independently). */
  setArmPartyPlacement(armed: boolean): void {
    this.armPartyPlacement = armed;
    this.changed$.next();
  }

  /** Sets the color currently selected in the Play-mode sidebar panel, used for the next party placement or player split. */
  setPlayModeColor(color: string): void {
    this.playModeColor = color;
    this.changed$.next();
  }

  /**
   * Spawns a new player icon at a small fixed offset from the party icon's
   * current position (or a default fallback position if no party icon has
   * been placed yet), with the given color and optional name.
   */
  splitPlayerIcon(color: string, name = ''): PlayerIcon {
    const basePosition = this.partyIcon ?? DEFAULT_ICON_POSITION;
    const icon: PlayerIcon = {
      id: generatePlayerIconId(),
      x: basePosition.x + PLAYER_ICON_SPLIT_OFFSET,
      y: basePosition.y + PLAYER_ICON_SPLIT_OFFSET,
      color,
      name,
    };
    this.playerIcons = [...this.playerIcons, icon];
    this.changed$.next();
    this.iconsChanged$.next();
    return icon;
  }

  /** Moves a player icon to a new world-space position. */
  movePlayerIcon(id: string, x: number, y: number): void {
    this.playerIcons = this.playerIcons.map(p => (p.id === id ? { ...p, x, y } : p));
    this.changed$.next();
    this.iconsChanged$.next();
  }

  /** Changes a player icon's color. */
  setPlayerIconColor(id: string, color: string): void {
    this.playerIcons = this.playerIcons.map(p => (p.id === id ? { ...p, color } : p));
    this.changed$.next();
    this.iconsChanged$.next();
  }

  /** Renames a player icon. */
  setPlayerIconName(id: string, name: string): void {
    this.playerIcons = this.playerIcons.map(p => (p.id === id ? { ...p, name } : p));
    this.changed$.next();
    this.iconsChanged$.next();
  }

  /** Removes a player icon entirely. */
  removePlayerIcon(id: string): void {
    this.playerIcons = this.playerIcons.filter(p => p.id !== id);
    this.changed$.next();
    this.iconsChanged$.next();
  }

  /**
   * Directly overwrites the party/player icon state — used when applying an
   * incoming update received over `MapMakerSyncService`'s BroadcastChannel.
   * Deliberately emits only `changed$` (to trigger a re-render) and *not*
   * `iconsChanged$`, so applying a remote update doesn't get immediately
   * re-broadcast back onto the channel (which would create an echo loop
   * between the two windows).
   */
  applyRemoteIcons(partyIcon: PartyIcon | null, playerIcons: PlayerIcon[]): void {
    this.partyIcon = partyIcon;
    this.playerIcons = playerIcons;
    this.changed$.next();
  }

  /**
   * Directly overwrites hidden-area state — used when applying an incoming
   * `'hidden-areas-update'` message received over `MapMakerSyncService`'s
   * BroadcastChannel (e.g. the DM revealing/hiding an area while already in
   * Play mode). Deliberately emits only `changed$` and *not*
   * `hiddenAreasChanged$`, so applying a remote update doesn't get
   * immediately re-broadcast back onto the channel (echo loop).
   */
  applyRemoteHiddenAreas(hiddenAreas: HiddenArea[]): void {
    this.hiddenAreas = hiddenAreas;
    this.changed$.next();
  }

  /**
   * Story 8: directly overwrites door state — used when applying an
   * incoming `'doors-update'` message received over `MapMakerSyncService`'s
   * BroadcastChannel (e.g. the DM revealing a hidden door while already in
   * Play mode). Deliberately emits only `changed$` and *not*
   * `doorsChanged$`, so applying a remote update doesn't get immediately
   * re-broadcast back onto the channel (echo loop).
   */
  applyRemoteDoors(doors: Door[]): void {
    this.doors.clear();
    for (const door of doors) {
      this.doors.set(doorKey(door), { ...door });
    }
    this.changed$.next();
  }

  /**
   * Story 8: directly overwrites placed-art state — used when applying an
   * incoming `'art-update'` message received over `MapMakerSyncService`'s
   * BroadcastChannel (e.g. the DM revealing a hidden art asset while
   * already in Play mode). Deliberately emits only `changed$` and *not*
   * `artChanged$`, so applying a remote update doesn't get immediately
   * re-broadcast back onto the channel (echo loop).
   */
  applyRemoteArt(artElements: ArtElement[]): void {
    this.artElements = artElements.map(a => ({ ...a }));
    this.changed$.next();
  }

  // --- Play mode: full-map snapshot (design data handshake) ------------------

  /** Builds a plain-object, structurally-cloneable snapshot of all design-time map data, for `MapMakerSyncService` to hand to a freshly-connected player-view window. */
  getSnapshot(): MapSnapshot {
    return {
      cells: Array.from(this.cells.entries()).map(([key, fragments]) => [key, [...fragments]]),
      doors: Array.from(this.doors.values()).map(door => ({ ...door })),
      walls: Array.from(this.walls.values()).map(wall => ({ ...wall })),
      texts: this.texts.map(t => ({ ...t })),
      artElements: this.artElements.map(a => ({ ...a })),
      hiddenAreas: this.hiddenAreas.map(h => ({ ...h, cellKeys: [...h.cellKeys] })),
    };
  }

  /** Overwrites all design-time map data (cells/doors/walls/texts/art/hidden areas) from a snapshot received over the sync channel. Does not touch play-mode state (mode/party/player icons). */
  applySnapshot(snapshot: MapSnapshot): void {
    this.cells.clear();
    for (const [key, fragments] of snapshot.cells) {
      this.cells.set(key, [...fragments]);
    }
    this.doors.clear();
    for (const door of snapshot.doors) {
      this.doors.set(doorKey(door), { ...door });
    }
    this.walls.clear();
    for (const wall of snapshot.walls ?? []) {
      this.walls.set(wallKey(wall), { ...wall });
    }
    this.texts = snapshot.texts.map(t => ({ ...t }));
    this.artElements = snapshot.artElements.map(a => ({ ...a }));
    this.hiddenAreas = (snapshot.hiddenAreas ?? []).map(h => ({ ...h, cellKeys: [...h.cellKeys] }));
    this.changed$.next();
  }

  // --- Story 6: save/load ------------------------------------------------

  /**
   * Builds the full, versioned save-file payload: everything `getSnapshot()`
   * covers (cells/doors/texts/art) plus play-mode data (party/player icons)
   * and color preferences (palette/active/play-mode colors), per Story 6's
   * "all data from both design and play mode is saved/loaded". Deliberately
   * does *not* include `mode` itself — loading a file always lands back in
   * Design mode (see `importSaveData`), so a stray popped-out player window
   * is never auto-reopened just from loading a file.
   */
  exportSaveData(): MapMakerSaveData {
    const snapshot = this.getSnapshot();
    return {
      version: 1,
      dungeonName: this.dungeonName,
      cells: snapshot.cells,
      doors: snapshot.doors,
      walls: snapshot.walls,
      texts: snapshot.texts,
      artElements: snapshot.artElements,
      hiddenAreas: snapshot.hiddenAreas,
      partyIcon: this.partyIcon ? { ...this.partyIcon } : null,
      playerIcons: this.playerIcons.map(p => ({ ...p })),
      paletteColors: [...this.paletteColors],
      activeColor: this.activeColor,
      playModeColor: this.playModeColor,
    };
  }

  /**
   * Restores full map state (design + play data + color preferences) from a
   * previously-exported save payload. Tolerates missing optional fields
   * (falls back to current/empty values) so files saved before a field
   * existed still load without error. Always forces Design mode and clears
   * any in-progress selections, so the canvas lands in a clean, predictable
   * state regardless of what was selected/active before the load.
   */
  importSaveData(data: MapMakerSaveData): void {
    this.dungeonName = data.dungeonName ?? '';
    this.applySnapshot({
      cells: data.cells ?? [],
      doors: data.doors ?? [],
      walls: data.walls ?? [],
      texts: data.texts ?? [],
      artElements: data.artElements ?? [],
      hiddenAreas: data.hiddenAreas ?? [],
    });
    this.partyIcon = data.partyIcon ?? null;
    this.playerIcons = data.playerIcons ? data.playerIcons.map(p => ({ ...p })) : [];
    this.armPartyPlacement = false;
    this.paletteColors = data.paletteColors && data.paletteColors.length > 0 ? [...data.paletteColors] : [...DEFAULT_COLORS];
    this.activeColor = data.activeColor ?? this.paletteColors[0];
    this.playModeColor = data.playModeColor ?? this.paletteColors[0];
    this.persistPalette();
    this.mode = 'design';
    this.selectedTextId = null;
    this.selectedArtId = null;
    this.selectedArtAssetFileName = null;
    this.changed$.next();
  }
}

export type { FragmentShape };
