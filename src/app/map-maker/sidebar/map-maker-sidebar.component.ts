import { Component, ElementRef, HostListener, QueryList, ViewChildren } from '@angular/core';
import { MapMakerStateService, MIN_ZOOM, MAX_ZOOM } from '../services/map-maker-state.service';
import { MapMakerTool, ShapeOption } from '../models/pick-shape';
import { ArtAsset, artAssetPath } from '../models/art-asset';
import { PlayerIcon } from '../models/player-icon';

interface ShapeOptionDef {
  value: ShapeOption;
  label: string;
  icon: string;
}

/**
 * Sidebar for the dungeon builder: tool selection (square/delete/text/door/
 * art, with 's'/'d'/'t'/'o'/'a' keyboard shortcuts), shape sub-option
 * picker, color picker (customizable default swatches, persisted to
 * localStorage, + a custom picker), a filterable art asset browser, and a
 * zoom slider — all bound to MapMakerStateService. Panning is not a
 * selectable tool here; it's always available via the right mouse button
 * on the canvas.
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

  /** Distinct categories in the art manifest, for the category filter <select> (currently just "2minutetabletop"). */
  readonly artCategories: string[];

  artSearch = '';
  artCategoryFilter = '';

  /** Optional name typed in the Play-mode panel for the *next* split player icon. */
  newPlayerName = '';

  constructor(public state: MapMakerStateService) {
    this.artCategories = this.state.getArtCategories();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    // Ignore shortcuts while typing into an input/select/textarea (e.g. the color picker).
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
      return;
    }
    // Drawing-tool shortcuts only apply in Design mode — Play mode has no "tool" concept.
    if (this.state.mode !== 'design') {
      return;
    }
    if (event.key === 's' || event.key === 'S') {
      this.selectTool('square');
    } else if (event.key === 'd' || event.key === 'D') {
      this.selectTool('delete');
    } else if (event.key === 't' || event.key === 'T') {
      this.selectTool('text');
    } else if (event.key === 'o' || event.key === 'O') {
      this.selectTool('door');
    } else if (event.key === 'a' || event.key === 'A') {
      this.selectTool('art');
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

  /** The art assets matching the current search text + category filter, for the Art tool's asset list. */
  get filteredArtAssets(): ArtAsset[] {
    return this.state.getArtAssets({ search: this.artSearch, category: this.artCategoryFilter || undefined });
  }

  /** Selects (or deselects, if already selected) an asset for the next canvas click to stamp. */
  selectArtAsset(asset: ArtAsset): void {
    const next = this.state.selectedArtAssetFileName === asset.fileName ? null : asset.fileName;
    this.state.setSelectedArtAsset(next);
  }

  /** The thumbnail image path for an art asset, shown in the sidebar list. */
  artThumbPath(asset: ArtAsset): string {
    return artAssetPath(asset.category, asset.fileName);
  }

  trackByAssetId(_index: number, asset: ArtAsset): string {
    return asset.id;
  }

  // --- Play mode ------------------------------------------------------------

  /** Sets the color used for the next party placement/re-color or player split. */
  selectPlayModeColor(color: string): void {
    this.state.setPlayModeColor(color);
  }

  /** Arms (or disarms) party placement: the next canvas click will place/move the party icon there. */
  togglePartyPlacement(): void {
    this.state.setArmPartyPlacement(!this.state.armPartyPlacement);
  }

  /** Spawns a new player icon near the party icon, using the current play-mode color and the typed name (if any), then clears the name field. */
  splitPlayerIcon(): void {
    if (!this.state.partyIcon) {
      return;
    }
    this.state.splitPlayerIcon(this.state.playModeColor, this.newPlayerName.trim());
    this.newPlayerName = '';
  }

  setPlayerColor(id: string, color: string): void {
    this.state.setPlayerIconColor(id, color);
  }

  setPlayerName(id: string, name: string): void {
    this.state.setPlayerIconName(id, name);
  }

  removePlayer(id: string): void {
    this.state.removePlayerIcon(id);
  }

  trackByPlayerId(_index: number, player: PlayerIcon): string {
    return player.id;
  }
}

