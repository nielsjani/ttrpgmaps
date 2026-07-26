import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MapMakerStateService } from '../services/map-maker-state.service';
import { MapMakerSyncService } from '../services/map-maker-sync.service';

/**
 * The "player view" — a minimal, tool-free shell shown in the second
 * browser window that pops out when the DM enables Play mode (see
 * `MapMakerComponent.togglePlayMode()`). It's a completely separate
 * Angular app instance (the popup navigates to a fresh URL, so the browser
 * does a full page load), with its own `MapMakerStateService` provided at
 * the module level like the main DM view — the two windows are kept in
 * sync purely via `MapMakerSyncService`'s BroadcastChannel, not shared
 * Angular state.
 *
 * Shows just the shared canvas (no sidebar/tools — the state service starts
 * in 'play' mode, which already disables all drawing-tool interactions) and
 * a small connection-status banner until the first full map snapshot
 * arrives from the DM window.
 */
@Component({
  selector: 'app-map-maker-player-view',
  templateUrl: './map-maker-player-view.component.html',
  styleUrls: ['./map-maker-player-view.component.scss'],
})
export class MapMakerPlayerViewComponent implements OnInit, OnDestroy {
  /** True once the first 'full-state' snapshot has been received from the DM window. */
  connected = false;
  private sync?: MapMakerSyncService;
  private connectedSubscription?: Subscription;

  constructor(public state: MapMakerStateService) {}

  ngOnInit(): void {
    this.state.setMode('play');
    this.sync = new MapMakerSyncService(this.state, 'player');
    this.connectedSubscription = this.sync.fullStateReceived$.subscribe(() => {
      this.connected = true;
    });
  }

  ngOnDestroy(): void {
    this.sync?.close();
    this.connectedSubscription?.unsubscribe();
  }
}
