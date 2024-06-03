import { Component, ChangeDetectorRef, ViewChild, SimpleChanges } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  SALE_ForecastDetailProvider,
  SALE_ForecastProvider,
  // PROD_ForecastDetailProvider,
  // PROD_ForecastProvider,
  SYS_TypeProvider,
  WMS_ItemProvider,
  WMS_PriceListProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject, Subscription } from 'rxjs';
import { catchError, distinctUntilChanged, pairwise, scan, switchMap, tap } from 'rxjs/operators';

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
  periodSubscription: Subscription;

  constructor(
    public pageProvider: SALE_ForecastProvider, //PROD_ForecastProvider,
    public forecastDetailService: SALE_ForecastDetailProvider, //PROD_ForecastProvider,
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
      IDBranch: new FormControl({
        value: this.env.selectedBranch,
        disabled: false,
      }),
      StartDate: ['', Validators.required],
      EndDate: ['', Validators.required],
      Name: [''],
      Period: ['Daily', Validators.required],
      Rows: this.formBuilder.array([]),
      Cells: this.formBuilder.array([]),
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

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    super.loadedData(event, ignoredFromGroup);
    this.formGroup.controls.Period.markAsDirty();
    this.formGroup.controls.IDBranch.markAsDirty();
    if (this.item.Id > 0) {
      this.item.ForeCastDetails?.forEach((i) => (i.Date = lib.dateFormat(i.Date)));
      this.renderView();
      this.patchCellsValue();
    }
  }

  renderView(reRender = false) {
    if (
      !this.formGroup.get('StartDate').value ||
      !this.formGroup.get('EndDate').value ||
      !this.formGroup.get('Period').value
    ) {
      return;
    }
    this.columnView = [];
    let startDate = new Date(this.formGroup.get('StartDate').value);
    let endDate = new Date(this.formGroup.get('EndDate').value);

    if (this.formGroup.get('Period').value === 'Daily') {
      let dateBetweens = lib.getStartEndDates(startDate, endDate);
      dateBetweens.forEach((date) => {
        date = new Date(date.Date);
        let dateFormatted = lib.dateFormat(date);
        this.columnView.push({
          Title: dateFormatted,
          SubTitle: this.getDayOfWeek(date),
          Date: dateFormatted,
        });
      });
    } else if (this.formGroup.get('Period').value === 'Weekly') {
      startDate = lib.getWeekDates(startDate)[1];
      let endWeeks = lib.getWeekDates(endDate);
      let endDateWeek = new Date(endWeeks[endWeeks.length - 1]); // t7
      endDateWeek.setDate(endDateWeek.getDate() + 1); // cn
      endDate = endDateWeek;
      let dateBetweens = lib.getStartEndDates(startDate, endDate);
      dateBetweens.forEach((date) => {
        date = new Date(date.Date);
        if (date.getDay() === 1) {
          // t2
          this.columnView.push({
            Title: 'Week ' + this.getWeekNumber(date),
            SubTitle: null,
            Date: lib.dateFormat(date),
          });
        }
      });
    } else if (this.formGroup.get('Period').value === 'Monthly') {
      startDate.setDate(1);
      endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
      let dateBetweens = lib.getStartEndDates(startDate, endDate);
      dateBetweens.forEach((date) => {
        date = new Date(date.Date);
        if (date.getDate() === 1) {
          // t2
          this.columnView.push({
            Title: date.toLocaleString('default', { month: 'long' }),
            SubTitle: null,
            Date: lib.dateFormat(date),
          });
        }
      });
    }
    console.log(this.columnView);

    if (reRender) {
      if (this.columnView.length >= 100) {
        this.env
          .showPrompt('Bạn đang load lượng lớn dữ liệu hơn 100 dòng, bạn có muốn tiếp tục ?', null, 'Tiếp tục')
          .then((_) => {
            this.reRender();
          })
          .catch((err) => {
            this.refresh();
          });
      } else {
        this.reRender();
      }
    } else {
      if (this.item.Items?.length > 0) {
        let rows = this.formGroup.get('Rows') as FormArray;
        rows.clear();
        this.item.Items.forEach((is) => {
          this.addRows(is);
        });
      }
    }
  }

  private patchCellsValue() {
    this.formGroup.controls.Cells = new FormArray([]);
    this.pageConfig.showSpinner = true;
    this.columnView.forEach((d) => {
      this.item.Items.forEach((state, index) => {
        let cell = this.item.ForeCastDetails.find(
          (x) => x.Date == d.Date && x.IDItem == state.IDItem && x.IDItem && state.IDUoM == x.IDUoM,
        );
        if (cell) {
          this.addCell(cell);
        } else {
          this.addCell(
            {
              IDForecast: this.item.Id,
              IDItem: state.IDItem,
              Key: state.IDItem + '-' + state.IDUoM,
              Quantity: 0,
              Id: 0,
              IDUoM: state.IDUoM,
              Date: d.Date,
            },
            true,
          );
        }
      });
    });

    if (!this.pageConfig.canEdit) {
      this.formGroup.controls.Cells.disable();
    }

    this.pageConfig.showSpinner = false;
    console.log(this.formGroup);
  }
  addCell(cell: any, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.Cells;
    let group = this.formBuilder.group({
      Id: new FormControl({ value: cell.Id, disabled: true }),
      IDForecast: new FormControl({ value: cell.IDForecast, disabled: true }),
      Key: new FormControl({ value: cell.IDItem + '-' + cell.IDUoM, disabled: true }),
      Name: [cell.Name],
      IDItem: [cell.IDItem, Validators.required],
      Quantity: [cell.Quantity],
      // UoMName: [cell.UoMName],
      // ItemName: [cell.ItemName], //de hien thi
      IDUoM: [cell.IDUoM], //de hien thi
      Date: [cell?.Date],
      IsDisabled: new FormControl({ value: cell.IsDisabled, disabled: true }),
      IsDeleted: new FormControl({ value: cell.IsDeleted, disabled: true }),
      CreatedBy: new FormControl({ value: cell.CreatedBy, disabled: true }),
      CreatedDate: new FormControl({ value: cell.CreatedDate, disabled: true }),
      ModifiedBy: new FormControl({ value: cell.ModifiedBy, disabled: true }),
      ModifiedDate: new FormControl({ value: cell.ModifiedDate, disabled: true }),
      IsChecked: new FormControl({ value: false, disabled: false }),
    });
    // group.get('_IDItemDataSource').value?.initSearch();
    group.get('IDForecast').markAsDirty();
    group.get('IDItem').markAsDirty();
    group.get('IDUoM').markAsDirty();
    group.get('Date').markAsDirty();
    groups.push(group);
  }

  addRows(row: any, addNew = false) {
    let groups = <FormArray>this.formGroup.controls.Rows;
    let group = this.formBuilder.group({
      Key: [row?.Key || row?.IDItem + '-' + row?.IDUoM],
      _IDItemDataSource: [
        {
          searchProvider: this.itemProvider,
          loading: false,
          input$: new Subject<string>(),
          selected: [
            {
              Id: row?.IDItem,
              Name: row?.ItemName,
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
      _UoMDataSource: [row?.UoMs],
      IDForecast: new FormControl({ value: row?.IDForecast, disabled: true }),
      Name: [row?.Name],
      IDItem: [row?.IDItem, Validators.required],
      IDUoM: [row?.IDUoM, Validators.required],
      IsChecked: [false],
    });
    group.get('_IDItemDataSource').value?.initSearch();
    groups.push(group);
  }
  reRender() {
    const Cells = this.formGroup.get('Cells') as FormArray;
    if (Cells.controls.length > 0) {
      let itemToDeletes = Cells.controls.map((cell) => {
        return {
          Id: cell.get('Id').value,
        };
      });
      if (this.pageConfig.canDelete) {
        this.env
          .showLoading('Xin vui lòng chờ trong giây lát...', this.forecastDetailService.delete(itemToDeletes))
          .then((_) => {
            this.isAllChecked = false;
            Cells.clear();
            const Rows = this.formGroup.get('Rows') as FormArray;
            let itemsToPush = [];
            this.columnView.forEach((d) => {
              Rows.controls.forEach((state, index) => {
                itemsToPush.push({
                  IDForecast: this.item.Id,
                  IDItem: state.get('IDItem').value,
                  Key: state.get('IDItem').value + '-' + state.get('IDUoM').value,
                  Quantity: 0,
                  Id: 0,
                  IDUoM: state.get('IDUoM').value,
                  Date: d.Date,
                });
              });
            });

            let obj: any = {
              id: this.formGroup.get('Id').value,
              items: itemsToPush,
            };
            this.commonService
              .connect('POST', 'SALE/Forecast/PostListDetail', obj)
              .toPromise()
              .then((result: any) => {
                if (result && result.length > 0) {
                  result.forEach((i) => {
                    i.Date = lib.dateFormat(i.Date);
                    this.addCell(i, true);
                  });
                }
                this.saveChange2(); // savechange View hoặc Date
              });
          })
          .catch((err) => {
            this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
            console.log(err);
          });
      }
    } else {
     
          this.saveChange2(); // savechange View hoặc Date
    }
  }
  changeItem(ev, row) {
    row.get('IDUoM').setValue('');
    row.get('_UoMDataSource').setValue(ev.UoMs);
    if (ev.SalesUoM && ev.UoMs?.length > 0) {
      row.get('IDUoM').setValue(ev.SalesUoM);
      this.changeUoM(row);
    }
  }
  changeUoM(row) {
    let key = row.get('IDItem').value + '-' + row.get('IDUoM').value;
    let groupCells = <FormArray>this.formGroup.controls.Cells;
    let existedCells = groupCells.controls.filter((cell) => cell.get('Key').value == row.get('Key').value);
    let itemsToPassingAPI = [];
    row.get('Key').setValue(key);
    if (existedCells.length > 0) {
      existedCells.forEach((cell) => {
        cell.get('Key').setValue(key);
        cell.get('IDItem').setValue(row.get('IDItem').value);
        cell.get('IDUoM').setValue(row.get('IDUoM').value);
        cell.get('IDItem').markAsDirty();
        cell.get('IDUoM').markAsDirty();
      });
      itemsToPassingAPI = existedCells.map((c) => {
        return {
          IDItem: c.get('IDItem').value,
          Id: c.get('Id').value,
          IDUoM: c.get('IDUoM').value,
        };
      });

      let obj: any = {
        id: this.formGroup.get('Id').value,
        items: itemsToPassingAPI,
      };
      this.commonService
        .connect('POST', 'SALE/Forecast/PutListDetail', obj)
        .toPromise()
        .then((result: any) => {
          if (result) {
            this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
          }
        });
    } else {
      this.columnView.forEach((c) => {
        let i = {
          IDForecast: this.item.Id,
          IDItem: row.get('IDItem').value,
          Quantity: 0,
          Id: 0,
          IDUoM: row.get('IDUoM').value,
          Date: c.Date,
        };
        itemsToPassingAPI.push(i);
      });

      let obj: any = {
        id: this.formGroup.get('Id').value,
        items: itemsToPassingAPI,
      };
      this.commonService
        .connect('POST', 'SALE/Forecast/PostListDetail', obj)
        .toPromise()
        .then((result: any) => {
          if (result && result.length > 0) {
            result.forEach((i) => {
              if (!groupCells.controls.find((d) => d.get('Id').value == i.Id)) {
                i.Date = lib.dateFormat(i.Date);
                this.addCell(i, true);
              }
            });
          }
        });
    }
  }

  isAllChecked = false;
  checkedRows: any = new FormArray([]);
  removeRow(fg, j) {
    let groupRows = <FormArray>this.formGroup.controls.Rows;
    let groupCells = <FormArray>this.formGroup.controls.Cells;
    let filteredIds = groupCells.controls.filter((cellControl) => cellControl.get('Key').value === fg.get('Key').value);
    //  let deleteIds = filteredIds?.map((filteredControl) => filteredControl.get('Id').value);
    let deletedIds = filteredIds?.map((fg) => {
      return {
        Id: fg.get('Id').value,
      };
    });
    if (!fg.get('IDItem').value) {
      var index = groupRows.controls.findIndex((d) => d.get('Key').value == 'undefined-undefined');
      if (index) groupRows.removeAt(index);
      return;
    }
    //  let deleteIds = filteredIds?.map((filteredControl) => filteredControl.get('Id').value);
    this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + deletedIds.length + ' dòng').then((_) => {
      this.forecastDetailService.delete(deletedIds).then((_) => {
        this.env
          .showLoading('Xin vui lòng chờ trong giây lát...', this.forecastDetailService.delete(deletedIds))
          .then((_) => {
            const indexRowToRemove = groupRows.controls.findIndex(
              (rowControl) => rowControl.get('Key').value === fg.get('Key').value,
            );

            groupRows.removeAt(indexRowToRemove);

            deletedIds?.forEach((d) => {
              const indexCellToRemove = groupCells.controls.findIndex(
                (cellControl) => cellControl.get('Id').value == d.Id,
              );

              if (indexRowToRemove) {
                this.checkedRows.removeAt(indexRowToRemove);
              }
              groupCells.removeAt(indexCellToRemove);
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
  removeSelectedItems() {
    let groupRows = <FormArray>this.formGroup.controls.Rows;
    let groupCells = <FormArray>this.formGroup.controls.Cells;
    let deleteCells = [];
    this.checkedRows.controls.forEach((fg) => {
      let filteredIds = groupCells.controls.filter(
        (cellControl) => cellControl.get('Key').value === fg.get('Key').value,
      );
      let deleteList = filteredIds?.map((fg) => {
        return {
          Id: fg.get('Id').value,
        };
      });
      deleteCells = [...deleteCells, ...deleteList];
    });
    deleteCells = [...new Set(deleteCells)];
    this.env
      .showPrompt(
        'Bạn chắc muốn xóa ' + deleteCells.length + ' đang chọn?',
        null,
        'Xóa ' + deleteCells.length + ' dòng',
      )
      .then((_) => {
        this.env
          .showLoading('Xin vui lòng chờ trong giây lát...', this.forecastDetailService.delete(deleteCells))
          .then((_) => {
            this.checkedRows.controls.forEach((fg) => {
              const indexRowToRemove = groupRows.controls.findIndex(
                (rowControl) => rowControl.get('Key').value === fg.get('Key').value,
              );
              groupRows.removeAt(indexRowToRemove);
            });

            deleteCells?.forEach((d) => {
              const indexCellToRemove = groupCells.controls.findIndex(
                (cellControl) => cellControl.get('Id').value === d,
              );
              groupCells.removeAt(indexCellToRemove);
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
    if (!this.pageConfig.canEdit) return;
    let groups = <FormArray>this.formGroup.controls.Rows;
    if (!this.isAllChecked) {
      this.checkedRows = new FormArray([]);
    }
    groups.controls.forEach((i) => {
      i.get('IsChecked').setValue(this.isAllChecked);
      if (this.isAllChecked) this.checkedRows.push(i);
    });
  }
  changePeriodAndDate() {
    if(this.submitAttempt){
      return;
    }
    console.log('Initial value:', this.formGroup.controls.StartDate.value);
    this.submitAttempt = true;
    let groupCells = <FormArray>this.formGroup.controls.Cells;
    if (groupCells.controls.length > 0) {
      
      this.env
        .showPrompt('Thay đổi chu kỳ sẽ xoá hết dữ liệu dự báo, bạn có tiếp tục?', null, 'Xóa')
        .then((_) => {
          this.submitAttempt = false;
          this.renderView(true);

        })
        .catch((er) => {
          this.submitAttempt = false;
          this.refresh();

          // this.formGroup.get(a).setValue(that);
          // this.refresh();
        });
    } else {
      this.submitAttempt = false;
      this.renderView();
      this.saveChange2();
    }
  }

  @ViewChild('importfile') importfile: any;
  onClickImport() {
    this.importfile.nativeElement.value = '';
    this.importfile.nativeElement.click();
  }

  async import(event) {
    if (this.submitAttempt) {
      this.env.showTranslateMessage('erp.app.pages.sale.sale-order.message.importing', 'primary');
      return;
    }
    this.submitAttempt = true;
    this.env.publishEvent({
      Code: 'app:ShowAppMessage',
      IsShow: true,
      Id: 'FileImport',
      Icon: 'flash',
      IsBlink: true,
      Color: 'danger',
      Message: 'đang import',
    });
    const formData: FormData = new FormData();
    formData.append('fileKey', event.target.files[0], event.target.files[0].name);
    this.env
      .showLoading(
        'Vui lòng chờ import dữ liệu...',
        this.commonService
          .connect('UPLOAD', 'SALE/Forecast/ImportExcel/' + this.formGroup.get('Id').value, formData)
          .toPromise(),
      )
      .then((resp: any) => {
        this.submitAttempt = false;
        this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
        this.refresh();
        if (resp.ErrorList && resp.ErrorList.length) {
          let message = '';
          for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
            if (i == 5) message += '<br> Còn nữa...';
            else {
              const e = resp.ErrorList[i];
              message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
            }
          this.env
            .showPrompt(
              'Có ' + resp.ErrorList.length + ' lỗi khi import:' + message,
              'Bạn có muốn xem lại các mục bị lỗi?',
              'Có lỗi import dữ liệu',
            )
            .then((_) => {
              this.downloadURLContent(resp.FileUrl);
            })
            .catch((e) => {});
        } else {
          this.env.showTranslateMessage('Import completed!', 'success');
        }
        // this.download(data);
      })
      .catch((err) => {
        this.submitAttempt = false;
        this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
        this.refresh();
        this.env.showTranslateMessage('erp.app.pages.sale.sale-order.message.import-error', 'danger');
      });
  }

  async export() {
    if (this.submitAttempt) return;
    this.query.IDForecast = this.formGroup.get('Id').value;
    this.submitAttempt = true;
    this.env
      .showLoading('Vui lòng chờ export dữ liệu...', this.forecastDetailService.export(this.query))
      .then((response: any) => {
        this.downloadURLContent(response);
        this.submitAttempt = false;
      })
      .catch((err) => {
        this.submitAttempt = false;
      });
  }

  getWeekNumber(date) {
    date = new Date(date);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    var yearStart = new Date(date.getFullYear(), 0, 1);
    var weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
  }

  getDayOfWeek(date) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return daysOfWeek[date.getDay()];
  }

  saveChangeDetail(fg: FormGroup) {
    this.saveChange2(fg, null, this.forecastDetailService);
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
