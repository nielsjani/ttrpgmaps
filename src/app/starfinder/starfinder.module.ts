import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { StarfinderRoutingModule } from './starfinder-routing.module';
import { StarfinderComponent } from './starfinder.component';
import { EnemiesAliensComponent } from './enemies-aliens/enemies-aliens.component';
import { EnemiesStarshipsComponent } from './enemies-starships/enemies-starships.component';
import { StarfinderEntryListComponent } from './entry-list/starfinder-entry-list.component';
import { StarfinderDetailComponent } from './detail/starfinder-detail.component';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { UniversalMonsterRulesComponent } from './universal-monster-rules/universal-monster-rules.component';
import { UmrDetailComponent } from './universal-monster-rules/umr-detail.component';
import { TemplateGraftsComponent } from './template-grafts/template-grafts.component';
import { TemplateGraftDetailComponent } from './template-grafts/template-graft-detail.component';
import { FightingStylesComponent } from './fighting-styles/fighting-styles.component';
import { FightingStyleDetailComponent } from './fighting-styles/fighting-style-detail.component';
import { EncounterBuilderComponent } from './encounter-builder/encounter-builder.component';

@NgModule({
  declarations: [
    StarfinderComponent,
    EnemiesAliensComponent,
    EnemiesStarshipsComponent,
    StarfinderEntryListComponent,
    StarfinderDetailComponent,
    SafeHtmlPipe,
    UniversalMonsterRulesComponent,
    UmrDetailComponent,
    TemplateGraftsComponent,
    TemplateGraftDetailComponent,
    FightingStylesComponent,
    FightingStyleDetailComponent,
    EncounterBuilderComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HttpClientModule,
    StarfinderRoutingModule,
  ]
})
export class StarfinderModule { }
