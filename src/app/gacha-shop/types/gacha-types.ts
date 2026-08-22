export type Rarity = 'common' | 'rare' | 'mythic' | 'legendary';

export interface GachaPrizeDefinition {
  id: string;
  name: string;
  /** The skill granted/boosted by rare and higher rarities of this prize. */
  skill: string;
  /** Extra special ability text granted only at legendary rarity. */
  legendarySpecial: string;
  /** Sprite sheet with 4 quadrants: common (top-left), rare (top-right), mythic (bottom-left), legendary (bottom-right). */
  image: string;
}

export interface GachaRarityInfo {
  rarity: Rarity;
  label: string;
  /** Probability of landing this rarity, expressed as a fraction (0-1). */
  weight: number;
  positionX: '0%' | '100%';
  positionY: '0%' | '100%';
}

export interface GachaResult {
  prize: GachaPrizeDefinition;
  rarity: Rarity;
  rarityLabel: string;
  image: string;
  backgroundPosition: string;
  /** Only set for common-rarity results: the trinket's serial number, e.g. "4213/10.000". */
  serialNumber?: string;
}
