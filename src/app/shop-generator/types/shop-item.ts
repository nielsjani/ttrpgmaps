import { ItemData } from './item-data';

export interface ShopItem {
  id: string;
  item: ItemData;
  calculatedPrice: number; // in copper pieces
  priceEditable: boolean;  // true for mundane items with no known value in the data
}
