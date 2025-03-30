import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {MapComponent} from './map/map.component';
import {MapContainerComponent} from './map-container/map-container.component';
import {HomeComponent} from './home/home.component';
import {CharacterCreatorModule} from "./character-creator/character-creator.module";
import {CharacterCreatorRoutingModule} from "./character-creator/character-creator-routing.module";

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    MapContainerComponent,
    HomeComponent,
  ],
  imports: [
    BrowserModule,
    CharacterCreatorRoutingModule,
    AppRoutingModule,
    CharacterCreatorModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
