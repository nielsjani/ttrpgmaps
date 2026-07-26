import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { MapMakerStateService, BASE_CELL_SIZE } from '../services/map-maker-state.service';
import { FRAGMENT_POLYGONS } from '../models/fragment-shape';
import { computeBorderSegments } from '../models/fragment-borders';
import { GridCoordinate, gridKey, parseGridKey } from '../models/grid';
import { TextElement } from '../models/text-element';

const GRID_LINE_COLOR = '#dddddd';
const BORDER_COLOR = '#000000';
const BORDER_WIDTH_PX = 2;
const ZOOM_WHEEL_FACTOR = 1.1;
const TEXT_COLOR = '#000000';
const TEXT_BORDER_WIDTH_PX = 1;
const TEXT_LINE_HEIGHT_FACTOR = 1.2;
const SELECTION_COLOR = '#4a7dfc';
const HANDLE_SIZE_PX = 8;
const HANDLE_HIT_RADIUS_PX = 8;

type TextHandleKind = 'scale' | 'width' | 'height';

/** Snapshot of a text drag operation (move/resize/scale), captured at drag start so every mousemove computes absolute target values rather than compounding relative deltas. */
interface TextDragState {
  kind: 'move' | TextHandleKind;
  id: string;
  startWorld: { x: number; y: number };
  startBox: { x: number; y: number; width: number; height: number; fontSize: number };
}

/**
 * The infinite, pannable/zoomable drawing surface for the dungeon builder.
 * Renders a background grid, every drawn fragment, and every text element,
 * translating mouse interaction into pan/zoom/draw/delete/text operations on
 * MapMakerStateService. Panning (right mouse button) is always available
 * regardless of the active tool; the left mouse button performs the active
 * tool's (square/delete/text) action.
 */
@Component({
  selector: 'app-map-maker-canvas',
  templateUrl: './map-maker-canvas.component.html',
  styleUrls: ['./map-maker-canvas.component.scss'],
})
export class MapMakerCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEl', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('textEditor') textEditorRef?: ElementRef<HTMLTextAreaElement>;

  private ctx!: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private changedSubscription?: Subscription;

  private isPointerDown = false;
  private isPanning = false;
  private dragStart = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };
  /** Grid cell (as a "col,row" key) last drawn/deleted during the current drag, to avoid redundant repeated actions on the same cell. */
  private lastActedCellKey: string | null = null;

  /** Active text move/resize/scale drag, if any (text tool only). */
  private textDrag: TextDragState | null = null;

  /** The id of the text element currently being inline-edited, if any (its canvas rendering is suppressed while the <textarea> overlay covers it). */
  editingTextId: string | null = null;
  editingValue = '';
  private discardEditOnBlur = false;

  constructor(public state: MapMakerStateService) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeObserver = new ResizeObserver(() => this.resizeAndRender());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.changedSubscription = this.state.changed$.subscribe(() => this.render());
    this.resizeAndRender();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.changedSubscription?.unsubscribe();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeAndRender();
  }

  private resizeAndRender(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? canvas.clientWidth;
    const height = parent?.clientHeight ?? canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  // --- Coordinate conversion -------------------------------------------------

  private get cellSize(): number {
    return BASE_CELL_SIZE * this.state.zoom;
  }

  /** Converts a screen (canvas-relative) point to the grid cell and the
   * fractional position (fx, fy in [0,1)) within that cell. */
  private screenToCell(sx: number, sy: number): { coord: GridCoordinate; fx: number; fy: number } {
    const worldX = (sx - this.state.pan.x) / this.state.zoom;
    const worldY = (sy - this.state.pan.y) / this.state.zoom;
    const cellX = worldX / BASE_CELL_SIZE;
    const cellY = worldY / BASE_CELL_SIZE;
    const col = Math.floor(cellX);
    const row = Math.floor(cellY);
    return { coord: { col, row }, fx: cellX - col, fy: cellY - row };
  }

  /** Converts a screen (canvas-relative) point to world-space coordinates (used by text placement/hit-testing, which isn't grid-locked). */
  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.state.pan.x) / this.state.zoom, y: (sy - this.state.pan.y) / this.state.zoom };
  }

  private getPointerPosition(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // --- Mouse interaction ------------------------------------------------------

  onMouseDown(event: MouseEvent): void {
    // If a text element is currently being inline-edited, commit (or discard,
    // if blank) it *synchronously* before doing anything else. Native
    // mousedown-triggered focus changes fire their `blur` event only *after*
    // all mousedown listeners on the new target (this canvas) have already
    // run, which would otherwise let a click that creates/selects another
    // text element race ahead of — and corrupt — the still-pending commit of
    // the element being edited. Calling `.blur()` ourselves here dispatches
    // `blur` (and thus `onEditorBlur()`) immediately, before any of that.
    this.commitActiveTextEdit();

    const pos = this.getPointerPosition(event);
    if (event.button === 2) {
      // Right mouse button: pan, regardless of the active tool.
      this.isPanning = true;
      this.dragStart = pos;
      this.panStart = { ...this.state.pan };
    } else if (event.button === 0) {
      this.isPointerDown = true;
      if (this.state.activeTool === 'text') {
        this.handleTextMouseDown(pos);
      } else {
        this.lastActedCellKey = null;
        this.performToolActionAt(pos);
      }
    }
  }

  /** Immediately blurs the inline text editor (if open), synchronously committing/discarding its content. See onMouseDown for why this must happen eagerly rather than relying on the browser's natural blur timing. */
  private commitActiveTextEdit(): void {
    if (this.editingTextId) {
      this.textEditorRef?.nativeElement.blur();
    }
  }

  onMouseMove(event: MouseEvent): void {
    const pos = this.getPointerPosition(event);
    if (this.isPanning) {
      const dx = pos.x - this.dragStart.x;
      const dy = pos.y - this.dragStart.y;
      this.state.setPan({ x: this.panStart.x + dx, y: this.panStart.y + dy });
    } else if (this.textDrag) {
      this.updateTextDrag(pos);
    } else if (this.isPointerDown && this.state.activeTool !== 'text') {
      this.performToolActionAt(pos);
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isPanning = false;
    } else if (event.button === 0) {
      this.isPointerDown = false;
      this.lastActedCellKey = null;
      this.textDrag = null;
    }
  }

  onMouseLeave(_event: MouseEvent): void {
    this.isPointerDown = false;
    this.isPanning = false;
    this.lastActedCellKey = null;
    this.textDrag = null;
  }

  onDoubleClick(event: MouseEvent): void {
    if (this.state.activeTool !== 'text') {
      return;
    }
    const pos = this.getPointerPosition(event);
    const world = this.screenToWorld(pos.x, pos.y);
    const hit = this.hitTestText(world.x, world.y);
    if (hit) {
      this.state.setSelectedText(hit.id);
      this.beginEditingText(hit.id);
    }
  }

  onContextMenu(event: MouseEvent): void {
    // Suppress the browser's right-click context menu, since right-click is
    // used for panning.
    event.preventDefault();
  }

  /** Draws/deletes at the cell under the given screen position, skipping cells already acted on during this drag. Also lets the Delete tool remove a text element under the cursor, taking priority over grid-fragment deletion. */
  private performToolActionAt(pos: { x: number; y: number }): void {
    if (this.state.activeTool === 'delete') {
      const world = this.screenToWorld(pos.x, pos.y);
      const hitText = this.hitTestText(world.x, world.y);
      if (hitText) {
        this.state.removeText(hitText.id);
        return;
      }
    }
    const { coord, fx, fy } = this.screenToCell(pos.x, pos.y);
    const key = gridKey(coord);
    if (key === this.lastActedCellKey) {
      return;
    }
    this.lastActedCellKey = key;
    if (this.state.activeTool === 'square') {
      this.state.placeFragment(coord, fx, fy);
    } else if (this.state.activeTool === 'delete') {
      this.state.removeFragmentAt(coord, fx, fy);
    }
  }

  // --- Text tool interaction ---------------------------------------------------

  /** Finds the topmost (last-drawn) text element whose box contains the given world-space point, if any. */
  private hitTestText(worldX: number, worldY: number): TextElement | undefined {
    const texts = this.state.texts;
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      if (worldX >= t.x && worldX <= t.x + t.width && worldY >= t.y && worldY <= t.y + t.height) {
        return t;
      }
    }
    return undefined;
  }

  /** Screen-space positions of a text element's move/resize/scale handles: se-corner scales font+box uniformly, right-edge resizes width only, bottom-edge resizes height only. */
  private getHandlePositions(t: TextElement): Record<TextHandleKind, { x: number; y: number }> {
    const zoom = this.state.zoom;
    const { pan } = this.state;
    const sx = t.x * zoom + pan.x;
    const sy = t.y * zoom + pan.y;
    const sw = t.width * zoom;
    const sh = t.height * zoom;
    return {
      scale: { x: sx + sw, y: sy + sh },
      width: { x: sx + sw, y: sy + sh / 2 },
      height: { x: sx + sw / 2, y: sy + sh },
    };
  }

  private hitTestHandle(t: TextElement, screenPos: { x: number; y: number }): TextHandleKind | null {
    const handles = this.getHandlePositions(t);
    for (const kind of Object.keys(handles) as TextHandleKind[]) {
      const hp = handles[kind];
      if (Math.hypot(screenPos.x - hp.x, screenPos.y - hp.y) <= HANDLE_HIT_RADIUS_PX) {
        return kind;
      }
    }
    return null;
  }

  private handleTextMouseDown(pos: { x: number; y: number }): void {
    const selected = this.state.selectedTextId ? this.state.getText(this.state.selectedTextId) : undefined;
    if (selected) {
      const handle = this.hitTestHandle(selected, pos);
      if (handle) {
        this.beginTextDrag(handle, selected, pos);
        return;
      }
    }

    const world = this.screenToWorld(pos.x, pos.y);
    const hit = this.hitTestText(world.x, world.y);
    if (hit) {
      this.state.setSelectedText(hit.id);
      this.beginTextDrag('move', hit, pos);
      return;
    }

    // Empty space: create a new text element here and drop straight into inline editing.
    const created = this.state.addText(world.x, world.y);
    this.beginEditingText(created.id);
  }

  private beginTextDrag(kind: 'move' | TextHandleKind, text: TextElement, pos: { x: number; y: number }): void {
    this.textDrag = {
      kind,
      id: text.id,
      startWorld: this.screenToWorld(pos.x, pos.y),
      startBox: { x: text.x, y: text.y, width: text.width, height: text.height, fontSize: text.fontSize },
    };
  }

  private updateTextDrag(pos: { x: number; y: number }): void {
    if (!this.textDrag) {
      return;
    }
    const { kind, id, startWorld, startBox } = this.textDrag;
    const world = this.screenToWorld(pos.x, pos.y);
    const dx = world.x - startWorld.x;
    const dy = world.y - startWorld.y;

    if (kind === 'move') {
      this.state.setTextBox(id, { x: startBox.x + dx, y: startBox.y + dy });
    } else if (kind === 'width') {
      this.state.setTextBox(id, { width: startBox.width + dx });
    } else if (kind === 'height') {
      this.state.setTextBox(id, { height: startBox.height + dy });
    } else if (kind === 'scale') {
      // Uniformly scale font size + box together, based on how the distance
      // from the box's top-left corner to the dragged se-corner has changed.
      const oldLength = Math.hypot(startBox.width, startBox.height) || 1;
      const newLength = Math.hypot(startBox.width + dx, startBox.height + dy);
      const factor = Math.max(0.1, newLength / oldLength);
      this.state.setTextBox(id, {
        width: startBox.width * factor,
        height: startBox.height * factor,
        fontSize: startBox.fontSize * factor,
      });
    }
  }

  /** Opens the inline-edit <textarea> overlay for a text element, focusing and selecting its current content. */
  private beginEditingText(id: string): void {
    const text = this.state.getText(id);
    if (!text) {
      return;
    }
    this.editingTextId = id;
    this.editingValue = text.text;
    this.render();
    setTimeout(() => {
      const el = this.textEditorRef?.nativeElement;
      el?.focus();
      el?.select();
    });
  }

  /** Positions/sizes the inline-edit <textarea> overlay to exactly match its text element's world rect, scaled by the current pan/zoom. */
  get editorStyle(): { [key: string]: string } {
    const text = this.editingTextId ? this.state.getText(this.editingTextId) : undefined;
    if (!text) {
      return { display: 'none' };
    }
    const zoom = this.state.zoom;
    const { pan } = this.state;
    return {
      left: `${text.x * zoom + pan.x}px`,
      top: `${text.y * zoom + pan.y}px`,
      width: `${text.width * zoom}px`,
      height: `${text.height * zoom}px`,
      fontSize: `${text.fontSize * zoom}px`,
      lineHeight: `${TEXT_LINE_HEIGHT_FACTOR}`,
    };
  }

  onEditorBlur(): void {
    if (!this.editingTextId) {
      return;
    }
    if (!this.discardEditOnBlur) {
      this.state.updateTextContent(this.editingTextId, this.editingValue);
    }
    this.discardEditOnBlur = false;
    this.editingTextId = null;
    this.render();
  }

  onEditorKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.discardEditOnBlur = true;
      this.textEditorRef?.nativeElement.blur();
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const pos = this.getPointerPosition(event);
    const factor = event.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
    this.zoomAround(pos.x, pos.y, this.state.zoom * factor);
  }

  /** Zooms to the given level while keeping the world point under (sx, sy) fixed on screen. */
  zoomAround(sx: number, sy: number, newZoom: number): void {
    const worldX = (sx - this.state.pan.x) / this.state.zoom;
    const worldY = (sy - this.state.pan.y) / this.state.zoom;
    this.state.setZoom(newZoom);
    this.state.setPan({
      x: sx - worldX * this.state.zoom,
      y: sy - worldY * this.state.zoom,
    });
  }

  // --- Rendering ---------------------------------------------------------------

  render(): void {
    if (!this.ctx) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    this.ctx.clearRect(0, 0, width, height);
    this.drawGrid(width, height);
    this.drawFragments(width, height);
    this.drawBorders(width, height);
    this.drawTexts(width, height);
  }

  private drawGrid(width: number, height: number): void {
    const size = this.cellSize;
    if (size <= 0) {
      return;
    }
    const { pan } = this.state;
    const minCol = Math.floor(-pan.x / size);
    const maxCol = Math.ceil((width - pan.x) / size);
    const minRow = Math.floor(-pan.y / size);
    const maxRow = Math.ceil((height - pan.y) / size);

    this.ctx.strokeStyle = GRID_LINE_COLOR;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let col = minCol; col <= maxCol; col++) {
      const x = col * size + pan.x;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
    }
    for (let row = minRow; row <= maxRow; row++) {
      const y = row * size + pan.y;
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
    }
    this.ctx.stroke();
  }

  private drawFragments(width: number, height: number): void {
    const size = this.cellSize;
    const { pan } = this.state;
    for (const [key, fragments] of this.state.getAllCells()) {
      const { col, row } = parseGridKey(key);
      const originX = col * size + pan.x;
      const originY = row * size + pan.y;
      // Skip cells fully outside the visible viewport.
      if (originX + size < 0 || originX > width || originY + size < 0 || originY > height) {
        continue;
      }
      for (const fragment of fragments) {
        const polygon = FRAGMENT_POLYGONS[fragment.shape];
        this.ctx.fillStyle = fragment.color;
        this.ctx.beginPath();
        polygon.forEach(([lx, ly], index) => {
          const x = originX + lx * size;
          const y = originY + ly * size;
          if (index === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        });
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
  }

  /**
   * Strokes a black border around the outer perimeter of each contiguous
   * same-color region of drawn fragments (see computeBorderSegments doc for
   * the merge/seam rule). Segments are expressed in "half-cell" units, so
   * each unit equals half a cell's on-screen size.
   */
  private drawBorders(_width: number, _height: number): void {
    const segments = computeBorderSegments(this.state.getAllCells());
    if (segments.length === 0) {
      return;
    }
    const halfSize = this.cellSize / 2;
    const { pan } = this.state;
    this.ctx.strokeStyle = BORDER_COLOR;
    this.ctx.lineWidth = BORDER_WIDTH_PX;
    this.ctx.lineCap = 'square';
    this.ctx.beginPath();
    for (const segment of segments) {
      this.ctx.moveTo(segment.x1 * halfSize + pan.x, segment.y1 * halfSize + pan.y);
      this.ctx.lineTo(segment.x2 * halfSize + pan.x, segment.y2 * halfSize + pan.y);
    }
    this.ctx.stroke();
  }

  /** Draws every text element: a thin black border around its box, plus its word-wrapped content (fixed black color), skipping whichever one is currently being inline-edited (the <textarea> overlay covers it instead). Also draws selection handles for the selected text while the Text tool is active. */
  private drawTexts(width: number, height: number): void {
    const zoom = this.state.zoom;
    const { pan } = this.state;
    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.textBaseline = 'top';
    for (const text of this.state.texts) {
      if (text.id === this.editingTextId) {
        continue;
      }
      const sx = text.x * zoom + pan.x;
      const sy = text.y * zoom + pan.y;
      const sw = text.width * zoom;
      const sh = text.height * zoom;
      if (sx + sw < 0 || sx > width || sy + sh < 0 || sy > height) {
        continue;
      }
      const fontPx = text.fontSize * zoom;
      if (fontPx < 1) {
        continue;
      }
      this.ctx.strokeStyle = TEXT_COLOR;
      this.ctx.lineWidth = TEXT_BORDER_WIDTH_PX;
      this.ctx.strokeRect(sx, sy, sw, sh);

      this.ctx.font = `${fontPx}px sans-serif`;
      const lineHeight = fontPx * TEXT_LINE_HEIGHT_FACTOR;
      const lines = this.wrapText(text.text, sw);
      lines.forEach((line, index) => {
        const ly = sy + index * lineHeight;
        if (ly > sy + sh) {
          return;
        }
        this.ctx.fillText(line, sx, ly);
      });
    }

    if (this.state.activeTool === 'text' && this.state.selectedTextId) {
      const selected = this.state.getText(this.state.selectedTextId);
      if (selected) {
        this.drawTextSelection(selected);
      }
    }
  }

  /** Greedily word-wraps text (respecting existing newlines) so each line fits within maxWidth, using the currently-set ctx.font for measurement. */
  private wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      const words = paragraph.split(' ');
      let current = '';
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (current && this.ctx.measureText(candidate).width > maxWidth) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      lines.push(current);
    }
    return lines;
  }

  private drawTextSelection(text: TextElement): void {
    const zoom = this.state.zoom;
    const { pan } = this.state;
    const sx = text.x * zoom + pan.x;
    const sy = text.y * zoom + pan.y;
    const sw = text.width * zoom;
    const sh = text.height * zoom;

    this.ctx.save();
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeStyle = SELECTION_COLOR;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(sx, sy, sw, sh);
    this.ctx.restore();

    this.ctx.fillStyle = SELECTION_COLOR;
    const half = HANDLE_SIZE_PX / 2;
    const handles = this.getHandlePositions(text);
    for (const kind of Object.keys(handles) as TextHandleKind[]) {
      const hp = handles[kind];
      this.ctx.fillRect(hp.x - half, hp.y - half, HANDLE_SIZE_PX, HANDLE_SIZE_PX);
    }
  }
}
