import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapMakerComponent } from './map-maker.component';

const routes: Routes = [
  { path: 'map-maker', component: MapMakerComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MapMakerRoutingModule { }
