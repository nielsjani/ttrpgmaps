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
import { DoorOrientation, doorKey } from '../models/door';
import { ArtElement } from '../models/art-element';
import { PartyIcon } from '../models/party-icon';
import { PlayerIcon } from '../models/player-icon';

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
const DOOR_FILL_COLOR = '#ffffff';
const DOOR_BORDER_COLOR = '#000000';
const DOOR_BORDER_WIDTH_PX = 1.5;
const DOOR_LENGTH_FACTOR = 0.6;
const DOOR_THICKNESS_FACTOR = 0.28;
const DOOR_HOVER_COLOR = 'rgba(74, 125, 252, 0.45)';
/** How close (in cell units) the cursor must be to a grid edge for it to be considered "hovered"/toggleable. */
const DOOR_EDGE_SNAP_THRESHOLD = 0.3;
const ART_SELECTION_COLOR = '#4a7dfc';
const ART_HANDLE_SIZE_PX = 8;
const ART_HANDLE_HIT_RADIUS_PX = 8;
/** World-space radius (before zoom) of the party icon; player icons are drawn a bit smaller. */
const PARTY_ICON_RADIUS = BASE_CELL_SIZE * 0.4;
const PLAYER_ICON_RADIUS = BASE_CELL_SIZE * 0.3;
const ICON_BORDER_COLOR = '#000000';
const ICON_BORDER_WIDTH_PX = 2;
const ICON_LABEL_COLOR = '#000000';

type TextHandleKind = 'scale' | 'width' | 'height';
type ArtHandleKind = 'scale' | 'rotate';

interface EdgeCandidate {
  orientation: DoorOrientation;
  col: number;
  row: number;
}

/** Snapshot of a text drag operation (move/resize/scale), captured at drag start so every mousemove computes absolute target values rather than compounding relative deltas. */
interface TextDragState {
  kind: 'move' | TextHandleKind;
  id: string;
  startWorld: { x: number; y: number };
  startBox: { x: number; y: number; width: number; height: number; fontSize: number };
}

/** Snapshot of an art element move/scale/rotate drag, captured at drag start. Scale uses a distance-from-center ratio (rotation-invariant); rotate uses an angle-from-center delta (so there's no jump at drag start). */
interface ArtDragState {
  kind: 'move' | ArtHandleKind;
  id: string;
  startWorld: { x: number; y: number };
  startBox: { centerX: number; centerY: number; width: number; height: number; rotation: number };
  /** For 'scale': distance from center to the bottom-right corner at drag start. For 'rotate': world-space angle from center to the bottom-left corner at drag start. */
  startCornerDistance: number;
  startCornerAngle: number;
}

/** Active party/player icon move drag, if any (Play mode only). Icons only ever move (no scale/rotate), so this only needs a start offset. */
interface IconDragState {
  kind: 'party' | 'player';
  /** Only set for kind 'player' (the party icon is singular, so it needs no id). */
  id?: string;
  startWorld: { x: number; y: number };
  startPos: { x: number; y: number };
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

  /** The edge (if any) currently nearest the cursor while the Door tool is active and within snapping range of two non-empty cells. Highlighted on hover; toggled on click. */
  hoveredEdge: EdgeCandidate | null = null;
  /** Door edge key last toggled during the current drag, to avoid repeatedly toggling the same edge back and forth as the cursor lingers over it. */
  private lastToggledEdgeKey: string | null = null;

  /** Active text move/resize/scale drag, if any (text tool only). */
  private textDrag: TextDragState | null = null;

  /** Active art element move/scale/rotate drag, if any (art tool only). */
  private artDrag: ArtDragState | null = null;

  /** Active party/player icon drag, if any (Play mode only). */
  private iconDrag: IconDragState | null = null;

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
      // Right mouse button: pan, regardless of the active tool or mode.
      this.isPanning = true;
      this.dragStart = pos;
      this.panStart = { ...this.state.pan };
    } else if (event.button === 0) {
      this.isPointerDown = true;
      if (this.state.mode === 'play') {
        this.handleIconMouseDown(pos);
      } else if (this.state.activeTool === 'text') {
        this.handleTextMouseDown(pos);
      } else if (this.state.activeTool === 'door') {
        this.lastToggledEdgeKey = null;
        this.toggleDoorAtPos(pos);
      } else if (this.state.activeTool === 'art') {
        this.handleArtMouseDown(pos);
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
    } else if (this.iconDrag) {
      this.updateIconDrag(pos);
    } else if (this.state.mode === 'play') {
      // Nothing else is interactive in Play mode besides pan/zoom and
      // dragging an already-hit party/player icon (handled above).
      return;
    } else if (this.textDrag) {
      this.updateTextDrag(pos);
    } else if (this.artDrag) {
      this.updateArtDrag(pos);
    } else if (this.state.activeTool === 'door') {
      this.updateHoveredEdge(pos);
      if (this.isPointerDown) {
        this.toggleDoorAtPos(pos);
      }
    } else if (this.isPointerDown && this.state.activeTool !== 'text' && this.state.activeTool !== 'art') {
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
      this.artDrag = null;
      this.iconDrag = null;
      this.lastToggledEdgeKey = null;
    }
  }

  onMouseLeave(_event: MouseEvent): void {
    this.isPointerDown = false;
    this.isPanning = false;
    this.lastActedCellKey = null;
    this.textDrag = null;
    this.artDrag = null;
    this.iconDrag = null;
    this.lastToggledEdgeKey = null;
    if (this.hoveredEdge) {
      this.hoveredEdge = null;
      this.render();
    }
  }

  onDoubleClick(event: MouseEvent): void {
    if (this.state.mode !== 'design' || this.state.activeTool !== 'text') {
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

  /** Draws/deletes at the cell under the given screen position, skipping cells already acted on during this drag. Also lets the Delete tool remove an art element or text element under the cursor, taking priority over grid-fragment deletion. */
  private performToolActionAt(pos: { x: number; y: number }): void {
    if (this.state.activeTool === 'delete') {
      const world = this.screenToWorld(pos.x, pos.y);
      const hitArt = this.hitTestArt(world.x, world.y);
      if (hitArt) {
        this.state.removeArt(hitArt.id);
        return;
      }
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

  // --- Door tool interaction ---------------------------------------------------

  /** Finds the grid edge (vertical or horizontal cell boundary) nearest the given world point, snapped within a small tolerance, but only if it borders two non-empty cells (or already has a door). Returns null if no such edge is close enough. */
  private findNearestEdge(worldX: number, worldY: number): EdgeCandidate | null {
    const cellX = worldX / BASE_CELL_SIZE;
    const cellY = worldY / BASE_CELL_SIZE;

    const verticalCol = Math.round(cellX);
    const verticalRow = Math.floor(cellY);
    const verticalDistance = Math.abs(cellX - verticalCol);

    const horizontalCol = Math.floor(cellX);
    const horizontalRow = Math.round(cellY);
    const horizontalDistance = Math.abs(cellY - horizontalRow);

    const candidates: Array<EdgeCandidate & { distance: number }> = [
      { orientation: 'vertical' as const, col: verticalCol, row: verticalRow, distance: verticalDistance },
      { orientation: 'horizontal' as const, col: horizontalCol, row: horizontalRow, distance: horizontalDistance },
    ].sort((a, b) => a.distance - b.distance);

    for (const candidate of candidates) {
      if (candidate.distance > DOOR_EDGE_SNAP_THRESHOLD) {
        continue;
      }
      const { orientation, col, row } = candidate;
      if (this.state.canPlaceDoorAt(orientation, col, row) || this.state.hasDoorAt(orientation, col, row)) {
        return { orientation, col, row };
      }
    }
    return null;
  }

  private updateHoveredEdge(pos: { x: number; y: number }): void {
    const world = this.screenToWorld(pos.x, pos.y);
    const edge = this.findNearestEdge(world.x, world.y);
    const changed =
      (edge?.orientation ?? null) !== (this.hoveredEdge?.orientation ?? null) ||
      edge?.col !== this.hoveredEdge?.col ||
      edge?.row !== this.hoveredEdge?.row;
    if (changed) {
      this.hoveredEdge = edge;
      this.render();
    }
  }

  /** Toggles the door at the nearest valid edge to the given screen position, deduped per edge during a drag so repeated mousemoves over the same edge don't flip it back and forth. */
  private toggleDoorAtPos(pos: { x: number; y: number }): void {
    const world = this.screenToWorld(pos.x, pos.y);
    const edge = this.findNearestEdge(world.x, world.y);
    if (!edge) {
      return;
    }
    const key = doorKey({ orientation: edge.orientation, col: edge.col, row: edge.row });
    if (key === this.lastToggledEdgeKey) {
      return;
    }
    this.lastToggledEdgeKey = key;
    this.state.toggleDoorAt(edge.orientation, edge.col, edge.row);
  }

  // --- Art tool interaction ---------------------------------------------------

  /** Finds the topmost (last-placed) art element whose (possibly rotated) box contains the given world-space point, if any. */
  private hitTestArt(worldX: number, worldY: number): ArtElement | undefined {
    const elements = this.state.artElements;
    for (let i = elements.length - 1; i >= 0; i--) {
      const art = elements[i];
      const local = this.worldToArtLocal(art, worldX, worldY);
      if (Math.abs(local.x) <= art.width / 2 && Math.abs(local.y) <= art.height / 2) {
        return art;
      }
    }
    return undefined;
  }

  /** Converts a world-space point into an art element's local, unrotated coordinate space (origin at its center), by inverse-rotating the point around the center. Used for both hit-testing and computing handle-drag deltas so rotation "just works" without special-casing. */
  private worldToArtLocal(art: ArtElement, worldX: number, worldY: number): { x: number; y: number } {
    const dx = worldX - art.centerX;
    const dy = worldY - art.centerY;
    const cos = Math.cos(art.rotation);
    const sin = Math.sin(art.rotation);
    // Inverse rotation: rotate the point by -rotation.
    return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
  }

  /** Screen-space positions of an art element's scale (bottom-right corner) and rotate (bottom-left corner) handles, accounting for its current rotation. */
  private getArtHandlePositions(art: ArtElement): Record<ArtHandleKind, { x: number; y: number }> {
    return {
      scale: this.artLocalToScreen(art, art.width / 2, art.height / 2),
      rotate: this.artLocalToScreen(art, -art.width / 2, art.height / 2),
    };
  }

  /** Converts a point in an art element's local (unrotated, center-origin) space to screen coordinates, applying its rotation then the current pan/zoom. */
  private artLocalToScreen(art: ArtElement, localX: number, localY: number): { x: number; y: number } {
    const cos = Math.cos(art.rotation);
    const sin = Math.sin(art.rotation);
    const worldX = art.centerX + localX * cos - localY * sin;
    const worldY = art.centerY + localX * sin + localY * cos;
    const { pan, zoom } = this.state;
    return { x: worldX * zoom + pan.x, y: worldY * zoom + pan.y };
  }

  private hitTestArtHandle(art: ArtElement, screenPos: { x: number; y: number }): ArtHandleKind | null {
    const handles = this.getArtHandlePositions(art);
    for (const kind of Object.keys(handles) as ArtHandleKind[]) {
      const hp = handles[kind];
      if (Math.hypot(screenPos.x - hp.x, screenPos.y - hp.y) <= ART_HANDLE_HIT_RADIUS_PX) {
        return kind;
      }
    }
    return null;
  }

  private handleArtMouseDown(pos: { x: number; y: number }): void {
    const selected = this.state.selectedArtId ? this.state.getArt(this.state.selectedArtId) : undefined;
    if (selected) {
      const handle = this.hitTestArtHandle(selected, pos);
      if (handle) {
        this.beginArtDrag(handle, selected, pos);
        return;
      }
    }

    const world = this.screenToWorld(pos.x, pos.y);
    const hit = this.hitTestArt(world.x, world.y);
    if (hit) {
      this.state.setSelectedArt(hit.id);
      this.beginArtDrag('move', hit, pos);
      return;
    }

    // Empty space, nothing hit: stamp a new instance of the currently
    // selected sidebar asset (if any) centered on the click point.
    if (this.state.selectedArtAssetFileName) {
      this.state.addArt(this.state.selectedArtAssetFileName, world.x, world.y);
    }
  }

  private beginArtDrag(kind: 'move' | ArtHandleKind, art: ArtElement, pos: { x: number; y: number }): void {
    const startWorld = this.screenToWorld(pos.x, pos.y);
    const startBox = { centerX: art.centerX, centerY: art.centerY, width: art.width, height: art.height, rotation: art.rotation };
    const dxToCorner = startWorld.x - art.centerX;
    const dyToCorner = startWorld.y - art.centerY;
    this.artDrag = {
      kind,
      id: art.id,
      startWorld,
      startBox,
      startCornerDistance: Math.hypot(art.width / 2, art.height / 2),
      startCornerAngle: Math.atan2(dyToCorner, dxToCorner),
    };
  }

  private updateArtDrag(pos: { x: number; y: number }): void {
    if (!this.artDrag) {
      return;
    }
    const { kind, id, startWorld, startBox, startCornerDistance, startCornerAngle } = this.artDrag;
    const world = this.screenToWorld(pos.x, pos.y);

    if (kind === 'move') {
      const dx = world.x - startWorld.x;
      const dy = world.y - startWorld.y;
      this.state.setArtTransform(id, { centerX: startBox.centerX + dx, centerY: startBox.centerY + dy });
    } else if (kind === 'scale') {
      // Distance from center to cursor is rotation-invariant, so scaling by
      // the ratio of current-to-start distance preserves both the aspect
      // ratio and the element's current rotation.
      const newDistance = Math.hypot(world.x - startBox.centerX, world.y - startBox.centerY);
      const factor = Math.max(0.05, newDistance / (startCornerDistance || 1));
      this.state.setArtTransform(id, {
        width: startBox.width * factor,
        height: startBox.height * factor,
      });
    } else if (kind === 'rotate') {
      // Track the change in angle (center -> cursor) since drag start and
      // apply that same delta to the starting rotation, so the element
      // doesn't jump/snap the instant the drag begins.
      const currentAngle = Math.atan2(world.y - startBox.centerY, world.x - startBox.centerX);
      const rotation = startBox.rotation + (currentAngle - startCornerAngle);
      this.state.setArtTransform(id, { rotation });
    }
  }

  // --- Play mode: party/player icon interaction --------------------------------

  /** Finds the party icon if the given world point falls within its radius, else undefined. */
  private hitTestPartyIcon(worldX: number, worldY: number): PartyIcon | undefined {
    const party = this.state.partyIcon;
    if (!party) {
      return undefined;
    }
    return Math.hypot(worldX - party.x, worldY - party.y) <= PARTY_ICON_RADIUS ? party : undefined;
  }

  /** Finds the topmost (last-added) player icon whose radius contains the given world point, if any. */
  private hitTestPlayerIcon(worldX: number, worldY: number): PlayerIcon | undefined {
    const icons = this.state.playerIcons;
    for (let i = icons.length - 1; i >= 0; i--) {
      const icon = icons[i];
      if (Math.hypot(worldX - icon.x, worldY - icon.y) <= PLAYER_ICON_RADIUS) {
        return icon;
      }
    }
    return undefined;
  }

  /**
   * Handles a left-mouse-down while in Play mode: if party placement is
   * armed (via the sidebar's "Place/Move Party" button), places/moves the
   * party icon at the click and disarms; otherwise, if an existing player
   * icon or the party icon is hit, begins dragging it. Player icons are
   * checked first since they're drawn on top of (and may overlap) the
   * party icon. Clicking empty space does nothing else in Play mode.
   */
  private handleIconMouseDown(pos: { x: number; y: number }): void {
    const world = this.screenToWorld(pos.x, pos.y);

    if (this.state.armPartyPlacement) {
      this.state.placePartyIcon(world.x, world.y, this.state.playModeColor);
      this.state.setArmPartyPlacement(false);
      return;
    }

    const hitPlayer = this.hitTestPlayerIcon(world.x, world.y);
    if (hitPlayer) {
      this.iconDrag = { kind: 'player', id: hitPlayer.id, startWorld: world, startPos: { x: hitPlayer.x, y: hitPlayer.y } };
      return;
    }

    const hitParty = this.hitTestPartyIcon(world.x, world.y);
    if (hitParty) {
      this.iconDrag = { kind: 'party', startWorld: world, startPos: { x: hitParty.x, y: hitParty.y } };
    }
  }

  private updateIconDrag(pos: { x: number; y: number }): void {
    if (!this.iconDrag) {
      return;
    }
    const { kind, id, startWorld, startPos } = this.iconDrag;
    const world = this.screenToWorld(pos.x, pos.y);
    const x = startPos.x + (world.x - startWorld.x);
    const y = startPos.y + (world.y - startWorld.y);
    if (kind === 'party') {
      this.state.movePartyIcon(x, y);
    } else if (id) {
      this.state.movePlayerIcon(id, x, y);
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
    this.drawDoors(width, height);
    this.drawArt(width, height);
    this.drawTexts(width, height);
    this.drawPartyAndPlayerIcons();
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

  /** Draws the hover-highlighted edge (if the Door tool is active and the cursor is near a valid edge), then every placed door as a white rectangle with a black border, oriented with its long axis along the edge it sits on. */
  private drawDoors(_width: number, _height: number): void {
    if (this.state.activeTool === 'door' && this.hoveredEdge) {
      this.drawEdgeHighlight(this.hoveredEdge.orientation, this.hoveredEdge.col, this.hoveredEdge.row);
    }
    for (const door of this.state.getAllDoors().values()) {
      this.drawDoorShape(door.orientation, door.col, door.row);
    }
  }

  /** Computes the on-screen rectangle (x, y, width, height) for a door/hover-highlight on the given edge, centered on the edge with its long axis running along it. */
  private getEdgeRect(
    orientation: DoorOrientation,
    col: number,
    row: number,
    lengthFactor: number,
    thicknessFactor: number
  ): { x: number; y: number; w: number; h: number } {
    const size = this.cellSize;
    const { pan } = this.state;
    const length = size * lengthFactor;
    const thickness = size * thicknessFactor;
    if (orientation === 'vertical') {
      const cx = col * size + pan.x;
      const cy = row * size + pan.y + size / 2;
      return { x: cx - thickness / 2, y: cy - length / 2, w: thickness, h: length };
    }
    const cx = col * size + pan.x + size / 2;
    const cy = row * size + pan.y;
    return { x: cx - length / 2, y: cy - thickness / 2, w: length, h: thickness };
  }

  private drawDoorShape(orientation: DoorOrientation, col: number, row: number): void {
    const { x, y, w, h } = this.getEdgeRect(orientation, col, row, DOOR_LENGTH_FACTOR, DOOR_THICKNESS_FACTOR);
    this.ctx.fillStyle = DOOR_FILL_COLOR;
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = DOOR_BORDER_COLOR;
    this.ctx.lineWidth = DOOR_BORDER_WIDTH_PX;
    this.ctx.strokeRect(x, y, w, h);
  }

  private drawEdgeHighlight(orientation: DoorOrientation, col: number, row: number): void {
    const size = this.cellSize;
    const { pan } = this.state;
    this.ctx.strokeStyle = DOOR_HOVER_COLOR;
    this.ctx.lineWidth = Math.max(3, size * 0.12);
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    if (orientation === 'vertical') {
      const x = col * size + pan.x;
      this.ctx.moveTo(x, row * size + pan.y);
      this.ctx.lineTo(x, (row + 1) * size + pan.y);
    } else {
      const y = row * size + pan.y;
      this.ctx.moveTo(col * size + pan.x, y);
      this.ctx.lineTo((col + 1) * size + pan.x, y);
    }
    this.ctx.stroke();
  }

  /** Draws every placed art element as a rotated image (rotation applied around its own center), skipping any whose image hasn't finished loading yet (it'll be drawn once `getArtImage`'s onload handler fires `changed$` and triggers a re-render). Also draws selection handles for the selected element while the Art tool is active. */
  private drawArt(_width: number, _height: number): void {
    const { pan, zoom } = this.state;
    for (const art of this.state.artElements) {
      const img = this.state.getArtImage(art.assetFileName);
      if (!img.complete || img.naturalWidth === 0) {
        continue;
      }
      const screenCenterX = art.centerX * zoom + pan.x;
      const screenCenterY = art.centerY * zoom + pan.y;
      const screenWidth = art.width * zoom;
      const screenHeight = art.height * zoom;
      this.ctx.save();
      this.ctx.translate(screenCenterX, screenCenterY);
      this.ctx.rotate(art.rotation);
      this.ctx.drawImage(img, -screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);
      this.ctx.restore();
    }

    if (this.state.activeTool === 'art' && this.state.selectedArtId) {
      const selected = this.state.getArt(this.state.selectedArtId);
      if (selected) {
        this.drawArtSelection(selected);
      }
    }
  }

  /** Draws a dashed selection outline (rotated with the element) plus the scale/rotate corner handles. */
  private drawArtSelection(art: ArtElement): void {
    const { pan, zoom } = this.state;
    const screenCenterX = art.centerX * zoom + pan.x;
    const screenCenterY = art.centerY * zoom + pan.y;
    const screenWidth = art.width * zoom;
    const screenHeight = art.height * zoom;

    this.ctx.save();
    this.ctx.translate(screenCenterX, screenCenterY);
    this.ctx.rotate(art.rotation);
    this.ctx.strokeStyle = ART_SELECTION_COLOR;
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([6, 4]);
    this.ctx.strokeRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);
    this.ctx.setLineDash([]);
    this.ctx.restore();

    const handles = this.getArtHandlePositions(art);
    this.ctx.fillStyle = ART_SELECTION_COLOR;
    for (const kind of Object.keys(handles) as ArtHandleKind[]) {
      const hp = handles[kind];
      this.ctx.fillRect(hp.x - ART_HANDLE_SIZE_PX / 2, hp.y - ART_HANDLE_SIZE_PX / 2, ART_HANDLE_SIZE_PX, ART_HANDLE_SIZE_PX);
    }
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

  // --- Play mode: party/player icon rendering ----------------------------------

  /** Draws the party icon (if placed) and every player icon as a colored circle with a black border, each with its name label (if any) drawn just below it. Player icons are drawn after (on top of) the party icon. */
  private drawPartyAndPlayerIcons(): void {
    const party = this.state.partyIcon;
    if (party) {
      this.drawIcon(party.x, party.y, PARTY_ICON_RADIUS, party.color, 'Party');
    }
    for (const icon of this.state.playerIcons) {
      this.drawIcon(icon.x, icon.y, PLAYER_ICON_RADIUS, icon.color, icon.name);
    }
  }

  private drawIcon(worldX: number, worldY: number, worldRadius: number, color: string, label: string): void {
    const { pan, zoom } = this.state;
    const sx = worldX * zoom + pan.x;
    const sy = worldY * zoom + pan.y;
    const radius = worldRadius * zoom;

    this.ctx.beginPath();
    this.ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.lineWidth = ICON_BORDER_WIDTH_PX;
    this.ctx.strokeStyle = ICON_BORDER_COLOR;
    this.ctx.stroke();

    if (label) {
      this.ctx.fillStyle = ICON_LABEL_COLOR;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText(label, sx, sy + radius + 2);
      this.ctx.textAlign = 'left';
    }
  }
}
