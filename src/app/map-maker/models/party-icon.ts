/**
 * The single "party" icon shown in Play mode — a circular marker (in
 * world-space units, same coordinate space as everything else on the
 * canvas) that both the dungeon-master view and the popped-out player view
 * can see and drag around. There is at most one party icon at a time
 * (hence a singular field on the state service, not an array), matching the
 * story's description of "the party" as one shared marker that additional
 * player icons are split off from.
 */
export interface PartyIcon {
  x: number;
  y: number;
  color: string;
}
