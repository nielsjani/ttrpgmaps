import {
  MapMakerStateService,
  DEFAULT_COLORS,
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_TEXT_FONT_SIZE,
  MIN_TEXT_FONT_SIZE,
  MAX_TEXT_FONT_SIZE,
} from './map-maker-state.service';

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

