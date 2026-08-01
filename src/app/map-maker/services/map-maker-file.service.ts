import { Injectable } from '@angular/core';
import { MapMakerSaveData } from '../models/map-save-data';

const CURRENT_VERSION = 1;
const DEFAULT_FILE_NAME = 'dungeon-map';

/**
 * Small, DOM-free helper for Story 6 (Save and load): turns a
 * `MapMakerSaveData` payload into/from JSON text, and derives a safe
 * download file name from the user-provided dungeon name. Kept free of
 * `Blob`/anchor-download/`FileReader` calls so it can be unit-tested
 * without mocking browser download machinery — `MapMakerComponent` owns
 * the actual DOM side effects (triggering the download, reading the
 * picked file).
 */
@Injectable()
export class MapMakerFileService {
  /** Wraps the payload in a versioned envelope and pretty-prints it to JSON text. */
  serialize(data: MapMakerSaveData): string {
    return JSON.stringify({ version: CURRENT_VERSION, data }, null, 2);
  }

  /**
   * Parses previously-serialized JSON text back into a `MapMakerSaveData`.
   * Throws a plain `Error` with a user-presentable message if the text
   * isn't valid JSON or doesn't look like a dungeon-builder save file, so
   * the caller can catch it and show a friendly alert.
   */
  deserialize(json: string): MapMakerSaveData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('This file is not valid JSON.');
    }
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
      throw new Error('This file does not look like a dungeon-builder save file.');
    }
    const envelope = parsed as { version?: unknown; data?: unknown };
    const data = envelope.data as Partial<MapMakerSaveData> | undefined;
    if (!data || typeof data !== 'object' || !Array.isArray(data.cells)) {
      throw new Error('This file does not look like a dungeon-builder save file.');
    }
    return {
      version: 1,
      dungeonName: typeof data.dungeonName === 'string' ? data.dungeonName : '',
      cells: data.cells ?? [],
      doors: Array.isArray(data.doors) ? data.doors : [],
      texts: Array.isArray(data.texts) ? data.texts : [],
      artElements: Array.isArray(data.artElements) ? data.artElements : [],
      partyIcon: data.partyIcon ?? null,
      playerIcons: Array.isArray(data.playerIcons) ? data.playerIcons : [],
      paletteColors: Array.isArray(data.paletteColors) ? data.paletteColors : [],
      activeColor: typeof data.activeColor === 'string' ? data.activeColor : '',
      playModeColor: typeof data.playModeColor === 'string' ? data.playModeColor : '',
    };
  }

  /**
   * Derives the download file name from a dungeon name: spaces become
   * underscores, then any remaining non-alphanumeric/underscore character
   * is stripped out. Falls back to `dungeon-map.json` if the name is
   * blank or contains nothing but stripped characters.
   */
  fileNameFor(dungeonName: string): string {
    const sanitized = dungeonName
      .trim()
      .replace(/ /g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    return `${sanitized || DEFAULT_FILE_NAME}.json`;
  }
}
