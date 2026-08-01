import { MapMakerFileService } from './map-maker-file.service';
import { MapMakerSaveData } from '../models/map-save-data';

describe('MapMakerFileService', () => {
  let service: MapMakerFileService;

  const sample: MapMakerSaveData = {
    version: 1,
    dungeonName: 'My Dungeon',
    cells: [['0,0', [{ shape: 'full', color: '#ff0000' }]]],
    doors: [{ orientation: 'vertical', col: 1, row: 0, hidden: false, revealed: false }],
    texts: [],
    artElements: [],
    hiddenAreas: [{ id: 'hidden-area-1', letter: 'A', name: 'A', cellKeys: ['0,0'], revealed: false }],
    partyIcon: null,
    playerIcons: [],
    paletteColors: ['#ffffff'],
    activeColor: '#ffffff',
    playModeColor: '#ffffff',
  };

  beforeEach(() => {
    service = new MapMakerFileService();
  });

  it('serialize()/deserialize() round-trips a save payload', () => {
    const json = service.serialize(sample);
    const restored = service.deserialize(json);
    expect(restored).toEqual(sample);
  });

  it('deserialize() throws a friendly error on malformed JSON', () => {
    expect(() => service.deserialize('not json{')).toThrowError('This file is not valid JSON.');
  });

  it('deserialize() throws a friendly error on valid JSON that is not a save file', () => {
    expect(() => service.deserialize(JSON.stringify({ foo: 'bar' }))).toThrowError(
      'This file does not look like a dungeon-builder save file.'
    );
    expect(() => service.deserialize(JSON.stringify({ version: 1, data: { foo: 'bar' } }))).toThrowError(
      'This file does not look like a dungeon-builder save file.'
    );
  });

  it('deserialize() tolerates missing optional fields', () => {
    const restored = service.deserialize(JSON.stringify({ version: 1, data: { cells: [] } }));
    expect(restored.dungeonName).toBe('');
    expect(restored.doors).toEqual([]);
    expect(restored.playerIcons).toEqual([]);
    expect(restored.partyIcon).toBeNull();
    expect(restored.hiddenAreas).toEqual([]);
  });

  describe('fileNameFor()', () => {
    it('replaces spaces with underscores', () => {
      expect(service.fileNameFor('My Dungeon')).toBe('My_Dungeon.json');
    });

    it('strips non-alphanumeric characters (other than underscores)', () => {
      expect(service.fileNameFor('My Dungeon!')).toBe('My_Dungeon.json');
      expect(service.fileNameFor('Caf\u00e9 #3')).toBe('Caf_3.json');
    });

    it('falls back to a default name when blank or fully stripped', () => {
      expect(service.fileNameFor('')).toBe('dungeon-map.json');
      expect(service.fileNameFor('   ')).toBe('dungeon-map.json');
      expect(service.fileNameFor('!!!')).toBe('dungeon-map.json');
    });
  });
});
