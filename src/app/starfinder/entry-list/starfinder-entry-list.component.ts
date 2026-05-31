import { Component, Input, OnInit, HostListener } from '@angular/core';
import { StarfinderDataService } from '../services/starfinder-data.service';
import { StarfinderEntry } from '../types/starfinder.types';

@Component({
  selector: 'app-starfinder-entry-list',
  templateUrl: './starfinder-entry-list.component.html',
  styleUrls: ['./starfinder-entry-list.component.scss']
})
export class StarfinderEntryListComponent implements OnInit {
  @Input() category: 'alien' | 'starship' = 'alien';
  @Input() title = '';
  @Input() backRoute = '/starfinder';

  entries: StarfinderEntry[] = [];
  loading = true;
  error = '';

  // Text search
  searchText = '';

  // CR range (integer steps 0-30; crValue for fractions < 1 passes when min=0)
  crMin = 0;
  crMax = 30;

  // Main type multiselect
  allMainTypes: string[] = [];
  selectedMainTypes = new Set<string>();
  mainTypeSearch = '';

  // Subtype multiselect (shown only when ≥1 main type is selected)
  subtypesByMainType = new Map<string, Set<string>>();
  selectedSubtypes = new Set<string>();
  subtypeSearch = '';

  // Main environment multiselect
  allMainEnvs: string[] = [];
  selectedMainEnvs = new Set<string>();
  mainEnvSearch = '';

  // Environment location multiselect (shown only when ≥1 main env is selected)
  envSubsByMainEnv = new Map<string, Set<string>>();
  selectedEnvSubs = new Set<string>();
  envSubSearch = '';

  openDropdown: 'mainType' | 'subtype' | 'env' | 'envSub' | null = null;

  constructor(private sf: StarfinderDataService) {}

  ngOnInit(): void {
    this.sf.getIndex(this.category).subscribe({
      next: data => {
        this.entries = data;
        this.loading = false;
        this.buildFilterOptions();
      },
      error: () => {
        this.error = `Failed to load ${this.category} data.`;
        this.loading = false;
      }
    });
  }

  // ---- type string parsing ----
  private parseType(typeStr: string): { mainType: string; subtypes: string[] } {
    const trimmed = typeStr.trim();
    const parenIdx = trimmed.indexOf('(');
    if (parenIdx === -1) {
      return { mainType: trimmed.toLowerCase(), subtypes: [] };
    }
    const mainType = trimmed.slice(0, parenIdx).trim().toLowerCase();
    const inner = trimmed.slice(parenIdx + 1).replace(/\).*$/, '');
    const subtypes = inner.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return { mainType, subtypes };
  }

  private parseEnv(envStr: string): { mainEnv: string; subs: string[] } {
    const trimmed = envStr.trim();
    const parenIdx = trimmed.indexOf('(');
    if (parenIdx === -1) {
      return { mainEnv: trimmed.toLowerCase(), subs: [] };
    }
    const mainEnv = trimmed.slice(0, parenIdx).trim().toLowerCase();
    const inner = trimmed.slice(parenIdx + 1).replace(/\).*$/, '');
    const subs = inner.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return { mainEnv, subs };
  }

  private buildFilterOptions(): void {
    const mainTypeSet = new Set<string>();
    const subtypesByMainType = new Map<string, Set<string>>();
    const mainEnvSet = new Set<string>();
    const envSubsByMainEnv = new Map<string, Set<string>>();

    for (const e of this.entries) {
      if (e.type) {
        const { mainType, subtypes } = this.parseType(e.type);
        mainTypeSet.add(mainType);
        if (!subtypesByMainType.has(mainType)) {
          subtypesByMainType.set(mainType, new Set());
        }
        for (const sub of subtypes) {
          subtypesByMainType.get(mainType)!.add(sub);
        }
      }
      if (e.environment) {
        const { mainEnv, subs } = this.parseEnv(e.environment);
        mainEnvSet.add(mainEnv);
        if (!envSubsByMainEnv.has(mainEnv)) {
          envSubsByMainEnv.set(mainEnv, new Set());
        }
        for (const sub of subs) {
          envSubsByMainEnv.get(mainEnv)!.add(sub);
        }
      }
    }

    this.allMainTypes = Array.from(mainTypeSet).sort((a, b) => a.localeCompare(b));
    this.subtypesByMainType = subtypesByMainType;
    this.allMainEnvs = Array.from(mainEnvSet).sort((a, b) => a.localeCompare(b));
    this.envSubsByMainEnv = envSubsByMainEnv;
  }

  // ---- available subtypes for selected main types ----
  get availableSubtypes(): string[] {
    const subtypes = new Set<string>();
    const mainTypes = this.selectedMainTypes.size > 0 ? this.selectedMainTypes : new Set<string>();
    for (const mt of mainTypes) {
      const subs = this.subtypesByMainType.get(mt);
      if (subs) for (const s of subs) subtypes.add(s);
    }
    return Array.from(subtypes).sort((a, b) => a.localeCompare(b));
  }

  get hasSubtypes(): boolean {
    return this.selectedMainTypes.size > 0 && this.availableSubtypes.length > 0;
  }

  // ---- available env locations for selected main envs ----
  get availableEnvSubs(): string[] {
    const subs = new Set<string>();
    for (const me of this.selectedMainEnvs) {
      const s = this.envSubsByMainEnv.get(me);
      if (s) for (const v of s) subs.add(v);
    }
    return Array.from(subs).sort((a, b) => a.localeCompare(b));
  }

  get hasEnvSubs(): boolean {
    return this.selectedMainEnvs.size > 0 && this.availableEnvSubs.length > 0;
  }

  // ---- filtered option lists for dropdown search ----
  get filteredMainTypeOptions(): string[] {
    if (!this.mainTypeSearch) return this.allMainTypes;
    const q = this.mainTypeSearch.toLowerCase();
    return this.allMainTypes.filter(t => t.includes(q));
  }

  get filteredSubtypeOptions(): string[] {
    const available = this.availableSubtypes;
    if (!this.subtypeSearch) return available;
    const q = this.subtypeSearch.toLowerCase();
    return available.filter(s => s.includes(q));
  }

  get filteredMainEnvOptions(): string[] {
    if (!this.mainEnvSearch) return this.allMainEnvs;
    const q = this.mainEnvSearch.toLowerCase();
    return this.allMainEnvs.filter(e => e.includes(q));
  }

  get filteredEnvSubOptions(): string[] {
    const available = this.availableEnvSubs;
    if (!this.envSubSearch) return available;
    const q = this.envSubSearch.toLowerCase();
    return available.filter(s => s.includes(q));
  }

  // ---- main filtered result ----
  get filteredEntries(): StarfinderEntry[] {
    const q = this.searchText.toLowerCase();
    return this.entries.filter(e => {
      if (q && !e.name.toLowerCase().includes(q) && !e.type.toLowerCase().includes(q)) {
        return false;
      }
      const cr = e.crValue ?? 0;
      if (cr < this.crMin || cr > this.crMax) return false;

      if (this.selectedMainTypes.size > 0 || this.selectedSubtypes.size > 0) {
        const { mainType, subtypes } = this.parseType(e.type);
        if (this.selectedMainTypes.size > 0 && !this.selectedMainTypes.has(mainType)) {
          return false;
        }
        if (this.selectedSubtypes.size > 0) {
          const hasMatch = subtypes.some(s => this.selectedSubtypes.has(s));
          if (!hasMatch) return false;
        }
      }

      if (this.selectedMainEnvs.size > 0 || this.selectedEnvSubs.size > 0) {
        const { mainEnv, subs } = this.parseEnv(e.environment || '');
        if (this.selectedMainEnvs.size > 0 && !this.selectedMainEnvs.has(mainEnv)) {
          return false;
        }
        if (this.selectedEnvSubs.size > 0) {
          const hasMatch = subs.some(s => this.selectedEnvSubs.has(s));
          if (!hasMatch) return false;
        }
      }

      return true;
    });
  }

  // ---- toggle helpers ----
  toggleMainType(t: string): void {
    const s = new Set(this.selectedMainTypes);
    s.has(t) ? s.delete(t) : s.add(t);
    this.selectedMainTypes = s;
    // Clear subtypes that no longer belong to any selected main type
    this.pruneSubtypes();
  }

  private pruneSubtypes(): void {
    if (this.selectedMainTypes.size === 0) {
      this.selectedSubtypes = new Set();
      return;
    }
    const validSubs = new Set<string>();
    for (const mt of this.selectedMainTypes) {
      const subs = this.subtypesByMainType.get(mt);
      if (subs) for (const s of subs) validSubs.add(s);
    }
    const pruned = new Set<string>();
    for (const s of this.selectedSubtypes) {
      if (validSubs.has(s)) pruned.add(s);
    }
    this.selectedSubtypes = pruned;
  }

  toggleSubtype(s: string): void {
    const set = new Set(this.selectedSubtypes);
    set.has(s) ? set.delete(s) : set.add(s);
    this.selectedSubtypes = set;
  }

  toggleMainEnv(e: string): void {
    const s = new Set(this.selectedMainEnvs);
    s.has(e) ? s.delete(e) : s.add(e);
    this.selectedMainEnvs = s;
    this.pruneEnvSubs();
  }

  private pruneEnvSubs(): void {
    if (this.selectedMainEnvs.size === 0) {
      this.selectedEnvSubs = new Set();
      return;
    }
    const validSubs = new Set<string>();
    for (const me of this.selectedMainEnvs) {
      const subs = this.envSubsByMainEnv.get(me);
      if (subs) for (const s of subs) validSubs.add(s);
    }
    const pruned = new Set<string>();
    for (const s of this.selectedEnvSubs) {
      if (validSubs.has(s)) pruned.add(s);
    }
    this.selectedEnvSubs = pruned;
  }

  toggleEnvSub(s: string): void {
    const set = new Set(this.selectedEnvSubs);
    set.has(s) ? set.delete(s) : set.add(s);
    this.selectedEnvSubs = set;
  }

  clearMainTypes(): void { this.selectedMainTypes = new Set(); this.selectedSubtypes = new Set(); }
  clearSubtypes(): void { this.selectedSubtypes = new Set(); }
  clearMainEnvs(): void { this.selectedMainEnvs = new Set(); this.selectedEnvSubs = new Set(); }
  clearEnvSubs(): void { this.selectedEnvSubs = new Set(); }

  clearAll(): void {
    this.searchText = '';
    this.crMin = 0;
    this.crMax = 30;
    this.selectedMainTypes = new Set();
    this.selectedSubtypes = new Set();
    this.selectedMainEnvs = new Set();
    this.selectedEnvSubs = new Set();
  }

  // ---- CR slider ----
  get crFillStyle(): object {
    const left = (this.crMin / 30) * 100;
    const width = ((this.crMax - this.crMin) / 30) * 100;
    return { left: `${left}%`, width: `${width}%` };
  }

  onCrMinInput(ev: Event): void {
    const v = +(ev.target as HTMLInputElement).value;
    this.crMin = Math.min(v, this.crMax);
    (ev.target as HTMLInputElement).value = String(this.crMin);
  }

  onCrMaxInput(ev: Event): void {
    const v = +(ev.target as HTMLInputElement).value;
    this.crMax = Math.max(v, this.crMin);
    (ev.target as HTMLInputElement).value = String(this.crMax);
  }

  crLabel(v: number): string {
    return v === 0 ? '< 1' : String(v);
  }

  // ---- dropdown state ----
  toggleDropdown(which: 'mainType' | 'subtype' | 'env' | 'envSub', ev: Event): void {
    ev.stopPropagation();
    this.openDropdown = this.openDropdown === which ? null : which;
  }

  stopProp(ev: Event): void { ev.stopPropagation(); }

  @HostListener('document:click')
  onDocumentClick(): void { this.openDropdown = null; }

  // ---- labels ----
  get mainTypeLabel(): string {
    return this.selectedMainTypes.size === 0 ? 'All types' : `${this.selectedMainTypes.size} selected`;
  }

  get subtypeLabel(): string {
    return this.selectedSubtypes.size === 0 ? 'All subtypes' : `${this.selectedSubtypes.size} selected`;
  }

  get mainEnvLabel(): string {
    return this.selectedMainEnvs.size === 0 ? 'All environments' : `${this.selectedMainEnvs.size} selected`;
  }

  get envSubLabel(): string {
    return this.selectedEnvSubs.size === 0 ? 'All locations' : `${this.selectedEnvSubs.size} selected`;
  }

  get hasActiveFilters(): boolean {
    return !!this.searchText || this.crMin > 0 || this.crMax < 30
      || this.selectedMainTypes.size > 0 || this.selectedSubtypes.size > 0
      || this.selectedMainEnvs.size > 0 || this.selectedEnvSubs.size > 0;
  }
}
