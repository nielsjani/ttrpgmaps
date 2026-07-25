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

const GRID_LINE_COLOR = '#dddddd';
const BORDER_COLOR = '#000000';
const BORDER_WIDTH_PX = 2;
const ZOOM_WHEEL_FACTOR = 1.1;

/**
 * The infinite, pannable/zoomable drawing surface for the dungeon builder.
 * Renders a background grid plus every drawn fragment, and translates mouse
 * interaction into pan/zoom/draw/delete operations on MapMakerStateService.
 * Panning (right mouse button) is always available regardless of the active
 * tool; the left mouse button performs the active tool's (square/delete)
 * action.
 */
@Component({
  selector: 'app-map-maker-canvas',
  templateUrl: './map-maker-canvas.component.html',
  styleUrls: ['./map-maker-canvas.component.scss'],
})
export class MapMakerCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEl', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private changedSubscription?: Subscription;

  private isPointerDown = false;
  private isPanning = false;
  private dragStart = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };
  /** Grid cell (as a "col,row" key) last drawn/deleted during the current drag, to avoid redundant repeated actions on the same cell. */
  private lastActedCellKey: string | null = null;

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

  private getPointerPosition(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // --- Mouse interaction ------------------------------------------------------

  onMouseDown(event: MouseEvent): void {
    const pos = this.getPointerPosition(event);
    if (event.button === 2) {
      // Right mouse button: pan, regardless of the active tool.
      this.isPanning = true;
      this.dragStart = pos;
      this.panStart = { ...this.state.pan };
    } else if (event.button === 0) {
      // Left mouse button: perform the active tool's action.
      this.isPointerDown = true;
      this.lastActedCellKey = null;
      this.performToolActionAt(pos);
    }
  }

  onMouseMove(event: MouseEvent): void {
    const pos = this.getPointerPosition(event);
    if (this.isPanning) {
      const dx = pos.x - this.dragStart.x;
      const dy = pos.y - this.dragStart.y;
      this.state.setPan({ x: this.panStart.x + dx, y: this.panStart.y + dy });
    } else if (this.isPointerDown) {
      this.performToolActionAt(pos);
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isPanning = false;
    } else if (event.button === 0) {
      this.isPointerDown = false;
      this.lastActedCellKey = null;
    }
  }

  onMouseLeave(_event: MouseEvent): void {
    this.isPointerDown = false;
    this.isPanning = false;
    this.lastActedCellKey = null;
  }

  onContextMenu(event: MouseEvent): void {
    // Suppress the browser's right-click context menu, since right-click is
    // used for panning.
    event.preventDefault();
  }

  /** Draws/deletes at the cell under the given screen position, skipping cells already acted on during this drag. */
  private performToolActionAt(pos: { x: number; y: number }): void {
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
}
