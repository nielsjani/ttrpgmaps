import {AfterViewInit, Component, Input} from '@angular/core';
import * as L from 'leaflet';
import {LatLngExpression, Marker, Point} from "leaflet";
import {MarkerData} from "../types/MarkerData";

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private map: any;
  private markers: Marker[] = [];
  @Input() mapId!: string;
  @Input() markerDatas!: MarkerData[];

  private initMap(): void {
    this.map = L.map(this.mapId, {minZoom: 1, maxZoom: 4, wheelPxPerZoomLevel: 150}).setView([0, -100], 2);

    const leftTopX = -90;
    const leftTopY = -300;

    const imageUrl = 'assets/map-sword-coast.jpg';
    //X and Y are switched?
    const imageBounds: L.LatLngBoundsExpression = [[leftTopX, leftTopY], [leftTopX + 400, leftTopY + 400]];

    L.imageOverlay(imageUrl, imageBounds, {}).addTo(this.map);
    this.markerDatas.forEach(markerData =>
      this.createMarker(
        markerData.id,
        markerData.iconName,
        [markerData.locationX, markerData.locationY],
        markerData.popupText));

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

    marker.on('click', e => console.log(e));

    this.markers.push(marker);
  }

  togglePopups() {
    this.markers.forEach(marker => marker.isPopupOpen() ? marker.closePopup() : marker.openPopup());
  }

  ngAfterViewInit(): void {
    this.initMap();
  }


}
