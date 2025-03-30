import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {CharacterOverviewComponent} from './character-overview/character-overview.component';
import {WizardStartComponent} from "./wizard/wizard-start.component";
import {ReactiveFormsModule} from "@angular/forms";
import {RouterLink} from "@angular/router";
import { WizardProgressBarComponent } from './wizard/wizard-progress-bar/wizard-progress-bar.component';

@NgModule({
  declarations: [
    CharacterOverviewComponent,
    WizardStartComponent,
    WizardProgressBarComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    RouterLink
  ],
  providers: [],
  bootstrap: []
})
export class CharacterCreatorModule { }
