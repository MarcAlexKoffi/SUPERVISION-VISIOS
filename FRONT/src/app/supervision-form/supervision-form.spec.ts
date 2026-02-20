import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupervisionForm } from './supervision-form';

describe('SupervisionForm', () => {
  let component: SupervisionForm;
  let fixture: ComponentFixture<SupervisionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupervisionForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupervisionForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
