import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { PriceBreakdown } from '../types/shop-item';

interface ItemPriceEntry {
  basePrice: number;
  modifier: number;
  randomNumberMax: number;
}

interface ItemPrices {
  [rarity: string]: ItemPriceEntry;
}

@Injectable({ providedIn: 'root' })
export class PriceCalculatorService {
  private prices: ItemPrices | null = null;

  constructor(private http: HttpClient) {}

  loadPrices(): Observable<ItemPrices> {
    return this.http.get<ItemPrices>('assets/data/items/item-prices.json').pipe(
      tap(data => (this.prices = data))
    );
  }

  /**
   * Parses a dice expression like "1D20+10" or "1D6-3".
   * Rolls numDice dice of dieSize sides, sums them, applies modifier. Min 0.
   */
  rollDiceExpression(expr: string): number {
    const match = expr.match(/^(\d+)[Dd](\d+)([+-]\d+)?$/);
    if (!match) return 0;
    const numDice = parseInt(match[1], 10);
    const dieSize = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * dieSize) + 1;
    }
    return Math.max(0, total + modifier);
  }

  /**
   * Calculates price in copper pieces.
   * Mundane (rarity="none"): uses the item's own value field.
   * Magic rarities: roll (modifier)d(randomNumberMax), sum, multiply by basePrice.
   *   e.g. uncommon = 3d6 * 5000 cp
   */
  calculatePrice(rarity: string, itemValue?: number): number {
    const normalised = (rarity ?? '').toLowerCase().trim();
    if (normalised === 'none' || normalised === '') {
      return itemValue ?? 0;
    }
    if (!this.prices) return itemValue ?? 0;
    const priceData = this.prices[normalised];
    if (!priceData) return itemValue ?? 0;
    let roll = 0;
    for (let i = 0; i < priceData.modifier; i++) {
      roll += Math.floor(Math.random() * priceData.randomNumberMax) + 1;
    }
    return priceData.basePrice * roll;
  }

  /**
   * Calculates price with a full breakdown, including an optional base item cost.
   * Mundane items return the item value with no magic roll.
   * Magic items: total = magicRoll + baseItemCost.
   */
  calculatePriceWithBreakdown(
    rarity: string,
    baseItemCost: number = 0,
    baseItemName: string = '',
    itemValue?: number
  ): { total: number; breakdown: PriceBreakdown } {
    const normalised = (rarity ?? '').toLowerCase().trim();
    if (normalised === 'none' || normalised === '') {
      const total = itemValue ?? 0;
      return {
        total,
        breakdown: { magicRoll: total, baseItemCost: 0, baseItemName: '' }
      };
    }
    if (!this.prices) {
      return {
        total: baseItemCost,
        breakdown: { magicRoll: 0, baseItemCost, baseItemName }
      };
    }
    const priceData = this.prices[normalised];
    if (!priceData) {
      return {
        total: baseItemCost,
        breakdown: { magicRoll: 0, baseItemCost, baseItemName }
      };
    }
    let roll = 0;
    for (let i = 0; i < priceData.modifier; i++) {
      roll += Math.floor(Math.random() * priceData.randomNumberMax) + 1;
    }
    const magicRoll = priceData.basePrice * roll;
    return {
      total: magicRoll + baseItemCost,
      breakdown: { magicRoll, baseItemCost, baseItemName }
    };
  }

  /** Formats a copper piece amount as a readable gp/sp/cp string. */
  formatPrice(cp: number): string {
    if (cp === 0) return '—';
    const gp = Math.floor(cp / 100);
    const sp = Math.floor((cp % 100) / 10);
    const rem = cp % 10;
    if (gp > 0 && sp === 0 && rem === 0) return `${gp} gp`;
    if (gp > 0 && rem === 0) return `${gp} gp ${sp} sp`;
    if (gp > 0) return `${gp} gp ${sp} sp ${rem} cp`;
    if (sp > 0 && rem === 0) return `${sp} sp`;
    if (sp > 0) return `${sp} sp ${rem} cp`;
    return `${rem} cp`;
  }

}
