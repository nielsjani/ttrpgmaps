import { Component, OnInit } from '@angular/core';
import { FightingStyle, FightingStyleAbility } from '../types/starfinder.types';
import { StarfinderDataService } from '../services/starfinder-data.service';

@Component({
  selector: 'app-fighting-styles',
  templateUrl: './fighting-styles.component.html',
  styleUrls: ['./fighting-styles.component.scss']
})
export class FightingStylesComponent implements OnInit {
  styles: FightingStyle[] = [];
  loading = true;
  error = '';
  searchText = '';
  abilitySearch = '';

  constructor(private sf: StarfinderDataService) {}

  ngOnInit(): void {
    this.sf.getFightingStyles().subscribe({
      next: data => {
        this.styles = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load fighting styles.';
        this.loading = false;
      }
    });
  }

  get filteredStyles(): FightingStyle[] {
    const styleQuery = this.searchText.trim().toLowerCase();
    const abilityQuery = this.abilitySearch.trim().toLowerCase();

    return this.styles.filter(style => {
      const matchesStyle = !styleQuery || style.name.toLowerCase().includes(styleQuery);
      const matchesAbility = !abilityQuery || style.special_abilities.some(ability =>
        ability.name.toLowerCase().includes(abilityQuery)
      );
      return matchesStyle && matchesAbility;
    });
  }

  abilityAnchorId(ability: FightingStyleAbility, index: number): string {
    return `ability-${index}-${this.sf.toSlug(ability.name)}`;
  }
}
