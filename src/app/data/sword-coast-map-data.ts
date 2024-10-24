import {MapData} from "../types/map-data";
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";
import {PhandalinMapData} from "./phandalin-map-data";

export class SwordCoastMapData implements MapData {

  private subMaps = new Map<string, MapData>([
    ['phandalin', new PhandalinMapData()]
  ]);

  getMarkerData(): MarkerData[] {
    return [
      new MarkerData(1, 'windmill.png', -72, -58, "Umbrage Hill"),
      new MarkerData(2, 'excavation.png', -78, -85, "Dwarven Excavation"),
      new MarkerData(3, 'mushroom.png', -74, -30, "Gnomengarde"),
      new MarkerData(4, 'woodcutter.png', 22, -90, "Logger's Camp"),
      new MarkerData(5, 'falcon.png', 12, -30, "Falcon?"),
      new MarkerData(6, 'cow-skeleton.png', -5, 55, "Butterskull Ranch"),
      new MarkerData(7, 'village.png', -11, 32, "Conyberry"),
      new MarkerData(8, 'village.png', -68.5, -71.5, "Phandalin"),
    ];
  }

  getPoiData(): PoiData[] {
    return [
      new PoiData(1, "Umbrage Hill", "Umbrage Hill got its name after two feuding dwarf clans fought a pitched battle atop it. The cause of their umbrage is a tale lost to time, and only the cairns of the dead now remain. The stone windmill on the hill is a later addition, but is still more than a hundred years old.\n" +
        "\n" +
        "Adabra Gwynn, a midwife and apothecary devoted to Chauntea (goddess of agriculture), resides here."),
      new PoiData(2, "Dwarven Excavation", `
                                                    <p>
                                                    Dazlyn Grayshard and Norbus Ironrune are shield dwarf prospectors and business partners.
                                                    While looking for gold in the mountains southwest of Phandalin, they decided to explore a nearby canyon and found evidence of an ancient dwarven settlement buried by an avalanche.
                                                    They’ve spent the past several months clearing the rubble and scouring the ruins for treasure, but have found nothing of value so far.
                                                    </p>`),
      new PoiData(3, "Gnomengarde", `<p>
                                                        The caves of Gnomengarde are carved into the base of a mountain southeast of Phandalin, around a narrow waterfall.
                                                        The rock gnome wizards who occupy these caves form strategic alliances with their human and dwarf neighbors as needs warrant.
                                                        Reclusive and secretive, the gnomes craft minor magic items and useful, nonmagical inventions to pass the time.
                                                        In these endeavors, their failures outnumber their successes.
                                                        They seldom stray far from home, subsisting largely on the mushrooms that grow on misty islands outside their caves.
                                                        </p>`),
      new PoiData(4, "Logger's Camp", `<p>
                                                  Years after the eruption of Mount Hotenow, the city of Neverwinter continues to rebuild itself after the destruction wrought by that event.
                                                  Loggers have set up camps along the river that flows out of Neverwinter Wood, using the river to transport logs to the city.
                                                  </p>`),
      new PoiData(5, "Falcon?", "<p>The mysterious hunter known as Falcon has a home somewhere in Neverwinter Woods. They say anyone with a bottle of wine is welcome to stay the night.</p>"),
      new PoiData(6, "Butterskull Ranch",
        `<p>Alfonse Kalazorn used to be the sheriff of Triboar, a town to the east, where he was known as Big Al Kalazorn.
                      He retired a decade ago, but retirement didn’t sit well with him.
                      Looking for a new challenge, he claimed a plot of fertile land five miles east of Conyberry and turned it into a cattle and horse ranch.
                       Later, he added a pig farm, chicken coops, vegetable gardens, corn fields, and an apple orchard.
                       Most of his money comes from the sale of butter skulls — lumps of butter cleverly molded into the shapes of humanoid skulls.
                       He sells his butter skulls primarily in towns to the east, although a few make their way to Barthen’s Provisions in Phandalin.</p>`),
      new PoiData(7, "Conyberry", "<p>The Triboar Trail runs right through this abandoned town, which was sacked by barbarians years ago and now lies in ruins.</p>"),
      new PoiData(8, "Phandalin", `
      <p>The frontier town of <b>Phandalin</b> is built on the ruins of a much older settlement.
      Hundreds of years ago, the old Phandalin was a thriving human town whose people were firmly allied with neighboring dwarves and gnomes.
      Then an orc horde swept through the area and laid waste to the settlement, and Phandalin was abandoned for centuries.</p>

      <p>
      In the last three or four years, settlers from the cities of Neverwinter and Waterdeep have begun the hard work of reclaiming the ruins of Phandalin.
      The new settlement is home now to farmers, woodcutters, fur traders, and prospectors drawn by stories of gold and platinum in the foothills of the Sword Mountains.
      </p>
      `, "phandalin")
    ];
  }

  getSubMap(submapId: string): MapData | undefined {
    let mapData = this.subMaps.get(submapId);
    if(!mapData) {
      throw new Error(`Submap data not found for id: ${submapId}`);
    }
    return mapData;
  }

  getMapName(): string {
    return "map-sword-coast";
  }

}
