import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MapContainerComponent} from "./map-container/map-container.component";
import {HomeComponent} from "./home/home.component";
import {CharacterOverviewComponent} from "./character-creator/character-overview/character-overview.component";

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'character-creator', component: CharacterOverviewComponent },
  { path: ':mapId/:subMapId', component: MapContainerComponent },
  { path: ':mapId', component: MapContainerComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
