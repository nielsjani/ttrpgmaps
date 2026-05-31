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

  // Type multiselect
  allTypes: string[] = [];
  selectedTypes = new Set<string>();
  typeSearch = '';

  // Environment multiselect
  allEnvironments: string[] = [];
  selectedEnvironments = new Set<string>();
  envSearch = '';

  openDropdown: 'type' | 'env' | null = null;

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

  private buildFilterOptions(): void {
    const types = new Set<string>();
    const envs = new Set<string>();
    for (const e of this.entries) {
      if (e.type) types.add(e.type);
      if (e.environment) envs.add(e.environment);
    }
    this.allTypes = Array.from(types).sort((a, b) => a.localeCompare(b));
    this.allEnvironments = Array.from(envs).sort((a, b) => a.localeCompare(b));
  }

  // ---- filtered option lists for dropdown search ----
  get filteredTypeOptions(): string[] {
    if (!this.typeSearch) return this.allTypes;
    const q = this.typeSearch.toLowerCase();
    return this.allTypes.filter(t => t.toLowerCase().includes(q));
  }

  get filteredEnvOptions(): string[] {
    if (!this.envSearch) return this.allEnvironments;
    const q = this.envSearch.toLowerCase();
    return this.allEnvironments.filter(e => e.toLowerCase().includes(q));
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
      if (this.selectedTypes.size > 0 && !this.selectedTypes.has(e.type)) return false;
      if (this.selectedEnvironments.size > 0 && !this.selectedEnvironments.has(e.environment)) return false;
      return true;
    });
  }

  // ---- toggle helpers ----
  toggleType(t: string): void {
    const s = new Set(this.selectedTypes);
    s.has(t) ? s.delete(t) : s.add(t);
    this.selectedTypes = s;
  }

  toggleEnv(e: string): void {
    const s = new Set(this.selectedEnvironments);
    s.has(e) ? s.delete(e) : s.add(e);
    this.selectedEnvironments = s;
  }

  clearTypes(): void { this.selectedTypes = new Set(); }
  clearEnvs(): void { this.selectedEnvironments = new Set(); }

  clearAll(): void {
    this.searchText = '';
    this.crMin = 0;
    this.crMax = 30;
    this.selectedTypes = new Set();
    this.selectedEnvironments = new Set();
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
  toggleDropdown(which: 'type' | 'env', ev: Event): void {
    ev.stopPropagation();
    this.openDropdown = this.openDropdown === which ? null : which;
  }

  stopProp(ev: Event): void { ev.stopPropagation(); }

  @HostListener('document:click')
  onDocumentClick(): void { this.openDropdown = null; }

  // ---- labels ----
  get typeLabel(): string {
    return this.selectedTypes.size === 0 ? 'All types' : `${this.selectedTypes.size} selected`;
  }

  get envLabel(): string {
    return this.selectedEnvironments.size === 0 ? 'All environments' : `${this.selectedEnvironments.size} selected`;
  }

  get hasActiveFilters(): boolean {
    return !!this.searchText || this.crMin > 0 || this.crMax < 30
      || this.selectedTypes.size > 0 || this.selectedEnvironments.size > 0;
  }
}

