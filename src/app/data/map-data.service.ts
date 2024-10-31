import {SwordCoastMapData} from "./sword-coast-map-data";
import {MapData} from "../types/map-data";
import {BastionAntwerpenMapData} from "./bastion-antwerpen-map-data";

export class MapDataService {

  mapDatas = new Map<string, MapData>([
    ["sword-coast-leuven", new SwordCoastMapData()],
    ["bastion-antwerpen", new BastionAntwerpenMapData()]
  ]);

  getMapData(mapId: string): MapData {
    const mapData = this.mapDatas.get(mapId);
    if (!mapData) {
      throw new Error(`Map data not found for id: ${mapId}`);
    }
    return mapData;
  }

  getSubMapData(mapId: string, subMapId: string) {
    return this.getMapData(mapId).getSubMap(subMapId);
  }
}
