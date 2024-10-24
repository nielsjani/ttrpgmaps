import {Component, OnInit} from '@angular/core';
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";
import {ActivatedRoute} from "@angular/router";
import {MapDataService} from "../data/map-data.service";

@Component({
  selector: 'app-sword-coast-leuven',
  templateUrl: './sword-coast-leuven.component.html',
  styleUrls: ['./sword-coast-leuven.component.scss']
})
export class SwordCoastLeuvenComponent implements OnInit {

  forgottenRealmsMarkers: MarkerData[] = [];
  forgottenRealmsPoiDatas: PoiData[] = [];
  mapName: string = '';
  mapId: string = '';

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.mapId = this.route.snapshot.paramMap.get('mapId') || '';
    const mapData = this.getMapData();
    if (!mapData) {
      throw new Error(`Map data not found for id: ${this.mapId}`);
    }
    this.mapName = mapData.getMapName();
    this.forgottenRealmsMarkers = mapData.getMarkerData();
    this.forgottenRealmsPoiDatas = mapData.getPoiData();
  }

  private getMapData() {
    const subMapId = this.route.snapshot.paramMap.get('subMapId') || '';
    if (subMapId) {
      return new MapDataService().getSubMapData(this.mapId, subMapId);
    }
    return new MapDataService().getMapData(this.mapId);
  }
}
