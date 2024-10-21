import {Component, OnInit} from '@angular/core';
import {MarkerData} from "../types/MarkerData";

@Component({
  selector: 'app-sword-coast-leuven',
  templateUrl: './sword-coast-leuven.component.html',
  styleUrls: ['./sword-coast-leuven.component.scss']
})
export class SwordCoastLeuvenComponent implements OnInit{

  forgottenRealmsMarkers: MarkerData[] = [];

  ngOnInit(): void {
    this.forgottenRealmsMarkers = [
      new MarkerData(1, 'windmill.png', -72, -58, "Umbrage Hill"),
      new MarkerData(2, 'excavation.png', -78, -85, "Dwarven Excavation"),
      new MarkerData(3, 'mushroom.png', -74, -30, "Gnomengarde"),
      new MarkerData(4, 'woodcutter.png', 22, -90, "Logger's Camp"),
      new MarkerData(5, 'falcon.png', 12, -30, "Falcon?"),
      new MarkerData(6, 'cow-skeleton.png', -5, 55, "Butterskull Ranch"),
      new MarkerData(7, 'village.png', -11, 32, "Conyberry"),
      new MarkerData(8, 'village.png', -68.5, -71.5, "Phandalin"),

    ]
  }
}
