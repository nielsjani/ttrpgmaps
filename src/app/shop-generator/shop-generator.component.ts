import { Component, OnInit } from '@angular/core';
import { ShopDataService, ShopType, BookTitles } from './services/shop-data.service';
import { PriceCalculatorService } from './services/price-calculator.service';
import { ItemData } from './types/item-data';
import { ShopItem } from './types/shop-item';
import { RarityConfig } from './types/rarity-config';

@Component({
  selector: 'app-shop-generator',
  templateUrl: './shop-generator.component.html',
  styleUrls: ['./shop-generator.component.scss']
})
export class ShopGeneratorComponent implements OnInit {
  edition: '2014' | '2024' = '2014';
  selectedShopType: string = 'all-adventuring-gear';
  shopTypes: ShopType[] = [];

  readonly HALF_PRICE_SHOPS = ['all-potions', 'all-poisons-and-explosives', 'all-scrolls'];

  rarityConfigs: RarityConfig[] = [
    { rarity: 'none',      label: 'Mundane',   count: 0, enabled: true, defaultExpression: '1D20+10' },
    { rarity: 'uncommon',  label: 'Uncommon',  count: 0, enabled: true, defaultExpression: '1D12+6'  },
    { rarity: 'rare',      label: 'Rare',      count: 0, enabled: true, defaultExpression: '1D6-3'   },
    { rarity: 'very rare', label: 'Very Rare', count: 0, enabled: true, defaultExpression: '1D4-2'   },
    { rarity: 'legendary', label: 'Legendary', count: 0, enabled: true, defaultExpression: '1D4-3'   },
  ];

  shopItems: ShopItem[] = [];
  allItems: ItemData[] = [];
  isGenerating: boolean = false;
  generated: boolean = false;
  errorMessage: string = '';
  bookTitles: BookTitles = {};

  private idCounter = 0;

  selectedItemId: string | null = null;

  constructor(
    public shopDataService: ShopDataService,
    private priceCalc: PriceCalculatorService
  ) {}

  ngOnInit(): void {
    this.shopTypes = this.shopDataService.shopTypes;
    this.priceCalc.loadPrices().subscribe();
    this.shopDataService.getBookTitles().subscribe(titles => this.bookTitles = titles);
  }

  onRarityConfigChange(event: { rarity: string; count: number; enabled: boolean }): void {
    const cfg = this.rarityConfigs.find(r => r.rarity === event.rarity);
    if (cfg) {
      cfg.count = event.count;
      cfg.enabled = event.enabled;
    }
  }

  generateShop(): void {
    this.isGenerating = true;
    this.errorMessage = '';
    this.shopDataService.getItems(this.edition, this.selectedShopType).subscribe({
      next: (items) => {
        this.allItems = items;
        this.shopItems = this.buildShopItems(items);
        this.generated = true;
        this.isGenerating = false;
      },
      error: (_err) => {
        this.errorMessage = 'Failed to load items. Please try again.';
        this.isGenerating = false;
      }
    });
  }

  private buildShopItems(allItems: ItemData[]): ShopItem[] {
    const result: ShopItem[] = [];
    const priceMultiplier = this.HALF_PRICE_SHOPS.includes(this.selectedShopType) ? 0.5 : 1;
    for (const cfg of this.rarityConfigs) {
      if (!cfg.enabled || cfg.count <= 0) continue;
      const pool = allItems.filter(i => (i.rarity ?? 'none').toLowerCase() === cfg.rarity);
      if (pool.length === 0) continue;
      const selected = this.pickRandom(pool, cfg.count);
      for (const item of selected) {
        const rawPrice = this.priceCalc.calculatePrice(item.rarity, item.value);
        result.push({
          id: this.nextId(),
          item,
          calculatedPrice: Math.round(rawPrice * priceMultiplier),
          priceEditable: this.isMundaneUnknown(item)
        });
      }
    }
    return result;
  }

  private pickRandom(pool: ItemData[], count: number): ItemData[] {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, pool.length));
  }

  private isMundaneUnknown(item: ItemData): boolean {
    return (item.rarity ?? 'none').toLowerCase() === 'none' && item.value == null;
  }

  removeItem(id: string): void {
    this.shopItems = this.shopItems.filter(si => si.id !== id);
  }

  rerollPrice(id: string): void {
    const si = this.shopItems.find(s => s.id === id);
    if (si) {
      si.calculatedPrice = this.priceCalc.calculatePrice(si.item.rarity, si.item.value);
    }
  }

  rerollItem(id: string): void {
    const si = this.shopItems.find(s => s.id === id);
    if (!si) return;
    const pool = this.allItems.filter(
      i => (i.rarity ?? 'none').toLowerCase() === (si.item.rarity ?? 'none').toLowerCase()
    );
    if (pool.length === 0) return;
    const newItem = pool[Math.floor(Math.random() * pool.length)];
    si.item = newItem;
    si.priceEditable = this.isMundaneUnknown(newItem);
    si.calculatedPrice = this.priceCalc.calculatePrice(newItem.rarity, newItem.value);
  }

  setPrice(id: string, event: Event): void {
    const si = this.shopItems.find(s => s.id === id);
    if (!si) return;
    const gp = parseFloat((event.target as HTMLInputElement).value);
    si.calculatedPrice = isNaN(gp) || gp < 0 ? 0 : Math.round(gp * 100);
  }

  formatPrice(cp: number): string {
    return this.priceCalc.formatPrice(cp);
  }

  getRarityLabel(rarity: string): string {
    const cfg = this.rarityConfigs.find(r => r.rarity === (rarity ?? 'none').toLowerCase());
    return cfg ? cfg.label : rarity;
  }

  getRarityClass(rarity: string): string {
    return (rarity ?? 'none').toLowerCase().replace(' ', '-');
  }

  private nextId(): string {
    return 'item-' + Date.now() + '-' + (this.idCounter++);
  }

  selectItem(id: string): void {
    this.selectedItemId = this.selectedItemId === id ? null : id;
  }

  /** Translates a source abbreviation (e.g. "DMG") to its full title. Falls back to the raw abbreviation. */
  getSourceTitle(source: string): string {
    return this.bookTitles[source] ?? source;
  }

  /** Returns an array of HTML strings representing the item's description entries.
   *  Prefers _fullEntries (richer data) over entries when both are present. */
  getEntryHtml(item: ItemData): string[] {
    return this.buildEntryLines(item['_fullEntries'] ?? item.entries ?? []);
  }

  private buildEntryLines(entries: any[]): string[] {
    const lines: string[] = [];
    for (const entry of entries) {
      if (typeof entry === 'string') {
        lines.push('<p>' + this.cleanText(entry) + '</p>');

      } else if (entry?.type === 'list' && Array.isArray(entry.items)) {
        const lis = entry.items
          .map((i: any) => `<li>${this.cleanText(typeof i === 'string' ? i : JSON.stringify(i))}</li>`)
          .join('');
        lines.push('<ul>' + lis + '</ul>');

      } else if (entry?.type === 'table' && Array.isArray(entry.rows)) {
        let html = entry.caption ? `<p class="table-caption">${this.cleanText(entry.caption)}</p>` : '';
        html += '<table class="entry-table"><thead><tr>';
        for (const col of (entry.colLabels ?? [])) {
          html += `<th>${this.cleanText(String(col))}</th>`;
        }
        html += '</tr></thead><tbody>';
        for (const row of entry.rows) {
          html += '<tr>';
          for (const cell of (Array.isArray(row) ? row : [])) {
            html += `<td>${this.cleanText(typeof cell === 'string' ? cell : JSON.stringify(cell))}</td>`;
          }
          html += '</tr>';
        }
        html += '</tbody></table>';
        lines.push(html);

      } else if (entry?.type === 'entries' && Array.isArray(entry.entries)) {
        // Named sub-section
        const header = entry.name ? `<p class="entry-section-name">${this.cleanText(entry.name)}</p>` : '';
        lines.push(header + this.buildEntryLines(entry.entries).join(''));

      } else if (entry?.type === 'inset' && Array.isArray(entry.entries)) {
        // Callout / sidebar box
        const header = entry.name ? `<p class="entry-section-name">${this.cleanText(entry.name)}</p>` : '';
        lines.push(`<div class="entry-inset">${header}${this.buildEntryLines(entry.entries).join('')}</div>`);

      } else if (Array.isArray(entry?.entries)) {
        // Fallback: any other object with an entries array
        lines.push(...this.buildEntryLines(entry.entries));
      }
    }
    return lines;
  }

  /** Strips 5etools {@tag text} markers from description text. */
  private cleanText(text: string): string {
    return text
      .replace(/\{@dc (\d+)\}/g, 'DC $1')
      .replace(/\{@\w+ ([^|}]+)(?:\|[^}]*)?\}/g, '$1');
  }
}
