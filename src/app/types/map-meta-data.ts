import {LatLngBoundsExpression, LatLngExpression} from "leaflet";

export class MapMetaData {
  constructor(
    public mapName: string,
    public imageBounds: LatLngBoundsExpression,
    public startingCenter: LatLngExpression = [-55, 10],
    public minZoom: number = 2,
    public maxZoom: number = 5,
    public pxlPerZoom: number = 150,
    public startingZoom: number = 3
  ) {
  }
}
