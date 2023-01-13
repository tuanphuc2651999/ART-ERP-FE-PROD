import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OrderRecommendationPage } from './order-recommendation.page';
import { ShareModule } from 'src/app/share.module';
import { OrderRecommendationModalPage } from '../order-recommendation-modal/order-recommendation-modal.page';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { NgxMaskModule } from 'ngx-mask';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    NgSelectModule,
    NgOptionHighlightModule,
    ShareModule,
    NgxMaskModule.forRoot(),
    RouterModule.forChild([{ path: '', component: OrderRecommendationPage }])
  ],
  declarations: [OrderRecommendationPage, OrderRecommendationModalPage]
})
export class OrderRecommendationPageModule {}
