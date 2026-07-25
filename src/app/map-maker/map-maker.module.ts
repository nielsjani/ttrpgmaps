import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MapMakerComponent } from './map-maker.component';
import { MapMakerRoutingModule } from './map-maker-routing.module';
import { MapMakerCanvasComponent } from './canvas/map-maker-canvas.component';
import { MapMakerSidebarComponent } from './sidebar/map-maker-sidebar.component';
import { MapMakerStateService } from './services/map-maker-state.service';

@NgModule({
  declarations: [
    MapMakerComponent,
    MapMakerCanvasComponent,
    MapMakerSidebarComponent,
  ],
  imports: [
    CommonModule,
    MapMakerRoutingModule,
  ],
  providers: [
    MapMakerStateService,
  ]
})
export class MapMakerModule { }
