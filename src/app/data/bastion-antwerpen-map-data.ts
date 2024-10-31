import {MapData} from "../types/map-data";
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";
import {MapMetaData} from "../types/map-meta-data";
import {MarkerCategory} from "../types/marker-category";

export class BastionAntwerpenMapData implements MapData {

  private subMaps = new Map<string, MapData>([
    // ['phandalin', new PhandalinMapData()]
  ]);

  getMarkerData(): MarkerData[] {
    return [
      // Rosmerta
      new MarkerData(1001, 'city-medieval.png', -10.14, -10.39, "Torrefaction"),
      new MarkerData(1002, 'town-medieval.png', -30.81, -16.74, "Undercroft Refuge"),
      new MarkerData(1003, 'town-medieval.png', -1.26, -23.24, "Gaultham"),
      new MarkerData(1004, 'town-medieval.png', -15.81, -3.74, "Ceteford"),
      new MarkerData(1005, 'ruin.png', -8.82, -18.83, "Red Tomb"),
      new MarkerData(1006, 'landmark.png', -34.71, -14.46, "Walls of Serenity"),
      new MarkerData(1007, 'landmark.png', -5.27, -19.43, "Lake of Life", MarkerCategory.LANDMARK),
      new MarkerData(1008, 'landmark.png', -28.56, -16.13, "Narder Forest", MarkerCategory.LANDMARK),
      new MarkerData(1009, 'giant-tree.png', -16.46, -21.18, "Crystal caves"),
      new MarkerData(1010, 'signpost.png', -45.03, -2.67, "Valley of Rosmerta", MarkerCategory.REGION),
      new MarkerData(1011, 'walled-city-medieval.png', -39.27, 39.00, "Barkfield"),
      //Hill-lands
      new MarkerData(2001, 'signpost.png', -5.70, 23.17, "Hill-Lands", MarkerCategory.REGION),
      new MarkerData(2002, 'temple.png', -7.51, 12.83, "Temple of Taranis"),
      //Lammasu's Regret
      new MarkerData(3001, 'signpost.png', 26.19, -2.82, "Lammasu's Regret", MarkerCategory.REGION),
      //Bog-King's Grounds
      new MarkerData(4001, 'signpost.png', -24.58, 76.72, "Bog-King's Grounds", MarkerCategory.REGION),
      new MarkerData(4002, 'city-medieval.png', -57.97, 98.06, "Sendall"),
      new MarkerData(4003, 'landmark.png', -18.72, 106.25, "Lymdall Woods", MarkerCategory.LANDMARK),
      //Domain of Sendris
      new MarkerData(5001, 'signpost.png', -71.00, 93.66, "Domain of Sendris", MarkerCategory.REGION),
      new MarkerData(6001, 'signpost.png', 40.36, -10.47, "The Battlefield", MarkerCategory.REGION),
      //Serrated Edge
      new MarkerData(7001, 'signpost.png', -43.79, -61.35, "The Serrated Edge", MarkerCategory.REGION),
      new MarkerData(7002, 'landmark.png', -6.97, -74.36, "The Twins (N)", MarkerCategory.LANDMARK),
      new MarkerData(7003, 'landmark.png', -59.61, -73.49, "The Twins (S)", MarkerCategory.LANDMARK),
      //Dvergar States
      new MarkerData(8001, 'signpost.png', -58.49, -16.02, "Dvergar States", MarkerCategory.LANDMARK),
      new MarkerData(8002, 'walled-city-medieval.png', -65.25, -32.01, "Bastion"),
      //Fissures
      new MarkerData(9001, 'signpost.png', -69.90, 53.75, "Fissures", MarkerCategory.REGION),
      new MarkerData(9002, 'magic-building.png', -73.74, 44.73, "Veneficus Erudio"),
      //Sea of Mist
      new MarkerData(10001, 'signpost.png', -77.91, 14.94, "Sea of Mist", MarkerCategory.REGION),
    ];
  }

  getPoiData(): PoiData[] {
    return [
      // new PoiData(1, "Umbrage Hill", "Umbrage Hill got its name after two feuding dwarf clans fought a pitched battle atop it. The cause of their umbrage is a tale lost to time, and only the cairns of the dead now remain. The stone windmill on the hill is a later addition, but is still more than a hundred years old.\n" +
      //   "\n" +
      //   "Adabra Gwynn, a midwife and apothecary devoted to Chauntea (goddess of agriculture), resides here."),
      // new PoiData(2, "Dwarven Excavation", `
      //                                               <p>
      //                                               Dazlyn Grayshard and Norbus Ironrune are shield dwarf prospectors and business partners.
      //                                               While looking for gold in the mountains southwest of Phandalin, they decided to explore a nearby canyon and found evidence of an ancient dwarven settlement buried by an avalanche.
      //                                               They’ve spent the past several months clearing the rubble and scouring the ruins for treasure, but have found nothing of value so far.
      //                                               </p>`),
      // new PoiData(3, "Gnomengarde", `<p>
      //                                                   The caves of Gnomengarde are carved into the base of a mountain southeast of Phandalin, around a narrow waterfall.
      //                                                   The rock gnome wizards who occupy these caves form strategic alliances with their human and dwarf neighbors as needs warrant.
      //                                                   Reclusive and secretive, the gnomes craft minor magic items and useful, nonmagical inventions to pass the time.
      //                                                   In these endeavors, their failures outnumber their successes.
      //                                                   They seldom stray far from home, subsisting largely on the mushrooms that grow on misty islands outside their caves.
      //                                                   </p>`),
      // new PoiData(4, "Logger's Camp", `<p>
      //                                             Years after the eruption of Mount Hotenow, the city of Neverwinter continues to rebuild itself after the destruction wrought by that event.
      //                                             Loggers have set up camps along the river that flows out of Neverwinter Wood, using the river to transport logs to the city.
      //                                             </p>`),
      // new PoiData(5, "Falcon?", "<p>The mysterious hunter known as Falcon has a home somewhere in Neverwinter Woods. They say anyone with a bottle of wine is welcome to stay the night.</p>"),
      // new PoiData(6, "Butterskull Ranch",
      //   `<p>Alfonse Kalazorn used to be the sheriff of Triboar, a town to the east, where he was known as Big Al Kalazorn.
      //                 He retired a decade ago, but retirement didn’t sit well with him.
      //                 Looking for a new challenge, he claimed a plot of fertile land five miles east of Conyberry and turned it into a cattle and horse ranch.
      //                  Later, he added a pig farm, chicken coops, vegetable gardens, corn fields, and an apple orchard.
      //                  Most of his money comes from the sale of butter skulls — lumps of butter cleverly molded into the shapes of humanoid skulls.
      //                  He sells his butter skulls primarily in towns to the east, although a few make their way to Barthen’s Provisions in Phandalin.</p>`),
      // new PoiData(7, "Conyberry", "<p>The Triboar Trail runs right through this abandoned town, which was sacked by barbarians years ago and now lies in ruins.</p>"),
      // new PoiData(8, "Phandalin", `
      // <p>The frontier town of <b>Phandalin</b> is built on the ruins of a much older settlement.
      // Hundreds of years ago, the old Phandalin was a thriving human town whose people were firmly allied with neighboring dwarves and gnomes.
      // Then an orc horde swept through the area and laid waste to the settlement, and Phandalin was abandoned for centuries.</p>
      //
      // <p>
      // In the last three or four years, settlers from the cities of Neverwinter and Waterdeep have begun the hard work of reclaiming the ruins of Phandalin.
      // The new settlement is home now to farmers, woodcutters, fur traders, and prospectors drawn by stories of gold and platinum in the foothills of the Sword Mountains.
      // </p>
      // `, "phandalin")
    ];
  }

  getSubMap(submapId: string): MapData | undefined {
    let mapData = this.subMaps.get(submapId);
    if (!mapData) {
      throw new Error(`Submap data not found for id: ${submapId}`);
    }
    return mapData;
  }

  getMapMetaData(): MapMetaData {
    return new MapMetaData("map-bastion.png",
      [[-80, -80], [44, 109]],
      [-7.87, -19.52],
      3,
      8,
      20,
      4);
  }

}
