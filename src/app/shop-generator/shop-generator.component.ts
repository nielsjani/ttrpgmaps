import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ShopDataService, ShopType, BookTitles } from './services/shop-data.service';
import { PriceCalculatorService } from './services/price-calculator.service';
import { ItemData } from './types/item-data';
import { ShopItem } from './types/shop-item';
import { RarityConfig } from './types/rarity-config';
import { ShopInstance } from './types/shop-instance';

// ─── Share-link serialisation ─────────────────────────────────────────────────

interface ShareItem { n: string; s: string; p: number; e: number; }
interface ShareShop { nm: string; ed: string; t: string; d: number; it: ShareItem[]; }

// ─── Export constants ─────────────────────────────────────────────────────────

const EXPORT_CSS = `
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:24px;color:#333}
.container{max-width:980px;margin:0 auto}
.page-title{font-size:2rem;font-weight:700;color:#1976d2;margin:0 0 28px}
.shop-section{background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);padding:24px;margin-bottom:28px}
.shop-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #e0e0e0}
.shop-title{margin:0;font-size:1.4rem;font-weight:700;color:#333}
.shop-subtitle{font-size:0.95rem;color:#888;font-weight:400}
.item-count{font-size:.85rem;color:#666;background:#f0f0f0;padding:2px 10px;border-radius:12px;margin-left:auto}
.items-table{width:100%;border-collapse:collapse;font-size:.92rem}
.items-table th{text-align:left;padding:10px 12px;background:#f5f5f5;font-weight:600;color:#555;border-bottom:2px solid #e0e0e0;white-space:nowrap}
.items-table td{padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
.item-row{cursor:pointer;transition:background .12s}
.item-row:hover td,.item-row.expanded td{background:#e8f4fd}
.expand-icon{color:#90a4ae;font-size:.75rem;width:24px;text-align:center;padding-right:0!important}
.item-name{font-weight:500;color:#222}
.price-col{text-align:right}
.item-price{text-align:right;font-family:monospace;font-weight:600;color:#2e7d32}
.badge{display:inline-block;font-size:.75rem;font-weight:600;padding:2px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}
.badge-none{background:#e0e0e0;color:#555}
.badge-uncommon{background:#4caf50;color:#fff}
.badge-rare{background:#2196f3;color:#fff}
.badge-very-rare{background:#9c27b0;color:#fff}
.badge-legendary{background:#ff9800;color:#fff}
.detail-row td{padding:0!important;border-bottom:2px solid #1976d2!important}
.detail-cell{background:#f0f7ff}
.item-detail{padding:16px 20px}
.detail-meta{display:flex;gap:14px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
.detail-source{font-size:.82rem;color:#555;background:#e3f2fd;padding:2px 10px;border-radius:10px}
.detail-attune{font-size:.82rem;color:#7b4f00;background:#fff3cd;border:1px solid #ffe08a;padding:2px 10px;border-radius:10px}
.item-stats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.stat-chip{display:inline-block;font-size:.78rem;font-weight:600;padding:2px 10px;border-radius:10px;background:#f0f4ff;color:#3a3a5c;border:1px solid #c5cdf5}
.stat-chip--type{background:#e8f5e9;color:#1b5e20;border-color:#a5d6a7}
.stat-chip--warn{background:#fff8e1;color:#7b4f00;border-color:#ffe082}
.entry-block p{margin:0 0 8px;font-size:.92rem;line-height:1.6;color:#333}
.entry-block ul{margin:4px 0 10px 20px;padding:0}
.entry-block li{font-size:.92rem;margin-bottom:4px}
.entry-section-name{font-weight:700;color:#1a237e;margin:10px 0 2px;font-size:.92rem}
.entry-inset{border-left:3px solid #90caf9;background:#e8f4fd;border-radius:0 6px 6px 0;padding:8px 14px;margin:8px 0}
.no-description{color:#999;font-style:italic;font-size:.9rem}
.entry-table{border-collapse:collapse;font-size:.85rem;margin:8px 0 12px}
.entry-table th{background:#dce8f5;padding:4px 10px;text-align:left;font-weight:600;border:1px solid #b0c4de}
.entry-table td{padding:4px 10px;border:1px solid #cdd9e8}
.table-caption{font-weight:600;margin-bottom:4px}
.click-hint{font-size:.8rem;color:#999;margin:0 0 8px;font-style:italic}
.discount-badge{display:inline-block;font-size:.85rem;font-weight:700;background:#fce4ec;color:#c62828;border:1px solid #ef9a9a;padding:3px 12px;border-radius:12px;white-space:nowrap}
.price-discounted{font-family:monospace;font-weight:700;color:#c62828}
.price-original{font-family:monospace;font-size:.8rem;color:#999;text-decoration:line-through}
`;

const EXPORT_JS = `
function toggleDetail(id){
  var row=document.getElementById(id);
  var icon=document.getElementById('icon-'+id);
  if(row.style.display==='none'){
    row.style.display='table-row';
    icon.textContent='▾';
  } else {
    row.style.display='none';
    icon.textContent='▸';
  }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-shop-generator',
  templateUrl: './shop-generator.component.html',
  styleUrls: ['./shop-generator.component.scss']
})
export class ShopGeneratorComponent implements OnInit {

  shops: ShopInstance[] = [];
  shopTypes: ShopType[] = [];
  bookTitles: BookTitles = {};
  globalDiscount = 0;
  isReadOnly = false;
  linkCopied = false;

  readonly HALF_PRICE_SHOPS = ['all-potions', 'all-poisons-and-explosives', 'all-scrolls'];

  private idCounter = 0;

  constructor(
    public shopDataService: ShopDataService,
    private priceCalc: PriceCalculatorService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.shopTypes = this.shopDataService.shopTypes;
    this.priceCalc.loadPrices().subscribe();
    this.shopDataService.getBookTitles().subscribe(titles => this.bookTitles = titles);

    const shareParam = this.route.snapshot.queryParamMap.get('share');
    if (shareParam) {
      this.isReadOnly = true;
      this.loadSharedData(shareParam);
    } else {
      this.addShop();
    }
  }

  // ── Shop management ──────────────────────────────────────────────────────────

  addShop(): void {
    this.shops.push(this.createShopInstance());
  }

  generateOneOfEach(): void {
    const edition = this.shops.length > 0 ? this.shops[0].edition : '2014';
    this.shops = [];
    for (const shopType of this.shopTypes) {
      const shop = this.createShopInstance();
      shop.name = shopType.label;
      shop.selectedShopType = shopType.file;
      shop.edition = edition;
      for (const cfg of shop.rarityConfigs) {
        cfg.count = this.evalDiceExpression(cfg.defaultExpression);
      }
      this.shops.push(shop);
    }
    for (const shop of [...this.shops]) {
      this.generateShop(shop);
    }
  }

  onGlobalDiscountChange(value: number): void {
    this.globalDiscount = value;
    for (const shop of this.shops) {
      shop.discount = value;
    }
  }

  private evalDiceExpression(expr: string): number {
    const match = expr.match(/^(\d+)[Dd](\d+)([+-]\d+)?$/);
    if (!match) return 0;
    const numDice = parseInt(match[1], 10);
    const dieSize = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    let total = modifier;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * dieSize) + 1;
    }
    return Math.max(0, total);
  }

  removeShop(shop: ShopInstance): void {
    this.shops = this.shops.filter(s => s.id !== shop.id);
  }

  private createShopInstance(): ShopInstance {
    return {
      id: this.nextId(),
      name: 'My Shop',
      edition: '2014',
      selectedShopType: 'all-adventuring-gear',
      rarityConfigs: [
        { rarity: 'none',      label: 'Mundane',   count: 0, enabled: true, defaultExpression: '1D20+10' },
        { rarity: 'uncommon',  label: 'Uncommon',  count: 0, enabled: true, defaultExpression: '1D12+6'  },
        { rarity: 'rare',      label: 'Rare',      count: 0, enabled: true, defaultExpression: '1D6-3'   },
        { rarity: 'very rare', label: 'Very Rare', count: 0, enabled: true, defaultExpression: '1D4-2'   },
        { rarity: 'legendary', label: 'Legendary', count: 0, enabled: true, defaultExpression: '1D4-3'   },
      ],
      shopItems: [],
      allItems: [],
      isGenerating: false,
      generated: false,
      errorMessage: '',
      selectedItemId: null,
      configCollapsed: false,
      excludeUnknownPrice: true,
      discount: this.globalDiscount,
    };
  }

  // ── Rarity counters ──────────────────────────────────────────────────────────

  onRarityConfigChange(event: { rarity: string; count: number; enabled: boolean }, shop: ShopInstance): void {
    const cfg = shop.rarityConfigs.find(r => r.rarity === event.rarity);
    if (cfg) {
      cfg.count = event.count;
      cfg.enabled = event.enabled;
    }
  }

  // ── Generate ─────────────────────────────────────────────────────────────────

  generateShop(shop: ShopInstance): void {
    shop.isGenerating = true;
    shop.errorMessage = '';
    this.shopDataService.getItems(shop.edition, shop.selectedShopType).subscribe({
      next: (items) => {
        shop.allItems = items;
        shop.shopItems = this.buildShopItems(items, shop);
        shop.generated = true;
        shop.isGenerating = false;
        shop.configCollapsed = true;
      },
      error: () => {
        shop.errorMessage = 'Failed to load items. Please try again.';
        shop.isGenerating = false;
      }
    });
  }

  private buildBaseItemMap(allItems: ItemData[]): Map<string, { name: string; value: number }> {
    const map = new Map<string, { name: string; value: number }>();
    for (const item of allItems) {
      if (!item.baseItem && item.value != null) {
        // This is a base item — key by lowercased name slug
        map.set(item.name.toLowerCase(), { name: item.name, value: item.value });
      }
    }
    return map;
  }

  private getBaseItemInfo(item: ItemData, baseItemMap: Map<string, { name: string; value: number }>): { name: string; cost: number } {
    if (!item.baseItem) return { name: '', cost: 0 };
    const slug = item.baseItem.split('|')[0].toLowerCase();
    const baseItem = baseItemMap.get(slug);
    return baseItem ? { name: baseItem.name, cost: baseItem.value } : { name: slug, cost: 0 };
  }

  private buildShopItems(allItems: ItemData[], shop: ShopInstance): ShopItem[] {
    const result: ShopItem[] = [];
    const priceMultiplier = this.HALF_PRICE_SHOPS.includes(shop.selectedShopType) ? 0.5 : 1;
    const baseItemMap = this.buildBaseItemMap(allItems);
    for (const cfg of shop.rarityConfigs) {
      if (!cfg.enabled || cfg.count <= 0) continue;
      const pool = allItems.filter(i => {
        const matchesRarity = (i.rarity ?? 'none').toLowerCase() === cfg.rarity;
        const hasUnknownPrice = this.isMundaneUnknown(i);
        return matchesRarity && !(shop.excludeUnknownPrice && hasUnknownPrice);
      });
      if (pool.length === 0) continue;
      const selected = this.pickRandom(pool, cfg.count);
      for (const item of selected) {
        const { name: baseItemName, cost: baseItemCost } = this.getBaseItemInfo(item, baseItemMap);
        const { total, breakdown } = this.priceCalc.calculatePriceWithBreakdown(
          item.rarity, baseItemCost, baseItemName, item.value
        );
        result.push({
          id: this.nextId(),
          item,
          calculatedPrice: Math.round(total * priceMultiplier),
          priceEditable: this.isMundaneUnknown(item),
          priceBreakdown: breakdown
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

  // ── Item actions ─────────────────────────────────────────────────────────────

  removeItem(shop: ShopInstance, id: string): void {
    shop.shopItems = shop.shopItems.filter(si => si.id !== id);
  }

  rerollPrice(shop: ShopInstance, id: string): void {
    const si = shop.shopItems.find(s => s.id === id);
    if (!si) return;
    const baseItemCost = si.priceBreakdown?.baseItemCost ?? 0;
    const baseItemName = si.priceBreakdown?.baseItemName ?? '';
    const { total, breakdown } = this.priceCalc.calculatePriceWithBreakdown(
      si.item.rarity, baseItemCost, baseItemName, si.item.value
    );
    si.calculatedPrice = total;
    si.priceBreakdown = breakdown;
  }

  rerollItem(shop: ShopInstance, id: string): void {
    const si = shop.shopItems.find(s => s.id === id);
    if (!si) return;
    const pool = shop.allItems.filter(
      i => (i.rarity ?? 'none').toLowerCase() === (si.item.rarity ?? 'none').toLowerCase()
    );
    if (pool.length === 0) return;
    const newItem = pool[Math.floor(Math.random() * pool.length)];
    si.item = newItem;
    si.priceEditable = this.isMundaneUnknown(newItem);
    const baseItemMap = this.buildBaseItemMap(shop.allItems);
    const { name: baseItemName, cost: baseItemCost } = this.getBaseItemInfo(newItem, baseItemMap);
    const { total, breakdown } = this.priceCalc.calculatePriceWithBreakdown(
      newItem.rarity, baseItemCost, baseItemName, newItem.value
    );
    si.calculatedPrice = total;
    si.priceBreakdown = breakdown;
  }

  setPrice(shop: ShopInstance, id: string, event: Event): void {
    const si = shop.shopItems.find(s => s.id === id);
    if (!si) return;
    const gp = parseFloat((event.target as HTMLInputElement).value);
    si.calculatedPrice = isNaN(gp) || gp < 0 ? 0 : Math.round(gp * 100);
  }

  selectItem(shop: ShopInstance, id: string): void {
    shop.selectedItemId = shop.selectedItemId === id ? null : id;
  }

  // ── Formatting helpers ───────────────────────────────────────────────────────

  formatPrice(cp: number): string {
    return this.priceCalc.formatPrice(cp);
  }

  getPriceBreakdownTooltip(si: ShopItem): string {
    const bd = si.priceBreakdown;
    if (!bd) return '';
    const rarity = (si.item.rarity ?? 'none').toLowerCase().trim();
    if (rarity === 'none' || rarity === '') return '';
    const lines: string[] = [];
    lines.push(`Magic roll: ${this.priceCalc.formatPrice(bd.magicRoll)}`);
    if (bd.baseItemCost > 0) {
      lines.push(`Base item (${bd.baseItemName}): ${this.priceCalc.formatPrice(bd.baseItemCost)}`);
    }
    lines.push(`Total: ${this.priceCalc.formatPrice(bd.magicRoll + bd.baseItemCost)}`);
    return lines.join('\n');
  }

  hasBreakdown(si: ShopItem): boolean {
    const bd = si.priceBreakdown;
    if (!bd) return false;
    const rarity = (si.item.rarity ?? 'none').toLowerCase().trim();
    if (rarity === 'none' || rarity === '') return false;
    // Only show icon when there are multiple components (magic roll + base item cost)
    return bd.baseItemCost > 0;
  }

  getEffectivePrice(shop: ShopInstance, si: ShopItem): number {
    const discount = shop.discount ?? 0;
    return Math.round(si.calculatedPrice * (1 - discount / 100));
  }

  getRarityLabel(shop: ShopInstance, rarity: string): string {
    const cfg = shop.rarityConfigs.find(r => r.rarity === (rarity ?? 'none').toLowerCase());
    return cfg ? cfg.label : rarity;
  }

  getRarityClass(rarity: string): string {
    return (rarity ?? 'none').toLowerCase().replace(' ', '-');
  }

  getShopTypeLabel(file: string): string {
    return this.shopTypes.find(st => st.file === file)?.label ?? file;
  }

  get anyGenerated(): boolean {
    return this.shops.some(s => s.generated && s.shopItems.length > 0);
  }

  private nextId(): string {
    return 'i' + Date.now() + (this.idCounter++);
  }

  // ── Item display helpers ─────────────────────────────────────────────────────

  private readonly PROPERTY_LABELS: Record<string, string> = {
    '2H': 'Two-Handed', 'A': 'Ammunition', 'AF': 'Automatic', 'AFDMG': 'Automatic',
    'B': 'Burst Fire', 'BFDMG': 'Burst Fire', 'F': 'Finesse', 'H': 'Heavy',
    'L': 'Light', 'LD': 'Loading', 'R': 'Reach', 'RLD': 'Reload',
    'S': 'Special', 'T': 'Thrown', 'V': 'Versatile',
    '2HXPHB': 'Two-Handed', 'AXPHB': 'Ammunition', 'AFXDMG': 'Automatic',
    'BFXDMG': 'Burst Fire', 'FXPHB': 'Finesse', 'HXPHB': 'Heavy',
    'LXPHB': 'Light', 'LDXPHB': 'Loading', 'RXPHB': 'Reach',
    'RLDXDMG': 'Reload', 'SXPHB': 'Special', 'TXPHB': 'Thrown', 'VXPHB': 'Versatile',
  };

  private readonly DMG_TYPE_LABELS: Record<string, string> = {
    'B': 'Bludgeoning', 'P': 'Piercing', 'S': 'Slashing',
    'A': 'Acid', 'C': 'Cold', 'F': 'Fire', 'L': 'Lightning',
    'N': 'Necrotic', 'O': 'Poison', 'Py': 'Psychic', 'Y': 'Psychic',
    'R': 'Radiant', 'T': 'Thunder', 'Fo': 'Force',
  };

  isWeapon(item: ItemData): boolean { return !!item.weaponCategory; }
  isArmor(item: ItemData): boolean  { return !!item.armor; }

  getWeaponPropertyLabels(item: ItemData): string[] {
    if (!Array.isArray(item.property)) return [];
    return item.property.map((p: any) => {
      const code: string = typeof p === 'string' ? p : (p?.uid ?? '');
      const note: string | undefined = typeof p === 'object' ? p?.note : undefined;
      const label = this.PROPERTY_LABELS[code] ?? code;
      return note ? `${label} (${note})` : label;
    }).filter(Boolean);
  }

  getDmgTypeLabel(code: string): string { return this.DMG_TYPE_LABELS[code] ?? code; }

  getArmorTypeLabel(item: ItemData): string {
    if (!item.type) return '';
    const base = item.type.split('|')[0];
    if (base.startsWith('LA')) return 'Light Armor';
    if (base.startsWith('MA')) return 'Medium Armor';
    if (base.startsWith('HA')) return 'Heavy Armor';
    if (base.startsWith('S'))  return 'Shield';
    return base;
  }

  getTotalAc(item: ItemData): number | null {
    if (item.ac == null) return null;
    const bonus = item.bonusAc ? parseInt(item.bonusAc, 10) : 0;
    return item.ac + (isNaN(bonus) ? 0 : bonus);
  }

  getAttunementLabel(item: ItemData): string | null {
    if (!item.reqAttune) return null;
    if (item.reqAttune === true) return 'Requires Attunement';
    return 'Requires Attunement ' + item.reqAttune;
  }

  formatAmmoType(ammoType: string): string {
    return ammoType.replace(/(xphb|xdmg|xmm|phb|dmg|mm)$/i, '').trim();
  }

  capitalizeFirst(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  getSourceTitle(source: string): string {
    return this.bookTitles[source] ?? source;
  }

  getEntryHtml(item: ItemData): string[] {
    return this.buildEntryLines(item['_fullEntries'] ?? item.entries ?? [], item);
  }

  private buildEntryLines(entries: any[], item: ItemData): string[] {
    const lines: string[] = [];
    for (const entry of entries) {
      if (typeof entry === 'string') {
        lines.push('<p>' + this.cleanText(entry, item) + '</p>');
      } else if (entry?.type === 'list' && Array.isArray(entry.items)) {
        const lis = entry.items
          .map((i: any) => `<li>${this.cleanText(typeof i === 'string' ? i : JSON.stringify(i), item)}</li>`)
          .join('');
        lines.push('<ul>' + lis + '</ul>');
      } else if (entry?.type === 'table' && Array.isArray(entry.rows)) {
        let html = entry.caption ? `<p class="table-caption">${this.cleanText(entry.caption, item)}</p>` : '';
        html += '<table class="entry-table"><thead><tr>';
        for (const col of (entry.colLabels ?? [])) html += `<th>${this.cleanText(String(col), item)}</th>`;
        html += '</tr></thead><tbody>';
        for (const row of entry.rows) {
          html += '<tr>';
          for (const cell of (Array.isArray(row) ? row : []))
            html += `<td>${this.cleanText(typeof cell === 'string' ? cell : JSON.stringify(cell), item)}</td>`;
          html += '</tr>';
        }
        html += '</tbody></table>';
        lines.push(html);
      } else if (entry?.type === 'entries' && Array.isArray(entry.entries)) {
        const header = entry.name ? `<p class="entry-section-name">${this.cleanText(entry.name, item)}</p>` : '';
        lines.push(header + this.buildEntryLines(entry.entries, item).join(''));
      } else if (entry?.type === 'inset' && Array.isArray(entry.entries)) {
        const header = entry.name ? `<p class="entry-section-name">${this.cleanText(entry.name, item)}</p>` : '';
        lines.push(`<div class="entry-inset">${header}${this.buildEntryLines(entry.entries, item).join('')}</div>`);
      } else if (Array.isArray(entry?.entries)) {
        lines.push(...this.buildEntryLines(entry.entries, item));
      }
    }
    return lines;
  }

  private cleanText(text: string, item?: ItemData): string {
    return text
      .replace(/\{=(\w+)\}/g, (_, field) => { const v = item?.[field]; return v != null ? String(v) : ''; })
      .replace(/\{#\w+[^}]*\}/g, '')
      .replace(/\{@dc (\d+)\}/g, 'DC $1')
      .replace(/\{@\w+ ([^|}]+)(?:\|[^}]*)?\}/g, '$1');
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  exportToHtml(): void {
    const generatedShops = this.shops.filter(s => s.generated && s.shopItems.length > 0);
    if (generatedShops.length === 0) return;

    const shopsHtml = generatedShops.map(s => this.buildExportShopSection(s)).join('\n');
    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shop Inventories</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
<div class="container">
<h1 class="page-title">🏪 Shop Inventories</h1>
${shopsHtml}
</div>
<script>${EXPORT_JS}</script>
</body>
</html>`;

    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shop-inventories.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private buildExportShopSection(shop: ShopInstance): string {
    const shopName = shop.name.trim() || 'Unnamed Shop';
    const typeLabel = this.getShopTypeLabel(shop.selectedShopType);
    const count = shop.shopItems.length;
    const rows = shop.shopItems.map((si, idx) => this.buildExportItemRow(si, shop, idx)).join('\n');
    const discountBadge = shop.discount > 0
      ? `<span class="discount-badge">🏷 ${shop.discount}% off</span>`
      : '';

    return `<section class="shop-section">
<div class="shop-header">
  <h2 class="shop-title">${this.esc(shopName)} <span class="shop-subtitle">— ${this.esc(typeLabel)} Inventory</span></h2>
  ${discountBadge}
  <span class="item-count">${count} item${count !== 1 ? 's' : ''}</span>
</div>
<p class="click-hint">Click a row to view item description.</p>
<table class="items-table">
<thead><tr><th></th><th>Name</th><th>Rarity</th><th class="price-col">Price</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</section>`;
  }

  private buildExportItemRow(si: ShopItem, shop: ShopInstance, idx: number): string {
    const rowId = `d-${shop.id}-${idx}`;
    const rarityClass = this.getRarityClass(si.item.rarity);
    const rarityLabel = this.getRarityLabel(shop, si.item.rarity);
    const effectivePrice = this.getEffectivePrice(shop, si);
    const detail = this.buildExportDetailHtml(si.item);

    let priceHtml: string;
    if (shop.discount > 0 && !si.priceEditable) {
      const original = this.esc(this.formatPrice(si.calculatedPrice));
      const discounted = this.esc(this.formatPrice(effectivePrice));
      priceHtml = `<span class="price-discounted">${discounted}</span><br><span class="price-original">${original}</span>`;
    } else {
      priceHtml = this.esc(this.formatPrice(effectivePrice));
    }

    return `<tr class="item-row" onclick="toggleDetail('${rowId}')">
  <td class="expand-icon" id="icon-${rowId}">▸</td>
  <td class="item-name">${this.esc(si.item.name)}</td>
  <td><span class="badge badge-${rarityClass}">${this.esc(rarityLabel)}</span></td>
  <td class="item-price">${priceHtml}</td>
</tr>
<tr id="${rowId}" class="detail-row" style="display:none">
  <td colspan="4" class="detail-cell"><div class="item-detail">${detail}</div></td>
</tr>`;
  }

  private buildExportDetailHtml(item: ItemData): string {
    let html = '<div class="detail-meta">';
    html += `<span class="detail-source">📖 ${this.esc(this.getSourceTitle(item.source))}</span>`;
    const attune = this.getAttunementLabel(item);
    if (attune) html += `<span class="detail-attune">✨ ${this.esc(attune)}</span>`;
    html += '</div>';

    if (this.isArmor(item)) {
      html += '<div class="item-stats">';
      html += `<span class="stat-chip stat-chip--type">${this.esc(this.getArmorTypeLabel(item))}</span>`;
      const ac = this.getTotalAc(item);
      if (ac !== null) html += `<span class="stat-chip">AC ${ac}</span>`;
      if (item.strength) html += `<span class="stat-chip">Min. STR ${this.esc(String(item.strength))}</span>`;
      if (item.stealth) html += `<span class="stat-chip stat-chip--warn">Stealth Disadvantage</span>`;
      html += '</div>';
    }

    if (this.isWeapon(item)) {
      html += '<div class="item-stats">';
      html += `<span class="stat-chip stat-chip--type">${this.esc(this.capitalizeFirst(item.weaponCategory ?? ''))} Weapon</span>`;
      if (item.dmg1 && item.dmgType)
        html += `<span class="stat-chip">${this.esc(item.dmg1)} ${this.esc(this.getDmgTypeLabel(item.dmgType))}</span>`;
      if (item.range) html += `<span class="stat-chip">Range ${this.esc(item.range)} ft.</span>`;
      for (const prop of this.getWeaponPropertyLabels(item))
        html += `<span class="stat-chip">${this.esc(prop)}</span>`;
      if (item.ammoType) html += `<span class="stat-chip">Ammo: ${this.esc(this.formatAmmoType(item.ammoType))}</span>`;
      html += '</div>';
    }

    const entries = this.getEntryHtml(item);
    if (entries.length > 0) {
      html += `<div class="entry-block">${entries.join('')}</div>`;
    } else {
      html += '<p class="no-description">No description available.</p>';
    }
    return html;
  }

  /** HTML-escape a plain-text string for safe embedding. */
  private esc(text: string): string {
    return (text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Share link ───────────────────────────────────────────────────────────────

  shareToLink(): void {
    const generatedShops = this.shops.filter(s => s.generated && s.shopItems.length > 0);
    if (generatedShops.length === 0) return;

    const shareData: ShareShop[] = generatedShops.map(s => ({
      nm: s.name,
      ed: s.edition,
      t: s.selectedShopType,
      d: s.discount,
      it: s.shopItems.map(si => ({
        n: si.item.name,
        s: si.item.source,
        p: si.calculatedPrice,
        e: si.priceEditable ? 1 : 0,
      })),
    }));

    const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const path = this.router.serializeUrl(
      this.router.createUrlTree(['/shop-generator'], { queryParams: { share: encoded } })
    );
    const shareUrl = `${window.location.origin}${window.location.pathname}#${path}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      this.linkCopied = true;
      setTimeout(() => this.linkCopied = false, 2500);
    });
  }

  private loadSharedData(encoded: string): void {
    try {
      const json = decodeURIComponent(atob(encoded));
      const shareData: ShareShop[] = JSON.parse(json);

      if (!Array.isArray(shareData) || shareData.length === 0) {
        this.addShop();
        return;
      }

      const observables = shareData.map(sd =>
        this.shopDataService.getItems(sd.ed as '2014' | '2024', sd.t).pipe(
          map(allItems => ({ sd, allItems }))
        )
      );

      forkJoin(observables).subscribe({
        next: (results) => {
          this.shops = results.map(({ sd, allItems }) => {
            const shopItems: ShopItem[] = sd.it.map(si => {
              const item: ItemData = allItems.find(i => i.name === si.n && i.source === si.s)
                ?? ({ name: si.n, source: si.s, rarity: 'none' } as ItemData);
              return { id: this.nextId(), item, calculatedPrice: si.p, priceEditable: si.e === 1 };
            });
            return {
              id: this.nextId(),
              name: sd.nm,
              edition: sd.ed as '2014' | '2024',
              selectedShopType: sd.t,
              discount: sd.d,
              shopItems,
              allItems,
              generated: true,
              configCollapsed: true,
              isGenerating: false,
              errorMessage: '',
              selectedItemId: null,
              excludeUnknownPrice: true,
              rarityConfigs: [
                { rarity: 'none',      label: 'Mundane',   count: 0, enabled: true, defaultExpression: '1D20+10' },
                { rarity: 'uncommon',  label: 'Uncommon',  count: 0, enabled: true, defaultExpression: '1D12+6'  },
                { rarity: 'rare',      label: 'Rare',      count: 0, enabled: true, defaultExpression: '1D6-3'   },
                { rarity: 'very rare', label: 'Very Rare', count: 0, enabled: true, defaultExpression: '1D4-2'   },
                { rarity: 'legendary', label: 'Legendary', count: 0, enabled: true, defaultExpression: '1D4-3'   },
              ],
            } as ShopInstance;
          });
        },
        error: () => { this.addShop(); },
      });
    } catch {
      console.error('Failed to decode share link');
      this.addShop();
    }
  }
}
