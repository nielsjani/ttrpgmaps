import {Component, OnInit} from '@angular/core';
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";

@Component({
  selector: 'app-sword-coast-leuven',
  templateUrl: './sword-coast-leuven.component.html',
  styleUrls: ['./sword-coast-leuven.component.scss']
})
export class SwordCoastLeuvenComponent implements OnInit {

  forgottenRealmsMarkers: MarkerData[] = [];
  forgottenRealmsPoiDatas: PoiData[] = [];

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
    ];

    this.forgottenRealmsPoiDatas = [
      new PoiData(1, "Umbrage Hill", "Umbrage Hill got its name after two feuding dwarf clans fought a pitched battle atop it. The cause of their umbrage is a tale lost to time, and only the cairns of the dead now remain. The stone windmill on the hill is a later addition, but is still more than a hundred years old.\n" +
        "\n" +
        "Adabra Gwynn, a midwife and apothecary devoted to Chauntea (goddess of agriculture), resides here."),
      new PoiData(2, "Dwarven Excavation", "The dwarves of Clan Battlehammer have been working this excavation for over a year. They are looking for the lost tomb of a long-dead king, and believe they are close to finding it. The excavation is overseen by Tharden Rockseeker, a cousin of Gundren Rockseeker."),
      new PoiData(3, "Gnomengarde", "Gnomengarde is a hidden village of rock gnomes. The gnomes are secretive and reclusive, but friendly to those who treat them with respect. The village is led by the wise gnome Eldon Quickwhistle."),
      new PoiData(4, "Logger's Camp", "This camp is home to a dozen or so loggers who work for the Phandalin Miner's Exchange. They are a rough and rowdy bunch, but are friendly enough."),
      new PoiData(5, "Falcon?", "A falcon has been spotted in the area. It seems to be watching the characters."),
      new PoiData(6, "Butterskull Ranch", "This ranch was once a thriving homestead, but has fallen on hard times. The owner, a retired adventurer named Daran Edermath, has been plagued by bad luck and misfortune. The ranch is named after a cow skull that hangs over the front gate."),
      new PoiData(7, "Conyberry", "Conyberry is a ruined village that was abandoned long ago. It is said to be haunted by the ghosts of its former inhabitants."),
      new PoiData(8, "Phandalin", "Phandalin is a small frontier town located at the eastern edge of the Sword Coast. It is a rough-and-tumble place, full of miners, prospectors, and other fortune-seekers. The town is governed by a council of wealthy landowners, who are constantly at odds with each other.", "phandalin")
    ];
  }
}
