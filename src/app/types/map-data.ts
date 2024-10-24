import {MarkerData} from "./MarkerData";
import {PoiData} from "./PoiData";

export interface MapData {
  getMapName(): string;
  getMarkerData(): MarkerData[];
  getPoiData(): PoiData[];
  getSubMap(markerId: string): MapData | undefined;
}
