import {AfterViewInit, Component, Input} from '@angular/core';
import * as L from 'leaflet';
import {LatLngExpression, Map, Marker, Point} from 'leaflet';
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";
import {MapMetaData} from "../types/map-meta-data";

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {

  private map: Map = undefined as any;
  private markers: Marker[] = [];
  selectedPoi: PoiData | undefined;

  @Input() mapMetaData!: MapMetaData;
  @Input() markerDatas!: MarkerData[];
  @Input() poiDatas: PoiData[] = [];
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
    this.map = L.map(this.mapMetaData.mapName, {minZoom: this.mapMetaData.minZoom, maxZoom: this.mapMetaData.maxZoom, wheelPxPerZoomLevel: this.mapMetaData.pxlPerZoom})
      .setView(this.mapMetaData.startingCenter, this.mapMetaData.startingZoom);
    this.map.on('click', (event: any) => {
      console.log(event.latlng.lat + ', ' + event.latlng.lng);
      this.getImageInfo();
    });
  }

  private getImageInfo() {
    const style = document.querySelector('.leaflet-overlay-pane')?.querySelector('img')?.style.cssText;
    const widthMatch = style?.match(/width:\s*([^;]+)/);
    const heightMatch = style?.match(/height:\s*([^;]+)/);

    const width = widthMatch ? widthMatch[1] : 'not found';
    const height = heightMatch ? heightMatch[1] : 'not found';

    console.log('Width:', width, 'Height:', height, 'Ratio:', parseFloat(width) / parseFloat(height));
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
    const imageUrl = 'assets/maps/' + this.mapMetaData.mapName;
    // left bottom, right top
    const imageBounds: L.LatLngBoundsExpression = this.mapMetaData.imageBounds;

    let imageOverlay = L.imageOverlay(imageUrl, imageBounds, {});
    imageOverlay.addTo(this.map);
  }

  private createMarker(id: number, iconName: string, location: LatLngExpression, popupText: string) {
    const icon = L.icon({
      iconUrl: 'assets/icons/' + iconName,
      iconSize: [50, 50]
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
