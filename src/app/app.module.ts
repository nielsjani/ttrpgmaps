import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {MapComponent} from './map/map.component';
import {MapContainerComponent} from './map-container/map-container.component';
import {HomeComponent} from './home/home.component';
import {CampaignMapsComponent} from './campaign-maps/campaign-maps.component';
import {CharacterCreatorModule} from "./character-creator/character-creator.module";
import {CharacterCreatorRoutingModule} from "./character-creator/character-creator-routing.module";
import {ShopGeneratorModule} from "./shop-generator/shop-generator.module";
import {StarfinderModule} from "./starfinder/starfinder.module";
import {MapMakerModule} from "./map-maker/map-maker.module";

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    MapContainerComponent,
    HomeComponent,
    CampaignMapsComponent,
  ],
  imports: [
    BrowserModule,
    CharacterCreatorRoutingModule,
    ShopGeneratorModule,
    StarfinderModule,
    MapMakerModule,
    AppRoutingModule,
    CharacterCreatorModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
