import {AfterViewInit, Component, Input} from '@angular/core';
import * as L from 'leaflet';
import {LatLngExpression, Marker, Point} from "leaflet";
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private map: any;
  private markers: Marker[] = [];
  @Input() mapName!: string;
  @Input() markerDatas!: MarkerData[];
  @Input() poiDatas: PoiData[] = [];
  selectedPoi: PoiData | undefined;
  @Input('router-root') routerRoot!: string;

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.initializeMap();
    this.addMapImage();
    this.addMarkers();
  }

  private initializeMap() {
    this.map = L.map(this.mapName, {minZoom: 1, maxZoom: 4, wheelPxPerZoomLevel: 150}).setView([0, -100], 2);
    this.map.on('click', (event: any) => console.log(event.latlng.lat + ', ' + event.latlng.lng));
  }

  private addMarkers() {
    this.markerDatas.forEach(markerData =>
      this.createMarker(
        markerData.id,
        markerData.iconName,
        [markerData.locationX, markerData.locationY],
        markerData.popupText));
  }

  private addMapImage() {
    const leftTopX = -90;
    const leftTopY = -300;

    const imageUrl = 'assets/' + this.mapName + '.jpg';
    //X and Y are switched?
    const imageBounds: L.LatLngBoundsExpression = [[leftTopX, leftTopY], [leftTopX + 400, leftTopY + 400]];

    L.imageOverlay(imageUrl, imageBounds, {}).addTo(this.map);
  }

  private createMarker(id: number, iconName: string, location: LatLngExpression, popupText: string) {
    const icon = L.icon({
      iconUrl: 'assets/icons/' + iconName,
      iconSize: [40, 40]
    });

    const marker = L.marker(location, {icon: icon}).addTo(this.map);

    marker.bindPopup(popupText, {offset: new Point(0, -5), maxHeight: 20, autoClose: false});

    let options: any = marker.options;
    options['id'] = id;

    marker.on('click', e => this.changeSelectedPoi(e.target.options.id));

    this.markers.push(marker);
  }

  togglePopups() {
    this.markers.forEach(marker => marker.isPopupOpen() ? marker.closePopup() : marker.openPopup());
  }

  private changeSelectedPoi(id: number) {
    this.selectedPoi = this.poiDatas.find(poiData => poiData.id === id);
  }
}
