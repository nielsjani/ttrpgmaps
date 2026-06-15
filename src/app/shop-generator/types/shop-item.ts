import { ItemData } from './item-data';

export interface PriceBreakdown {
  magicRoll: number;    // The random dice roll component (in copper pieces)
  baseItemName: string; // Name of the base item (e.g. "Breastplate"), empty if none
  baseItemCost: number; // Value of the base item in copper pieces (0 if none)
}

export interface ShopItem {
  id: string;
  item: ItemData;
  calculatedPrice: number; // in copper pieces
  priceEditable: boolean;  // true for mundane items with no known value in the data
  priceBreakdown?: PriceBreakdown;
}
