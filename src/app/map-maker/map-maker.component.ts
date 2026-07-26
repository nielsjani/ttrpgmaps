import { Component, OnDestroy } from '@angular/core';
import { MapMakerStateService } from './services/map-maker-state.service';
import { MapMakerSyncService } from './services/map-maker-sync.service';

/**
 * Top-level dungeon-builder page: a header with the Design/Play mode
 * toggle, plus the existing sidebar + canvas layout below it.
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
  private sync?: MapMakerSyncService;
  private playerWindow: Window | null = null;
  private playerWindowWatcher?: ReturnType<typeof setInterval>;

  constructor(public state: MapMakerStateService) {}

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
