import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CellFragment } from '../models/cell-fragment';
import { GridCoordinate, gridKey } from '../models/grid';
import { MapMakerTool, ShapeOption, pickFragmentShape } from '../models/pick-shape';
import { FragmentShape, shapeContainsPoint, shapesOverlap } from '../models/fragment-shape';

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

export interface PanOffset {
  x: number;
  y: number;
}

/**
 * Holds all shared, in-memory state for the dungeon-builder drawing tool:
 * the grid of drawn fragments, the active tool/shape/color, the color
 * palette, and the current pan/zoom of the canvas. The grid of drawn
 * fragments is not persisted (story 1 has no map save/load yet), but the
 * color palette *is* persisted to localStorage so a user's custom swatches
 * survive page reloads.
 */
@Injectable()
export class MapMakerStateService {
  private readonly cells = new Map<string, CellFragment[]>();

  activeTool: MapMakerTool = 'square';
  activeShapeOption: ShapeOption = 'square';

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
   * as pieces are individually deleted.
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
    } else {
      this.cells.set(key, remaining);
    }
    this.changed$.next();
  }

  setTool(tool: MapMakerTool): void {
    this.activeTool = tool;
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
    this.changed$.next();
  }
}

export type { FragmentShape };
