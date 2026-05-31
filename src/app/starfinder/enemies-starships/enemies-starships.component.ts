import { Component } from '@angular/core';

@Component({
  selector: 'app-enemies-starships',
  template: `<app-starfinder-entry-list
    category="starship"
    title="Enemies – Starships"
    backRoute="/starfinder">
  </app-starfinder-entry-list>`
})
export class EnemiesStarshipsComponent {}

