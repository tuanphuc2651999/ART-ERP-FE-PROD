import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FlatDetailPage } from './bill-of-materials-detail.page';

describe('FlatDetailPage', () => {
  let component: FlatDetailPage;
  let fixture: ComponentFixture<FlatDetailPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FlatDetailPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FlatDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
