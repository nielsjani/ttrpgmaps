import {MapData} from "../types/map-data";
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";

export class PhandalinMapData implements MapData{
  getMapName(): string {
    return "map-phandalin";
  }

  getMarkerData(): MarkerData[] {
    return [];
  }

  getPoiData(): PoiData[] {
    return [];
  }

  getSubMap(markerId: string): MapData | undefined {
    return undefined;
  }

}
