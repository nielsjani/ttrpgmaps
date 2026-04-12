export interface ItemData {
  name: string;
  source: string;
  type: string;
  rarity: string;
  value?: number; // in copper pieces
  entries?: any[];
  [key: string]: any;
}
