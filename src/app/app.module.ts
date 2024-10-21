import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import { SwordCoastLeuvenComponent } from './sword-coast-leuven/sword-coast-leuven.component';
import { HomeComponent } from './home/home.component';
import { SwordCoastLeuvenSubmapComponent } from './sword-coast-leuven-submap/sword-coast-leuven-submap.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    SwordCoastLeuvenComponent,
    HomeComponent,
    SwordCoastLeuvenSubmapComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
