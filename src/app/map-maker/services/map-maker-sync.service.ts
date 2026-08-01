import { Subject, Subscription } from 'rxjs';
import { MapMakerStateService } from './map-maker-state.service';
import { PartyIcon } from '../models/party-icon';
import { PlayerIcon } from '../models/player-icon';
import { MapSnapshot } from '../models/map-snapshot';
import { HiddenArea } from '../models/hidden-area';

/** The BroadcastChannel name shared by every dungeon-builder window (DM + any popped-out player views). Same-origin only, no backend involved. */
const CHANNEL_NAME = 'ttrpgmaps-map-maker-play';

type SyncRole = 'dm' | 'player';

interface RequestStateMessage {
  type: 'request-state';
}

interface FullStateMessage {
  type: 'full-state';
  snapshot: MapSnapshot;
  partyIcon: PartyIcon | null;
  playerIcons: PlayerIcon[];
}

interface IconsUpdateMessage {
  type: 'icons-update';
  partyIcon: PartyIcon | null;
  playerIcons: PlayerIcon[];
}

interface HiddenAreasUpdateMessage {
  type: 'hidden-areas-update';
  hiddenAreas: HiddenArea[];
}

type SyncMessage = RequestStateMessage | FullStateMessage | IconsUpdateMessage | HiddenAreasUpdateMessage;

/**
 * Keeps a dungeon-master window and any popped-out player-view window (each
 * an entirely separate Angular app instance, running in its own browser
 * window with its own `MapMakerStateService`) in sync during Play mode,
 * using the `BroadcastChannel` API — a same-origin, backend-free pub/sub
 * mechanism available to all windows/tabs of the same site.
 *
 * Protocol:
 * - A `role: 'player'` instance immediately posts `'request-state'` on
 *   construction.
 * - A `role: 'dm'` instance replies to `'request-state'` with a
 *   `'full-state'` message containing the whole design-time map snapshot
 *   plus the current party/player icons (a one-time handshake for data
 *   that's fixed for the duration of Play mode).
 * - Either role posts a lightweight `'icons-update'` message whenever its
 *   local `state.iconsChanged$` fires (i.e. whenever *that* window moved,
 *   placed, recolored, renamed, added, or removed a party/player icon),
 *   and applies incoming `'icons-update'`/`'full-state'` messages via
 *   `state.applyRemoteIcons()` (which does not itself re-fire
 *   `iconsChanged$`, preventing an infinite echo between the two windows).
 * - Similarly, either role posts a `'hidden-areas-update'` message whenever
 *   `state.hiddenAreasChanged$` fires — this covers the DM revealing/hiding
 *   a hidden area's letter badge *while already in Play mode*, which (unlike
 *   the rest of the design-time map) can legitimately change after the
 *   initial handshake. Applied via `state.applyRemoteHiddenAreas()`, which
 *   likewise does not re-fire `hiddenAreasChanged$`.
 */
export class MapMakerSyncService {
  private readonly channel: BroadcastChannel;
  private readonly iconsSubscription: Subscription;
  private readonly hiddenAreasSubscription: Subscription;

  /** Emits once, the first time a `'full-state'` message is received (player role only) — a reliable "we've heard from the DM" signal for the player-view's connection banner. */
  readonly fullStateReceived$ = new Subject<void>();

  constructor(private readonly state: MapMakerStateService, private readonly role: SyncRole) {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent<SyncMessage>) => this.handleMessage(event.data);

    this.iconsSubscription = this.state.iconsChanged$.subscribe(() => this.broadcastIconsUpdate());
    this.hiddenAreasSubscription = this.state.hiddenAreasChanged$.subscribe(() => this.broadcastHiddenAreasUpdate());

    if (this.role === 'player') {
      this.postMessage({ type: 'request-state' });
    }
  }

  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'request-state':
        if (this.role === 'dm') {
          this.postMessage({
            type: 'full-state',
            snapshot: this.state.getSnapshot(),
            partyIcon: this.state.partyIcon,
            playerIcons: this.state.playerIcons,
          });
        }
        break;
      case 'full-state':
        this.state.applySnapshot(message.snapshot);
        this.state.applyRemoteIcons(message.partyIcon, message.playerIcons);
        this.fullStateReceived$.next();
        break;
      case 'icons-update':
        this.state.applyRemoteIcons(message.partyIcon, message.playerIcons);
        break;
      case 'hidden-areas-update':
        this.state.applyRemoteHiddenAreas(message.hiddenAreas);
        break;
    }
  }

  private broadcastIconsUpdate(): void {
    this.postMessage({
      type: 'icons-update',
      partyIcon: this.state.partyIcon,
      playerIcons: this.state.playerIcons,
    });
  }

  private broadcastHiddenAreasUpdate(): void {
    this.postMessage({
      type: 'hidden-areas-update',
      hiddenAreas: this.state.hiddenAreas,
    });
  }

  private postMessage(message: SyncMessage): void {
    this.channel.postMessage(message);
  }

  /** Stops listening/broadcasting and releases the underlying BroadcastChannel. Call this when leaving Play mode or destroying the owning component. */
  close(): void {
    this.iconsSubscription.unsubscribe();
    this.hiddenAreasSubscription.unsubscribe();
    this.channel.close();
    this.fullStateReceived$.complete();
  }
}
