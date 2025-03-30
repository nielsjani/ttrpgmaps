import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {WizardComponent} from "./wizard/wizard.component";

const routes: Routes = [
  { path: 'wizard/2014/start', component: WizardComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class CharacterCreatorRoutingModule { }
