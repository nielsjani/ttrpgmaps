import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {CharacterOverviewComponent} from './character-overview/character-overview.component';
import {WizardComponent} from "./wizard/wizard.component";
import {ReactiveFormsModule} from "@angular/forms";
import {RouterLink} from "@angular/router";
import { WizardProgressBarComponent } from './wizard/wizard-progress-bar/wizard-progress-bar.component';
import { StartStepComponent } from './wizard/start-step/start-step.component';
import { ClassStepComponent } from './wizard/class-step/class-step.component';

@NgModule({
  declarations: [
    CharacterOverviewComponent,
    WizardComponent,
    WizardProgressBarComponent,
    StartStepComponent,
    ClassStepComponent
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
