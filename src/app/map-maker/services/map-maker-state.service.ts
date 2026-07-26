import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CellFragment } from '../models/cell-fragment';
import { GridCoordinate, gridKey } from '../models/grid';
import { MapMakerTool, ShapeOption, pickFragmentShape } from '../models/pick-shape';
import { FragmentShape, shapeContainsPoint, shapesOverlap } from '../models/fragment-shape';
import { TextElement, generateTextId } from '../models/text-element';
import { Door, DoorOrientation, doorKey, getAdjacentCells } from '../models/door';

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

  activeTool: MapMakerTool = 'square';
  activeShapeOption: ShapeOption = 'square';

  /** All free-floating text elements placed on the map (world-space units, see TextElement). */
  texts: TextElement[] = [];
  /** The id of the currently-selected text element (shows move/resize/scale handles), or null. */
  selectedTextId: string | null = null;

  /** The user-customizable default color swatches shown in the sidebar, persisted to localStorage. */
  paletteColors: string[] = loadStoredPalette() ?? [...DEFAULT_COLORS];
  activeColor: string = this.paletteColors[0];

  pan: PanOffset = { x: 0, y: 0 };
  zoom = 1;

  /**
   * Emits whenever any state changes that should trigger a canvas re-render
   * (fragments, pan, or zoom) — including changes made from outside the
   * canvas itself, e.g. the sidebar's zoom slider.
   */
  readonly changed$ = new Subject<void>();

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
      return;
    }
    if (!this.canPlaceDoorAt(orientation, col, row)) {
      return;
    }
    this.doors.set(key, { orientation, col, row });
    this.changed$.next();
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
}

export type { FragmentShape };
