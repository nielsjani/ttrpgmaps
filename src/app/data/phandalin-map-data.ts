import {MapData} from "../types/map-data";
import {MarkerData} from "../types/MarkerData";
import {PoiData} from "../types/PoiData";
import {MapMetaData} from "../types/map-meta-data";

export class PhandalinMapData implements MapData {
  getMarkerData(): MarkerData[] {
    return [new MarkerData(1, 'person.png', -66.70, -13.71, 'Miner\'s Exchange'),
      new MarkerData(2, 'person.png', -60.15, 26.01, 'Harbin Wester\'s Home'),
      new MarkerData(3, 'person.png', -56.46, 5.97, 'Townmaster\'s Hall'),
      new MarkerData(4, 'person.png', -46.98, 10.36, 'Stonehill Inn'),
      new MarkerData(5, 'person.png', -33.94, 26.36, 'Barthen\'s Provisions'),
      new MarkerData(6, 'person.png', -57.60, -9.68, 'Lionshield Coster'),
      new MarkerData(7, 'person.png', -48.69, -2.28, 'Shrine of Luck'),
    ];
  }

  getPoiData(): PoiData[] {
    return [
      new PoiData(1, 'Miner\'s Exchange', `
                      <p>Miners come here to have their valuable finds weighed, measured, and paid out.
                      The exchange also serves as an unofficial records office, registering claims to various streams and excavations around the area.
                      Enough wealth is hidden in the nearby streams and valleys to support a good number of independent prospectors.
                      </p>
                      <p>
                      The exchange is a great place to meet people who spend a lot of time out and about in the countryside surrounding Phandalin. The guildmaster is a calculating human woman named Halia Thornton.
                      </p>`),
      new PoiData(3, 'Townmaster\'s Hall', `
                      <p>The townmaster’s hall has sturdy stone walls, a pitched wooden roof, and a bell tower at the back. The job board next to the front door features a sparse number of notices, all written in Common and in the same hand. </p>
                     `),
      new PoiData(4, 'Stonehill Inn', `
                      <p>This modest, two-story roadhouse has six rooms for rent on the upper floor.
                      A bed for the night costs 5 sp, while a meal costs 1 sp.
                      The proprietor is a short, friendly male human named Toblen Stonehill.
                      Toblen is a native of the town of Triboar to the east.
                      He came to Phandalin to prospect, but soon realized that he knew a lot more about running an inn than he did about mining.
                      </p>
                     `),
      new PoiData(5, 'Barthen\'s Provisions', `
                      <p>The shelves of this general store stock most ordinary goods and supplies, including backpacks, bedrolls, rope, and rations.
                      Barthen’s doesn’t stock weapons or armor. Anyone in need of those items are directed to the Lionshield Coster.</p>
                     `),
      new PoiData(6, 'Lionshield Coster', `
                      <p><i>Hanging above the front door of this modest trading post is a sign shaped like a wooden shield with a blue lion painted on it.</i></p>
                      <p>This building is owned by the Lionshields, a merchant company based in the city of Yartar over a hundred miles to the east.
                      The company ships finished goods to Phandalin and other small settlements throughout the region.
                      The master of the Phandalin post is a sharp-tongued human woman of thirty-five named Linene Graywind.
                      Linene keeps a supply of armor and weapons, all of which are for sale to interested buyers. </p>
                     `),
      new PoiData(7, 'Shrine of Luck', `
                      <p>Phandalin’s only temple is a shrine made of stones taken from the nearby ruins.
                      It is dedicated to Tymora (goddess of luck and good fortune) and is in the care of a zealous elf acolyte named Sister Garaele. </p>
                     `)
    ];
  }

  getSubMap(markerId: string): MapData | undefined {
    return undefined;
  }

  getMapMetaData(): MapMetaData {
    //1.39534883721

    return new MapMetaData("map-phandalin", [[-80, -80], [3.75, 120]], [-53.32, 24.24], 2, 4, 150, 3);
  }

}
