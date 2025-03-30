import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WizardStartComponent} from "./wizard/wizard-start.component";

const routes: Routes = [
  { path: 'wizard/2014/start', component: WizardStartComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class CharacterCreatorRoutingModule { }
