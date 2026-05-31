import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { StarfinderRoutingModule } from './starfinder-routing.module';
import { StarfinderComponent } from './starfinder.component';
import { EnemiesAliensComponent } from './enemies-aliens/enemies-aliens.component';
import { EnemiesStarshipsComponent } from './enemies-starships/enemies-starships.component';

@NgModule({
  declarations: [
    StarfinderComponent,
    EnemiesAliensComponent,
    EnemiesStarshipsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    StarfinderRoutingModule,
  ]
})
export class StarfinderModule { }

