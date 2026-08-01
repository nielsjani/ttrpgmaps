import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { MapMakerStateService } from './services/map-maker-state.service';
import { MapMakerSyncService } from './services/map-maker-sync.service';
import { MapMakerFileService } from './services/map-maker-file.service';

/**
 * Top-level dungeon-builder page: a header with the dungeon name input,
 * Save/Load buttons, and the Design/Play mode toggle, plus the existing
 * sidebar + canvas layout below it.
 *
 * Switching to Play mode pops out a second browser window (the "player
 * view", see `MapMakerPlayerViewComponent`) at the `map-maker/player` route
 * and starts a `MapMakerSyncService` (role 'dm') so party/player icon
 * moves and the one-time full map snapshot flow between the two windows
 * over a `BroadcastChannel`. Switching back to Design mode closes both.
 */
@Component({
  selector: 'app-map-maker',
  templateUrl: './map-maker.component.html',
  styleUrls: ['./map-maker.component.scss']
})
export class MapMakerComponent implements OnDestroy {
  @ViewChild('loadFileInput') loadFileInput?: ElementRef<HTMLInputElement>;

  private sync?: MapMakerSyncService;
  private playerWindow: Window | null = null;
  private playerWindowWatcher?: ReturnType<typeof setInterval>;

  constructor(public state: MapMakerStateService, private fileService: MapMakerFileService) {}

  get isPlayMode(): boolean {
    return this.state.mode === 'play';
  }

  /** Whether the player-view popup is expected to be open but currently isn't (e.g. the user closed it manually) — shows a "Reopen" affordance instead of the main toggle. */
  get playerWindowClosed(): boolean {
    return this.isPlayMode && (!this.playerWindow || this.playerWindow.closed);
  }

  togglePlayMode(): void {
    if (this.isPlayMode) {
      this.state.setMode('design');
      this.closePlayerWindow();
      this.sync?.close();
      this.sync = undefined;
    } else {
      this.state.setMode('play');
      this.sync = new MapMakerSyncService(this.state, 'dm');
      this.openPlayerWindow();
    }
  }

  reopenPlayerWindow(): void {
    this.openPlayerWindow();
  }

  /** Serializes the current map (design + play data + color prefs) and triggers a browser download named after the sanitized dungeon name. */
  saveToFile(): void {
    const json = this.fileService.serialize(this.state.exportSaveData());
    const fileName = this.fileService.fileNameFor(this.state.dungeonName);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Opens the hidden file picker for Load. */
  triggerLoad(): void {
    this.loadFileInput?.nativeElement.click();
  }

  /** Reads the file picked via the hidden `<input type="file">`, and if it parses as a valid save file, restores it (always landing back in Design mode — see `MapMakerStateService.importSaveData`). Shows a plain alert on invalid input, leaving current state untouched. */
  async onLoadFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file to re-trigger 'change'
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const data = this.fileService.deserialize(text);
      if (this.isPlayMode) {
        this.togglePlayMode(); // close player window/sync before switching back to Design mode on load
      }
      this.state.importSaveData(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error.';
      alert(`Could not load this map file: ${message}`);
    }
  }

  private openPlayerWindow(): void {
    const url = `${location.origin}${location.pathname}#/map-maker/player`;
    this.playerWindow = window.open(url, 'ttrpgmaps-player-view', 'width=1100,height=800');
    this.playerWindowWatcher = setInterval(() => {
      if (this.playerWindow?.closed) {
        this.playerWindow = null;
        if (this.playerWindowWatcher) {
          clearInterval(this.playerWindowWatcher);
          this.playerWindowWatcher = undefined;
        }
      }
    }, 1000);
  }

  private closePlayerWindow(): void {
    if (this.playerWindowWatcher) {
      clearInterval(this.playerWindowWatcher);
      this.playerWindowWatcher = undefined;
    }
    if (this.playerWindow && !this.playerWindow.closed) {
      this.playerWindow.close();
    }
    this.playerWindow = null;
  }

  ngOnDestroy(): void {
    this.closePlayerWindow();
    this.sync?.close();
  }
}
