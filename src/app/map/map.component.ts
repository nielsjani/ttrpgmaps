import {AfterViewInit, Component, NgZone, OnInit} from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  private map: any;

  private initMap(): void {
    this.map = L.map('map', {minZoom: 2, maxZoom: 4}).setView([-70, -70], 3);

    // console.log(this.map._size.x);
    // console.log(this.map._size.y);

    const leftTopX = -90;
    const leftTopY = -300;

    const imageUrl = 'assets/map-sword-coast.jpg';
    //X and Y are switched?
    const imageBounds: L.LatLngBoundsExpression = [[leftTopX, leftTopY], [leftTopX + 400, leftTopY + 400]]; // Adjust these bounds to fit your image

    L.imageOverlay(imageUrl, imageBounds, {}).addTo(this.map);
  }

  constructor(private zone: NgZone) {
  }

  ngAfterViewInit(): void {
    // this.zone.runOutsideAngular(() => {
    this.initMap();
    // });
  }


}
