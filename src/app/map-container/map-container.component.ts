import {Component, OnInit} from '@angular/core';
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";
import {ActivatedRoute} from "@angular/router";
import {MapDataService} from "../data/map-data.service";
import {MapMetaData} from "../types/map-meta-data";

@Component({
  selector: 'app-map-container',
  templateUrl: './map-container.component.html',
  styleUrls: ['./map-container.component.scss']
})
export class MapContainerComponent implements OnInit {

  mapMarkers: MarkerData[] = [];
  mapPoiDatas: PoiData[] = [];
  mapMetaData: MapMetaData = undefined as any;
  mapId: string = '';

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    //opletten met deze subscribe die nooit unsubscribed
    this.route.paramMap.subscribe(params => {
      const newMapId = params.get('mapId') || '';
      this.hardReloadOnMapChange(newMapId);
      this.mapId = newMapId;
      const mapData = this.getMapData();
      if (!mapData) {
        throw new Error(`Map data not found for id: ${this.mapId}`);
      }
      this.mapMetaData = mapData.getMapMetaData();
      this.mapMarkers = mapData.getMarkerData();
      this.mapPoiDatas = mapData.getPoiData();
    });
  }

  private hardReloadOnMapChange(newMapId: string) {
    if (this.mapId && this.mapId !== newMapId) {
      window.location.reload();
    }
  }

  private getMapData() {
    const subMapId = this.route.snapshot.paramMap.get('subMapId') || '';
    if (subMapId) {
      return new MapDataService().getSubMapData(this.mapId, subMapId);
    }
    return new MapDataService().getMapData(this.mapId);
  }
}
