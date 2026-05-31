import { Component, OnInit } from '@angular/core';
import { StarfinderDataService } from '../services/starfinder-data.service';
import { UniversalMonsterRule } from '../types/starfinder.types';

@Component({
  selector: 'app-universal-monster-rules',
  templateUrl: './universal-monster-rules.component.html',
  styleUrls: ['./universal-monster-rules.component.scss']
})
export class UniversalMonsterRulesComponent implements OnInit {
  rules: UniversalMonsterRule[] = [];
  loading = true;
  error = '';
  searchText = '';

  constructor(private sf: StarfinderDataService) {}

  ngOnInit(): void {
    this.sf.getUniversalMonsterRules().subscribe({
      next: data => { this.rules = data; this.loading = false; },
      error: () => { this.error = 'Failed to load universal monster rules.'; this.loading = false; }
    });
  }

  get filteredRules(): UniversalMonsterRule[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.rules;
    return this.rules.filter(r => r.name.toLowerCase().includes(q));
  }

  abilityTypeLabel(t: string | undefined): string {
    if (!t) return '';
    const map: Record<string, string> = {
      'Ex': 'Extraordinary', 'Su': 'Supernatural', 'Sp': 'Spell-Like'
    };
    return map[t] ?? t;
  }
}

