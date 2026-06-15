import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FightingStyle, FightingStyleAbility } from '../types/starfinder.types';
import { StarfinderDataService } from '../services/starfinder-data.service';

@Component({
  selector: 'app-fighting-style-detail',
  templateUrl: './fighting-style-detail.component.html',
  styleUrls: ['./fighting-style-detail.component.scss']
})
export class FightingStyleDetailComponent implements OnInit {
  style: FightingStyle | null = null;
  loading = true;
  error = '';
  private currentFragment = '';

  constructor(
    private route: ActivatedRoute,
    private sf: StarfinderDataService
  ) {}

  ngOnInit(): void {
    this.route.fragment.subscribe(fragment => {
      this.currentFragment = fragment || '';
      this.scrollToFragment();
    });

    this.route.paramMap.subscribe(params => {
      this.loadStyle(params.get('slug') || '');
    });
  }

  abilityAnchorId(ability: FightingStyleAbility, index: number): string {
    return `ability-${index}-${this.sf.toSlug(ability.name)}`;
  }

  private loadStyle(slug: string): void {
    this.loading = true;
    this.error = '';
    this.style = null;

    this.sf.getFightingStyles().subscribe({
      next: styles => {
        this.style = styles.find(style => style.slug === slug) || null;
        if (!this.style) {
          this.error = 'Fighting style not found.';
        }
        this.loading = false;
        setTimeout(() => this.scrollToFragment());
      },
      error: () => {
        this.error = 'Failed to load fighting styles.';
        this.loading = false;
      }
    });
  }

  private scrollToFragment(): void {
    if (!this.currentFragment || !this.style) {
      return;
    }

    const target = document.getElementById(this.currentFragment);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
