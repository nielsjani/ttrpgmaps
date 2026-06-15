import { Component, OnInit, QueryList, ViewChildren, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StarfinderDataService } from '../services/starfinder-data.service';
import { StarfinderEntry, StarfinderDetail } from '../types/starfinder.types';

interface XpRow { total: number; p13: number; p45: number; p6: number; }

export interface EncounterEntry {
  slug: string;
  name: string;
  cr: string;
  crValue: number;
  xpEach: number;
  count: number;
  detail: StarfinderDetail | null;
  loadingDetail: boolean;
  collapsed: boolean;
}

const XP_TABLE: Record<string, XpRow> = {
  '1/8':  { total: 50,       p13: 15,     p45: 15,     p6: 10     },
  '1/6':  { total: 65,       p13: 20,     p45: 15,     p6: 10     },
  '1/4':  { total: 100,      p13: 35,     p45: 25,     p6: 15     },
  '1/3':  { total: 135,      p13: 45,     p45: 35,     p6: 25     },
  '1/2':  { total: 200,      p13: 65,     p45: 50,     p6: 35     },
  '1':    { total: 400,      p13: 135,    p45: 100,    p6: 65     },
  '2':    { total: 600,      p13: 200,    p45: 150,    p6: 100    },
  '3':    { total: 800,      p13: 265,    p45: 200,    p6: 135    },
  '4':    { total: 1200,     p13: 400,    p45: 300,    p6: 200    },
  '5':    { total: 1600,     p13: 535,    p45: 400,    p6: 265    },
  '6':    { total: 2400,     p13: 800,    p45: 600,    p6: 400    },
  '7':    { total: 3200,     p13: 1070,   p45: 800,    p6: 535    },
  '8':    { total: 4800,     p13: 1600,   p45: 1200,   p6: 800    },
  '9':    { total: 6400,     p13: 2130,   p45: 1600,   p6: 1070   },
  '10':   { total: 9600,     p13: 3200,   p45: 2400,   p6: 1600   },
  '11':   { total: 12800,    p13: 4270,   p45: 3200,   p6: 2130   },
  '12':   { total: 19200,    p13: 6400,   p45: 4800,   p6: 3200   },
  '13':   { total: 25600,    p13: 8530,   p45: 6400,   p6: 4270   },
  '14':   { total: 38400,    p13: 12800,  p45: 9600,   p6: 6400   },
  '15':   { total: 51200,    p13: 17100,  p45: 12800,  p6: 8530   },
  '16':   { total: 76800,    p13: 25600,  p45: 19200,  p6: 12800  },
  '17':   { total: 102400,   p13: 34100,  p45: 25600,  p6: 17100  },
  '18':   { total: 153600,   p13: 51200,  p45: 38400,  p6: 25600  },
  '19':   { total: 204800,   p13: 68300,  p45: 51200,  p6: 34100  },
  '20':   { total: 307200,   p13: 102000, p45: 76800,  p6: 51200  },
  '21':   { total: 409600,   p13: 137000, p45: 102400, p6: 68300  },
  '22':   { total: 614400,   p13: 205000, p45: 153600, p6: 102400 },
  '23':   { total: 819200,   p13: 273000, p45: 204800, p6: 137000 },
  '24':   { total: 1228800,  p13: 410000, p45: 307200, p6: 204800 },
  '25':   { total: 1638400,  p13: 546000, p45: 409600, p6: 273000 },
};

const DIFFICULTIES = [
  { label: 'Easy',        offset: -1, color: 'easy'        },
  { label: 'Average',     offset:  0, color: 'average'     },
  { label: 'Challenging', offset:  1, color: 'challenging' },
  { label: 'Hard',        offset:  2, color: 'hard'        },
  { label: 'Epic',        offset:  3, color: 'epic'        },
];

@Component({
  selector: 'app-encounter-builder',
  templateUrl: './encounter-builder.component.html',
  styleUrls: ['./encounter-builder.component.scss']
})
export class EncounterBuilderComponent implements OnInit {
  apl = 5;
  partySize = 4;

  allAliens: StarfinderEntry[] = [];
  loadingAliens = true;
  alienSearch = '';
  crMin = 0;
  crMax = 25;

  encounter: EncounterEntry[] = [];
  exportDone = false;
  shareLinkCopied = false;
  playerMode = false;
  focusedCreatureIndex = 0;

  @ViewChildren('creatureCard') creatureCards!: QueryList<ElementRef>;

  private urlUpdateTimer: any = null;
  private pendingRestore: { apl: number; party: number; creatures: { slug: string; count: number }[] } | null = null;

  constructor(
    private sf: StarfinderDataService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Read URL state before loading aliens so settings (APL, party) are applied immediately
    const encoded = this.route.snapshot.queryParams['state'];
    if (encoded) {
      try {
        const parsed = JSON.parse(atob(encoded));
        this.apl = parsed.apl ?? this.apl;
        this.partySize = parsed.party ?? this.partySize;
        this.pendingRestore = parsed;
      } catch { /* ignore malformed state */ }
    }

    this.sf.getIndex('alien').subscribe({
      next: data => {
        this.allAliens = data;
        this.loadingAliens = false;
        this.restoreCreaturesFromUrl();
      },
      error: () => { this.loadingAliens = false; }
    });
  }

  private restoreCreaturesFromUrl(): void {
    if (!this.pendingRestore?.creatures?.length) return;
    for (const { slug, count } of this.pendingRestore.creatures) {
      const alien = this.allAliens.find(a => a.slug === slug);
      if (alien) {
        this.addCreature(alien);
        const entry = this.encounter.find(e => e.slug === slug);
        if (entry) entry.count = count;
      }
    }
    this.pendingRestore = null;
  }

  scheduleUrlUpdate(): void {
    clearTimeout(this.urlUpdateTimer);
    this.urlUpdateTimer = setTimeout(() => this.updateUrl(), 400);
  }

  private updateUrl(): void {
    const state = {
      apl: this.apl,
      party: this.partySize,
      creatures: this.encounter.map(e => ({ slug: e.slug, count: e.count })),
    };
    const encoded = btoa(JSON.stringify(state));
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { state: encoded },
      replaceUrl: true,
    });
  }

  copyShareLink(): void {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.shareLinkCopied = true;
      setTimeout(() => this.shareLinkCopied = false, 2500);
    });
  }

  // ── Alien browser ──────────────────────────────────────────────

  private parsedCrValue(entry: StarfinderEntry): number {
    if (entry.crValue != null) return entry.crValue;
    const cr = (entry.cr ?? '').trim();
    if (cr.includes('/')) {
      const [n, d] = cr.split('/');
      return parseInt(n, 10) / parseInt(d, 10);
    }
    return parseFloat(cr) || 0;
  }

  get filteredAliens(): StarfinderEntry[] {
    const q = this.alienSearch.trim().toLowerCase();
    return this.allAliens.filter(a => {
      if (q && !a.name.toLowerCase().includes(q)) return false;
      const cr = this.parsedCrValue(a);
      if (cr < this.crMin || cr > this.crMax) return false;
      return true;
    }).slice(0, 200);
  }

  // ── XP helpers ─────────────────────────────────────────────────

  private xpForCr(cr: string): number {
    return XP_TABLE[cr.trim()]?.total ?? 0;
  }

  xpBudgetForApl(aplOffset: number): number {
    const cr = Math.max(1, Math.min(25, this.apl + aplOffset));
    return XP_TABLE[String(cr)]?.total ?? 0;
  }

  get totalXp(): number {
    return this.encounter.reduce((sum, e) => sum + e.xpEach * e.count, 0);
  }

  get individualXp(): number {
    const total = this.totalXp;
    if (this.partySize <= 3) return Math.round(total / 3);
    if (this.partySize <= 5) return Math.round(total / 4);
    return Math.round(total / 6);
  }

  get currentDifficulty(): { label: string; color: string } {
    const xp = this.totalXp;
    if (xp === 0) return { label: 'No creatures', color: 'none' };
    if (xp >= this.xpBudgetForApl(3))  return { label: 'Epic',        color: 'epic'        };
    if (xp >= this.xpBudgetForApl(2))  return { label: 'Hard',        color: 'hard'        };
    if (xp >= this.xpBudgetForApl(1))  return { label: 'Challenging', color: 'challenging' };
    if (xp >= this.xpBudgetForApl(0))  return { label: 'Average',     color: 'average'     };
    if (xp >= this.xpBudgetForApl(-1)) return { label: 'Easy',        color: 'easy'        };
    return { label: 'Trivial', color: 'trivial' };
  }

  get difficultyBands(): Array<{ label: string; color: string; budget: number }> {
    return DIFFICULTIES.map(d => ({
      label: d.label,
      color: d.color,
      budget: this.xpBudgetForApl(d.offset),
    }));
  }

  get xpProgressPercent(): number {
    const epicBudget = this.xpBudgetForApl(3);
    if (epicBudget === 0) return 0;
    return Math.min(100, (this.totalXp / epicBudget) * 100);
  }

  // ── Encounter management ────────────────────────────────────────

  addCreature(entry: StarfinderEntry): void {
    const existing = this.encounter.find(e => e.slug === entry.slug);
    if (existing) { existing.count++; this.scheduleUrlUpdate(); return; }

    const newEntry: EncounterEntry = {
      slug: entry.slug,
      name: entry.name,
      cr: entry.cr,
      crValue: this.parsedCrValue(entry),
      xpEach: this.xpForCr(entry.cr),
      count: 1,
      detail: null,
      loadingDetail: true,
      collapsed: false,
    };
    this.encounter.push(newEntry);
    this.scheduleUrlUpdate();
    this.sf.getDetail('alien', entry.slug).subscribe({
      next: d  => { newEntry.detail = d; newEntry.loadingDetail = false; },
      error: () => { newEntry.loadingDetail = false; }
    });
  }

  increment(entry: EncounterEntry): void { entry.count++; this.scheduleUrlUpdate(); }

  decrement(entry: EncounterEntry): void {
    if (entry.count > 1) { entry.count--; this.scheduleUrlUpdate(); }
    else this.remove(entry);
  }

  remove(entry: EncounterEntry): void {
    this.encounter = this.encounter.filter(e => e.slug !== entry.slug);
    this.scheduleUrlUpdate();
  }

  toggleCollapse(entry: EncounterEntry): void { entry.collapsed = !entry.collapsed; }

  clearEncounter(): void { this.encounter = []; this.scheduleUrlUpdate(); }

  scrollToCreature(index: number): void {
    if (index < 0 || index >= this.encounter.length) return;
    this.focusedCreatureIndex = index;
    const cards = this.creatureCards.toArray();
    if (cards[index]) {
      cards[index].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.playerMode || this.encounter.length === 0) return;
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.scrollToCreature(Math.min(this.focusedCreatureIndex + 1, this.encounter.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.scrollToCreature(Math.max(this.focusedCreatureIndex - 1, 0));
    }
  }

  isInEncounter(slug: string): boolean {
    return this.encounter.some(e => e.slug === slug);
  }

  get totalCreatureCount(): number {
    return this.encounter.reduce((sum, e) => sum + e.count, 0);
  }

  // ── Stat block helpers ─────────────────────────────────────────

  headerLine(d: StarfinderDetail): string {
    return [d.alignment, d.size, d.creature_type || d.type].filter(Boolean).join(' ');
  }

  saves(d: StarfinderDetail): string {
    if (!d.fort && !d.ref && !d.will) return '';
    return `Fort ${d.fort ?? '—'}, Ref ${d.ref ?? '—'}, Will ${d.will ?? '—'}`;
  }

  abilityScores(d: StarfinderDetail): string {
    const a = d.ability_scores;
    if (!a) return '';
    return `STR ${a.str}  DEX ${a.dex}  CON ${a.con}  INT ${a.int}  WIS ${a.wis}  CHA ${a.cha}`;
  }

  slaText(d: StarfinderDetail): string {
    const sla = d.spell_like_abilities;
    if (!sla) return '';
    if (typeof sla === 'string') return sla;
    return `(${sla.caster_info}) ${sla.spells}`;
  }

  // ── Export ─────────────────────────────────────────────────────

  exportToMarkdown(): void {
    const diff = this.currentDifficulty;
    const stripHtml = (html: string) => (html ?? '').replace(/<[^>]+>/g, '');

    const lines: string[] = [
      `# Encounter (APL ${this.apl}, ${this.partySize} players)`,
      '',
      `**Difficulty:** ${diff.label}  `,
      `**Total XP:** ${this.totalXp.toLocaleString()} XP  `,
      `**Individual XP (${this.partySize} players):** ${this.individualXp.toLocaleString()} XP each  `,
      '',
      '### XP Thresholds',
      ...DIFFICULTIES.map(d => `- **${d.label}:** ${this.xpBudgetForApl(d.offset).toLocaleString()} XP`),
      '',
      '---',
      '',
      '## Creatures',
    ];

    for (const entry of this.encounter) {
      lines.push('');
      lines.push(`### ${entry.count}× ${entry.name} (CR ${entry.cr})`);
      lines.push(`**XP:** ${entry.xpEach.toLocaleString()} each — ${(entry.xpEach * entry.count).toLocaleString()} total`);

      const d = entry.detail;
      if (!d) { lines.push('*(stat block not loaded)*'); continue; }

      const hl = this.headerLine(d);
      if (hl) lines.push(`*${hl}*`);
      if (d.source) lines.push(`**Source:** ${d.source}`);
      lines.push('');

      const initParts = [
        d.init        ? `Init ${d.init}`               : '',
        d.senses      ? `Senses ${d.senses}`           : '',
        d.perception  ? `Perception ${d.perception}`   : '',
      ].filter(Boolean);
      if (initParts.length) lines.push(initParts.join(' | '));

      const defParts = [
        d.hp  ? `HP ${d.hp}`   : '',
        d.eac ? `EAC ${d.eac}` : '',
        d.kac ? `KAC ${d.kac}` : '',
      ].filter(Boolean);
      if (defParts.length) lines.push(`**Defense:** ${defParts.join(' | ')}`);

      const sv = this.saves(d);
      if (sv)               lines.push(`**Saves:** ${sv}`);
      if (d.dr)             lines.push(`**DR:** ${d.dr}`);
      if (d.sr)             lines.push(`**SR:** ${d.sr}`);
      if (d.immunities)     lines.push(`**Immunities:** ${d.immunities}`);
      if (d.resistances)    lines.push(`**Resistances:** ${d.resistances}`);
      if (d.weaknesses)     lines.push(`**Weaknesses:** ${d.weaknesses}`);
      if (d.speed)          lines.push(`**Speed:** ${d.speed}`);
      if (d.melee)          lines.push(`**Melee:** ${d.melee}`);
      if (d.ranged)         lines.push(`**Ranged:** ${d.ranged}`);
      if (d.space)          lines.push(`**Space:** ${d.space}; **Reach:** ${d.reach}`);
      if (d.offensive_abilities) lines.push(`**Offensive Abilities:** ${d.offensive_abilities}`);
      const sla = this.slaText(d);
      if (sla)              lines.push(`**Spell-Like Abilities:** ${sla}`);
      if (d.spells)         lines.push(`**Spells:** ${d.spells}`);

      const abs = this.abilityScores(d);
      if (abs)              lines.push(`**Ability Scores:** \`${abs}\``);
      if (d.skills)         lines.push(`**Skills:** ${d.skills}`);
      if (d.feats)          lines.push(`**Feats:** ${d.feats}`);
      if (d.languages)      lines.push(`**Languages:** ${d.languages}`);
      if (d.other_abilities) lines.push(`**Other Abilities:** ${d.other_abilities}`);
      if (d.gear)           lines.push(`**Gear:** ${d.gear}`);
      if (d.environment)    lines.push(`**Environment:** ${d.environment}`);
      if (d.organization)   lines.push(`**Organization:** ${d.organization}`);

      if (d.special_abilities?.length) {
        lines.push('');
        lines.push('**Special Abilities:**');
        for (const sa of d.special_abilities) {
          lines.push(`- **${sa.name}:** ${stripHtml(sa.description)}`);
        }
      }
    }

    const markdown = lines.join('\n');
    navigator.clipboard.writeText(markdown).then(() => {
      this.exportDone = true;
      setTimeout(() => this.exportDone = false, 2500);
    });
  }
}
