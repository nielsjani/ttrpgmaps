import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShopGeneratorComponent } from './shop-generator.component';

const routes: Routes = [
  { path: 'shop-generator', component: ShopGeneratorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ShopGeneratorRoutingModule { }

