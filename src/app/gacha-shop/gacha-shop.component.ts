import { Component } from '@angular/core';
import { GachaPrizeDefinition, GachaRarityInfo, GachaResult, PityRarity, Rarity } from './types/gacha-types';

const PULL_ONE_COST = 100;
const PULL_TEN_COST = 900;
const PITY_PULL_COUNT = 5;
const PITY_PULL_COST = 250;
const TOTAL_TRINKETS = 10000;
const INSERT_THRESHOLD = 10;
const CAPSULE_OPEN_ANIMATION_MS = 500;

/** Purely cosmetic capsule colour pairs — random per pull, unrelated to rarity, so a capsule gives no hint of what's inside. */
const CAPSULE_COLORS: { top: string; bottom: string }[] = [
  { top: '#e53935', bottom: '#ffffff' },
  { top: '#1e88e5', bottom: '#ffffff' },
  { top: '#fdd835', bottom: '#ffffff' },
  { top: '#43a047', bottom: '#ffffff' },
  { top: '#8e24aa', bottom: '#ffffff' },
  { top: '#fb8c00', bottom: '#ffffff' },
];

const RARITIES: GachaRarityInfo[] = [
  { rarity: 'common', label: 'Common', weight: 0.75, positionX: '0%', positionY: '0%' },
  { rarity: 'rare', label: 'Rare', weight: 0.22, positionX: '100%', positionY: '0%' },
  { rarity: 'mythic', label: 'Mythic', weight: 0.025, positionX: '0%', positionY: '100%' },
  { rarity: 'legendary', label: 'Legendary', weight: 0.005, positionX: '100%', positionY: '100%' },
];

const PRIZES: GachaPrizeDefinition[] = [
  //Str
  {
    id: 'cyclops',
    name: 'Keychain of the Cyclops',
    skill: 'Athletics',
    legendarySpecial: 'Once per day, change your Strength score to 30 before rolling for an Athletics check.',
    image: 'assets/gacha/cyclops_gacha.png',
  },
  //Dex
  {
    id: 'master-thief',
    name: 'Keychain of the Master Thief',
    skill: 'Sleight of Hand',
    legendarySpecial: 'Once per day after performing a successful Sleight of Hand check, become invisible for a number of minutes equal to your levels in full martial classes. Taking an offensive attack breaks the effect',
    image: 'assets/gacha/master_thief_gacha.png',
  },
  {
    id: 'couatl',
    name: 'Keychain of the Couatl',
    skill: 'Acrobatics',
    legendarySpecial: 'Once per day, change your Dexterity score to 30 before rolling for an Acrobatics check.',
    image: 'assets/gacha/couatl_gacha.png',
  },
  {
    id: 'invisible-stalker',
    name: 'Keychain of the Invisible Stalker',
    skill: 'Stealth',
    legendarySpecial: 'Once per day, roll a Stealth check and make the result count for up to 5 other creatures you can see. You can choose to use this ability after seeing the result of the roll.',
    image: 'assets/gacha/invisible_stalker_gacha.png',
  },
  // INT
  {
    id: 'lich',
    name: 'Keychain of the Lich',
    skill: 'Arcana',
    legendarySpecial: 'Once per day, cast a spell from any spell list. You still have to expend a spell slot and require the material components. You cannot use this ability during combat.',
    image: 'assets/gacha/lich_gacha.png',
  },
  {
    id: 'empyrean',
    name: 'Keychain of the Empyrean',
    skill: 'History',
    legendarySpecial: 'Once per session, after making a successful History check, ask the DM one yes-or-no question about the history of the subject and receive a truthful answer.',
    image: 'assets/gacha/empyrean_gacha.png',
  },
  {
    id: 'elder-brain',
    name: 'Keychain of the Elder Brain',
    skill: 'Investigation',
    legendarySpecial: 'Once per day, after making a successful Investigation check that exceeds the required DC by 5 or more, you can roll once on the Treasure Hoard table that is one tier lower than your current tier. (Only applicable on spatial investigation checks like finding hidden doors in a room)',
    image: 'assets/gacha/elder_brain_gacha.png',
  },
  {
    id: 'oblex',
    name: 'Keychain of the Oblex',
    skill: 'Nature',
    legendarySpecial: 'Once per day, after making a successful Nature check, absorb the memories of a plant or animal droppings you ingest, learning one true fact about events it has witnessed in the last year.',
    image: 'assets/gacha/oblex_gacha.png',
  },
  {
    id: 'androsphinx',
    name: 'Keychain of the Androsphinx',
    skill: 'Religion',
    legendarySpecial: 'Once per day, after making a successful Religion check, pose one question formulated as a Limerick or Haiku to a deity or its servants and receive a truthful, if cryptic, answer. Also, the weather changes to a status related to the deity you contacted. This change lasts until the end of the day.',
    image: 'assets/gacha/androsphinx_gacha.png',
  },
  //WIS
  {
    id: 'solar',
    name: 'Keychain of the Solar',
    skill: 'Perception',
    legendarySpecial: 'Once per day, if you would lose one of your senses (eg blinded or deafened), you ignore this effect.',
    image: 'assets/gacha/solar_gacha.png',
  },
  {
    id: 'rakshasa',
    name: 'Keychain of the Rakshasa',
    skill: 'Insight',
    legendarySpecial: 'Once per day, after making a successful Insight check against a creature, learn a way to get into good graces with the target.',
    image: 'assets/gacha/rakshasa_gacha.png',
  },
  {
    id: 'kolyarut',
    name: 'Keychain of the Kolyarut',
    skill: 'Survival',
    legendarySpecial: 'Once per day, know every place a target has been to and which routes they took within 1000 feet of you over the last year. You need a personal belonging or a piece of the target\'s body to activate this ability. This item is consumed upon activation',
    image: 'assets/gacha/kolyarut_gacha.png',
  },
  {
    id: 'animal-lord',
    name: 'Keychain of the Animal Lord',
    skill: 'Animal Handling',
    legendarySpecial: 'After a successful animal handling check, you can communicate with the creature using Common language. It understands you and you understand it.',
    image: 'assets/gacha/animal_lord_gacha.png',
  },
  {
    id: 'archpriest',
    name: 'Keychain of the Archpriest',
    skill: 'Medicine',
    legendarySpecial: 'When you stabilize an ally, you automatically grant them Hit Points equal to two of their hit dice plus one of your hit dice. These hit dice are then spent',
    image: 'assets/gacha/archpriest_gacha.png',
  },
  //CHA
  {
    id: 'succubus',
    name: 'Keychain of the Succubus',
    skill: 'Deception',
    legendarySpecial: 'Once per day, have an ally retry a failed Deception check using your Deception skill modifier.',
    image: 'assets/gacha/succubus_gacha.png',
  },
  {
    id: 'arch-hag',
    name: 'Keychain of the Arch Hag',
    skill: 'Persuasion',
    legendarySpecial: 'Once per day, you can try to persuade a target into doing you a favor. If they agree, the image in this keychain fades away. As soon as they have completed the favor, the image returns',
    image: 'assets/gacha/arch_hag_gacha.png',
  },
  {
    id: 'death-knight',
    name: 'Keychain of the Death Knight',
    skill: 'Intimidation',
    legendarySpecial: 'Once per day, after a successful Intimidation check, you can force the target to become frightened of you for 1 minute.',
    image: 'assets/gacha/death_knight_gacha.png',
  },
  {
    id: 'copper-dragon',
    name: 'Keychain of the Copper Dragon',
    skill: 'Performance',
    legendarySpecial: 'Once per day, after a successful Performance check that exceeds the required DC by 5 or more, roll twice on the Individual treasure Table and choose one result to keep. (Performance check needs to be properly role-played)',
    image: 'assets/gacha/copper_dragon_gacha.png',
  },
  //Saves
  {
    id: 'forcecage',
    name: 'Keychain of Forcecage',
    bonusType: 'savingThrow',
    skill: 'Charisma',
    legendarySpecial: 'Once per day, change the saving throw type of one your spells to Charisma. If you are unable to cast spells, you can reduce to armor class of a foe by an amount equal to the original value of this ability for a number of rounds equal to half your proficiency bonus rounded down',
    image: 'assets/gacha/forcecage_gacha.png',
  },
  {
    id: 'meteor-swarm',
    name: 'Keychain of the Meteor Swarm',
    bonusType: 'savingThrow',
    skill: 'Dexterity',
    legendarySpecial: 'Once per day, change the saving throw type of one your spells to Dexterity. If you are unable to cast spells, you can reduce to armor class of a foe by an amount equal to the original value of this ability for a number of rounds equal to half your proficiency bonus rounded down',
    image: 'assets/gacha/meteor_swarm_gacha.png',
  },
  {
    id: 'psychic-scream',
    name: 'Keychain of the Psychic Scream',
    bonusType: 'savingThrow',
    skill: 'Intelligence',
    legendarySpecial: 'Once per day, change the saving throw type of one your spells to Intelligence. If you are unable to cast spells, you can reduce to armor class of a foe by an amount equal to the original value of this ability for a number of rounds equal to half your proficiency bonus rounded down',
    image: 'assets/gacha/psychic_scream_gacha.png',
  },
  {
    id: 'ravenous-void',
    name: 'Keychain of the Ravenous Void',
    bonusType: 'savingThrow',
    skill: 'Strength',
    legendarySpecial: 'Once per day, change the saving throw type of one your spells to Strength. If you are unable to cast spells, you can reduce to armor class of a foe by an amount equal to the original value of this ability for a number of rounds equal to half your proficiency bonus rounded down',
    image: 'assets/gacha/ravenous_void_gacha.png',
  },
  {
    id: 'storm-of-vengeance',
    name: 'Keychain of the Storm of Vengeance',
    bonusType: 'savingThrow',
    skill: 'Constitution',
    legendarySpecial: 'Once per day, change the saving throw type of one your spells to Constitution. If you are unable to cast spells, you can reduce to armor class of a foe by an amount equal to the original value of this ability for a number of rounds equal to half your proficiency bonus rounded down',
    image: 'assets/gacha/storm_of_vengeance_gacha.png',
  },
  {
    id: 'weird',
    name: 'Keychain of Weird',
    bonusType: 'savingThrow',
    skill: 'Wisdom',
    legendarySpecial: 'Once per day, change the saving throw type of one your spells to Wisdom. If you are unable to cast spells, you can reduce to armor class of a foe by an amount equal to the original value of this ability for a number of rounds equal to half your proficiency bonus rounded down',
    image: 'assets/gacha/weird_gacha.png',
  },
];

@Component({
  selector: 'app-gacha-shop',
  templateUrl: './gacha-shop.component.html',
  styleUrls: ['./gacha-shop.component.scss']
})
export class GachaShopComponent {

  readonly shopName = 'Gretchen\'s Trinkets';
  readonly category = 'gacha - keychains';
  readonly pullOneCost = PULL_ONE_COST;
  readonly pullTenCost = PULL_TEN_COST;
  readonly pityPullCount = PITY_PULL_COUNT;
  readonly pityPullCost = PITY_PULL_COST;
  readonly insertThreshold = INSERT_THRESHOLD;
  readonly prizes = PRIZES;
  readonly pityRarityKeys: PityRarity[] = ['common', 'rare', 'mythic'];

  lastResults: GachaResult[] = [];
  selectedResult: GachaResult | null = null;

  /** All prizes currently owned (most recent first) that haven't been fed back into the machine. */
  inventory: GachaResult[] = [];

  /** Progress (0-9) towards the next pity threshold for each insertable rarity. */
  insertCounts: Record<PityRarity, number> = { common: 0, rare: 0, mythic: 0 };

  /** Whether the rarity-odds boost unlocked by a given rarity's pity threshold is active. Only applies to Pity Pulls. */
  boostUnlocked: Record<PityRarity, boolean> = { common: false, rare: false, mythic: false };

  /** Number of pity rewards waiting for the player to pick a guaranteed prize type. */
  pendingGuaranteeChoices = 0;

  /** Queue of prize ids already chosen; each entry guarantees the type of one upcoming Pity Pull (not regular pulls). */
  guaranteeQueue: string[] = [];

  /** Number of discounted Pity Pull (5 pulls / 250g) uses available. */
  pityPullCharges = 0;

  private idCounter = 0;

  pullOne(): void {
    this.pull(1, false);
  }

  pullTen(): void {
    this.pull(10, false);
  }

  pityPull(): void {
    if (this.pityPullCharges <= 0) {
      return;
    }
    this.pityPullCharges--;
    this.pull(PITY_PULL_COUNT, true);
  }

  /** Cracks open a capsule; the prize is revealed once the opening animation finishes. */
  openCapsule(result: GachaResult): void {
    if (result.opened || result.isOpening) {
      return;
    }
    result.isOpening = true;
    setTimeout(() => {
      result.isOpening = false;
      result.opened = true;
    }, CAPSULE_OPEN_ANIMATION_MS);
  }

  selectResult(result: GachaResult): void {
    if (!result.opened) {
      return;
    }
    this.selectedResult = result;
  }

  closeDetail(): void {
    this.selectedResult = null;
  }

  /** Feeds a prize of the given rarity into the machine towards its pity threshold. Assumes the player has an effectively unlimited supply of prizes to trade in. */
  insertIntoPity(key: PityRarity): void {
    this.insertCounts[key]++;
    if (this.insertCounts[key] >= INSERT_THRESHOLD) {
      this.insertCounts[key] -= INSERT_THRESHOLD;
      this.boostUnlocked[key] = true;
      this.pendingGuaranteeChoices++;
      this.pityPullCharges++;
    }
  }

  /** Player picks which prize type will be the sole result of their next Pity Pull. */
  chooseGuaranteedPrize(prizeId: string): void {
    if (this.pendingGuaranteeChoices <= 0) {
      return;
    }
    this.pendingGuaranteeChoices--;
    this.guaranteeQueue.push(prizeId);
  }

  isNewPull(result: GachaResult): boolean {
    return this.lastResults.some(r => r.id === result.id);
  }

  guaranteedPrizeNames(): string {
    return this.guaranteeQueue
      .map(id => PRIZES.find(p => p.id === id)?.name ?? id)
      .join(', ');
  }

  pityLabel(key: PityRarity): string {
    return RARITIES.find(r => r.rarity === key)!.label;
  }

  pityBoostDescription(key: PityRarity): string {
    switch (key) {
      case 'common': return 'Rare+ odds x2 on Pity Pulls';
      case 'rare': return 'Mythic+ odds x3 on Pity Pulls';
      case 'mythic': return 'Legendary odds x4 on Pity Pulls';
    }
  }

  /** Builds the flavour/effect paragraphs shown for the selected prize, based on its rarity. */
  getEffectParagraphs(result: GachaResult): string[] {
    const skill = result.prize.skill;
    const isSavingThrow = result.prize.bonusType === 'savingThrow';
    const attunementLine = 'Requires attunement. This uses your gacha-attunement slot, which is different from your standard attunement slots. You only have 1 gacha attunement slot.';
    const mythicLine = isSavingThrow
      ? `You become proficient in ${skill} saving throws. If you are already proficient, add half your proficiency bonus rounded down to this saving throw.`
      : `You become proficient in ${skill}. If you are already proficient in this skill, you gain expertise in this skill. If you already have expertise in this skill, add half your proficiency bonus rounded down to this skill.`;

    switch (result.rarity) {
      case 'common':
        return [`Enjoy this unique trinket handmade by Gretchen Hapon. ${result.serialNumber}`];

      case 'rare':
        return [
          attunementLine,
          isSavingThrow
            ? `This item increases your ${skill} saving throw by half your proficiency bonus, rounded down.`
            : `This item increases your ${skill} skill by half your proficiency bonus, rounded down.`,
        ];

      case 'mythic':
        return [attunementLine, mythicLine];

      case 'legendary':
        return [attunementLine, mythicLine, result.prize.legendarySpecial];

      default:
        return [];
    }
  }

  private pull(count: number, isPityPull: boolean): void {
    const forcedPrizeId = isPityPull && this.guaranteeQueue.length ? this.guaranteeQueue.shift()! : null;
    const weights = isPityPull ? this.getEffectiveWeights() : this.getBaseWeights();

    const results: GachaResult[] = [];
    for (let i = 0; i < count; i++) {
      const rarity = this.rollRarity(weights);
      const prize = forcedPrizeId
        ? PRIZES.find(p => p.id === forcedPrizeId)!
        : PRIZES[Math.floor(Math.random() * PRIZES.length)];
      results.push({
        id: `prize-${++this.idCounter}`,
        prize,
        rarity: rarity.rarity,
        rarityLabel: rarity.label,
        image: prize.image,
        backgroundPosition: `${rarity.positionX} ${rarity.positionY}`,
        serialNumber: rarity.rarity === 'common' ? this.rollSerialNumber() : undefined,
        opened: false,
        isOpening: false,
        capsuleTopColor: this.rollCapsuleColors().top,
        capsuleBottomColor: this.rollCapsuleColors().bottom,
      });
    }
    this.lastResults = results;
    this.inventory = [...results, ...this.inventory];
    this.selectedResult = null;
  }

  private rollCapsuleColors(): { top: string; bottom: string } {
    return CAPSULE_COLORS[Math.floor(Math.random() * CAPSULE_COLORS.length)];
  }

  /**
   * The plain, un-boosted rarity odds used for normal Pull x1 / Pull x10 actions.
   */
  private getBaseWeights(): Record<Rarity, number> {
    const weights = {} as Record<Rarity, number>;
    for (const rarity of RARITIES) {
      weights[rarity.rarity] = rarity.weight;
    }
    return weights;
  }

  /**
   * Computes the pity-adjusted rarity weights used only for Pity Pulls. Each unlocked pity boost
   * multiplies the odds of every rarity above the rarity that was fed in: commons double
   * rare-and-up, rares triple mythic-and-up, mythics quadruple legendary. Common absorbs whatever
   * probability is left over so the weights always sum to 1.
   */
  private getEffectiveWeights(): Record<Rarity, number> {
    let rare = RARITIES.find(r => r.rarity === 'rare')!.weight;
    let mythic = RARITIES.find(r => r.rarity === 'mythic')!.weight;
    let legendary = RARITIES.find(r => r.rarity === 'legendary')!.weight;

    if (this.boostUnlocked.common) {
      rare *= 2;
      mythic *= 2;
      legendary *= 2;
    }
    if (this.boostUnlocked.rare) {
      mythic *= 3;
      legendary *= 3;
    }
    if (this.boostUnlocked.mythic) {
      legendary *= 4;
    }

    const common = Math.max(0, 1 - (rare + mythic + legendary));
    return { common, rare, mythic, legendary };
  }

  private rollRarity(weights: Record<Rarity, number>): GachaRarityInfo {
    const roll = Math.random();
    let cumulative = 0;
    for (const rarity of RARITIES) {
      cumulative += weights[rarity.rarity];
      if (roll < cumulative) {
        return rarity;
      }
    }
    return RARITIES[RARITIES.length - 1];
  }

  private rollSerialNumber(): string {
    const number = 1 + Math.floor(Math.random() * TOTAL_TRINKETS);
    return `${number.toLocaleString('de-DE')}/${TOTAL_TRINKETS.toLocaleString('de-DE')}`;
  }
}
