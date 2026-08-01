import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MapMakerComponent } from './map-maker.component';
import { MapMakerRoutingModule } from './map-maker-routing.module';
import { MapMakerCanvasComponent } from './canvas/map-maker-canvas.component';
import { MapMakerSidebarComponent } from './sidebar/map-maker-sidebar.component';
import { MapMakerStateService } from './services/map-maker-state.service';
import { MapMakerFileService } from './services/map-maker-file.service';
import { MapMakerPlayerViewComponent } from './player-view/map-maker-player-view.component';

@NgModule({
  declarations: [
    MapMakerComponent,
    MapMakerCanvasComponent,
    MapMakerSidebarComponent,
    MapMakerPlayerViewComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MapMakerRoutingModule,
  ],
  providers: [
    MapMakerStateService,
    MapMakerFileService,
  ]
})
export class MapMakerModule { }
