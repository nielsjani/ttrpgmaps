import { MapMakerStateService, DEFAULT_COLORS } from './map-maker-state.service';

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
