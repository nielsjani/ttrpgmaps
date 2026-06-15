import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StarfinderComponent } from './starfinder.component';
import { EnemiesAliensComponent } from './enemies-aliens/enemies-aliens.component';
import { EnemiesStarshipsComponent } from './enemies-starships/enemies-starships.component';
import { StarfinderDetailComponent } from './detail/starfinder-detail.component';
import { UniversalMonsterRulesComponent } from './universal-monster-rules/universal-monster-rules.component';
import { UmrDetailComponent } from './universal-monster-rules/umr-detail.component';
import { TemplateGraftsComponent } from './template-grafts/template-grafts.component';
import { TemplateGraftDetailComponent } from './template-grafts/template-graft-detail.component';
import { FightingStylesComponent } from './fighting-styles/fighting-styles.component';
import { FightingStyleDetailComponent } from './fighting-styles/fighting-style-detail.component';

const routes: Routes = [
  { path: 'starfinder', component: StarfinderComponent },
  { path: 'starfinder/enemies-aliens', component: EnemiesAliensComponent },
  { path: 'starfinder/enemies-aliens/:slug', component: StarfinderDetailComponent, data: { category: 'alien' } },
  { path: 'starfinder/enemies-starships', component: EnemiesStarshipsComponent },
  { path: 'starfinder/enemies-starships/:slug', component: StarfinderDetailComponent, data: { category: 'starship' } },
  { path: 'starfinder/universal-monster-rules', component: UniversalMonsterRulesComponent },
  { path: 'starfinder/universal-monster-rules/:slug', component: UmrDetailComponent },
  { path: 'starfinder/template-grafts', component: TemplateGraftsComponent },
  { path: 'starfinder/template-grafts/:slug', component: TemplateGraftDetailComponent },
  { path: 'starfinder/fighting-styles', component: FightingStylesComponent },
  { path: 'starfinder/fighting-styles/:slug', component: FightingStyleDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StarfinderRoutingModule { }
