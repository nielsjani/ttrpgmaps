export type Rarity = 'common' | 'rare' | 'mythic' | 'legendary';

/** Rarities that can be fed back into the machine for the pity system (legendary is the top tier, so it can't be). */
export type PityRarity = 'common' | 'rare' | 'mythic';

/** Whether a prize's rare+ rarities boost a skill or a saving throw. */
export type GachaBonusType = 'skill' | 'savingThrow';

export interface GachaPrizeDefinition {
  id: string;
  name: string;
  /** Whether `skill` names a skill or a saving throw. Defaults to 'skill' when omitted. */
  bonusType?: GachaBonusType;
  /** The skill or saving throw granted/boosted by rare and higher rarities of this prize. */
  skill: string;
  /** Overrides the generic rare-tier flavour text when this prize has a unique rare effect. */
  rareSpecial?: string;
  /** Overrides the generic mythic-tier flavour text when this prize has a unique mythic effect. */
  mythicSpecial?: string;
  /** Extra special ability text granted only at legendary rarity. */
  legendarySpecial: string;
  /** Sprite sheet with 4 quadrants: common (top-left), rare (top-right), mythic (bottom-left), legendary (bottom-right). */
  image: string;
}

export interface GachaRarityInfo {
  rarity: Rarity;
  label: string;
  /** Base probability of landing this rarity (before pity boosts), expressed as a fraction (0-1). */
  weight: number;
  positionX: '0%' | '100%';
  positionY: '0%' | '100%';
}

export interface GachaResult {
  id: string;
  prize: GachaPrizeDefinition;
  rarity: Rarity;
  rarityLabel: string;
  image: string;
  backgroundPosition: string;
  /** Only set for common-rarity results: the trinket's serial number, e.g. "4213/10.000". */
  serialNumber?: string;
  /** Whether the player has cracked open the gacha capsule to reveal this prize yet. */
  opened: boolean;
  /** True while the capsule-opening animation is playing. */
  isOpening: boolean;
  /** Cosmetic capsule colours, unrelated to rarity, so the capsule gives no hint of what's inside. */
  capsuleTopColor: string;
  capsuleBottomColor: string;
}
