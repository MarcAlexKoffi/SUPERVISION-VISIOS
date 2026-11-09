import { CommonModule } from '@angular/common';
import {
  Component, ElementRef, EventEmitter, HostListener, Input, NgZone,
  OnChanges, OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';
import { normalizeAcademicSearch } from '../../utils/academic-search';

/** AURA V2.3: searchable chooser, with a body-level popup to avoid drawer clipping.
 * The popup is independently created/removed: Angular never destroys a node
 * that has been reparented out of an Angular view. Business value and label remain distinct.
 */
@Component({
  selector: 'app-academic-search-select', standalone: true, imports: [CommonModule],
  templateUrl: './academic-search-select.html', styleUrl: './academic-search-select.scss'
})
export class AcademicSearchSelectComponent implements OnChanges, OnDestroy {
  private static nextId = 0;
  readonly id = 'academic-search-' + ++AcademicSearchSelectComponent.nextId;
  @Input() options: readonly any[] = [];
  @Input() inputId = ''; // Existing for= labels can target the actual input.
  @Input() value: string | number | null | undefined = '';
  @Input() valueField = 'id';
  @Input() labelField = 'name';
  @Input() labelFields: readonly string[] = [];
  @Input() detailFields: readonly string[] = [];
  @Input() placeholder = 'Rechercher ou sélectionner…';
  @Input() ariaLabel = 'Rechercher dans la liste';
  @Input() emptyLabel = 'Toutes les valeurs';
  @Input() emptyValue: string | number | null = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() loading = false;
  @Input() error = '';
  @Output() valueChange = new EventEmitter<string | number | null>();
  @ViewChild('inputRef') inputRef?: ElementRef<HTMLInputElement>;

  query = '';
  isOpen = false;
  activeIndex = 0;
  private popup: HTMLElement | null = null;
  private readonly onViewportChange = () => { if (this.isOpen) this.positionPopup(); };

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {
    if (typeof document !== 'undefined') document.addEventListener('scroll', this.onViewportChange, true);
    if (typeof window !== 'undefined') window.addEventListener('resize', this.onViewportChange);
  }
  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.removeEventListener('scroll', this.onViewportChange, true);
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.onViewportChange);
    this.close();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['value'] || changes['options']) && !this.isOpen) this.query = this.selectedLabel;
    if (this.isOpen) this.renderPopup();
  }
  optionValue(option: any): string | number | null {
    if (option === null || option === undefined) return this.emptyValue;
    if (typeof option !== 'object') return option;
    return option[this.valueField] ?? this.emptyValue;
  }
  optionLabel(option: any): string {
    if (typeof option !== 'object' || !option) return String(option ?? '');
    if (this.labelFields.length) return this.labelFields.map(k => option[k] ?? '').join(' ').trim();
    return String(option[this.labelField] ?? option.name ?? option.code ?? '');
  }
  optionDetail(option: any): string {
    if (typeof option !== 'object' || !option) return '';
    return this.detailFields.map(k => String(option[k] ?? '').trim()).filter(Boolean).join(' · ');
  }
  get chosen(): any | undefined {
    if (this.value === this.emptyValue || this.value === null || this.value === undefined || this.value === '') return undefined;
    return this.options.find(o => String(this.optionValue(o)) === String(this.value));
  }
  get selectedLabel(): string { return this.chosen ? this.optionLabel(this.chosen) : ''; }
  get filteredOptions(): any[] {
    const term = normalizeAcademicSearch(this.query === this.selectedLabel ? '' : this.query);
    if (!term) return [...this.options];
    return this.options.filter(item => normalizeAcademicSearch(
      [this.optionLabel(item), this.optionDetail(item)].join(' ')).includes(term));
  }
  open(): void {
    if (this.disabled) return;
    if (!this.isOpen) this.activeIndex = 0;
    this.isOpen = true;
    this.renderPopup();
  }
  close(): void {
    this.isOpen = false;
    this.popup?.remove();
    this.popup = null;
  }
  onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    const previousLabel = this.selectedLabel;
    this.query = next;
    this.activeIndex = 0;
    // Explicitly invalidate stale IDs when the text diverges from a prior choice.
    if (this.chosen && next !== previousLabel) {
      this.valueChange.emit(this.emptyValue);
    }
    this.open();
  }
  choose(option: any): void {
    this.query = this.optionLabel(option);
    this.inputRef?.nativeElement.focus();
    this.close();
    this.valueChange.emit(this.optionValue(option));
  }
  clear(): void {
    this.query = '';
    this.inputRef?.nativeElement.focus();
    this.close();
    this.valueChange.emit(this.emptyValue);
  }
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { this.close(); event.stopPropagation(); return; }
    if (event.key === 'Tab') { this.close(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen) { this.open(); return; }
      const count = this.filteredOptions.length;
      if (count) this.activeIndex = (this.activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
      this.renderPopup();
    }
    if (event.key === 'Enter' && this.isOpen) {
      const item = this.filteredOptions[this.activeIndex];
      if (item !== undefined) { event.preventDefault(); this.choose(item); }
    }
  }
  @HostListener('document:pointerdown', ['$event'])
  onOutsidePointer(event: PointerEvent): void {
    if (!this.isOpen || !(event.target instanceof Node)) return;
    if (!this.host.nativeElement.contains(event.target) && !this.popup?.contains(event.target)) this.close();
  }
  private renderPopup(): void {
    if (!this.isOpen || typeof document === 'undefined') return;
    if (!this.popup) {
      this.popup = document.createElement('div');
      this.popup.id = this.id + '-options';
      this.popup.className = 'academic-search-popup';
      this.popup.setAttribute('role','listbox');
      document.body.appendChild(this.popup);
    }
    const panel = this.popup;
    panel.textContent = ''; // No HTML injection: dynamic labels are assigned only as textContent.
    const addButton = (label:string, detail:string, select:()=>void, i:number, selected:boolean, empty=false) => {
      const b = document.createElement('button');
      b.type='button';
      b.setAttribute('role','option');
      b.setAttribute('aria-selected',String(selected));
      b.id=this.id+'-option-'+i;
      if (i===this.activeIndex && !empty) b.classList.add('is-active');
      if (empty) b.classList.add('academic-search-empty');
      const primary = document.createElement('span');primary.className='academic-search-name';primary.textContent=label;b.appendChild(primary);
      if (detail) {const secondary=document.createElement('small');secondary.textContent=detail;b.appendChild(secondary);}
      b.addEventListener('mousedown',e=>e.preventDefault());
      b.addEventListener('click',()=>this.zone.run(select));
      panel.appendChild(b);
    };
    if (!this.required && this.emptyLabel) addButton(this.emptyLabel,'',()=>this.clear(),-1,false,true);
    const list = this.filteredOptions;
    for(let i=0;i<list.length;i++) {
      const item = list[i];
      addButton(this.optionLabel(item),this.optionDetail(item),()=>this.choose(item),i,this.chosen===item);
    }
    if (this.loading || this.error || (!list.length && !this.loading)) {
      const p=document.createElement('p');p.textContent=this.error || (this.loading?'Chargement des choix…':'Aucun résultat trouvé');
      p.setAttribute('role',this.error?'alert':'status');panel.appendChild(p);
    }
    this.positionPopup();
  }
  private positionPopup(): void {
    if (!this.isOpen || !this.inputRef || !this.popup || typeof window === 'undefined') return;
    const rect = this.inputRef.nativeElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const below = window.innerHeight - rect.bottom - 10;
    const above = rect.top - 10;
    const up = below < 190 && above > below;
    const height = Math.min(252,Math.max(70, (up ? above : below)-8));
    const width = Math.min(Math.max(170,rect.width),window.innerWidth-20);
    const left = Math.min(Math.max(10,rect.left),window.innerWidth-width-10);
    Object.assign(this.popup.style,{position:'fixed',zIndex:'10000',left:left+'px',width:width+'px',maxHeight:height+'px',top:(up?Math.max(8,rect.top-height-5):rect.bottom+5)+'px'});
  }
}
