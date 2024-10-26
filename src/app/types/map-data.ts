import {MarkerData} from "./MarkerData";
import {PoiData} from "./PoiData";
import {MapMetaData} from "./map-meta-data";

export interface MapData {
  getMapMetaData(): MapMetaData;
  getMarkerData(): MarkerData[];
  getPoiData(): PoiData[];
  getSubMap(markerId: string): MapData | undefined;
}
