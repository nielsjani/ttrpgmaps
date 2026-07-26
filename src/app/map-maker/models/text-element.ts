/**
 * A free-floating text label placed on the dungeon builder canvas.
 *
 * Position, size, and font size are all stored in **world-space units**
 * (the same unbounded coordinate space as `BASE_CELL_SIZE`, not grid-locked
 * cell/row indices), so text naturally scales and pans together with the
 * grid and drawn fragments without any special-casing in the zoom/pan math:
 * `screenX = pan.x + x * zoom`, `screenFontSize = fontSize * zoom`, etc.
 *
 * `width`/`height` define the wrapping box: text is word-wrapped to fit
 * `width`, and can span one or more lines within `height` (see
 * `MapMakerCanvasComponent.drawTexts()` for the wrap/measure logic). Text
 * is always rendered in a fixed black color (no color picker for text).
 */
export interface TextElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  text: string;
}

let nextTextId = 1;

/** Generates a simple, unique-within-this-session id for a new TextElement. */
export function generateTextId(): string {
  return `text-${nextTextId++}`;
}
