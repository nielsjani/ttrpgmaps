import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { ShopGeneratorComponent } from './shop-generator.component';
import { RarityCounterComponent } from './rarity-counter/rarity-counter.component';
import { ShopGeneratorRoutingModule } from './shop-generator-routing.module';

@NgModule({
  declarations: [
    ShopGeneratorComponent,
    RarityCounterComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ShopGeneratorRoutingModule,
  ]
})
export class ShopGeneratorModule { }

