export interface StarfinderEntry {
  name: string;
  cr: string;
  crValue: number;
  type: string;
  environment: string;
  slug: string;
}

export interface AbilityScores {
  str: string; dex: string; con: string;
  int: string; wis: string; cha: string;
}

export interface SpecialAbility {
  name: string;
  description: string;
}

export interface StarfinderDetail {
  name: string;
  source_url?: string;
  source?: string;
  cr?: string;
  crValue?: number;
  xp?: string;
  alignment?: string;
  size?: string;
  creature_type?: string;
  type?: string;
  category?: string;
  init?: string;
  senses?: string;
  perception?: string;
  hp?: string;
  eac?: string;
  kac?: string;
  fort?: string;
  ref?: string;
  will?: string;
  dr?: string;
  sr?: string;
  immunities?: string;
  resistances?: string;
  weaknesses?: string;
  speed?: string;
  melee?: string;
  ranged?: string;
  space?: string;
  reach?: string;
  offensive_abilities?: string;
  spell_like_abilities?: { caster_info: string; spells: string } | string;
  spells?: string;
  ability_scores?: AbilityScores;
  skills?: string;
  feats?: string;
  languages?: string;
  other_abilities?: string;
  gear?: string;
  environment?: string;
  organization?: string;
  special_abilities?: SpecialAbility[];
  description?: string;
  extra_content?: string;
  imageUrl?: string;
}

export interface UniversalMonsterRule {
  name: string;
  source_url?: string;
  source?: string;
  ability_type?: string;   // Ex | Su | Sp
  description?: string;
  slug?: string;           // derived client-side
}

export interface TemplateGraft {
  name: string;
  slug?: string;           // derived client-side
  family: string;          // URL Family param value (e.g. "Class", "Dragon (Chromatic)")
  category: string;        // one of the 7 main categories
  source?: string;         // e.g. "Alien Archive pg. 132"
  source_url?: string;     // link to this graft's page on aonsrd.com
  book_url?: string;       // link to the source book on paizo.com
  description?: string;    // raw HTML of the graft content
}
