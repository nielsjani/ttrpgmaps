import {MapData} from "../types/map-data";
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";

export class PhandalinMapData implements MapData {
  getMapName(): string {
    return "map-phandalin";
  }

  getMarkerData(): MarkerData[] {
    return [new MarkerData(1, 'person.png', -49.11336131891053, -167.26177032404442, 'Miner\'s Exchange'),];
  }

  getPoiData(): PoiData[] {
    return [
      new PoiData(1, 'Miner\'s Exchange', `
                      <p>Miners come here to have their valuable finds weighed, measured, and paid out.
                      The exchange also serves as an unofficial records office, registering claims to various streams and excavations around the area.
                      Enough wealth is hidden in the nearby streams and valleys to support a good number of independent prospectors.
                      </p>
                      <p>
                      The exchange is a great place to meet people who spend a lot of time out and about in the countryside surrounding Phandalin. The guildmaster is a calculating human woman named Halia Thornton.
                      </p>`)
    ];
  }

  getSubMap(markerId: string): MapData | undefined {
    return undefined;
  }

}
