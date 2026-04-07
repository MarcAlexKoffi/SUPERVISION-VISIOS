import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsyncSupervisionForm } from './async-supervision-form';

describe('AsyncSupervisionForm', () => {
  let component: AsyncSupervisionForm;
  let fixture: ComponentFixture<AsyncSupervisionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsyncSupervisionForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsyncSupervisionForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
