import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StaffCateringBookingNotePage } from './staff-catering-booking-note.page';
import { ShareModule } from 'src/app/share.module';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { NgSelectModule } from '@ng-select/ng-select';
import { StaffCateringBookingComponentsModule } from './components/staff-catering-booking-components.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    NgOptionHighlightModule,
    ShareModule,
    StaffCateringBookingComponentsModule,
    RouterModule.forChild([{ path: '', component: StaffCateringBookingNotePage }])
  ],
  declarations: [StaffCateringBookingNotePage]
})
export class StaffCateringBookingNotePageModule {}
