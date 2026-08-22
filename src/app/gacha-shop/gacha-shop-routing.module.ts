import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GachaShopComponent } from './gacha-shop.component';

const routes: Routes = [
  { path: 'shop-generator/gretchens-trinkets', component: GachaShopComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GachaShopRoutingModule { }
