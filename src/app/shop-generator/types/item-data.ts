export interface ItemData {
  name: string;
  source: string;
  type?: string;
  rarity: string;
  value?: number; // in copper pieces
  entries?: any[];

  // Weapon fields
  weaponCategory?: string;
  property?: (string | { uid: string; note?: string })[];
  range?: string;
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  ammoType?: string;

  // Armor fields
  ac?: number;
  bonusAc?: string;
  strength?: string;
  armor?: boolean;
  stealth?: boolean;

  // Base item reference (e.g. "breastplate|phb")
  baseItem?: string;

  // Attunement
  reqAttune?: boolean | string;

  [key: string]: any;
}
