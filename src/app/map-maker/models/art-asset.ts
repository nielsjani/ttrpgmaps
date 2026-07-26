/** A raw manifest row (as authored in art-asset-data.ts): just enough to derive an ArtAsset. */
export interface ArtAssetManifestEntry {
  fileName: string;
  category: string;
}

/**
 * A browsable art asset in the sidebar's Art tool panel. `id` is the file
 * name itself (stable, unique, and human-inspectable), `name` is derived
 * from the file name with its extension stripped (per the story: "the
 * names of the assets in the dropdown are the same as the filenames").
 * `category` doubles as the "author" facet mentioned in the story for a
 * future filter — today every imported asset shares the single category
 * `"2minutetabletop"`.
 */
export interface ArtAsset {
  id: string;
  name: string;
  fileName: string;
  category: string;
}

/** Strips a trailing file extension (e.g. ".png") from a file name for display. */
function stripExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

/** Builds the full ArtAsset list from the raw manifest entries. */
export function buildArtAssets(entries: ArtAssetManifestEntry[]): ArtAsset[] {
  return entries.map(entry => ({
    id: entry.fileName,
    name: stripExtension(entry.fileName),
    fileName: entry.fileName,
    category: entry.category,
  }));
}

/** The relative asset path (under src/assets) for a given art asset, using its category as the folder name (assets are organized as one folder per category/author). */
export function artAssetPath(category: string, fileName: string): string {
  return `assets/map-maker/art/${category}/${fileName}`;
}
