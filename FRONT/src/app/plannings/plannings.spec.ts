import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Plannings } from './plannings';

describe('Plannings', () => {
  let component: Plannings;
  let fixture: ComponentFixture<Plannings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Plannings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Plannings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
