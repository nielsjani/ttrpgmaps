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
  user-customizable color picker, and a delete tool. Described in detail
  below.
- **Story 2 — Adding text**: implemented. A Text tool (`t` shortcut) lets
  users place, move, resize, scale, edit, and delete free-floating text
  labels on the canvas. Described in detail below.
- **Story 3 — Adding doors**: implemented. A Door tool (`o` shortcut) lets
  users toggle door icons on grid edges between two adjacent, non-empty
  cells, with hover preview and click/drag-to-toggle. Described in detail
  below.

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
│   ├── fragment-borders.ts        # computeBorderSegments() — black border/seam logic
│   ├── text-element.ts            # TextElement, generateTextId() — Story 2 text labels
│   ├── door.ts                    # Door, DoorOrientation, doorKey(), getAdjacentCells() — Story 3 doors
│   └── index.ts                   # barrel export
├── services/
│   └── map-maker-state.service.ts # MapMakerStateService — shared state & grid data
├── canvas/
│   └── map-maker-canvas.component.*  # <canvas> rendering + pan/zoom/draw/delete/text input
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
- **Tools & mouse buttons**: `MapMakerTool` is `'square' | 'delete' | 'text' |
  'door'` (no `'pan'` tool). Panning is **always available**, independent of
  the active tool: holding the **right** mouse button and dragging pans the
  canvas (`event.button === 2`); the canvas suppresses the browser's context
  menu on right-click (`onContextMenu`) so this doesn't pop up a menu
  instead. The **left** mouse button always performs the active tool's
  action. For `square`/`delete`, holding the left button down and dragging
  paints/deletes every cell the cursor passes over (not just a single
  click); the component tracks the last acted-on cell (`lastActedCellKey`)
  so the same cell isn't repeatedly reprocessed while the pointer lingers
  inside it. For `text`, see the dedicated section below. For `door`, see
  the dedicated section below.
- **Drawing/deleting**: left-button `mousedown` immediately performs the
  action for the cell under the cursor; every subsequent `mousemove` while
  the left button is held repeats this for whatever new cell the cursor
  enters, via `performToolActionAt()`. The **Delete** tool hit-tests text
  elements first (`hitTestText()`) — if the click lands on a text box it
  removes that text instead of falling through to grid-fragment deletion.
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

## Text elements (Story 2)

- **Data model** (`models/text-element.ts`): `TextElement { id, x, y, width,
  height, fontSize, text }`. Position, box size, and font size are all
  **world-space units** (same coordinate space as `BASE_CELL_SIZE`, not
  grid-locked) — text is not snapped to the grid and scales/pans naturally
  with everything else (`screenX = pan.x + x * zoom`, etc.), needing no
  special-casing in the zoom/pan math. Text is always rendered **fixed
  black** — there is no color picker for text.
- **State** (`MapMakerStateService`): `texts: TextElement[]`,
  `selectedTextId: string | null`. `addText(x, y)` creates a new element
  with defaults (`DEFAULT_TEXT_WIDTH` = 4 cells, `DEFAULT_TEXT_HEIGHT` = 1
  cell, `DEFAULT_TEXT_FONT_SIZE` = 16), selects it, and returns it so the
  canvas can immediately enter inline-edit mode. `updateTextContent(id,
  text)` sets the content, but **auto-removes the element if the committed
  text is blank/whitespace-only** (so users never leave invisible empty
  boxes behind). `moveText`/`resizeText`/`scaleText` are convenience
  absolute/relative setters; `setTextBox(id, partial)` is the lower-level
  method the canvas actually uses during drags — it directly overwrites
  whichever of `{x, y, width, height, fontSize}` are passed, clamped to
  sane bounds (`MIN_TEXT_SIZE`, `[MIN_TEXT_FONT_SIZE, MAX_TEXT_FONT_SIZE]`).
  Computing absolute target values from a fixed drag-start snapshot (rather
  than repeatedly applying a relative delta to already-mutated state) is
  what keeps move/resize/scale drags accurate instead of compounding.
  `removeText(id)` deletes and clears selection if it was selected.
  `setSelectedText(id | null)` selects/deselects. `MapMakerStateService.
  setTool()` clears `selectedTextId` whenever switching away from the text
  tool.
- **Interaction** (`MapMakerCanvasComponent`, only meaningful while
  `activeTool === 'text'`):
  - **Create**: clicking empty canvas (no existing text hit) immediately
    calls `state.addText()` at the clicked world position and enters
    inline-edit mode on it (a real caret appears right there).
  - **Select + move**: a single click on an *existing* text element
    (`hitTestText()`, topmost/last-drawn wins) selects it
    (`state.setSelectedText`) and begins a move drag; dragging updates its
    position live via `setTextBox`.
  - **Edit**: double-clicking an existing text element
    (`onDoubleClick`/`ondblclick`) opens the inline-edit overlay for it.
  - **Resize/scale handles**: when a text is selected, three small square
    handles are drawn at its screen-space box corners/edges
    (`getHandlePositions()`): the **bottom-right corner** handle
    (`'scale'`) uniformly scales `fontSize` + `width` + `height` together,
    based on how far the corner has been dragged relative to the box's
    diagonal at drag-start; the **right-edge** handle (`'width'`) resizes
    only `width`; the **bottom-edge** handle (`'height'`) resizes only
    `height` — neither edge handle touches `fontSize` (this matches "a
    corner scales, an edge resizes"). Handle hit-testing
    (`hitTestHandle()`) uses a small pixel-radius tolerance
    (`HANDLE_HIT_RADIUS_PX`).
  - **Delete**: handled by the Delete tool (see above), not the Text tool.
- **Inline editing overlay**: a single absolutely-positioned `<textarea
  class="text-editor-overlay">` (Angular `FormsModule`/`ngModel`, `*ngIf`
  bound to a component field `editingTextId`) sits on top of the `<canvas>`
  inside a new `.map-maker-canvas-container` wrapper (`position: relative`)
  so it can be positioned with plain `left/top/width/height/font-size`
  computed from the text element's world rect via the current pan/zoom
  (`get editorStyle()`), re-evaluated every change-detection tick so it
  tracks pan/zoom live. Opening it (`beginEditingText()`) focuses and
  selects all its content. **Committing**: on `blur`, the value is written
  back via `state.updateTextContent()` (which itself removes the element if
  left blank/whitespace-only). **Cancelling**: pressing `Escape` sets a
  `discardEditOnBlur` flag and blurs the textarea programmatically; the
  blur handler then skips the commit, effectively reverting. While an
  element is being inline-edited, `drawTexts()` skips drawing its canvas
  text (the overlay covers it visually).
  - **Important ordering gotcha**: clicking elsewhere on the *canvas* while
    editing must commit the old element *before* any new hit-test/create
    logic runs for that same click. The browser only fires the native
    `blur` event *after* all `mousedown` listeners on the newly-clicked
    target have finished — so without special handling, a click just
    outside the box would run `handleTextMouseDown()` (potentially creating
    a brand-new text element and reassigning `editingTextId` to it) *before*
    the old element's `blur`/commit ever happens, causing the old element's
    typed content to be silently lost (or an empty box to never be
    auto-deleted). Fixed by `commitActiveTextEdit()`, called first thing in
    `onMouseDown()`: it calls `.blur()` on the editor textarea itself when
    `editingTextId` is set, which dispatches `blur` (and thus
    `onEditorBlur()`) *synchronously* right there, guaranteeing the old
    element is fully committed/removed before any further mousedown logic
    (hit-testing, new-text-creation, panning, etc.) runs.
- **Rendering** (`drawTexts()`, drawn after fragments/borders so text sits
  on top): each text element gets a thin **black border** stroked around
  its box (`strokeRect`, `TEXT_BORDER_WIDTH_PX`) so placed labels are always
  visually delineated, even when empty/unselected. Its `TextElement.text`
  is then greedily word-wrapped (`wrapText()`) to fit `width * zoom` using
  `ctx.measureText` against the currently-set `ctx.font`, honoring existing
  `\n` line breaks as hard paragraph splits; wrapped lines are drawn
  top-aligned (`textBaseline = 'top'`) at `fontSize * zoom`, line height
  `1.2×` font size, soft-clipped so lines past the box's `height` aren't
  drawn. Elements fully outside the visible viewport are skipped. Selection
  UI (`drawTextSelection()`) — a dashed blue rectangle plus the three
  handles described above — is drawn only for `state.selectedTextId` while
  the Text tool is active, on top of the black box border.

## Doors (Story 3)

- **Data model** (`models/door.ts`): `DoorOrientation = 'vertical' |
  'horizontal'`; `Door { orientation, col, row }`, where a door doesn't sit
  *inside* a cell but on the **edge/boundary line** between two adjacent
  cells: a `vertical` door sits on the line `x = col`, separating cells
  `(col-1,row)` (left) and `(col,row)` (right); a `horizontal` door sits on
  the line `y = row`, separating `(col,row-1)` (top) and `(col,row)`
  (bottom). `doorKey(door)` builds a canonical string key (e.g. `v:3,2`) for
  `Map` storage/dedup, mirroring `gridKey()` for cells.
  `getAdjacentCells(orientation, col, row)` returns the two `GridCoordinate`s
  bordering an edge.
- **State** (`MapMakerStateService`): `private readonly doors = new
  Map<string, Door>()`, exposed read-only via `getAllDoors():
  ReadonlyMap<string, Door>`. `canPlaceDoorAt(orientation, col, row)` is true
  only when **both** adjacent cells currently have at least one drawn
  fragment (`getFragments(...).length > 0`) — a door can never exist next to
  an empty cell. `hasDoorAt(orientation, col, row)` checks whether a door
  already exists there. `toggleDoorAt(orientation, col, row)` removes the
  door if one exists; otherwise adds one, but only if `canPlaceDoorAt`
  allows it (silently does nothing otherwise) — this is the single entry
  point the canvas calls on click/drag. `removeFragmentAt()`'s
  cell-deletion branch (when a cell's last fragment is removed) additionally
  calls a private `removeDoorsTouchingCell(coord)` helper that scans
  `doors` and removes any whose adjacent cells include the now-empty cell,
  since a door strictly requires both neighbors to stay non-empty.
  `clear()` also clears `doors`.
- **Interaction** (`MapMakerCanvasComponent`, only meaningful while
  `activeTool === 'door'`):
  - **Edge picking** (`findNearestEdge()`): converts the cursor's world
    position to fractional cell coordinates, then separately finds the
    nearest *vertical* grid line (`Math.round(cellX)`, at whichever row the
    cursor's `y` falls in) and the nearest *horizontal* grid line
    (`Math.round(cellY)`, at whichever column the cursor's `x` falls in).
    Both candidates are sorted by distance and tried in order; a candidate
    is accepted only if it's within `DOOR_EDGE_SNAP_THRESHOLD` (`0.3`, i.e.
    within ~30% of a cell width/height of the line) **and**
    `state.canPlaceDoorAt(...)` or `state.hasDoorAt(...)` is true for it.
    Returns `null` if no edge qualifies (e.g. the cursor is over a cell
    interior, or both neighboring cells aren't fully non-empty).
  - **Hover preview**: `onMouseMove` calls `updateHoveredEdge()`, which
    re-runs `findNearestEdge()` and stores the result in the `hoveredEdge`
    field (only triggering a re-render when it actually changes, to avoid
    redundant redraws on every pixel of mouse movement). `drawDoors()`
    strokes a translucent blue highlight line along `hoveredEdge` (if any)
    before drawing any doors, so the user sees exactly which edge a click
    would affect — regardless of whether that edge already has a door.
  - **Toggle on click/drag**: `onMouseDown` (left button, door tool active)
    and every subsequent `onMouseMove` while the button is held both call
    `toggleDoorAtPos()`, which resolves the nearest valid edge and calls
    `state.toggleDoorAt(...)`. A drag toggles each newly-entered edge
    exactly once via a dedup key (`lastToggledEdgeKey`, the edge's
    `doorKey()`), reset on `mousedown`/`mouseup`/`mouseleave` — the same
    drag-paint idiom used by the Square/Delete tools' `lastActedCellKey`.
    Unlike the square tool, this does *not* mean "add" on every new cell —
    since it's a toggle, dragging across several fresh edges places a door
    on each of them (each edge is only touched once per drag, so it can't
    flicker on/off within a single continuous drag gesture).
  - **Panning/other tools unaffected**: right-click-drag still pans
    regardless of the active tool; the Delete tool's own click/drag
    behavior is unrelated to doors — the story intentionally routes door
    removal only through the Door tool's own toggle click, not through
    Delete.
- **Rendering** (`drawDoors()`, called after `drawBorders()` and before
  `drawTexts()` so doors sit above fragment fill/borders but below any text
  labels): draws the hover highlight first (if the Door tool is active and
  `hoveredEdge` is set), then iterates `state.getAllDoors()` and draws each
  door as a small solid **white rectangle with a black border**
  (`DOOR_FILL_COLOR`/`DOOR_BORDER_COLOR`), computed by `getEdgeRect()`:
  centered on the edge's midpoint, with its **long axis running along the
  edge** (e.g. a vertical door's rectangle is taller than it is wide, since
  the wall itself runs vertically) sized as a fraction of the current
  on-screen `cellSize` (`DOOR_LENGTH_FACTOR` = `0.6`,
  `DOOR_THICKNESS_FACTOR` = `0.28`), so doors scale naturally with zoom like
  everything else. A door has no "open/closed" state or icon variants in
  this pass — it's simply present or absent.

## Sidebar (`MapMakerSidebarComponent`)

- Tool buttons: **Square** (`s` shortcut), **Delete** (`d` shortcut),
  **Text** (`t` shortcut), and **Door** (`o` shortcut), bound to
  `MapMakerStateService.activeTool`. There is no "Pan" tool button — a hint
  below the tool buttons reminds the user that holding the right mouse
  button pans regardless of the selected tool; a second hint (shown only
  while the Text tool is active) explains the click-to-create /
  click-to-select-and-drag / double-click-to-edit / handle-drag
  interactions, and a third hint (shown only while the Door tool is active)
  explains hover-to-preview / click-or-drag-to-toggle and the "needs two
  non-empty neighboring squares" requirement. Shortcuts are handled via a
  `window:keydown` host listener that ignores keystrokes while an
  `<input>`/`<textarea>`/`<select>` has focus (so typing in the custom color
  picker, or in the text inline-edit overlay, doesn't accidentally switch
  tools).
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
