import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MapMakerComponent } from './map-maker.component';
import { MapMakerRoutingModule } from './map-maker-routing.module';

@NgModule({
  declarations: [
    MapMakerComponent,
  ],
  imports: [
    CommonModule,
    MapMakerRoutingModule,
  ]
})
export class MapMakerModule { }
