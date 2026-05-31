import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StarfinderDataService } from '../services/starfinder-data.service';
import { StarfinderDetail } from '../types/starfinder.types';

@Component({
  selector: 'app-starfinder-detail',
  templateUrl: './starfinder-detail.component.html',
  styleUrls: ['./starfinder-detail.component.scss']
})
export class StarfinderDetailComponent implements OnInit {
  category: 'alien' | 'starship' = 'alien';
  slug = '';
  detail: StarfinderDetail | null = null;
  loading = true;
  error = '';

  constructor(private route: ActivatedRoute, private sf: StarfinderDataService) {}

  ngOnInit(): void {
    this.category = this.route.snapshot.data['category'] as 'alien' | 'starship';
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.sf.getDetail(this.category, this.slug).subscribe({
      next: d => { this.detail = d; this.loading = false; },
      error: () => { this.error = `Could not load details for "${this.slug}".`; this.loading = false; }
    });
  }

  get listRoute(): string {
    return this.category === 'alien' ? '/starfinder/enemies-aliens' : '/starfinder/enemies-starships';
  }

  get listLabel(): string {
    return this.category === 'alien' ? 'Enemies – Aliens' : 'Enemies – Starships';
  }

  get headerLine(): string {
    return [this.detail?.alignment, this.detail?.size,
            this.detail?.creature_type || this.detail?.type]
      .filter(Boolean).join(' ');
  }

  get saves(): string {
    const d = this.detail;
    if (!d?.fort && !d?.ref && !d?.will) return '';
    return `Fort ${d.fort ?? '—'}, Ref ${d.ref ?? '—'}, Will ${d.will ?? '—'}`;
  }

  get abilityScores(): string {
    const a = this.detail?.ability_scores;
    if (!a) return '';
    return `STR ${a.str}  DEX ${a.dex}  CON ${a.con}  INT ${a.int}  WIS ${a.wis}  CHA ${a.cha}`;
  }

  get slaText(): string {
    const sla = this.detail?.spell_like_abilities;
    if (!sla) return '';
    if (typeof sla === 'string') return sla;
    return `(${sla.caster_info}) ${sla.spells}`;
  }
}

