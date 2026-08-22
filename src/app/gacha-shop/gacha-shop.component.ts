import { Component } from '@angular/core';
import { GachaPrizeDefinition, GachaRarityInfo, GachaResult } from './types/gacha-types';

const PULL_ONE_COST = 100;
const PULL_TEN_COST = 900;
const TOTAL_TRINKETS = 10000;

const RARITIES: GachaRarityInfo[] = [
  { rarity: 'common', label: 'Common', weight: 0.75, positionX: '0%', positionY: '0%' },
  { rarity: 'rare', label: 'Rare', weight: 0.22, positionX: '100%', positionY: '0%' },
  { rarity: 'mythic', label: 'Mythic', weight: 0.025, positionX: '0%', positionY: '100%' },
  { rarity: 'legendary', label: 'Legendary', weight: 0.005, positionX: '100%', positionY: '100%' },
];

const PRIZES: GachaPrizeDefinition[] = [
  {
    id: 'cyclops',
    name: 'Keychain of the Cyclops',
    skill: 'Athletics',
    legendarySpecial: 'Once per day, change your strength score to 30 before rolling for an Athletics check.',
    image: 'assets/gacha/cyclops_gacha.png',
  },
  {
    id: 'master-thief',
    name: 'Keychain of the Master Thief',
    skill: 'Sleight of Hand',
    legendarySpecial: 'Once per day after performing a successful Sleight of Hand check, become invisible for a number of minutes equal to your levels in full martial classes.',
    image: 'assets/gacha/master_thief_gacha.png',
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

  lastResults: GachaResult[] = [];
  selectedResult: GachaResult | null = null;

  pullOne(): void {
    this.pull(1);
  }

  pullTen(): void {
    this.pull(10);
  }

  selectResult(result: GachaResult): void {
    this.selectedResult = result;
  }

  closeDetail(): void {
    this.selectedResult = null;
  }

  /** Builds the flavour/effect paragraphs shown for the selected prize, based on its rarity. */
  getEffectParagraphs(result: GachaResult): string[] {
    const skill = result.prize.skill;

    switch (result.rarity) {
      case 'common':
        return [`Enjoy this unique trinket handmade by Gretchen Hapon. ${result.serialNumber}`];

      case 'rare':
        return [
          'Requires attunement. This uses your gacha-attunement slot, which is different from your standard attunement slots. You only have 1 gacha attunement slot.',
          `This item increases your ${skill} skill by half your proficiency bonus, rounded down.`,
        ];

      case 'mythic':
        return [
          'Requires attunement. This uses your gacha-attunement slot, which is different from your standard attunement slots. You only have 1 gacha attunement slot.',
          `You become proficient in ${skill}. If you are already proficient in this skill, you gain expertise in this skill. If you already have expertise in this skill, add half your proficiency bonus rounded down to this skill.`,
        ];

      case 'legendary':
        return [
          'Requires attunement. This uses your gacha-attunement slot, which is different from your standard attunement slots. You only have 1 gacha attunement slot.',
          `You become proficient in ${skill}. If you are already proficient in this skill, you gain expertise in this skill. If you already have expertise in this skill, add half your proficiency bonus rounded down to this skill.`,
          result.prize.legendarySpecial,
        ];

      default:
        return [];
    }
  }

  private pull(count: number): void {
    const results: GachaResult[] = [];
    for (let i = 0; i < count; i++) {
      const rarity = this.rollRarity();
      const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
      results.push({
        prize,
        rarity: rarity.rarity,
        rarityLabel: rarity.label,
        image: prize.image,
        backgroundPosition: `${rarity.positionX} ${rarity.positionY}`,
        serialNumber: rarity.rarity === 'common' ? this.rollSerialNumber() : undefined,
      });
    }
    this.lastResults = results;
    this.selectedResult = null;
  }

  private rollRarity(): GachaRarityInfo {
    const roll = Math.random();
    let cumulative = 0;
    for (const rarity of RARITIES) {
      cumulative += rarity.weight;
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
