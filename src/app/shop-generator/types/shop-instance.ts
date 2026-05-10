import { RarityConfig } from './rarity-config';
import { ShopItem } from './shop-item';
import { ItemData } from './item-data';

export interface ShopInstance {
  id: string;
  name: string;
  edition: '2014' | '2024';
  selectedShopType: string;
  rarityConfigs: RarityConfig[];
  shopItems: ShopItem[];
  allItems: ItemData[];
  isGenerating: boolean;
  generated: boolean;
  errorMessage: string;
  selectedItemId: string | null;
  configCollapsed: boolean;
  excludeUnknownPrice: boolean;
  discount: number;
}

