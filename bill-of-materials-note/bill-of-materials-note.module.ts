import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BillOfMaterialsNotePage } from './bill-of-materials-note.page';
import { ShareModule } from 'src/app/share.module';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    NgOptionHighlightModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: BillOfMaterialsNotePage }])
  ],
  declarations: [BillOfMaterialsNotePage]
})
export class BillOfMaterialsNotePageModule {}
