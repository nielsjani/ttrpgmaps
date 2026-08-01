import {
  MapMakerStateService,
  DEFAULT_COLORS,
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_TEXT_FONT_SIZE,
  MIN_TEXT_FONT_SIZE,
  MAX_TEXT_FONT_SIZE,
} from './map-maker-state.service';
import { MapMakerSyncService } from './map-maker-sync.service';

describe('MapMakerStateService', () => {
  const PALETTE_STORAGE_KEY = 'map-maker.palette-colors';
  let service: MapMakerStateService;

  beforeEach(() => {
    localStorage.removeItem(PALETTE_STORAGE_KEY);
    service = new MapMakerStateService();
  });

  afterEach(() => {
    localStorage.removeItem(PALETTE_STORAGE_KEY);
  });

  it('starts with an empty grid', () => {
    expect(service.getFragments({ col: 0, row: 0 })).toEqual([]);
    expect(service.getAllCells().size).toBe(0);
  });

  it('places a full square fragment with the active color', () => {
    service.setShapeOption('square');
    service.setColor('#ff0000');
    service.placeFragment({ col: 1, row: 2 }, 0.5, 0.5);

    const fragments = service.getFragments({ col: 1, row: 2 });
    expect(fragments.length).toBe(1);
    expect(fragments[0]).toEqual({ shape: 'full', color: '#ff0000' });
  });

  it('replaces a full square when a new overlapping fragment is placed', () => {
    service.setShapeOption('square');
    service.placeFragment({ col: 0, row: 0 }, 0.5, 0.5);
    service.setShapeOption('quarter');
    service.placeFragment({ col: 0, row: 0 }, 0.1, 0.1); // top-left quarter

    const fragments = service.getFragments({ col: 0, row: 0 });
    expect(fragments.length).toBe(1);
    expect(fragments[0].shape).toBe('quarter-tl');
  });

  it('allows non-overlapping quarters to coexist in the same cell', () => {
    service.setShapeOption('quarter');
    service.placeFragment({ col: 0, row: 0 }, 0.1, 0.1); // tl
    service.placeFragment({ col: 0, row: 0 }, 0.9, 0.1); // tr
    service.placeFragment({ col: 0, row: 0 }, 0.1, 0.9); // bl

    const fragments = service.getFragments({ col: 0, row: 0 });
    expect(fragments.map(f => f.shape).sort()).toEqual(['quarter-bl', 'quarter-tl', 'quarter-tr']);
  });

  it('removes only the fragment at the clicked sub-position, leaving others intact', () => {
    service.setShapeOption('quarter');
    service.placeFragment({ col: 0, row: 0 }, 0.1, 0.1); // tl
    service.placeFragment({ col: 0, row: 0 }, 0.9, 0.1); // tr

    service.removeFragmentAt({ col: 0, row: 0 }, 0.1, 0.1); // remove tl only

    const fragments = service.getFragments({ col: 0, row: 0 });
    expect(fragments.length).toBe(1);
    expect(fragments[0].shape).toBe('quarter-tr');
  });

  it('deletes the cell entry entirely once its last fragment is removed', () => {
    service.setShapeOption('square');
    service.placeFragment({ col: 3, row: 3 }, 0.5, 0.5);
    service.removeFragmentAt({ col: 3, row: 3 }, 0.5, 0.5);

    expect(service.getFragments({ col: 3, row: 3 })).toEqual([]);
    expect(service.getAllCells().has('3,3')).toBe(false);
  });

  it('does nothing when deleting from an already-empty cell', () => {
    expect(() => service.removeFragmentAt({ col: 5, row: 5 }, 0.5, 0.5)).not.toThrow();
    expect(service.getFragments({ col: 5, row: 5 })).toEqual([]);
  });

  it('picks half/triangle orientation nearest the click position', () => {
    service.setShapeOption('half');
    service.placeFragment({ col: 0, row: 0 }, 0.5, 0.05); // near top edge
    expect(service.getFragments({ col: 0, row: 0 })[0].shape).toBe('half-top');

    service.clear();
    service.setShapeOption('triangle');
    service.placeFragment({ col: 0, row: 0 }, 0.05, 0.05); // near top-left corner
    expect(service.getFragments({ col: 0, row: 0 })[0].shape).toBe('triangle-tl');
  });

  it('clamps zoom between MIN and MAX', () => {
    service.setZoom(100);
    expect(service.zoom).toBeLessThanOrEqual(4);
    service.setZoom(-10);
    expect(service.zoom).toBeGreaterThanOrEqual(0.25);
  });

  it('exposes default color swatches including the initial active color', () => {
    expect(DEFAULT_COLORS.length).toBeGreaterThan(0);
    expect(DEFAULT_COLORS).toContain(service.activeColor);
  });

  it('setTool/setColor/setShapeOption update active state', () => {
    service.setTool('delete');
    expect(service.activeTool).toBe('delete');
    service.setColor('#123456');
    expect(service.activeColor).toBe('#123456');
    service.setShapeOption('triangle');
    expect(service.activeShapeOption).toBe('triangle');
  });

  it('setTool clears the selected text when switching away from the text tool', () => {
    const text = service.addText(0, 0);
    service.setSelectedText(text.id);
    service.setTool('square');
    expect(service.selectedTextId).toBeNull();
  });

  it('starts with the default palette when nothing is stored', () => {
    expect(service.paletteColors).toEqual(DEFAULT_COLORS);
  });

  it('setPaletteColor overwrites the given slot and persists it to localStorage', () => {
    service.setPaletteColor(2, '#abcdef');
    expect(service.paletteColors[2]).toBe('#abcdef');
    expect(service.paletteColors.length).toBe(DEFAULT_COLORS.length);

    const stored = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY)!);
    expect(stored[2]).toBe('#abcdef');
  });

  it('ignores out-of-range indexes when setting a palette color', () => {
    service.setPaletteColor(-1, '#abcdef');
    service.setPaletteColor(999, '#abcdef');
    expect(service.paletteColors).toEqual(DEFAULT_COLORS);
  });

  it('loads a previously-stored palette on construction', () => {
    const customPalette = ['#111111', '#222222'];
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(customPalette));

    const reloaded = new MapMakerStateService();
    expect(reloaded.paletteColors).toEqual(customPalette);
    expect(reloaded.activeColor).toBe(customPalette[0]);
  });

  it('falls back to defaults when stored palette JSON is corrupt', () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, 'not valid json');
    const reloaded = new MapMakerStateService();
    expect(reloaded.paletteColors).toEqual(DEFAULT_COLORS);
  });

  it('falls back to defaults when stored palette is not an array of strings', () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    const reloaded = new MapMakerStateService();
    expect(reloaded.paletteColors).toEqual(DEFAULT_COLORS);
  });

  it('resetPalette restores the defaults and persists them', () => {
    service.setPaletteColor(0, '#abcdef');
    service.resetPalette();
    expect(service.paletteColors).toEqual(DEFAULT_COLORS);

    const stored = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY)!);
    expect(stored).toEqual(DEFAULT_COLORS);
  });
});

describe('MapMakerStateService — text elements', () => {
  let service: MapMakerStateService;

  beforeEach(() => {
    localStorage.removeItem('map-maker.palette-colors');
    service = new MapMakerStateService();
  });

  it('addText creates a text element with default size/font-size and selects it', () => {
    const text = service.addText(100, 200);

    expect(text.x).toBe(100);
    expect(text.y).toBe(200);
    expect(text.width).toBe(DEFAULT_TEXT_WIDTH);
    expect(text.height).toBe(DEFAULT_TEXT_HEIGHT);
    expect(text.fontSize).toBe(DEFAULT_TEXT_FONT_SIZE);
    expect(text.text).toBe('');
    expect(service.texts).toEqual([text]);
    expect(service.selectedTextId).toBe(text.id);
  });

  it('getText finds a text element by id', () => {
    const text = service.addText(0, 0);
    expect(service.getText(text.id)).toEqual(text);
    expect(service.getText('does-not-exist')).toBeUndefined();
  });

  it('updateTextContent sets the text content', () => {
    const text = service.addText(0, 0);
    service.updateTextContent(text.id, 'Hello, world!');
    expect(service.getText(text.id)?.text).toBe('Hello, world!');
  });

  it('updateTextContent removes the element when committed content is blank', () => {
    const text = service.addText(0, 0);
    service.updateTextContent(text.id, '   ');
    expect(service.getText(text.id)).toBeUndefined();
    expect(service.texts.length).toBe(0);
  });

  it('moveText updates the position', () => {
    const text = service.addText(0, 0);
    service.moveText(text.id, 42, 84);
    expect(service.getText(text.id)).toEqual(jasmine.objectContaining({ x: 42, y: 84 }));
  });

  it('resizeText updates width/height without touching fontSize, clamped to a sane minimum', () => {
    const text = service.addText(0, 0);
    service.resizeText(text.id, 300, 120);
    expect(service.getText(text.id)).toEqual(
      jasmine.objectContaining({ width: 300, height: 120, fontSize: DEFAULT_TEXT_FONT_SIZE })
    );

    service.resizeText(text.id, -50, -50);
    const clamped = service.getText(text.id)!;
    expect(clamped.width).toBeGreaterThan(0);
    expect(clamped.height).toBeGreaterThan(0);
  });

  it('scaleText uniformly scales fontSize/width/height together', () => {
    const text = service.addText(0, 0);
    const before = service.getText(text.id)!;
    service.scaleText(text.id, 2);
    const after = service.getText(text.id)!;

    expect(after.fontSize).toBeCloseTo(before.fontSize * 2, 5);
    expect(after.width).toBeCloseTo(before.width * 2, 5);
    expect(after.height).toBeCloseTo(before.height * 2, 5);
  });

  it('scaleText clamps fontSize within [MIN_TEXT_FONT_SIZE, MAX_TEXT_FONT_SIZE]', () => {
    const text = service.addText(0, 0);
    service.scaleText(text.id, 0.001);
    expect(service.getText(text.id)!.fontSize).toBe(MIN_TEXT_FONT_SIZE);

    service.scaleText(text.id, 1000000);
    expect(service.getText(text.id)!.fontSize).toBe(MAX_TEXT_FONT_SIZE);
  });

  it('setTextBox overwrites given absolute fields only, clamping bounds', () => {
    const text = service.addText(0, 0);
    service.setTextBox(text.id, { x: 10, fontSize: 1000 });
    const updated = service.getText(text.id)!;
    expect(updated.x).toBe(10);
    expect(updated.y).toBe(0);
    expect(updated.fontSize).toBe(MAX_TEXT_FONT_SIZE);
  });

  it('removeText deletes the element and clears selection if it was selected', () => {
    const text = service.addText(0, 0);
    expect(service.selectedTextId).toBe(text.id);
    service.removeText(text.id);
    expect(service.getText(text.id)).toBeUndefined();
    expect(service.selectedTextId).toBeNull();
  });

  it('setSelectedText selects/deselects a text element', () => {
    const text = service.addText(0, 0);
    service.setSelectedText(null);
    expect(service.selectedTextId).toBeNull();
    service.setSelectedText(text.id);
    expect(service.selectedTextId).toBe(text.id);
  });

  it('supports multiple independent text elements', () => {
    const a = service.addText(0, 0);
    const b = service.addText(50, 50);
    expect(service.texts.length).toBe(2);
    service.updateTextContent(a.id, 'A');
    service.updateTextContent(b.id, 'B');
    expect(service.getText(a.id)?.text).toBe('A');
    expect(service.getText(b.id)?.text).toBe('B');
  });
});

describe('MapMakerStateService — doors', () => {
  let service: MapMakerStateService;

  beforeEach(() => {
    localStorage.removeItem('map-maker.palette-colors');
    service = new MapMakerStateService();
  });

  function drawSquare(col: number, row: number): void {
    service.setShapeOption('square');
    service.placeFragment({ col, row }, 0.5, 0.5);
  }

  it('canPlaceDoorAt is false when either neighboring cell is empty', () => {
    expect(service.canPlaceDoorAt('vertical', 1, 0)).toBe(false);
    drawSquare(0, 0);
    expect(service.canPlaceDoorAt('vertical', 1, 0)).toBe(false); // (1,0) still empty
  });

  it('canPlaceDoorAt is true when both neighboring cells are non-empty', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    expect(service.canPlaceDoorAt('vertical', 1, 0)).toBe(true);
  });

  it('toggleDoorAt adds a door when valid and none exists yet', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    expect(service.hasDoorAt('vertical', 1, 0)).toBe(false);

    service.toggleDoorAt('vertical', 1, 0);

    expect(service.hasDoorAt('vertical', 1, 0)).toBe(true);
    expect(service.getAllDoors().size).toBe(1);
  });

  it('toggleDoorAt removes an existing door', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    service.toggleDoorAt('vertical', 1, 0);

    service.toggleDoorAt('vertical', 1, 0);

    expect(service.hasDoorAt('vertical', 1, 0)).toBe(false);
    expect(service.getAllDoors().size).toBe(0);
  });

  it('toggleDoorAt is a no-op when the edge is not adjacent to two non-empty cells', () => {
    drawSquare(0, 0); // (1,0) is empty, so this vertical edge is invalid

    service.toggleDoorAt('vertical', 1, 0);

    expect(service.hasDoorAt('vertical', 1, 0)).toBe(false);
    expect(service.getAllDoors().size).toBe(0);
  });

  it('works for horizontal edges too', () => {
    drawSquare(0, 0);
    drawSquare(0, 1);

    expect(service.canPlaceDoorAt('horizontal', 0, 1)).toBe(true);
    service.toggleDoorAt('horizontal', 0, 1);
    expect(service.hasDoorAt('horizontal', 0, 1)).toBe(true);
  });

  it('automatically removes doors touching a cell that becomes empty', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    service.toggleDoorAt('vertical', 1, 0);
    expect(service.hasDoorAt('vertical', 1, 0)).toBe(true);

    // Remove the only fragment in cell (1, 0), emptying it entirely.
    service.removeFragmentAt({ col: 1, row: 0 }, 0.5, 0.5);

    expect(service.hasDoorAt('vertical', 1, 0)).toBe(false);
    expect(service.getAllDoors().size).toBe(0);
  });

  it('leaves unrelated doors intact when a different cell becomes empty', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    drawSquare(2, 0);
    service.toggleDoorAt('vertical', 1, 0); // between (0,0) and (1,0)
    service.toggleDoorAt('vertical', 2, 0); // between (1,0) and (2,0)

    // Emptying (2,0) should only remove the door between (1,0) and (2,0).
    service.removeFragmentAt({ col: 2, row: 0 }, 0.5, 0.5);

    expect(service.hasDoorAt('vertical', 1, 0)).toBe(true);
    expect(service.hasDoorAt('vertical', 2, 0)).toBe(false);
    expect(service.getAllDoors().size).toBe(1);
  });

  it('clear() removes all doors along with all fragments', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    service.toggleDoorAt('vertical', 1, 0);

    service.clear();

    expect(service.getAllDoors().size).toBe(0);
    expect(service.getAllCells().size).toBe(0);
  });
});

describe('MapMakerStateService — hidden areas', () => {
  let service: MapMakerStateService;

  beforeEach(() => {
    localStorage.removeItem('map-maker.palette-colors');
    service = new MapMakerStateService();
  });

  function drawSquare(col: number, row: number): void {
    service.setShapeOption('square');
    service.placeFragment({ col, row }, 0.5, 0.5);
  }

  it('computeConnectedCells returns an empty set for an empty cell', () => {
    expect(service.computeConnectedCells({ col: 0, row: 0 }).size).toBe(0);
  });

  it('computeConnectedCells includes all orthogonally-adjacent non-empty cells', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    drawSquare(1, 1);

    const cells = service.computeConnectedCells({ col: 0, row: 0 });

    expect(cells).toEqual(new Set(['0,0', '1,0', '1,1']));
  });

  it('computeConnectedCells stops at empty cells', () => {
    drawSquare(0, 0);
    drawSquare(2, 0); // not adjacent, (1,0) stays empty

    const cells = service.computeConnectedCells({ col: 0, row: 0 });

    expect(cells).toEqual(new Set(['0,0']));
  });

  it('computeConnectedCells stops at a door, even though both sides are non-empty', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    service.toggleDoorAt('vertical', 1, 0);

    const cells = service.computeConnectedCells({ col: 0, row: 0 });

    expect(cells).toEqual(new Set(['0,0']));
  });

  it('toggleHiddenAreaAt creates a new hidden area covering the connected region, letter "A" first', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);

    service.toggleHiddenAreaAt({ col: 0, row: 0 });

    expect(service.hiddenAreas.length).toBe(1);
    const area = service.hiddenAreas[0];
    expect(area.letter).toBe('A');
    expect(area.name).toBe('A');
    expect(area.revealed).toBe(false);
    expect(new Set(area.cellKeys)).toEqual(new Set(['0,0', '1,0']));
  });

  it('toggleHiddenAreaAt is a no-op when clicking an empty cell not part of any area', () => {
    service.toggleHiddenAreaAt({ col: 0, row: 0 });
    expect(service.hiddenAreas.length).toBe(0);
  });

  it('toggleHiddenAreaAt removes the whole area when clicking a cell already inside one', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });
    expect(service.hiddenAreas.length).toBe(1);

    service.toggleHiddenAreaAt({ col: 1, row: 0 }); // any cell in the area un-hides it

    expect(service.hiddenAreas.length).toBe(0);
  });

  it('assigns the next free letter and reuses a freed letter', () => {
    drawSquare(0, 0);
    drawSquare(5, 5);
    drawSquare(9, 9);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });
    service.toggleHiddenAreaAt({ col: 5, row: 5 });
    expect(service.hiddenAreas.map(a => a.letter).sort()).toEqual(['A', 'B']);

    // Remove area "A" and create a new one — it should reuse letter "A".
    const areaA = service.hiddenAreas.find(a => a.letter === 'A')!;
    service.removeHiddenArea(areaA.id);
    service.toggleHiddenAreaAt({ col: 9, row: 9 });

    expect(service.hiddenAreas.map(a => a.letter).sort()).toEqual(['A', 'B']);
  });

  it('renameHiddenArea overrides the display name without affecting the letter', () => {
    drawSquare(0, 0);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });
    const area = service.hiddenAreas[0];

    service.renameHiddenArea(area.id, 'Throne Room');

    expect(service.hiddenAreas[0].name).toBe('Throne Room');
    expect(service.hiddenAreas[0].letter).toBe('A');
  });

  it('toggleHiddenAreaRevealed flips the revealed flag', () => {
    drawSquare(0, 0);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });
    const id = service.hiddenAreas[0].id;
    expect(service.hiddenAreas[0].revealed).toBe(false);

    service.toggleHiddenAreaRevealed(id);
    expect(service.hiddenAreas[0].revealed).toBe(true);

    service.toggleHiddenAreaRevealed(id);
    expect(service.hiddenAreas[0].revealed).toBe(false);
  });

  it('getHiddenAreaAt finds the area containing a given cell', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });

    expect(service.getHiddenAreaAt({ col: 1, row: 0 })?.letter).toBe('A');
    expect(service.getHiddenAreaAt({ col: 5, row: 5 })).toBeUndefined();
  });

  it('shrinks and eventually deletes a hidden area as its cells are individually erased', () => {
    drawSquare(0, 0);
    drawSquare(1, 0);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });
    expect(service.hiddenAreas.length).toBe(1);

    service.removeFragmentAt({ col: 1, row: 0 }, 0.5, 0.5);
    expect(service.hiddenAreas[0].cellKeys).toEqual(['0,0']);

    service.removeFragmentAt({ col: 0, row: 0 }, 0.5, 0.5);
    expect(service.hiddenAreas.length).toBe(0);
  });

  it('clear() removes all hidden areas', () => {
    drawSquare(0, 0);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });

    service.clear();

    expect(service.hiddenAreas.length).toBe(0);
  });
});

describe('MapMakerStateService — art assets', () => {
  let service: MapMakerStateService;

  beforeEach(() => {
    localStorage.removeItem('map-maker.palette-colors');
    service = new MapMakerStateService();
  });

  it('loads a non-empty art asset manifest, all under the 2minutetabletop category', () => {
    expect(service.artAssets.length).toBeGreaterThan(0);
    expect(service.getArtCategories()).toEqual(['2minutetabletop']);
    expect(service.artAssets.every(a => a.category === '2minutetabletop')).toBe(true);
  });

  it('derives each asset name from its file name, stripping the extension', () => {
    const asset = service.artAssets[0];
    expect(asset.name).not.toContain('.png');
    expect(asset.fileName.startsWith(asset.name)).toBe(true);
  });

  it('getArtAssets filters by case-insensitive name search', () => {
    const all = service.getArtAssets();
    const target = all.find(a => a.name.toLowerCase().includes('chair'))!;
    const filtered = service.getArtAssets({ search: 'CHAIR' });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered).toContain(target);
    expect(filtered.every(a => a.name.toLowerCase().includes('chair'))).toBe(true);
  });

  it('getArtAssets filters by category, returning nothing for an unknown category', () => {
    expect(service.getArtAssets({ category: '2minutetabletop' }).length).toBe(service.artAssets.length);
    expect(service.getArtAssets({ category: 'nonexistent-author' }).length).toBe(0);
  });

  it('getArtImage lazily creates and caches a single <img> element per file name', () => {
    const fileName = service.artAssets[0].fileName;
    const first = service.getArtImage(fileName);
    const second = service.getArtImage(fileName);
    expect(first).toBe(second);
    expect(first.src).toContain(encodeURI(fileName));
  });

  it('setSelectedArtAsset sets the pending-placement asset and can be cleared', () => {
    const fileName = service.artAssets[0].fileName;
    service.setSelectedArtAsset(fileName);
    expect(service.selectedArtAssetFileName).toBe(fileName);
    service.setSelectedArtAsset(null);
    expect(service.selectedArtAssetFileName).toBeNull();
  });

  it('addArt creates an element centered at the given point and selects it', () => {
    const fileName = service.artAssets[0].fileName;
    const art = service.addArt(fileName, 100, 200);

    expect(art.assetFileName).toBe(fileName);
    expect(art.centerX).toBe(100);
    expect(art.centerY).toBe(200);
    expect(art.rotation).toBe(0);
    expect(art.width).toBeGreaterThan(0);
    expect(art.height).toBeGreaterThan(0);
    expect(service.artElements).toEqual([art]);
    expect(service.selectedArtId).toBe(art.id);
  });

  it('getArt finds a placed element by id', () => {
    const art = service.addArt(service.artAssets[0].fileName, 0, 0);
    expect(service.getArt(art.id)).toEqual(art);
    expect(service.getArt('does-not-exist')).toBeUndefined();
  });

  it('setArtTransform overwrites the given fields (move/scale/rotate) and clamps size to a minimum', () => {
    const art = service.addArt(service.artAssets[0].fileName, 0, 0);

    service.setArtTransform(art.id, { centerX: 50, centerY: 60 });
    expect(service.getArt(art.id)).toEqual(jasmine.objectContaining({ centerX: 50, centerY: 60 }));

    service.setArtTransform(art.id, { width: 200, height: 100 });
    expect(service.getArt(art.id)).toEqual(jasmine.objectContaining({ width: 200, height: 100 }));

    service.setArtTransform(art.id, { rotation: Math.PI / 2 });
    expect(service.getArt(art.id)?.rotation).toBeCloseTo(Math.PI / 2);

    service.setArtTransform(art.id, { width: -50, height: -50 });
    const clamped = service.getArt(art.id)!;
    expect(clamped.width).toBeGreaterThan(0);
    expect(clamped.height).toBeGreaterThan(0);
  });

  it('removeArt deletes the element and clears selection if it was selected', () => {
    const art = service.addArt(service.artAssets[0].fileName, 0, 0);
    expect(service.selectedArtId).toBe(art.id);

    service.removeArt(art.id);

    expect(service.getArt(art.id)).toBeUndefined();
    expect(service.artElements.length).toBe(0);
    expect(service.selectedArtId).toBeNull();
  });

  it('setSelectedArt selects/deselects a placed element', () => {
    const art = service.addArt(service.artAssets[0].fileName, 0, 0);
    service.setSelectedArt(null);
    expect(service.selectedArtId).toBeNull();
    service.setSelectedArt(art.id);
    expect(service.selectedArtId).toBe(art.id);
  });

  it('setTool clears selectedArtId when leaving the art tool, but keeps the pending sidebar asset selection', () => {
    const art = service.addArt(service.artAssets[0].fileName, 0, 0);
    service.setSelectedArtAsset(service.artAssets[0].fileName);
    service.setTool('art');

    service.setTool('square');

    expect(service.selectedArtId).toBeNull();
    expect(service.selectedArtAssetFileName).toBe(service.artAssets[0].fileName);
  });

  it('clear() removes all art elements along with fragments and doors', () => {
    service.addArt(service.artAssets[0].fileName, 0, 0);
    service.clear();
    expect(service.artElements.length).toBe(0);
    expect(service.selectedArtId).toBeNull();
  });
});

describe('MapMakerStateService — Play mode and icons', () => {
  let service: MapMakerStateService;

  beforeEach(() => {
    service = new MapMakerStateService();
  });

  it('starts in design mode and can switch to play mode without clearing content', () => {
    expect(service.mode).toBe('design');
    service.setShapeOption('square');
    service.placeFragment({ col: 0, row: 0 }, 0.5, 0.5);

    service.setMode('play');

    expect(service.mode).toBe('play');
    expect(service.getAllCells().size).toBe(1);

    service.setMode('design');
    expect(service.mode).toBe('design');
    expect(service.getAllCells().size).toBe(1);
  });

  it('placePartyIcon places (or re-places) the single party icon', () => {
    service.placePartyIcon(10, 20, '#ff0000');
    expect(service.partyIcon).toEqual({ x: 10, y: 20, color: '#ff0000' });

    service.placePartyIcon(30, 40, '#00ff00');
    expect(service.partyIcon).toEqual({ x: 30, y: 40, color: '#00ff00' });
  });

  it('movePartyIcon moves an existing party icon and is a no-op if none exists', () => {
    service.movePartyIcon(5, 5);
    expect(service.partyIcon).toBeNull();

    service.placePartyIcon(0, 0, '#ff0000');
    service.movePartyIcon(15, 25);
    expect(service.partyIcon).toEqual({ x: 15, y: 25, color: '#ff0000' });
  });

  it('setPartyColor recolors an existing party icon and is a no-op if none exists', () => {
    service.setPartyColor('#0000ff');
    expect(service.partyIcon).toBeNull();

    service.placePartyIcon(0, 0, '#ff0000');
    service.setPartyColor('#0000ff');
    expect(service.partyIcon?.color).toBe('#0000ff');
  });

  it('splitPlayerIcon spawns a new player icon offset from the party icon', () => {
    service.placePartyIcon(100, 100, '#ff0000');
    const player = service.splitPlayerIcon('#00ff00', 'Alice');

    expect(service.playerIcons).toEqual([player]);
    expect(player.color).toBe('#00ff00');
    expect(player.name).toBe('Alice');
    expect(player.x).not.toBe(100);
    expect(player.y).not.toBe(100);
  });

  it('splitPlayerIcon falls back to a default position if no party icon exists yet', () => {
    const player = service.splitPlayerIcon('#00ff00');
    expect(service.playerIcons).toEqual([player]);
    expect(player.name).toBe('');
  });

  it('movePlayerIcon/setPlayerIconColor/setPlayerIconName update the matching icon only', () => {
    service.placePartyIcon(0, 0, '#ff0000');
    const a = service.splitPlayerIcon('#00ff00', 'Alice');
    const b = service.splitPlayerIcon('#0000ff', 'Bob');

    service.movePlayerIcon(a.id, 5, 6);
    service.setPlayerIconColor(a.id, '#ffff00');
    service.setPlayerIconName(a.id, 'Alicia');

    const updatedA = service.playerIcons.find(p => p.id === a.id)!;
    const untouchedB = service.playerIcons.find(p => p.id === b.id)!;
    expect(updatedA).toEqual(jasmine.objectContaining({ x: 5, y: 6, color: '#ffff00', name: 'Alicia' }));
    expect(untouchedB).toEqual(b);
  });

  it('removePlayerIcon removes only the matching icon', () => {
    service.placePartyIcon(0, 0, '#ff0000');
    const a = service.splitPlayerIcon('#00ff00', 'Alice');
    const b = service.splitPlayerIcon('#0000ff', 'Bob');

    service.removePlayerIcon(a.id);

    expect(service.playerIcons).toEqual([b]);
  });

  it('iconsChanged$ fires only for icon mutations, not for unrelated state changes', () => {
    let fireCount = 0;
    service.iconsChanged$.subscribe(() => fireCount++);

    service.setZoom(2);
    service.setPan({ x: 1, y: 1 });
    service.setShapeOption('square');
    service.placeFragment({ col: 0, row: 0 }, 0.5, 0.5);
    expect(fireCount).toBe(0);

    service.placePartyIcon(0, 0, '#ff0000');
    expect(fireCount).toBe(1);

    const player = service.splitPlayerIcon('#00ff00');
    expect(fireCount).toBe(2);

    service.movePlayerIcon(player.id, 1, 1);
    expect(fireCount).toBe(3);

    service.removePlayerIcon(player.id);
    expect(fireCount).toBe(4);
  });

  it('applyRemoteIcons overwrites icon state and emits changed$ but not iconsChanged$ (no echo loop)', () => {
    let changedCount = 0;
    let iconsChangedCount = 0;
    service.changed$.subscribe(() => changedCount++);
    service.iconsChanged$.subscribe(() => iconsChangedCount++);

    const party = { x: 1, y: 2, color: '#abcdef' };
    const players = [{ id: 'p1', x: 3, y: 4, color: '#123456', name: 'Remote' }];

    service.applyRemoteIcons(party, players);

    expect(service.partyIcon).toEqual(party);
    expect(service.playerIcons).toEqual(players);
    expect(changedCount).toBeGreaterThan(0);
    expect(iconsChangedCount).toBe(0);
  });

  it('setArmPartyPlacement arms/disarms placement mode', () => {
    expect(service.armPartyPlacement).toBe(false);
    service.setArmPartyPlacement(true);
    expect(service.armPartyPlacement).toBe(true);
    service.setArmPartyPlacement(false);
    expect(service.armPartyPlacement).toBe(false);
  });

  it('clear() resets mode and party/player icons', () => {
    service.setMode('play');
    service.placePartyIcon(0, 0, '#ff0000');
    service.splitPlayerIcon('#00ff00');
    service.setArmPartyPlacement(true);

    service.clear();

    expect(service.mode).toBe('design');
    expect(service.partyIcon).toBeNull();
    expect(service.playerIcons).toEqual([]);
    expect(service.armPartyPlacement).toBe(false);
  });

  it('getSnapshot()/applySnapshot() round-trips cells, doors, texts, art, and hidden areas', () => {
    service.setShapeOption('square');
    service.placeFragment({ col: 0, row: 0 }, 0.5, 0.5);
    service.placeFragment({ col: 1, row: 0 }, 0.5, 0.5);
    service.toggleDoorAt('vertical', 1, 0);
    service.addText(10, 20);
    service.addArt(service.artAssets[0].fileName, 5, 5);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });

    const snapshot = service.getSnapshot();

    const other = new MapMakerStateService();
    other.applySnapshot(snapshot);

    expect(other.getAllCells().size).toBe(service.getAllCells().size);
    expect(Array.from(other.getAllCells().keys()).sort()).toEqual(Array.from(service.getAllCells().keys()).sort());
    expect(other.getAllDoors().size).toBe(1);
    expect(other.texts.length).toBe(1);
    expect(other.texts[0].text).toBe(service.texts[0].text);
    expect(other.artElements.length).toBe(1);
    expect(other.artElements[0].assetFileName).toBe(service.artElements[0].assetFileName);
    expect(other.hiddenAreas.length).toBe(1);
    expect(other.hiddenAreas[0].letter).toBe('A');
    // A door already separates (0,0) from (1,0), so the designated area only covers (0,0).
    expect(new Set(other.hiddenAreas[0].cellKeys)).toEqual(new Set(['0,0']));
  });

  it('exportSaveData()/importSaveData() round-trips design data, play data, hidden areas, and color prefs', () => {
    service.dungeonName = 'My Dungeon';
    service.setShapeOption('square');
    service.placeFragment({ col: 0, row: 0 }, 0.5, 0.5);
    service.placeFragment({ col: 1, row: 0 }, 0.5, 0.5);
    service.toggleDoorAt('vertical', 1, 0);
    service.addText(10, 20);
    service.addArt(service.artAssets[0].fileName, 5, 5);
    service.toggleHiddenAreaAt({ col: 0, row: 0 });
    service.toggleHiddenAreaRevealed(service.hiddenAreas[0].id);
    service.setMode('play');
    service.placePartyIcon(3, 4, '#123456');
    service.splitPlayerIcon('#abcdef', 'Alice');
    service.setPaletteColor(0, '#111111');
    service.setColor('#111111');
    service.setPlayModeColor('#222222');

    const saved = service.exportSaveData();

    const other = new MapMakerStateService();
    other.importSaveData(saved);

    expect(other.dungeonName).toBe('My Dungeon');
    expect(other.getAllCells().size).toBe(2);
    expect(other.getAllDoors().size).toBe(1);
    expect(other.texts.length).toBe(1);
    expect(other.artElements.length).toBe(1);
    expect(other.hiddenAreas.length).toBe(1);
    expect(other.hiddenAreas[0].revealed).toBe(true);
    expect(other.partyIcon).toEqual({ x: 3, y: 4, color: '#123456' });
    expect(other.playerIcons.length).toBe(1);
    expect(other.playerIcons[0].name).toBe('Alice');
    expect(other.paletteColors[0]).toBe('#111111');
    expect(other.activeColor).toBe('#111111');
    expect(other.playModeColor).toBe('#222222');
    // Loading always lands back in Design mode, regardless of the mode active when saved.
    expect(other.mode).toBe('design');
  });

  it('importSaveData() tolerates missing optional fields (backward compatibility)', () => {
    const minimal = {
      version: 1,
      dungeonName: '',
      cells: [],
      doors: [],
      texts: [],
      artElements: [],
      partyIcon: null,
      playerIcons: [],
      paletteColors: [],
      activeColor: '',
      playModeColor: '',
    } as unknown as Parameters<MapMakerStateService['importSaveData']>[0];

    expect(() => service.importSaveData(minimal)).not.toThrow();
    expect(service.mode).toBe('design');
    expect(service.paletteColors).toEqual(DEFAULT_COLORS);
    expect(service.hiddenAreas).toEqual([]);
  });
});

describe('MapMakerSyncService', () => {
  let dmState: MapMakerStateService;
  let playerState: MapMakerStateService;
  let dmSync: MapMakerSyncService;
  let playerSync: MapMakerSyncService;

  beforeEach(() => {
    dmState = new MapMakerStateService();
    playerState = new MapMakerStateService();
  });

  afterEach(() => {
    dmSync?.close();
    playerSync?.close();
  });

  it('sends the full map snapshot and current icons to a player-view instance on connect', done => {
    dmState.setShapeOption('square');
    dmState.placeFragment({ col: 2, row: 2 }, 0.5, 0.5);
    dmState.placePartyIcon(10, 10, '#ff0000');

    dmSync = new MapMakerSyncService(dmState, 'dm');
    playerSync = new MapMakerSyncService(playerState, 'player');

    playerSync.fullStateReceived$.subscribe(() => {
      expect(playerState.getAllCells().size).toBe(1);
      expect(playerState.partyIcon).toEqual({ x: 10, y: 10, color: '#ff0000' });
      done();
    });
  });

  it('propagates icon moves made in one window to the other, without echoing back', done => {
    dmState.placePartyIcon(0, 0, '#ff0000');
    dmSync = new MapMakerSyncService(dmState, 'dm');
    playerSync = new MapMakerSyncService(playerState, 'player');

    playerSync.fullStateReceived$.subscribe(() => {
      // Player moves the party icon; the DM window should see the update.
      let dmIconsChangedCount = 0;
      dmState.iconsChanged$.subscribe(() => dmIconsChangedCount++);

      playerState.movePartyIcon(99, 100);

      setTimeout(() => {
        expect(dmState.partyIcon).toEqual({ x: 99, y: 100, color: '#ff0000' });
        // Applying the remote update must not itself re-fire iconsChanged$ on the DM side.
        expect(dmIconsChangedCount).toBe(0);
        done();
      }, 50);
    });
  });

  it('propagates a hidden-area reveal toggled on the DM side to the player-view, live during Play mode', done => {
    dmState.setShapeOption('square');
    dmState.placeFragment({ col: 0, row: 0 }, 0.5, 0.5);
    dmState.toggleHiddenAreaAt({ col: 0, row: 0 });
    const areaId = dmState.hiddenAreas[0].id;

    dmSync = new MapMakerSyncService(dmState, 'dm');
    playerSync = new MapMakerSyncService(playerState, 'player');

    playerSync.fullStateReceived$.subscribe(() => {
      expect(playerState.hiddenAreas[0].revealed).toBe(false);

      // DM reveals the area *after* the initial handshake, as would happen during Play mode.
      let playerHiddenAreasChangedCount = 0;
      playerState.hiddenAreasChanged$.subscribe(() => playerHiddenAreasChangedCount++);

      dmState.toggleHiddenAreaRevealed(areaId);

      setTimeout(() => {
        expect(playerState.hiddenAreas[0].revealed).toBe(true);
        // Applying the remote update must not itself re-fire hiddenAreasChanged$ on the player side.
        expect(playerHiddenAreasChangedCount).toBe(0);
        done();
      }, 50);
    });
  });
});

