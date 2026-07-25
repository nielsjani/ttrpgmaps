---
applyTo: "src/app/map-maker/**"
---

# Dungeon Builder (`map-maker`) — Instructions

This file tracks the functionality and structure of the `map-maker` feature
module (the "Dungeon Builder"). Keep it up to date as new stories from
`map-maker.md` are implemented.

## Overview

`map-maker` is a lazy-loaded Angular feature module reachable at the
`/map-maker` route (registered from the home page and the top nav as
"🧱 Dungeon builder"). It provides a tool for drawing dungeon maps on an
infinite, pannable, zoomable canvas.

## Story status

- **Story 0 — Routing & menu**: done (outside this module; see
  `app-routing.module.ts`, `home.component.html`, `app.component.html`).
- **Story 1 — Drawing tool**: implemented. Infinite grid canvas with pan/zoom,
  a square-drawing tool with full/half/quarter/triangle shape options, a
  color picker, and a delete tool. Described in detail below.

## Module structure

```
src/app/map-maker/
├── map-maker.module.ts            # declares components, provides MapMakerStateService
├── map-maker-routing.module.ts    # route: 'map-maker' -> MapMakerComponent
├── map-maker.component.*          # container: lays out sidebar + canvas
├── models/
│   ├── grid.ts                    # GridCoordinate, gridKey()/parseGridKey()
│   ├── fragment-shape.ts          # FragmentShape union, unit-space polygons,
│   │                               # point-in-polygon & overlap helpers
│   ├── cell-fragment.ts           # CellFragment { shape, color }
│   ├── pick-shape.ts              # MapMakerTool, ShapeOption, pickFragmentShape()
│   └── index.ts                   # barrel export
├── services/
│   └── map-maker-state.service.ts # MapMakerStateService — shared state & grid data
├── canvas/
│   └── map-maker-canvas.component.*  # <canvas> rendering + pan/zoom/draw/delete input
└── sidebar/
    └── map-maker-sidebar.component.*  # tool/shape/color/zoom controls + shortcuts
```

`MapMakerStateService` is a real `@Injectable()` provided in `MapMakerModule`'s
`providers` array (module-scoped singleton), **not** `providedIn: 'root'` —
this keeps its grid state scoped to the map-maker feature and reset whenever
the module is (re)loaded. Both the sidebar and canvas components inject the
same instance via the constructor.

## Data model

- The grid is infinite and integer-indexed: `GridCoordinate { col, row }`.
- `MapMakerStateService` holds `Map<string, CellFragment[]>` keyed by
  `"col,row"` (see `gridKey`/`parseGridKey`). Only cells with at least one
  fragment have an entry — the grid itself is otherwise unbounded and
  unallocated.
- A `CellFragment` is `{ shape: FragmentShape, color: string }`. A cell can
  hold several fragments simultaneously (e.g. up to four quarters, or two
  triangles) as long as their shapes don't overlap.
- `FragmentShape` is one of: `full`, `half-top/bottom/left/right`,
  `quarter-tl/tr/bl/br`, `triangle-tl/tr/bl/br`. Each shape's geometry is
  defined as a polygon in **local unit space** (the cell spans `(0,0)`
  top-left to `(1,1)` bottom-right) in `FRAGMENT_POLYGONS`
  (`models/fragment-shape.ts`). Triangle shapes are named after the corner
  holding the right angle; the hypotenuse runs along the opposite diagonal
  (e.g. `triangle-tl` covers the corner where `x + y <= 1`).

## Placing & removing fragments

- **Placing** (`MapMakerStateService.placeFragment(coord, fx, fy)`): the
  concrety shape to place is derived from the active `ShapeOption` (`square`,
  `half`, `quarter`, `triangle`) and the fractional click position `(fx, fy)`
  within the cell, via `pickFragmentShape()`:
  - `square` → always `full`.
  - `half` → whichever of the 4 edges (top/bottom/left/right) is nearest the
    click.
  - `quarter` / `triangle` → whichever of the 4 corners is nearest the click
    (`quarter-<corner>` / `triangle-<corner>`).
  Any existing fragments in that cell whose polygon geometrically overlaps
  the new shape are removed first (checked via `shapesOverlap()`, an 8×8
  sample-point approximation — good enough for placement conflict
  resolution without full polygon clipping), so fragments in a cell never
  overlap.
- **Removing** (`MapMakerStateService.removeFragmentAt(coord, fx, fy)`):
  removes only the single fragment whose polygon contains the clicked
  `(fx, fy)` point (`shapeContainsPoint()`), leaving any other fragments in
  that cell untouched. Nothing is ever removed as a fused "blob" — see the
  merging note below.

## Visual merging of adjacent same-color shapes & black borders

Adjacent same-color shapes appear merged (no seam) via `computeBorderSegments()`
(`models/fragment-borders.ts`) plus draw order, without any merge data structure:

1. `MapMakerCanvasComponent` first draws the background grid lines across
   the whole visible viewport.
2. It then draws every fragment as a flat, opaque, unstroked fill, exactly
   matching its polygon geometry (scaled to world/screen space).
3. Finally it strokes a **black border** around the outer perimeter of each
   contiguous same-color region (`drawBorders()`).

`computeBorderSegments(cells)` walks every fragment's polygon edges (derived
from `FRAGMENT_POLYGONS`), converts each edge's endpoints to an exact-integer
"half-cell" coordinate system (`col*2 + localX*2`, safe because fragment
vertices only ever sit at local fractions 0, 0.5, or 1), and groups edges by
a canonical (direction-independent) key. Axis-aligned edges are first
decomposed into atomic 1-half-cell-unit pieces (`splitIntoUnitEdges()`) —
this is what lets a shape with a full-length side (e.g. a full square)
partially merge with a same-color shorter-sided neighbor (e.g. a quarter or
half occupying only part of the adjoining cell): only the overlapping
half/quarter of the shared boundary merges away, while the rest of the full
square's side still gets a border. Diagonal (triangle hypotenuse) edges are
never split — they only ever match another identical whole diagonal. For
each unique atomic edge:
- If exactly the fragments sharing that edge all have the **same color**
  (typically 2, one on each side), the edge is an internal seam and is
  **skipped** — this is what makes merged same-color shapes look like one
  bigger shape with no visible line between them.
- Otherwise (edge borders empty space, or two different-colored fragments
  meet there) the edge is **kept** and stroked once in black.

Because there's no merged-region data structure, deleting one fragment
simply removes its own fill and re-runs `computeBorderSegments()` on the
next render — a merged-looking group naturally regains its individual
border as pieces are deleted, with no special-case code required.

Note: `computeBorderSegments()` currently scans *all* drawn cells on every
render (called every mouse move while dragging). This is fine at
prototype scale; if large maps become sluggish, a future story should
restrict it to cells within (plus one ring around) the visible viewport.

## Canvas interaction (`MapMakerCanvasComponent`)

- **Coordinate system**: `BASE_CELL_SIZE` (40px) is the unbounded world-space
  cell size; `cellSize = BASE_CELL_SIZE * zoom` is the on-screen size.
  `pan: {x, y}` is the screen-space offset of world origin `(0,0)`. Screen →
  world: `world = (screen - pan) / zoom`. World → cell: `col/row =
  floor(world / BASE_CELL_SIZE)`, with `(fx, fy)` as the remaining fractional
  part.
- **Tools & mouse buttons**: `MapMakerTool` is `'square' | 'delete'` (no
  `'pan'` tool). Panning is **always available**, independent of the active
  tool: holding the **right** mouse button and dragging pans the canvas
  (`event.button === 2`); the canvas suppresses the browser's context menu
  on right-click (`onContextMenu`) so this doesn't pop up a menu instead.
  The **left** mouse button always performs the active tool's
  (`square`/`delete`) action. Holding the left button down and dragging
  paints/deletes every cell the cursor passes over (not just a single
  click); the component tracks the last acted-on cell (`lastActedCellKey`)
  so the same cell isn't repeatedly reprocessed while the pointer lingers
  inside it.
- **Drawing/deleting**: left-button `mousedown` immediately performs the
  action for the cell under the cursor; every subsequent `mousemove` while
  the left button is held repeats this for whatever new cell the cursor
  enters, via `performToolActionAt()`.
- **Zooming**: mouse wheel zooms in/out (factor `1.1` per notch) around the
  cursor position, keeping the world point under the cursor fixed on screen.
  The sidebar's zoom slider calls `state.setZoom()` directly. Both zoom
  paths (wheel and slider) — and pan changes — go through
  `MapMakerStateService.changed$` (an RxJS `Subject`), which the canvas
  subscribes to in order to re-render; this is what keeps the canvas in
  sync with state changes made from *outside* itself (e.g. the sidebar
  slider), not just its own mouse/wheel handlers. Zoom is clamped to
  `[MIN_ZOOM, MAX_ZOOM]` = `[0.25, 4]` in `MapMakerStateService.setZoom()`.
- **Resizing**: a `ResizeObserver` on the canvas's parent element keeps the
  `<canvas>` sized to its container (accounting for `devicePixelRatio`) and
  triggers a re-render.
- **Cursor**: crosshair (no special pan cursor state currently).

## Sidebar (`MapMakerSidebarComponent`)

- Tool buttons: **Square** (`s` shortcut) and **Delete** (`d` shortcut),
  bound to `MapMakerStateService.activeTool`. There is no "Pan" tool button
  — a hint below the tool buttons reminds the user that holding the right
  mouse button pans regardless of the selected tool. Shortcuts are handled
  via a `window:keydown` host listener that ignores keystrokes while an
  `<input>`/`<textarea>`/`<select>` has focus (so typing in the custom color
  picker doesn't accidentally switch tools).
- Shape-option buttons (full/half/quarter/triangle) are only shown while the
  square tool is active, bound to `activeShapeOption`.
- Color picker: a grid of swatch buttons bound to
  `state.paletteColors` (user-customizable, see below) plus a native
  `<input type="color">` for one-off custom colors, bound to `activeColor`.
  Only affects newly-placed fragments — existing ones are never repainted.
  Double-clicking a swatch opens a hidden native `<input type="color">` for
  that slot (`openPaletteEditor()` / `#paletteInput` via `ViewChildren`),
  letting the user redefine that swatch's color permanently; a "Reset
  palette to defaults" link restores `DEFAULT_COLORS`.
- Zoom slider: an `<input type="range">` bound to `state.zoom`
  (`[MIN_ZOOM, MAX_ZOOM]`), kept in sync with wheel-zooming on the canvas.

## Extending this module (future stories)

- Keep new tools/state on `MapMakerStateService` so canvas and sidebar stay
  in sync automatically.
- If a future story needs true shape merging (e.g. exporting a merged
  polygon, or a "select merged region" interaction), note that today's
  approach is purely visual (render-order based) — no merged-region data
  exists to query. Such a feature would need an actual union-find /
  polygon-union step over `MapMakerStateService`'s cell map.
- No persistence (save/load) of the drawn map exists yet — the fragment grid
  is in-memory and reset on page reload/navigation. The **color palette** is
  the one exception: `MapMakerStateService.paletteColors` is persisted to
  `localStorage` (key `map-maker.palette-colors`, JSON array of hex
  strings) via `setPaletteColor()`/`resetPalette()`, and reloaded at
  construction time (`loadStoredPalette()`), falling back to
  `DEFAULT_COLORS` if nothing is stored or the stored value is malformed.
- Update this file whenever module structure, data model, or interaction
  behavior changes.
