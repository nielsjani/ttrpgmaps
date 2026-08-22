nimport { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { GachaShopComponent } from './gacha-shop.component';
import { GachaShopRoutingModule } from './gacha-shop-routing.module';

@NgModule({
  declarations: [
    GachaShopComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    GachaShopRoutingModule,
  ]
})
export class GachaShopModule { }
