import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  // PROD_ForecastDetailProvider,
  // PROD_ForecastProvider,
  SYS_TypeProvider,
  WMS_ItemProvider,
  WMS_PriceListProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-forecast-detail',
  templateUrl: './forecast-detail.page.html',
  styleUrls: ['./forecast-detail.page.scss'],
})
export class ForecastDetailPage extends PageBase {
  viewDataSource = [];
  branchList = [];
  itemsState = [];
  columnView = [];
  //removedItem
  removedItems = [];

  constructor(
    public pageProvider: WMS_ItemProvider, //PROD_ForecastProvider,
    public forecastDetailService: WMS_ItemProvider, //PROD_ForecastProvider,
    // public bomDetailProvider: PROD_ForecastDetailProvider,
    public branchProvider: BRA_BranchProvider,
    public itemProvider: WMS_ItemProvider,
    public typeProvider: SYS_TypeProvider,
    public priceListProvider: WMS_PriceListProvider,

    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
  ) {
    super();
    this.pageConfig.isDetailPage = true;

    this.formGroup = formBuilder.group({
      Id: new FormControl({ value: 0, disabled: true }),
      IDBranch: [''],
      StartDate: [''],
      EndDate: [''],
      Name: [''],
      Period: ['Daily'],
      Rows: this.formBuilder.array([]),
      Lines: this.formBuilder.array([]),
      Remark: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: [''],
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
    });
  }

  preLoadData(event) {
    this.viewDataSource = [
      { Name: 'Daily', Code: 'Daily' },
      { Name: 'Weekly', Code: 'Weekly' },
      { Name: 'Monthly', Code: 'Monthly' },
    ];
    this.branchProvider
      .read({
        Skip: 0,
        Take: 5000,
        Type: 'Warehouse',
        AllParent: true,
        Id: this.env.selectedBranchAndChildren,
      })
      .then((resp) => {
        lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
          this.branchList = result;
          this.branchList.forEach((i) => {
            i.disabled = true;
          });
          this.markNestedNode(this.branchList, this.env.selectedBranch);
        });
      });
    super.preLoadData(event);
  }
  loadData(event) {
    this.item ={};
    this.item = {
      Id: 1,
      Code: null,
      Name: 'Forecast 1',
      IDBranch: 616,
      StartDate: '2024-01-21',
      EndDate: '2024-01-31',
      Period: 'Daily',
      IsDeleted: false,
      IsDisabled: false,
      Remark: 'aaa',
      CreatedBy: 'Puc',
      ModifiedBy: 'Puc',
      ModifiedDate: '2024-01-01',
      CreatedDate: '2024-01-01',
      Lines: [
        {
          Id: 1,
          IDForecast: 1,
          IDWarehouse: 1,
          IDItem: 9716,
          ItemName: 'Chè khúc bạch',
          UoMs: [
            { Id: 1, Name: 'Khách' },
            { Id: 2, Name: 'Nhóm' },
          ],
          IDUoM: 1,
          Date: '2024-01-01',
          Quantity: 100,
        },
        {
          Id: 2,
          IDForecast: 1,
          IDWarehouse: 1,
          IDItem: 9716,
          ItemName: 'Chè khúc bạch',
          IDUoM: 1,
          UoMs: [
            { Id: 1, Name: 'Khách' },
            { Id: 2, Name: 'Nhóm' },
          ],
          Date: '2024-01-22',
          Quantity: 160,
        },
        {
          Id: 1,
          IDForecast: 1,
          IDWarehouse: 1,
          IDItem: 9717,
          ItemName: 'Sâm bổ lượng',
          IDUoM: 3,
          UoMs: [
            { Id: 3, Name: 'Ly' },
            { Id: 4, Name: 'Tô' },
          ],
          Date: '2024-01-28',
          Quantity: 120,
        },
        {
          Id: 2,
          IDForecast: 1,
          IDWarehouse: 1,
          IDItem: 9717,
          ItemName: 'Sâm bổ lượng',
          UoMs: [
            { Id: 3, Name: 'Ly' },
            { Id: 4, Name: 'Tô' },
          ],
          IDUoM: 3,
          Date: '2024-01-29',
          Quantity: 130,
        },
      ],
    };
    this.loadedData();
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    super.loadedData(event, ignoredFromGroup);
    this.renderView();
    this.patchLinesValue();
  }
  renderView(reRender = false) {
    if(!this.formGroup.get('StartDate').value || !this.formGroup.get('EndDate').value){
      return;
    }
    const Lines = this.formGroup.get('Lines') as FormArray;
    Lines.clear();
    let dates = [];
    this.columnView = [];
    let startDate = new Date(this.formGroup.get('StartDate').value);
    let endDate = new Date(this.formGroup.get('EndDate').value);
    
    if (this.formGroup.get('Period').value === 'Daily') {
      let dateBetweens = lib.getStartEndDates(startDate,endDate);
      dateBetweens.forEach(date=>{
        date = new Date(date.Date);
        let dateFormatted  = lib.dateFormat(date);
        this.columnView.push({
          Title : dateFormatted,
          SubTitle: this.getDayOfWeek(date),
          Date: dateFormatted
        });
    });
    }
    else if (this.formGroup.get('Period').value === 'Weekly') {
     
      startDate = lib.getWeekDates(startDate)[1];
      let endWeeks = lib.getWeekDates(endDate);
      let endDateWeek = new Date(endWeeks[endWeeks.length-1]);// t7
      endDateWeek.setDate(endDateWeek.getDate() + 1); // cn
      endDate = endDateWeek;
      let dateBetweens = lib.getStartEndDates(startDate,endDate);
      dateBetweens.forEach(date=>{
        date = new Date(date.Date);
        if(date.getDay() === 1){// t2
          this.columnView.push({
            Title :'Week '+ this.getWeekNumber(date),
            SubTitle: null,
            Date: lib.dateFormat(date)
          });
        }
      });
    }
    else if (this.formGroup.get('Period').value === 'Monthly') {
      startDate.setDate(1);
       endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
      let dateBetweens = lib.getStartEndDates(startDate,endDate);
      dateBetweens.forEach(date=>{
        date = new Date(date.Date);
        if(date.getDate() === 1){// t2
          this.columnView.push({
            Title : date.toLocaleString('default', { month: 'long' }),
            SubTitle: null,
            Date: lib.dateFormat(date)
          });
        }
      });
     
    }
    console.log(this.columnView);
   
    if(reRender){
      if (this.pageConfig.canDelete) {
        let groups = <FormArray>this.formGroup.controls.Lines;
  
        let itemsToDelete = groups.controls.map(s=> s.get('Id').value);
          this.env .showLoading('Xin vui lòng chờ trong giây lát...', this.forecastDetailService.delete(itemsToDelete)) .then((_) => {
          
              this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
              this.isAllChecked = false;
              this.patchLinesValue();
            })
            .catch((err) => {
              const Lines = this.formGroup.get('Lines') as FormArray;
              Lines.clear();
              this.item.Lines = [];
              this.patchLinesValue();// temp
              this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
              console.log(err);
            });
      }
    }
    else{
      const groupedLines = this.item.Lines.reduce((acc, line) => {
        // Create a unique key for grouping
        const key = `${line.IDItem}-${line.IDUoM}`;
        // Check if the key already exists in the accumulator
        if (!acc[key]) {
          // If not, add the line with its current properties
          acc[key] = { ...line ,Key: key};
        }
        return acc;
      }, {});
      this.itemsState = Object.values(groupedLines);
      this.itemsState.forEach((is) => {
        this.addRows(is);
      });
    }

}
 

  private patchLinesValue() {
    this.pageConfig.showSpinner = true;
    this.columnView.forEach((d) => {
      this.itemsState.forEach((state,index) => {
        let line = this.item.Lines.find(
          (x) => x.Date == d.Date && x.IDItem == state.IDItem && x.IDItem && state.IDUoM == x.IDUoM,
        );
        if (line) {
          this.addLine(line);
        } else {
          this.addLine(
            {
              IDForecast: this.item.Id,
              IDItem: state.IDItem,
              Key :  state.IDItem+'-'+ state.IDUoM,
              Quantity: 0,
              Id : 0,
              // UoMName: [line.UoMName],
              // ItemName: [line.ItemName], //de hien thi
              IDUoM: state.IDUoM, //de hien thi
              Date: d.Date,
            },
            true,
          );
        }
      });
    });

    // if (this.item.Lines?.length) {
    //   this.item.Lines.forEach((i) => {
    //     this.addLine(i);
    //   });
    // }

    if (!this.pageConfig.canEdit) {
      this.formGroup.controls.Lines.disable();
    }

    this.pageConfig.showSpinner = false;
    console.log(this.formGroup);
  }
  addLine(line: any, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.Lines;
    let group = this.formBuilder.group({
      Id: new FormControl({ value: line.Id, disabled: true }),
      IDForecast: new FormControl({ value: line.IDForecast, disabled: true }),
      Key: new FormControl({ value: line.IDItem+'-'+line.IDUoM, disabled: true }),
      Name: [line.Name],
      IDItem: [line.IDItem, Validators.required],
      Quantity: [line.Quantity],
      // UoMName: [line.UoMName],
      // ItemName: [line.ItemName], //de hien thi
      IDUoM: [line.IDUoM], //de hien thi
      Date: [line?.Date],
      IsDisabled: new FormControl({ value: line.IsDisabled, disabled: true }),
      IsDeleted: new FormControl({ value: line.IsDeleted, disabled: true }),
      CreatedBy: new FormControl({ value: line.CreatedBy, disabled: true }),
      CreatedDate: new FormControl({ value: line.CreatedDate, disabled: true }),
      ModifiedBy: new FormControl({ value: line.ModifiedBy, disabled: true }),
      ModifiedDate: new FormControl({ value: line.ModifiedDate, disabled: true }),
      IsChecked: new FormControl({ value: false, disabled: false }),
    });
    // group.get('_IDItemDataSource').value?.initSearch();
    groups.push(group);
    if(markAsDirty){
      //save change
    }
  }

  addRows(line: any,addNew = false) {
    let groups = <FormArray>this.formGroup.controls.Rows;
    let group = this.formBuilder.group({
      Key :[line?.Key],
      _IDItemDataSource: [
        {
          searchProvider: this.itemProvider,
          loading: false,
          input$: new Subject<string>(),
          selected: [
            {
              Id: line?.IDItem,
              Name: line?.ItemName,
            },
          ],
          items$: null,
          initSearch() {
            this.loading = false;
            this.items$ = concat(
              of(this.selected),
              this.input$.pipe(
                distinctUntilChanged(),
                tap(() => (this.loading = true)),
                switchMap((term) =>
                  this.searchProvider
                    .search({
                      SortBy: ['Id_desc'],
                      Take: 20,
                      Skip: 0,
                      Term: term,
                    })
                    .pipe(
                      catchError(() => of([])), // empty list on error
                      tap(() => (this.loading = false)),
                    ),
                ),
              ),
            );
          },
        },
      ],
      _UoMDataSource: [line?.UoMs],
      IDForecast: new FormControl({ value: line?.IDForecast, disabled: true }),
      Name: [line?.Name],
      IDItem: [line?.IDItem, Validators.required],
      IDUoM: [line?.IDUoM, Validators.required], 
      IsChecked:[false]
    });
    group.get('_IDItemDataSource').value?.initSearch();
    groups.push(group);
    if(addNew){
      this.itemsState.push(group.getRawValue());
    }
  }

  changeItem(ev, row) {
    row.get('IDUoM').setValue('');
    row.get('_UoMDataSource').setValue(ev.UoMs);
    if(ev.SalesUoM && ev.UoMs?.length>0){
      row.get('IDUoM').setValue(ev.SalesUoM);
      this.changeUoM(row);
    }
  }
  changeUoM(row){
    let key = row.get('IDItem').value +'-'+ row.get('IDUoM').value;
    let groupLines = <FormArray>this.formGroup.controls.Lines;
    let existedLines = groupLines.controls.filter(line=>line.get('Key').value == row.get('Key').value );
    row.get('Key').setValue(key);
    if(existedLines.length>0){
      existedLines.forEach(line=>{
        line.get('Key').setValue(key);
        line.get('IDItem').setValue(row.get('IDItem').value);
        line.get('IDUoM').setValue(row.get('IDUoM').value);
        line.get('IDItem').markAsDirty();
        line.get('IDUoM').markAsDirty();
      })
      // save change here
    }
    else{
      this.columnView.forEach((c) => {
          this.addLine(
          {
            IDForecast: this.item.Id,
            IDItem: row.get('IDItem').value,
            Key :  row.get('Key').value,
            Quantity: 0,
            Id : 0,
            // UoMName: [line.UoMName],
            // ItemName: [line.ItemName], //de hien thi
            IDUoM:  row.get('IDUoM').value, //de hien thi
            Date: c.Date,
          },
            true,
          );
      });
    }
  }

  isAllChecked = false;
  checkedRows: any = new FormArray([]);
  removeRow(fg, j) {
    let groupRows = <FormArray>this.formGroup.controls.Rows;
    let groupLines = <FormArray>this.formGroup.controls.Lines;
    let deleteLines = [];
    let filteredIds = groupLines.controls .filter( (lineControl) => lineControl.get('Key').value === fg.get('Key').value );
    let deleteIds = filteredIds?.map((filteredControl) => filteredControl.get('Id').value);
    deleteLines = [...deleteLines,...deleteIds];
    this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + deleteLines.length + ' dòng').then((_) => {
      this.forecastDetailService.delete(deleteLines) .then((_) => {
        this.env
          .showLoading('Xin vui lòng chờ trong giây lát...', this.forecastDetailService.delete(deleteLines))
          .then((_) => {
            const indexRowToRemove = groupRows.controls.findIndex(rowControl => rowControl.get('Key').value === fg.get('Key').value );

            groupRows.removeAt(indexRowToRemove);

            deleteLines?.forEach((d) => {
              const indexLineToRemove = groupLines.controls.findIndex(
                (lineControl) => lineControl.get('Id').value == d,
              );

              if(indexRowToRemove){
                this.checkedRows.removeAt(indexRowToRemove);
              }
              groupLines.removeAt(indexLineToRemove);
            });

            this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
          })
          .catch((err) => {
            this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
            console.log(err);
          });
      });
    });
  }

  changeSelection(i) {
    if (i.get('IsChecked').value) {
      this.checkedRows.push(i);
    } else {
      let index = this.checkedRows.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
      this.checkedRows.removeAt(index);
    }
  }
  // deleteItems() {
  //   if (this.pageConfig.canDelete) {
  //     let groups = <FormArray>this.formGroup.controls.Lines;

  //     let itemsToDelete = groups.controls.map(s=> s.get('Id').value);
      
  //     this.env
  //       .showPrompt(
  //         'Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?',
  //         null,
  //         'Xóa ' + itemsToDelete.length + ' dòng',
  //       )
  //       .then((_) => {
  //         this.env
  //           .showLoading('Xin vui lòng chờ trong giây lát...', this.forecastDetailService.delete(itemsToDelete))
  //           .then((_) => {
  //             groups = this.formBuilder.array([]);
  //             this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
  //             this.isAllChecked = false;
  //           })
  //           .catch((err) => {
  //             groups = this.formBuilder.array([]); //temp
  //             this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
  //             console.log(err);
  //           });
  //       });
  //   }
  // }

  removeSelectedItems() {
    let groupRows = <FormArray>this.formGroup.controls.Rows;
    let groupLines = <FormArray>this.formGroup.controls.Lines;
    let deleteLines = [];
    this.checkedRows.controls.forEach((fg) => {
  
      let filteredIds = groupLines.controls .filter( (lineControl) => lineControl.get('Key').value === fg.get('Key').value );
      let deleteIds = filteredIds?.map((filteredControl) => filteredControl.get('Id').value);
      deleteLines = [...deleteLines,...deleteIds];
    });
    deleteLines = [... new Set(deleteLines)];
    this.env
      .showPrompt(
        'Bạn chắc muốn xóa ' + deleteLines.length + ' đang chọn?',
        null,
        'Xóa ' + deleteLines.length + ' dòng',
      )
      .then((_) => {
        this.env
          .showLoading('Xin vui lòng chờ trong giây lát...', this.forecastDetailService.delete(deleteLines))
          .then((_) => {
            this.checkedRows.controls.forEach((fg) => {
              const indexRowToRemove = groupRows.controls.findIndex(rowControl => rowControl.get('Key').value === fg.get('Key').value );
              groupRows.removeAt(indexRowToRemove);
           
            });
               
            deleteLines?.forEach((d) => {
              const indexLineToRemove = groupLines.controls.findIndex(
                (lineControl) => lineControl.get('Id').value === d,
              );
              groupLines.removeAt(indexLineToRemove);
            });
            this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
            this.isAllChecked = false;
            this.checkedRows = new FormArray([]);
          })
          .catch((err) => {
            
            this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
            console.log(err);
          });
      });
  }

  toggleSelectAll() {
    if(!this.pageConfig.canEdit) return;
    let groups = <FormArray>this.formGroup.controls.Rows;
    if (!this.isAllChecked) {
        this.checkedRows = new FormArray([]);
    }
    groups.controls.forEach(i => {
        i.get('IsChecked').setValue(this.isAllChecked)
        if (this.isAllChecked) this.checkedRows.push(i)
    });
}
  changeView() {
    this.renderView(true);

  }
  changeDate(){
    this.renderView(true);

  }

  getWeekNumber(date)  {
    // Copy the date so we don't modify the original
    date = new Date(date);
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    // Get first day of year
    var yearStart = new Date(date.getFullYear(), 0, 1);
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }
  
   getDayOfWeek(date) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return daysOfWeek[date.getDay()];
  }

  async saveChange() {}

  saveChangeDetail(fg: FormGroup) {
    this.saveChange2(fg, null, this.forecastDetailService)
}
  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type == 'Warehouse') i.disabled = false;
      this.markNestedNode(ls, i.Id);
    });
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }
}


