import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StarfinderComponent } from './starfinder.component';
import { EnemiesAliensComponent } from './enemies-aliens/enemies-aliens.component';
import { EnemiesStarshipsComponent } from './enemies-starships/enemies-starships.component';

const routes: Routes = [
  { path: 'starfinder', component: StarfinderComponent },
  { path: 'starfinder/enemies-aliens', component: EnemiesAliensComponent },
  { path: 'starfinder/enemies-starships', component: EnemiesStarshipsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StarfinderRoutingModule { }

