/**
 * A placed instance of an art asset (e.g. a piece of furniture) on the
 * dungeon builder canvas.
 *
 * Unlike `TextElement` (which anchors at its top-left corner), an
 * `ArtElement` stores its **center** point plus an unrotated `width`/
 * `height`, because rotation happens around the center — storing the
 * center directly avoids re-deriving it from a corner + size + rotation
 * every time the element is drawn, hit-tested, or rotated further.
 *
 * All fields are in **world-space units** (the same unbounded coordinate
 * space as `BASE_CELL_SIZE`), so art naturally scales/pans with everything
 * else on the canvas.
 */
export interface ArtElement {
  id: string;
  /** The `ArtAsset.fileName` (and `id`) of the image this element renders. */
  assetFileName: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  /** Rotation around the center, in radians. */
  rotation: number;
  /** Story 8: whether the DM has designated this art element as hidden (design-time flag). */
  hidden: boolean;
  /** Story 8: whether the DM has revealed this hidden art element during Play mode. Meaningless while `hidden` is false. */
  revealed: boolean;
}

let nextArtId = 1;

/** Generates a simple, unique-within-this-session id for a new ArtElement. */
export function generateArtId(): string {
  return `art-${nextArtId++}`;
}
