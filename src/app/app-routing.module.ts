import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {SwordCoastLeuvenComponent} from "./sword-coast-leuven/sword-coast-leuven.component";
import {HomeComponent} from "./home/home.component";

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'sword-coast-leuven', component: SwordCoastLeuvenComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
