import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StarfinderDataService } from '../services/starfinder-data.service';
import { UniversalMonsterRule } from '../types/starfinder.types';

@Component({
  selector: 'app-umr-detail',
  templateUrl: './umr-detail.component.html',
  styleUrls: ['./umr-detail.component.scss']
})
export class UmrDetailComponent implements OnInit {
  slug = '';
  rule: UniversalMonsterRule | null = null;
  loading = true;
  error = '';

  constructor(private route: ActivatedRoute, private sf: StarfinderDataService) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.sf.getUniversalMonsterRules().subscribe({
      next: rules => {
        const found = rules.find(r => r.slug === this.slug);
        if (found) {
          this.rule = found;
        } else {
          this.error = `Rule "${this.slug}" not found.`;
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load universal monster rules.';
        this.loading = false;
      }
    });
  }

  get abilityTypeLabel(): string {
    const map: Record<string, string> = {
      'Ex': 'Extraordinary',
      'Su': 'Supernatural',
      'Sp': 'Spell-Like Ability'
    };
    return this.rule?.ability_type ? (map[this.rule.ability_type] ?? this.rule.ability_type) : '';
  }

  get descriptionParagraphs(): string[] {
    const desc = this.rule?.description ?? '';
    return desc.split(/\n{2,}/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean);
  }
}

