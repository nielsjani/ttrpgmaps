import { Component } from '@angular/core';

@Component({
  selector: 'app-enemies-aliens',
  template: `<app-starfinder-entry-list
    category="alien"
    title="Enemies – Aliens"
    backRoute="/starfinder">
  </app-starfinder-entry-list>`
})
export class EnemiesAliensComponent {}

