import { Component, ElementRef, HostListener, QueryList, ViewChildren } from '@angular/core';
import { MapMakerStateService, MIN_ZOOM, MAX_ZOOM } from '../services/map-maker-state.service';
import { MapMakerTool, ShapeOption } from '../models/pick-shape';

interface ShapeOptionDef {
  value: ShapeOption;
  label: string;
  icon: string;
}

/**
 * Sidebar for the dungeon builder: tool selection (square/delete, with
 * 's'/'d' keyboard shortcuts), shape sub-option picker, color picker
 * (customizable default swatches, persisted to localStorage, + a custom
 * picker), and a zoom slider — all bound to MapMakerStateService. Panning
 * is not a selectable tool here; it's always available via the right mouse
 * button on the canvas.
 */
@Component({
  selector: 'app-map-maker-sidebar',
  templateUrl: './map-maker-sidebar.component.html',
  styleUrls: ['./map-maker-sidebar.component.scss'],
})
export class MapMakerSidebarComponent {
  readonly minZoom = MIN_ZOOM;
  readonly maxZoom = MAX_ZOOM;

  @ViewChildren('paletteInput') paletteInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly shapeOptions: ShapeOptionDef[] = [
    { value: 'square', label: 'Full square', icon: '⬛' },
    { value: 'half', label: 'Half square', icon: '▬' },
    { value: 'quarter', label: 'Quarter square', icon: '◰' },
    { value: 'triangle', label: 'Diagonal half (triangle)', icon: '◺' },
  ];

  constructor(public state: MapMakerStateService) {}

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    // Ignore shortcuts while typing into an input/select/textarea (e.g. the color picker).
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
      return;
    }
    if (event.key === 's' || event.key === 'S') {
      this.selectTool('square');
    } else if (event.key === 'd' || event.key === 'D') {
      this.selectTool('delete');
    } else if (event.key === 't' || event.key === 'T') {
      this.selectTool('text');
    }
  }

  selectTool(tool: MapMakerTool): void {
    this.state.setTool(tool);
  }

  selectShapeOption(option: ShapeOption): void {
    this.state.setShapeOption(option);
  }

  selectColor(color: string): void {
    this.state.setColor(color);
  }

  /** Opens the hidden native color picker for the given palette slot (triggered by double-clicking a swatch). */
  openPaletteEditor(index: number): void {
    this.paletteInputs.get(index)?.nativeElement.click();
  }

  /** Overwrites a palette slot with a newly picked color and persists the palette. */
  updatePaletteColor(index: number, color: string): void {
    const previousColor = this.state.paletteColors[index];
    this.state.setPaletteColor(index, color);
    // Keep the active drawing color in sync if the swatch being edited was selected.
    if (this.state.activeColor === previousColor) {
      this.state.setColor(color);
    }
  }

  resetPalette(): void {
    this.state.resetPalette();
  }

  trackByIndex(index: number): number {
    return index;
  }

  selectZoom(value: string): void {
    this.state.setZoom(Number(value));
  }
}

