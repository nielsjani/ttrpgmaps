import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapMakerComponent } from './map-maker.component';
import { MapMakerPlayerViewComponent } from './player-view/map-maker-player-view.component';

const routes: Routes = [
  { path: 'map-maker', component: MapMakerComponent },
  { path: 'map-maker/player', component: MapMakerPlayerViewComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MapMakerRoutingModule { }
