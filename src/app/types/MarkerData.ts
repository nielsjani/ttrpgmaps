import {MarkerCategory} from "./marker-category";

export class MarkerData {

  constructor(
    public id: number,
    public iconName: string,
    public locationX: number,
    public locationY: number,
    public popupText: string,
    public category: MarkerCategory = MarkerCategory.NONE
  ) {
  }
}
