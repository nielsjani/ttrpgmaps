/**
 * An individual "player" icon shown in Play mode, split off from the party
 * icon. Each has its own color and an optional display name, and can be
 * independently dragged around by either the dungeon-master view or the
 * popped-out player view. All fields are in world-space units.
 */
export interface PlayerIcon {
  id: string;
  x: number;
  y: number;
  color: string;
  /** Optional display name shown under the icon; empty string if not given. */
  name: string;
}

let nextPlayerIconId = 1;

/** Generates a simple, unique-within-this-session id for a new PlayerIcon. */
export function generatePlayerIconId(): string {
  return `player-${nextPlayerIconId++}`;
}
