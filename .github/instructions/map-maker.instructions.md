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
- **Story 4 — Adding art assets**: implemented. An Art tool (`a` shortcut)
  lets users browse a filterable list of furniture art assets (first batch
  imported from the "2minutetabletop" pack), place them on the canvas, then
  move/scale/rotate the placed instances. Described in detail below.
- **Story 5 — Design vs Play mode**: implemented. A Design/Play toggle in a
  new header bar disables all drawing tools in Play mode (only pan/zoom +
  party/player icon placement/dragging remain active), pops out a second
  "player view" browser window kept in sync with the DM window via
  `BroadcastChannel`, and lets both windows place/move a shared "party"
  icon plus any number of individually-colored/named "player" icons split
  off from it. Described in detail below.
- **Story 6 — Save and load**: implemented. A dungeon name text input plus
  💾 Save / 📂 Load buttons in the header bar let the user download the
  full map (design data, play-mode party/player icons, and color
  preferences) as a versioned `.json` file, and reload it later. The
  downloaded file is named after the sanitized dungeon name. Described in
  detail below.
- **Story 7 — Hidden areas**: implemented. A Hidden Area tool (`h`
  shortcut) lets the DM designate a connected, wall/door-bounded region of
  drawn cells as hidden, auto-assigning it the next free letter (A, B, C,
  …, renamable). In Play mode, the player-view canvas renders unrevealed
  hidden areas — and any undrawn grid space — as a solid black,
  bordered "fog of war"; the DM's own view always shows everything, plus a
  clickable letter badge per area to toggle its revealed state. Described
  in detail below.
- **Story 8 — Hidden doors & hidden art assets**: implemented. In Design
  mode, a "Mark Hidden" toggle button in the Door tool's sidebar panel
  lets the DM flag individual doors as hidden; a "Hidden" checkbox on a
  selected art element does the same for art assets. Hidden-and-unrevealed
  doors show as a plain black-bordered wall edge in the player-view (no
  door icon); hidden-and-unrevealed art is invisible there. In Play mode,
  the DM reveals either by clicking the door icon / art asset directly in
  the DM view. Described in detail below.
- **Story 15 — Add walls**: implemented. A Wall tool (`w` shortcut) lets
  the DM click or drag across any grid edge to toggle a plain black
  border there — unlike doors, walls have no non-empty-cell placement
  constraint (they can be drawn between two undrawn cells) and no hidden
  state, so they render identically and unconditionally in both the DM
  and player views. Walls also act as a boundary for Story 7's connected-
  region flood fill, alongside doors. Described in detail below.
- **Story 9 — Draw large squares**: implemented. Holding Ctrl while
  dragging with the Square tool active (Design mode only) draws a live
  preview rectangle with a "W x H" cell-size label; releasing the mouse
  commits it as a single bulk fill of full-square fragments in the active
  color via `MapMakerStateService.placeFullSquareRect()`, overwriting any
  existing fragments in the rectangle, regardless of the currently
  selected shape option. Described in detail below.

## Module structure

```
src/app/map-maker/
├── map-maker.module.ts            # declares components, provides MapMakerStateService/MapMakerFileService
├── map-maker-routing.module.ts    # routes: 'map-maker' -> MapMakerComponent,
│                                   # 'map-maker/player' -> MapMakerPlayerViewComponent (Story 5)
├── map-maker.component.*          # container: header (dungeon name + Save/Load + Design/Play toggle) + sidebar + canvas
├── models/
│   ├── grid.ts                    # GridCoordinate, gridKey()/parseGridKey()
│   ├── fragment-shape.ts          # FragmentShape union, unit-space polygons,
│   │                               # point-in-polygon & overlap helpers
│   ├── cell-fragment.ts           # CellFragment { shape, color }
│   ├── pick-shape.ts              # MapMakerTool, ShapeOption, pickFragmentShape()
│   ├── fragment-borders.ts        # computeBorderSegments() — black border/seam logic
│   ├── text-element.ts            # TextElement, generateTextId() — Story 2 text labels
│   ├── door.ts                    # Door, DoorOrientation, doorKey(), getAdjacentCells() — Story 3 doors
│   ├── wall.ts                    # Wall, wallKey() — Story 15 walls (no non-empty-cell constraint, no hidden state)
│   ├── art-asset.ts               # ArtAsset, buildArtAssets(), artAssetPath() — Story 4 asset browser
│   ├── art-asset-data.ts          # ART_ASSET_MANIFEST — static list of imported art asset files
│   ├── art-element.ts             # ArtElement, generateArtId() — Story 4 placed art instances
│   ├── party-icon.ts              # PartyIcon — Story 5 shared party marker
│   ├── player-icon.ts             # PlayerIcon, generatePlayerIconId() — Story 5 split-off markers
│   ├── hidden-area.ts              # HiddenArea, generateHiddenAreaId(), letterForIndex(), nextAvailableLetter() — Story 7
│   ├── map-snapshot.ts            # MapSnapshot — serializable design-data mirror for the sync handshake
│   ├── map-save-data.ts           # MapMakerSaveData — versioned full save-file payload (Story 6)
│   └── index.ts                   # barrel export
├── services/
│   ├── map-maker-state.service.ts # MapMakerStateService — shared state & grid data
│   ├── map-maker-sync.service.ts  # MapMakerSyncService — BroadcastChannel-based DM/player sync (Story 5)
│   └── map-maker-file.service.ts  # MapMakerFileService — serialize/deserialize/file-name logic (Story 6)
├── canvas/
│   └── map-maker-canvas.component.*  # <canvas> rendering + pan/zoom/draw/delete/text/art/icon input
├── sidebar/
│   └── map-maker-sidebar.component.*  # tool/shape/color/zoom/Play-mode controls + shortcuts
└── player-view/
    └── map-maker-player-view.component.*  # Story 5 popped-out player-view shell (canvas only)
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

## Drawing large squares (Story 9)

Holding **Ctrl** while dragging with the **Square tool** active (Design
mode only) draws a filled rectangle spanning multiple cells, instead of
the normal per-cell drag-paint:

- **Preview-then-commit model**: while the Ctrl-drag is in progress,
  nothing is written to `MapMakerStateService` — `MapMakerCanvasComponent`
  only tracks a `largeSquareDrag: { anchor, current } | null` field (both
  grid cells) and re-renders a **live preview** on every `mousemove`
  (`drawLargeSquarePreview()`): a semi-transparent fill in the active
  color, a solid border, and a "W x H" cell-count label centered on the
  rectangle. The rectangle is only actually filled in on `mouseup`.
- **Committing**: on `mouseup`, the anchor/current corners are normalized
  (`normalizedRect()`, shared with the preview renderer) and passed to
  `MapMakerStateService.placeFullSquareRect(colMin, rowMin, colMax,
  rowMax)`, which directly overwrites every cell in the inclusive
  rectangle with a single full-square fragment in `state.activeColor` —
  ignoring whatever `activeShapeOption` (square/half/quarter/triangle) is
  currently selected, since sub-shapes don't make sense applied across a
  multi-cell rectangle — and emits `changed$` only once for the whole
  bulk fill (not per-cell). Existing fragments of any shape/color inside
  the rectangle are fully replaced, mirroring how a single full-square
  `placeFragment()` call already becomes the sole fragment in a cell.
- **Ctrl detection**: whether a drag is a "large square" gesture is
  decided once, at `mousedown` (`event.ctrlKey`), not re-checked on every
  `mousemove` — consistent with how other drag gestures (text/art/icon)
  snapshot their mode at drag start. A plain (non-Ctrl) drag with the
  Square tool is completely unaffected and still paints cell-by-cell via
  `performToolActionAt()`.
- **Cancel-on-leave**: if the cursor leaves the canvas mid-drag
  (`onMouseLeave`), the preview is discarded without committing anything,
  mirroring how text/art drags are already abandoned rather than
  committed on `onMouseLeave`.
- A Ctrl-click with no drag movement is just a degenerate 1×1 rectangle —
  no special-casing needed, since it's a valid input to `placeFullSquareRect`.

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
  'door' | 'art'` (no `'pan'` tool). Panning is **always available**,
  independent of the active tool or mode: holding the **right** mouse button
  and dragging pans the canvas (`event.button === 2`); the canvas suppresses
  the browser's context menu on right-click (`onContextMenu`) so this
  doesn't pop up a menu instead. The **left** mouse button always performs
  the active tool's action **while `state.mode === 'design'`**; while
  `state.mode === 'play'`, the left button instead only places/drags the
  party/player icons (see the dedicated Story 5 section below) — every
  design-tool branch in `onMouseDown`/`onMouseMove` is gated behind a
  `state.mode === 'design'`/`!== 'design'` check so a stale `activeTool`
  value can't leak drawing behavior into Play mode. For `square`/`delete`,
  holding the left button down and dragging paints/deletes every cell the
  cursor passes over (not just a single click); the component tracks the
  last acted-on cell (`lastActedCellKey`) so the same cell isn't repeatedly
  reprocessed while the pointer lingers inside it. For `text`, see the
  dedicated section below. For `door`, see the dedicated section below. For
  `art`, see the dedicated section below.
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
- **Play-mode visibility** (see also "Design vs Play mode (Story 5)"
  below): text elements are treated as DM-only notes once Play mode
  starts. `MapMakerCanvasComponent.drawTexts()` only strokes the
  black editing-aid border around each text box while `state.mode ===
  'design'` (Play mode shows the text content with no border); and it skips
  drawing *any* text at all when the canvas's `@Input() isPlayerView` is
  `true` — set on the `<app-map-maker-canvas>` instance used by
  `MapMakerPlayerViewComponent`'s template, but left `false` (default) on
  the DM window's instance in `MapMakerComponent`'s template. So: DM view
  in Design mode shows text+border, DM view in Play mode shows text with
  no border, and the player-view canvas never shows text in either mode.
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

## Art assets (Story 4)

- **Source assets & manifest**: the first batch of furniture art was
  imported from the "Furniture Map Assets" pack (253 flat PNG files) into
  `src/assets/map-maker/art/2minutetabletop/`, one folder per category
  (today only `2minutetabletop`, the pack's publisher — doubling as an
  "author" facet for a future filter, per the story). `models/art-asset-data.ts`
  (`ART_ASSET_MANIFEST`) is a plain, static TypeScript array of
  `{ fileName, category }` rows — no HTTP fetch is needed since the asset
  list never changes at runtime, mirroring how `MapDataService`'s map
  registry is a hard-coded in-memory structure rather than JSON fetched over
  HTTP. `models/art-asset.ts` builds the browsable `ArtAsset[]` list from
  that manifest (`buildArtAssets()`): `id`/`fileName` is the file name
  itself, `name` is the file name with its extension stripped (per the
  story: "the names of the assets in the dropdown are the same as the
  filenames"). `artAssetPath(category, fileName)` resolves the on-disk
  `assets/...` path for a given asset.
- **Placed element data model** (`models/art-element.ts`): `ArtElement {
  id, assetFileName, centerX, centerY, width, height, rotation }`, all in
  **world-space units** (same coordinate space as `BASE_CELL_SIZE`) except
  `rotation`, which is in radians. Unlike `TextElement` (anchored at its
  top-left corner), `ArtElement` stores its **center** point — since
  rotation happens around the center, this avoids re-deriving the center
  from a corner + size + rotation on every draw/hit-test/rotate.
- **State** (`MapMakerStateService`): `readonly artAssets: ArtAsset[]` (built
  once from the manifest), `getArtAssets({ search?, category? })` (filters
  by case-insensitive name substring and/or exact category — used by the
  sidebar's search box + category `<select>`), `getArtCategories()` (all
  distinct categories, for the category filter's options). `artElements:
  ArtElement[]`, `selectedArtId: string | null` (the placed element
  currently showing move/scale/rotate handles), `selectedArtAssetFileName:
  string | null` (which sidebar asset is armed for the *next* placement
  click — stays selected across placements so the user can stamp multiple
  copies, and stays selected across tool switches too, unlike
  `selectedArtId` which `setTool()` clears whenever leaving the `'art'`
  tool, mirroring how it clears `selectedTextId` when leaving `'text'`).
  `getArtImage(fileName): HTMLImageElement` lazily creates and caches a
  single `<img>`-backed `Image()` per asset file name (shared by canvas
  rendering and by `addArt()`'s aspect-ratio lookup), kicking off its
  network load on first request and emitting `changed$` on load so the
  canvas re-renders once pixels (and real dimensions) are available.
  `setSelectedArtAsset(fileName | null)` also proactively calls
  `getArtImage()` to warm the cache as soon as the user picks an asset in
  the sidebar, so its natural aspect ratio is usually already known by the
  time they click the canvas to place it. `addArt(assetFileName, centerX,
  centerY)` creates a new element centered on the given point, sized to
  preserve the source image's aspect ratio (longer side =
  `DEFAULT_ART_LONG_SIDE`, 2 grid cells) — or a small square fallback if the
  image hasn't finished loading yet — selects it, and returns it.
  `setArtTransform(id, partial)` is the lower-level absolute setter the
  canvas uses during move/scale/rotate drags (same "absolute target from a
  fixed drag-start snapshot" idiom as `setTextBox`), clamping `width`/
  `height` to `MIN_ART_SIZE`. `removeArt(id)` deletes and clears selection
  if it was selected. `setSelectedArt(id | null)` selects/deselects.
  `clear()` also clears `artElements`/`selectedArtId`.
- **Interaction** (`MapMakerCanvasComponent`, only meaningful while
  `activeTool === 'art'`) — all hit-testing and handle math is
  **rotation-aware**, via two small coordinate-transform helpers:
  `worldToArtLocal()` (inverse-rotates a world point into the element's
  local, center-origin, unrotated space — used for hit-testing) and
  `artLocalToScreen()` (rotates a local point by the element's rotation,
  then applies pan/zoom — used to compute handle screen positions). This
  means rotation "just works" for hit-testing/dragging without any
  special-casing beyond these two functions.
  - **Select + move**: clicking an *existing* element (`hitTestArt()`,
    topmost/last-placed wins, using `worldToArtLocal()` for the
    point-in-rotated-rect test) selects it (`state.setSelectedArt`) and
    begins a move drag; dragging updates `centerX`/`centerY` live via
    `setArtTransform`.
  - **Place**: clicking empty space (no existing element hit) stamps a new
    instance of `state.selectedArtAssetFileName` (if any is selected in the
    sidebar) centered on the click point, via `addArt()`. Nothing happens if
    no asset is currently selected.
  - **Scale handle** (bottom-right corner, local `(+width/2, +height/2)`):
    uniformly scales `width`/`height` together, using the **ratio of the
    cursor's current distance from the center to its distance at drag
    start** — distance-from-center is rotation-invariant, so this factor
    naturally preserves both the aspect ratio and the element's current
    rotation without needing to un-rotate the drag delta.
  - **Rotate handle** (bottom-left corner, local `(-width/2, +height/2)`):
    rotates around the center by tracking the **change** in the world-space
    angle from center to cursor since drag start, and adding that delta to
    the rotation the element had at drag start (`startCornerAngle`,
    `startBox.rotation`) — this specifically avoids the element snapping to
    a new rotation the instant the drag begins (which a naive
    absolute-angle assignment would cause, since the handle isn't
    necessarily at angle 0 when idle).
  - Handle hit-testing (`hitTestArtHandle()`) uses a small pixel-radius
    tolerance (`ART_HANDLE_HIT_RADIUS_PX`), same idiom as text's handles.
  - **Delete**: the Delete tool's hit-testing chain now checks art elements
    first (`hitTestArt()`), then text elements, before falling through to
    grid-fragment deletion — so clicking on a piece of furniture with the
    Delete tool removes it rather than whatever fragment happens to be
    underneath.
- **Rendering** (`drawArt()`, called after `drawDoors()` and before
  `drawTexts()` so art sits above the grid/fragments/doors but below text
  labels): for each element, resolves its (possibly still-loading) `<img>`
  via `state.getArtImage()`, skips it entirely if not yet loaded
  (`img.complete && img.naturalWidth > 0` — it'll be drawn automatically
  once loading finishes and `changed$` re-triggers a render), otherwise
  `ctx.translate()`s to its screen-space center, `ctx.rotate()`s by its
  `rotation` (canvas rotation and world rotation share the same sign
  convention since both use a y-down coordinate system, so no sign flip is
  needed), and `drawImage()`s it centered in its scaled screen-space
  width/height. Selection UI (`drawArtSelection()`) — a rotated dashed blue
  rectangle plus the two square handles described above — is drawn only for
  `state.selectedArtId` while the Art tool is active.

## Design vs Play mode (Story 5)

- **Mode field** (`MapMakerStateService.mode: 'design' | 'play'`, default
  `'design'`): switched via `setMode()`. Switching modes **never clears**
  any drawn/placed content — fragments, doors, text, art, and even the
  party/player icons all persist across mode switches, so a DM can freely
  pause a play session (e.g. to draw a new room) and resume it later
  without losing party/player icon positions.
- **What's disabled in Play mode**: every design-tool interaction branch in
  `MapMakerCanvasComponent.onMouseDown`/`onMouseMove` is gated behind
  `state.mode === 'design'` (see the "Tools & mouse buttons" bullet above),
  so square/delete/text/door/art placement, dragging, and double-click-to-
  edit are all inert while in Play mode, regardless of `activeTool`'s
  stale value. Keyboard tool shortcuts (`s`/`d`/`t`/`o`/`a`) are likewise
  ignored by the sidebar's `window:keydown` listener while `mode !==
  'design'`. **What stays active**: right-button panning, wheel/slider
  zooming, and party/player icon placement/dragging (below) — all
  independent of `mode`/`activeTool`.

### Party & player icons

- **Data model**: `PartyIcon { x, y, color }` (`models/party-icon.ts`) — a
  single shared marker, stored as `MapMakerStateService.partyIcon: PartyIcon
  | null` (not an array — "the party" is one marker). `PlayerIcon { id, x,
  y, color, name }` (`models/player-icon.ts`) — any number of individually
  colored/named markers split off from the party, stored as
  `MapMakerStateService.playerIcons: PlayerIcon[]`. Both are world-space
  coordinates, same as everything else.
- **State service API**: `placePartyIcon(x, y, color)` (places or
  re-places), `movePartyIcon(x, y)`, `setPartyColor(color)` (both no-ops if
  no party icon exists yet), `splitPlayerIcon(color, name?)` (spawns a new
  `PlayerIcon` at a small fixed offset — `PLAYER_ICON_SPLIT_OFFSET` — from
  the party icon's current position, or a default fallback position if no
  party icon exists yet), `movePlayerIcon(id, x, y)`,
  `setPlayerIconColor(id, color)`, `setPlayerIconName(id, name)`,
  `removePlayerIcon(id)`.
- **`armPartyPlacement` / `playModeColor`**: purely local UI state (not
  synced across windows — each window arms its own placement
  independently). The sidebar's "Place/Move Party" button calls
  `setArmPartyPlacement(true)`; the *next* Play-mode canvas click then
  calls `placePartyIcon()` at that point and auto-disarms
  (`handleIconMouseDown()` in the canvas). `playModeColor` is the color
  currently selected in the Play-mode sidebar panel, used for the next
  party placement/re-color or player split.
- **Canvas interaction** (`handleIconMouseDown()`, `updateIconDrag()`,
  `hitTestPartyIcon()`, `hitTestPlayerIcon()`): on a Play-mode left-click,
  if placement is armed the party icon is placed/moved there; otherwise
  player icons are hit-tested before the party icon (they're drawn on top
  and may overlap it) and, if hit, begin a plain move-drag
  (`IconDragState`) — there's no scale/rotate for icons, just move,
  computed the same "absolute target from a fixed drag-start snapshot" way
  as text/art drags.
- **Rendering** (`drawPartyAndPlayerIcons()`, called last in `render()` so
  icons always sit on top of everything else): each icon is a filled,
  black-bordered circle (`drawIcon()`) — the party icon uses
  `PARTY_ICON_RADIUS` (slightly larger), player icons use the smaller
  `PLAYER_ICON_RADIUS` — with its name (if any) drawn as a small centered
  label just below it.

### Cross-window sync (`MapMakerSyncService`)

The DM window and the popped-out player-view window are **two entirely
separate Angular app instances** — `window.open()`ing a URL performs a full
browser navigation, so the popup gets its own fresh bootstrap, injector, and
`MapMakerStateService` instance. They're kept in sync purely client-side via
the same-origin `BroadcastChannel('ttrpgmaps-map-maker-play')` API (no
backend involved):

- **Protocol** (see `services/map-maker-sync.service.ts` for the exact
  message shapes): a `role: 'player'` instance posts `'request-state'`
  immediately on construction; a `role: 'dm'` instance replies with
  `'full-state'` containing `state.getSnapshot()` (see below) plus the
  current `partyIcon`/`playerIcons` — a one-time handshake for data that's
  otherwise fixed for the duration of Play mode. Thereafter, **either**
  role posts a lightweight `'icons-update'` message whenever its own
  `state.iconsChanged$` fires (i.e. whenever *that* window's user
  placed/moved/recolored/renamed/added/removed a party/player icon).
  Additionally, **either** role posts a `'hidden-areas-update'` message
  whenever `state.hiddenAreasChanged$` fires — this is what makes revealing
  or hiding a hidden area's letter badge *during Play mode* (Story 7) show
  up live in the other window, since (unlike the rest of the design-time
  map) a hidden area's `revealed` flag can legitimately change after Play
  mode has already started. Story 8 adds the same live-update treatment
  for doors and art: **either** role posts a `'doors-update'` message
  (carrying the full current door list) whenever `state.doorsChanged$`
  fires, and an `'art-update'` message (carrying the full current
  `artElements` list) whenever `state.artChanged$` fires — this is what
  makes the DM revealing a hidden door/art asset *during Play mode* show up
  live in the player-view; without it, the reveal only re-rendered the
  DM's own canvas and never reached the popped-out player window.
- **`iconsChanged$`/`hiddenAreasChanged$`/`doorsChanged$`/`artChanged$` vs
  `changed$`**: `MapMakerStateService` fires the general `changed$`
  (triggers a re-render) on every mutation as usual, but also fires
  narrower `iconsChanged$` (party/player icon mutators),
  `hiddenAreasChanged$` (hidden-area designate/rename/remove/reveal
  mutators), `doorsChanged$` (door add/remove/hide/reveal mutators), and
  `artChanged$` (art add/remove/transform/hide/reveal mutators) subjects.
  `MapMakerSyncService` subscribes to all four of these narrower subjects
  (not `changed$`) so it only broadcasts on genuine icon/hidden-area/door/
  art changes, not on every pan/zoom/fragment edit.
- **No-echo apply**: incoming `'icons-update'`/`'full-state'` messages are
  applied via `state.applyRemoteIcons(partyIcon, playerIcons)`, incoming
  `'hidden-areas-update'`/`'full-state'` messages via
  `state.applyRemoteHiddenAreas(hiddenAreas)`, incoming `'doors-update'`
  messages via `state.applyRemoteDoors(doors)`, and incoming `'art-update'`
  messages via `state.applyRemoteArt(artElements)` — all overwrite the
  relevant fields and fire `changed$` (to re-render) but deliberately
  **not** their own `*Changed$` subject — this is what prevents an
  infinite broadcast echo loop between the two windows.
- **Full-map snapshot handshake**: `MapMakerStateService.getSnapshot()` /
  `applySnapshot(snapshot)` convert between live state (a `Map` for cells,
  etc.) and a plain-object `MapSnapshot` (`models/map-snapshot.ts` — cells
  as `[key, fragments][]` entries, plus arrays of doors/texts/artElements)
  that's safe to pass through `BroadcastChannel`'s structured-clone
  transport.
- **`fullStateReceived$`**: a `Subject<void>` on `MapMakerSyncService` that
  fires once a `'full-state'` message has been processed — used by
  `MapMakerPlayerViewComponent` to flip its "Waiting for Dungeon Master…"
  banner off.

### Popup window management (`MapMakerComponent`)

`togglePlayMode()` is the single entry point: switching to Play mode calls
`state.setMode('play')`, constructs a `MapMakerSyncService(state, 'dm')`,
and opens the popup via `window.open(`${origin}${pathname}#/map-maker/player`,
'ttrpgmaps-player-view', 'width=1100,height=800')`, keeping the `Window`
handle so it can be closed later. Switching back to Design mode closes both
the popup and the sync service. A `setInterval` polls `playerWindow.closed`
so that if the user manually closes the popup, the header can show a
"🔁 Reopen player window" button instead of silently doing nothing.

### Player-view route (`MapMakerPlayerViewComponent`)

A minimal, tool-free shell at the `map-maker/player` route (declared in
`MapMakerModule`, not linked from any nav menu — only reachable via the DM's
popup): renders just `<app-map-maker-canvas>` (no sidebar) plus a "Waiting
for Dungeon Master…" banner until `fullStateReceived$` fires. `ngOnInit`
sets `state.setMode('play')` and constructs a
`MapMakerSyncService(state, 'player')`; `ngOnDestroy` closes it. Note
`AppComponent.hideToolbarPaths` also hides the site's main nav toolbar on
this route (in addition to the actual home page), so the popped-out window
reads as a clean, standalone player screen rather than a page users could
navigate away from via the main site nav.

## Sidebar (`MapMakerSidebarComponent`)

- All of the design-tool UI described below (tool buttons, shape options,
  color picker, art panel) is wrapped in `*ngIf="state.mode === 'design'"`
  and hidden entirely in Play mode; the Play-mode panel described further
  down takes its place. The "hold right mouse to pan" hint and the zoom
  slider are shown unconditionally in both modes.
- Tool buttons: **Square** (`s` shortcut), **Delete** (`d` shortcut),
  **Text** (`t` shortcut), **Door** (`o` shortcut), **Art** (`a`
  shortcut), and **Hidden area** (`h` shortcut), bound to
  `MapMakerStateService.activeTool`. There is no "Pan"
  tool button — a hint below the tool buttons reminds the user that holding
  the right mouse button pans regardless of the selected tool; a second
  hint (shown only while the Text tool is active) explains the
  click-to-create / click-to-select-and-drag / double-click-to-edit /
  handle-drag interactions; a third hint (shown only while the Door tool is
  active) explains hover-to-preview / click-or-drag-to-toggle and the
  "needs two non-empty neighboring squares" requirement; a fourth hint
  (shown only while the Art tool is active) explains pick-then-click-to-
  place / click-to-select-and-drag / corner-drag-to-scale-or-rotate; a
  fifth hint (shown only while the Hidden Area tool is active) explains
  click-to-designate / click-again-to-remove and that regions stop
  automatically at walls and doors.
  Shortcuts are handled via a `window:keydown` host listener that ignores
  keystrokes while an `<input>`/`<textarea>`/`<select>` has focus (so typing
  in the custom color picker, the text inline-edit overlay, or the art
  search box, doesn't accidentally switch tools), and are also ignored
  entirely while `state.mode !== 'design'`.
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
- Art panel (shown only while the Art tool is active, following the same
  conditional-section pattern as the shape/color panels): a text search
  input (`artSearch`, case-insensitive substring match against asset name)
  and a category `<select>` (`artCategoryFilter`, defaults to "All
  categories") both feed `MapMakerSidebarComponent.filteredArtAssets`
  (a getter delegating to `state.getArtAssets({ search, category })`), which
  drives a scrollable `<ul>` of asset rows — each showing a small lazy-
  loaded `<img>` thumbnail (`artThumbPath()`) plus the asset's name.
  Clicking a row calls `selectArtAsset()`, which toggles
  `state.selectedArtAssetFileName` (clicking the already-selected asset
  deselects it) — the active asset is highlighted in the list.
- Hidden-area list (shown only while the Hidden Area tool is active): an
  editable `<ul>` of `state.hiddenAreas` — each row shows the area's
  `letter`, a name `<input>` (`renameHiddenArea()`) defaulting to the
  letter but freely overridable, and a remove button
  (`removeHiddenArea()`) — same row layout as the Play-mode player-icon
  list.
- Zoom slider: an `<input type="range">` bound to `state.zoom`
  (`[MIN_ZOOM, MAX_ZOOM]`), kept in sync with wheel-zooming on the canvas.
- **Play-mode panel** (`*ngIf="state.mode === 'play'"`, see "Design vs Play
  mode (Story 5)" above for the full icon data model/sync design): a color
  picker (palette swatches + custom `<input type="color">`) bound to a
  local `playModeColor`; a "Place/Move Party" toggle button
  (`togglePartyPlacement()`) that arms `state.armPartyPlacement` so the next
  Play-mode canvas click places/moves the party icon; a "Split Player Icon"
  button (`splitPlayerIcon()`, disabled until a party icon exists) plus an
  optional name `<input>` (`newPlayerName`) next to it; and an editable
  list of existing player icons — each row has a color `<input
  type="color">` (`setPlayerColor()`), a name `<input>` (`setPlayerName()`),
  and a remove button (`removePlayer()`). Below that, if any hidden areas
  exist, a read-only list mirroring them (letter + name + a Reveal/Hide
  toggle button calling `toggleHiddenAreaRevealed()`) — a discoverable
  alternative to clicking a hidden area's letter badge directly on the
  canvas (see Story 7 below).

## Save and load (Story 6)

- **Header UI** (`map-maker.component.html`): a `dungeonName` text `<input>`
  (two-way bound to `state.dungeonName`), a "💾 Save" button, and a
  "📂 Load" button (which clicks a hidden `<input type="file"
  accept=".json,application/json">` via a template ref, so the visible
  button controls the native file picker).
- **Data model** (`models/map-save-data.ts`): `MapMakerSaveData` is a
  versioned (`version: 1`), plain-object payload containing *everything*
  the story requires — both design-time data (`cells`, `doors`, `texts`,
  `artElements`, mirroring `MapSnapshot`) and play-mode data (`partyIcon`,
  `playerIcons`), plus color preferences (`paletteColors`, `activeColor`,
  `playModeColor`) and the `dungeonName` itself. `mode` is deliberately
  **not** persisted — loading a file always lands back in Design mode (see
  below), so a stray player-view popup is never silently reopened just
  from a load.
- **`MapMakerStateService`**:
  - `exportSaveData(): MapMakerSaveData` builds on the existing
    `getSnapshot()` (cells/doors/texts/art) and adds
    partyIcon/playerIcons/palette/colors/dungeonName.
  - `importSaveData(data: MapMakerSaveData): void` mirrors
    `applySnapshot()` for the design-time fields, then restores
    partyIcon/playerIcons/palette/colors/dungeonName, persists the palette
    to localStorage, clears any active text/art selection, forces
    `mode = 'design'`, and emits `changed$`. Every field is read
    defensively (`data.field ?? fallback`) so files saved by an older
    version of this schema (missing newer optional fields) still load
    without throwing.
- **`MapMakerFileService`** (`services/map-maker-file.service.ts`) — kept
  free of DOM/download APIs so it's trivially unit-testable:
  - `serialize(data)` / `deserialize(json)`: wrap/unwrap a
    `{ version, data }` JSON envelope; `deserialize()` throws a plain,
    user-presentable `Error` on invalid JSON or an unrecognized shape
    (missing/non-array `cells`), which the component catches and shows via
    `alert()`.
  - `fileNameFor(dungeonName)`: derives the download file name — spaces
    become underscores, then any character that isn't alphanumeric or an
    underscore is stripped out; falls back to `dungeon-map.json` if the
    sanitized result is empty (blank name, or a name made entirely of
    stripped characters).
- **`MapMakerComponent`**:
  - `saveToFile()`: `state.exportSaveData()` → `fileService.serialize()` →
    wraps the JSON text in a `Blob`, creates an object URL, and clicks a
    programmatically-created `<a download>` (then revokes the URL) — the
    standard client-side-only download pattern (no backend exists).
  - `triggerLoad()` / `onLoadFileSelected()`: the file `<input>`'s `change`
    event reads the picked file via `File.text()`, deserializes it, and
    (if currently in Play mode) first tears down the player window/sync
    exactly like `togglePlayMode()` would, before calling
    `state.importSaveData()`. The input's `value` is reset after every
    selection so re-picking the same file re-fires `change`.

## Hidden areas (Story 7)

- **Data model** (`models/hidden-area.ts`): `HiddenArea { id, letter, name,
  cellKeys, revealed }`. `cellKeys` is a **frozen snapshot** — an array of
  `gridKey()` strings captured at the moment the area was designated — not
  continuously recomputed as the map is edited, mirroring how doors and
  fragments are each independently-tracked pieces of state elsewhere in
  this module. `letter` is the stable, auto-assigned identifier used for
  reuse ordering; `name` starts out equal to `letter` but can be freely
  overridden by the user without affecting letter reuse.
  `letterForIndex(n)` produces a spreadsheet-column-style base-26 sequence
  (`A, B, … Z, AA, AB, …`) so there's no hard cap on the number of areas;
  `nextAvailableLetter(existing)` picks the smallest letter in that
  sequence not currently in use, so deleting an area frees its letter for
  the next one.
- **"Area" definition**: a maximal connected region of non-empty cells,
  where connectivity stops at any edge that either borders an empty cell,
  has a door on it, has an explicit `Wall` on it, **or** is a visible
  color-boundary border between two differently-colored (or otherwise
  non-merging) drawn fragments — e.g. where a Story 9 large-square fill of
  one color partially overlaps a differently-colored area, the black
  border rendered at that seam (`computeBorderSegmentKeySet()` in
  `models/fragment-borders.ts`) counts as a boundary too, even without an
  explicit `Wall` placed there, since the two areas already read visually
  as separate. All of these act as the area's boundary, matching the
  story text ("separated to the empty grid by a border or door(s)")
  almost verbatim, extended to also cover any border that's actually
  rendered. In particular, two rooms joined by a door are always
  two *separate* hidden areas, never one.
- **State** (`MapMakerStateService`):
  - `hiddenAreas: HiddenArea[]`.
  - `computeConnectedCells(coord): Set<string>` — the flood-fill described
    above (returns an empty set if `coord` itself has no fragments).
  - `getHiddenAreaAt(coord)`: the (first) area whose `cellKeys` contains
    that cell's key, if any.
  - `toggleHiddenAreaAt(coord)`: the single entry point the canvas calls.
    If `coord` already belongs to a hidden area, the **whole area** is
    removed (a click anywhere inside an existing area un-hides it, not
    just its originally-clicked cell); otherwise, provided the cell is
    non-empty, a new `HiddenArea` is created covering
    `computeConnectedCells(coord)` with the next free letter as both
    `letter` and initial `name`. No-op on an empty cell not already part
    of an area.
  - `renameHiddenArea(id, name)`, `removeHiddenArea(id)` (frees the
    letter for reuse), `toggleHiddenAreaRevealed(id)` (flips `revealed`,
    called from the DM's canvas-badge click in Play mode, or the
    Play-mode sidebar list's Reveal/Hide button).
  - Cleanup: `removeFragmentAt()`'s existing cell-deletion branch (which
    already calls `removeDoorsTouchingCell`) additionally calls a private
    `removeHiddenAreaCell(coord)`, stripping that cell's key out of every
    area's `cellKeys` and deleting any area that becomes fully empty as a
    result — the same idiom as door cleanup.
  - `clear()` also clears `hiddenAreas`.
- **Snapshot & save-data plumbing**: `hiddenAreas` is included in both
  `MapSnapshot` (`models/map-snapshot.ts` — needed by the DM→player sync
  handshake, since the player-view's fog rendering depends on it, unlike
  text/mode which are DM-only) and `MapMakerSaveData`
  (`models/map-save-data.ts`). `getSnapshot()`/`applySnapshot()` and
  `exportSaveData()`/`importSaveData()` all include/restore it
  defensively (`data.hiddenAreas ?? []`, same pattern as every other
  optional field, for backward compatibility with older save files).
  `revealed` is deliberately persisted through save/load and through
  Design↔Play mode switches — same "never silently clears content"
  philosophy as Story 5/6 (a DM can save mid-session with some areas
  already revealed).
- **Canvas interaction** (`MapMakerCanvasComponent`):
  - **Design mode, Hidden Area tool active**: `onMouseDown`'s design-tool
    branch calls `handleHiddenAreaMouseDown()` → `state.toggleHiddenAreaAt()`
    once per click. Unlike Square/Delete, this is a **whole-region toggle**,
    not a per-cell paint, so there is deliberately no drag-repeat handling
    (dragging across a freshly-designated area's cells would otherwise
    flicker it on/off) — `performToolActionAt()`'s generic drag-repaint
    path silently no-ops for this tool since neither of its `square`/
    `delete` branches match it.
  - **Play mode, DM view only** (`!isPlayerView`): before falling through
    to the usual party/player-icon click handling, `onMouseDown` calls
    `handleHiddenAreaBadgeClick()`, which hit-tests every hidden area's
    letter badge (`hitTestHiddenAreaBadge()`/`hiddenAreaBadgeScreenRect()`,
    a simple screen-space circle centered on `hiddenAreaCentroid()` — the
    average cell-center of `cellKeys`) and, if hit, calls
    `state.toggleHiddenAreaRevealed()` and reports handled (so the click
    doesn't also try to place/drag an icon).
- **Rendering**:
  - `drawHiddenAreas()` (new pass, after `drawTexts()`/before the fog pass
    in `render()`'s order — see below): a no-op on the player-view canvas
    (`isPlayerView`) and when there are no hidden areas. In Design mode,
    every area gets a translucent purple tint (`HIDDEN_AREA_DESIGN_TINT`)
    over its cells; in Play mode (DM view), only **not-yet-revealed**
    areas keep a (slightly stronger) tint, so the DM can tell at a glance
    what's still hidden. Every area, in both modes, gets a small circular
    letter/name badge (`drawHiddenAreaBadge()`) drawn at its centroid —
    this badge becomes clickable once in Play mode (see above).
  - `drawFogOfWar()` (new pass, only meaningful when `isPlayerView &&
    state.mode === 'play'` — a no-op otherwise, including on the DM's own
    canvas, which always shows the true map): iterates the same visible
    cell range already computed by `drawGrid()` and paints a solid black,
    black-bordered square over every cell that either belongs to a
    not-yet-revealed hidden area, or has no fragments at all (the story's
    "space between shown areas" — i.e. plain undrawn grid space becomes
    fog too, not just designated hidden rooms). It runs *after*
    fragments/doors/art/text have already been drawn normally, simply
    painting over them — this fully occludes shape/color/door/art details
    in fogged cells without needing to special-case any earlier draw
    pass. `render()`'s order is: grid → fragments → borders → doors → art
    → texts → **fog of war** → **hidden-area tint/badges** → party/player
    icons (icons are always drawn last, on top of the fog, so the party
    token stays visible even in unexplored territory).
  - As with `computeBorderSegments()`, both new passes iterate every
    visible cell on every render; fine at prototype scale, but a future
    story should consider caching if large maps make this sluggish.
- **Sidebar** (`MapMakerSidebarComponent`): a new **Hidden area** tool
  button (`h` shortcut); a hint shown while it's active; an editable list
  of `state.hiddenAreas` (letter + renamable name + remove button) shown
  alongside the tool in Design mode; and, in the Play-mode panel, a
  parallel read-only list with a Reveal/Hide toggle button per area (see
  the Sidebar section above for both).
- **Live reveal sync during Play mode**: toggling `revealed` (via the
  DM's canvas badge click or the Play-mode sidebar button) fires
  `hiddenAreasChanged$` in addition to `changed$`. `MapMakerSyncService`
  subscribes to `hiddenAreasChanged$` and broadcasts a
  `'hidden-areas-update'` message (see "Cross-window sync" above) so the
  popped-out player-view's fog-of-war updates immediately — this is what
  makes the Reveal/Hide button actually show/hide the area on the player
  screen, not just locally on the DM's own canvas.

## Hidden doors & hidden art (Story 8)

Both doors (`models/door.ts`) and art elements (`models/art-element.ts`)
gained two boolean fields: `hidden` (a design-time DM designation) and
`revealed` (a Play-mode DM action, meaningless while `hidden` is `false`).
Both default to `false` and are covered automatically by every existing
save/load and DM↔player-view sync path, since those already round-trip
whole `Door`/`ArtElement` objects via object spread (`{ ...door }` /
`{ ...a }`) rather than naming individual fields.

- **Marking a door hidden** (design mode): a new **"Mark Hidden"** toggle
  button in the Door tool's sidebar panel arms/disarms
  `MapMakerStateService.armHiddenDoorMode` (purely local UI state, like
  `armPartyPlacement` — each window arms it independently, and it's
  auto-disarmed by `setTool()` whenever the Door tool isn't active). While
  disarmed, the Door tool behaves exactly as in Story 3 (click/drag toggles
  a door's existence). While armed, `MapMakerCanvasComponent.toggleDoorAtPos()`
  instead calls `state.toggleDoorHidden(orientation, col, row)` for the
  nearest valid edge on each click/drag-entered edge — this flips the
  `hidden` flag of whichever door already sits there (no-op if there's no
  door on that edge; you can't hide a door that doesn't exist) and resets
  `revealed` back to `false`, so re-marking a door never carries over a
  stale Play-mode reveal state.
- **Marking an art element hidden** (design mode): reuses the existing
  Story 4 selection mechanism — no new modifier or arm-a-mode UI needed.
  When an art element is selected (`state.selectedArtId` set, Art tool
  active), the sidebar shows a **"Hidden"** checkbox
  (`MapMakerSidebarComponent.selectedArt` getter +
  `toggleSelectedArtHidden()`) bound to that element's `hidden` flag via
  `state.setArtHidden(id, hidden)` (which likewise resets `revealed` to
  `false`).
- **Revealing in Play mode (DM view only)**: `MapMakerCanvasComponent.onMouseDown`'s
  Play-mode, DM-view branch (`!isPlayerView`) tries, in order,
  `handleHiddenAreaBadgeClick()` (Story 7), then two new handlers, each
  short-circuiting the fall-through to party/player-icon click handling on
  a hit:
  - `handleDoorRevealClick()`: hit-tests every **hidden** door's on-screen
    icon rectangle (`pointInDoorRect()`, reusing the existing
    `getEdgeRect()` helper) and calls `state.toggleDoorRevealed(...)` on a
    hit. Non-hidden doors are never hit-tested here — they stay
    non-interactive in Play mode, same as before this story.
  - `handleHiddenArtRevealClick()`: hit-tests only art elements with
    `hidden === true`, reusing the same point-in-rotated-rect math as
    `hitTestArt()`/`worldToArtLocal()`, and calls
    `state.toggleArtRevealed(id)` on a hit. Non-hidden art is likewise
    never hit-tested in Play mode.
  - Both `toggleDoorRevealed`/`toggleArtRevealed` (like every other door/
    art mutator) fire `doorsChanged$`/`artChanged$` in addition to
    `changed$`, which `MapMakerSyncService` broadcasts to the popped-out
    player-view window as a `'doors-update'`/`'art-update'` message (see
    "Cross-window sync" above) — this is what makes a reveal made *during
    Play mode* actually show up on the player screen, not just re-render
    the DM's own canvas.
- **Rendering** — the core trick for doors: the black perimeter border
  between cells (`drawBorders()`/`computeBorderSegments()`) is computed
  entirely independently of doors (see "Visual merging..." above), and is
  drawn *before* `drawDoors()`. So simply skipping the door *icon* on the
  player-view canvas when it's hidden-and-unrevealed automatically leaves
  behind "a regular black-bordered edge" — exactly the story's wording —
  with no extra rendering code required:
  - `drawDoors()`: on the player-view canvas (`isPlayerView === true`),
    skips drawing the icon entirely for any door with `hidden &&
    !revealed`.
  - `drawDoorShape()`: on the DM view, always draws the icon, but fills it
    with a distinct tint color (`DOOR_HIDDEN_FILL_COLOR`, light blue)
    instead of plain white whenever `door.hidden && (state.mode ===
    'design' || !door.revealed)` — mirroring `drawHiddenAreas()`'s
    design-vs-play `showTint` condition exactly, so the DM can spot
    flagged/unrevealed doors at a glance. Once revealed in Play mode (or
    always, in Design mode once un-hidden), it's plain white.
  - `drawArt()`: on the player-view canvas, skips the element entirely
    when `hidden && !revealed` (fully invisible — unlike doors there's no
    "wall edge" fallback for a piece of furniture). On the DM view it
    always draws normally, plus a small dashed indicator outline
    (`drawArtHiddenIndicator()`, in a distinct color
    `ART_HIDDEN_INDICATOR_COLOR` from the blue selection outline) whenever
    `hidden && (state.mode === 'design' || !revealed)`, so hidden/
    unrevealed art is spottable even when not currently selected.

## Walls (Story 15)

`models/wall.ts` defines `Wall { orientation: DoorOrientation; col: number;
row: number; }` (reusing `DoorOrientation` from `door.ts` — same
vertical/horizontal grid-edge convention as doors) and `wallKey()` (same
canonical `` `v:col,row` `` / `` `h:col,row` `` string-key pattern as
`doorKey()`). `MapMakerStateService` holds them in a private `walls:
Map<string, Wall>`, exposed via `getAllWalls()`/`hasWallAt()`/
`toggleWallAt()`.

- **Key design difference from doors**: a wall has **no non-empty-cell
  placement constraint** — `toggleWallAt()` always succeeds, unlike
  `toggleDoorAt()`'s `canPlaceDoorAt()` gate. The story's wording ("edges
  between two squares") doesn't repeat Story 3's explicit "that are not
  empty" qualifier, so a wall can be drawn on any grid edge, whether or
  not either neighboring cell has ever been drawn on — it's a purely
  structural/design element, independent of floor color. Consequently,
  emptying a cell (`removeFragmentAt`) does **not** remove walls touching
  it (contrast with `removeDoorsTouchingCell()`, which does, precisely
  because a door *requires* two non-empty neighbors).
- **No hidden/revealed state**: unlike Story 8's doors/art, walls have no
  DM-only "Mark Hidden"/reveal concept — a wall is always a plain,
  unconditionally-visible black border in both Design and Play mode, DM
  and player view alike. There's therefore no `wallsChanged$` subject and
  no `'walls-update'` message in `MapMakerSyncService` — walls can only be
  toggled via the (Design-mode-only) Wall tool, so they can never change
  once Play mode has started; the one-time `'full-state'` handshake
  (which now carries `walls` as part of `MapSnapshot`) is always
  sufficient.
- **Interaction** (`MapMakerCanvasComponent`, Wall tool, `w` shortcut):
  mirrors the Door tool's edge-toggle interaction almost exactly.
  `findNearestEdge()`'s edge-snapping logic was factored out into a shared
  `findNearestEdgeMatching(worldX, worldY, isValidEdge)` helper; the door
  path calls it with the existing `canPlaceDoorAt || hasDoorAt` predicate,
  while a new `findNearestWallEdge()` calls it with `() => true` (every
  edge qualifies). `hoveredWallEdge`/`lastToggledWallEdgeKey` mirror
  `hoveredEdge`/`lastToggledEdgeKey`; `toggleWallAtPos()` mirrors
  `toggleDoorAtPos()` (minus the "Mark Hidden" branch) — dedupes per edge
  during a drag via `lastToggledWallEdgeKey`, so a lingering cursor
  doesn't flicker a wall on/off, and a drag across several fresh edges
  adds a wall to each while a drag back across existing walls removes
  them one by one, satisfying "click or drag to draw... clicking or
  dragging on a drawn wall removes it".
- **Rendering** (`drawWalls()`, called right after `drawBorders()` and
  before `drawDoors()` in `render()`): draws the hover-highlight for the
  Wall tool (reusing `drawEdgeHighlight()`, now parameterized with an
  optional `color` argument so it can use a distinct pink/red
  `WALL_HOVER_COLOR` instead of the door tool's blue `DOOR_HOVER_COLOR`),
  then strokes every wall as a solid line the full length of its edge, in
  the exact same `BORDER_COLOR`/`BORDER_WIDTH_PX` used by the automatic
  fragment borders — per the story, "draws a black border... similar to
  the border at the edge of the grid". Drawing walls before `drawDoors()`
  means a door icon placed on the same edge as a wall still renders on
  top of it.
- **Interaction with Story 7's hidden areas**: `computeConnectedCells()`'s
  flood fill now also stops at any edge with `hasWallAt(...)`, alongside
  the existing `hasDoorAt(...)` check — consistent with that story's own
  wording that a room is "separated to the empty grid by a border or
  door(s)"; a wall is exactly such a border.
- **Save/load & sync**: `walls: Wall[]` was added to both `MapSnapshot`
  and `MapMakerSaveData`, threaded through
  `getSnapshot()`/`applySnapshot()`/`exportSaveData()`/`importSaveData()`
  and `MapMakerFileService.deserialize()` (defaulting to `[]` for older
  save files that predate this field, exactly like every other
  optional/added field in this module).

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
