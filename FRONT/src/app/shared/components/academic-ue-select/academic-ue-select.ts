import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { normalizeAcademicSearch } from '../../utils/academic-search';

/**
 * Sélecteur UE partagé. La recherche texte ne remplace JAMAIS la valeur métier.
 * Prise en charge des listes d'UE et des listes de titres utilisées par l'historique.
 */
@Component({
  selector: 'app-academic-ue-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './academic-ue-select.html',
  styleUrl: './academic-ue-select.scss'
})
export class AcademicUeSelectComponent implements OnChanges {
  private static counter = 0;
  readonly optionsId = 'academic-ue-options-' + ++AcademicUeSelectComponent.counter;

  @Input() options: readonly any[] = [];
  @Input() value: string | number | null = null;
  @Input() valueField: 'id' | 'code' | 'name' = 'id';
  @Input() placeholder = 'Rechercher ou choisir une UE';
  @Input() emptyLabel = 'Aucune UE sélectionnée';
  @Input() emptyValue: string | number | null = null;
  @Input() required = false;
  @Input() ariaLabel = 'Sélectionner une unité d’enseignement';
  @Output() valueChange = new EventEmitter<string | number | null>();

  query = '';
  isOpen = false;
  activeIndex = 0;

  constructor(private host: ElementRef<HTMLElement>) {}

  private optionValue(option: any): string | number | null {
    if (typeof option === 'string' || typeof option === 'number') return option;
    return option?.[this.valueField] ?? null;
  }
  optionLabel(option: any): string {
    if (typeof option === 'string' || typeof option === 'number') return String(option);
    return String(option?.name ?? option?.code ?? '');
  }
  optionDetail(option: any): string {
    if (!option || typeof option !== 'object') return '';
    return String(option.code ?? '');
  }
  get chosen(): any | undefined {
    if (this.value === null || this.value === '' || this.value === this.emptyValue) return undefined;
    return this.options.find(o => String(this.optionValue(o)) === String(this.value));
  }
  get filteredOptions(): any[] {
    if (this.chosen && this.query === this.chosenLabel) return [...this.options];
    const text = normalizeAcademicSearch(this.query);
    return this.options.filter(option => {
      return !text || normalizeAcademicSearch(`${this.optionDetail(option)} ${this.optionLabel(option)}`).includes(text);
    });
  }
  get chosenLabel(): string {
    if (!this.chosen) return '';
    const code = this.optionDetail(this.chosen);
    return code ? `${code} · ${this.optionLabel(this.chosen)}` : this.optionLabel(this.chosen);
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['options']) {
      // Conserver la saisie en cours lorsque la sélection métier est invalidée.
      // Sans cette garde, (valueChange) déclenche un nouveau cycle Angular et
      // efface la recherche dès le premier caractère après une sélection.
      if (!this.isOpen) {
        this.query = this.chosenLabel;
      } else if (this.chosen && !this.query) {
        this.query = this.chosenLabel;
      }
    }
  }
  onInput(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.isOpen = true;
    this.activeIndex = 0;
    if (this.query !== this.chosenLabel && this.value !== this.emptyValue) {
      this.valueChange.emit(this.emptyValue);
    }
  }
  choose(option: any): void {
    const picked = this.optionValue(option);
    this.query = this.optionDetail(option) ? `${this.optionDetail(option)} · ${this.optionLabel(option)}` : this.optionLabel(option);
    this.isOpen = false;
    this.valueChange.emit(picked);
  }
  clear(): void {
    this.query = '';
    this.isOpen = true;
    this.activeIndex = 0;
    this.valueChange.emit(this.emptyValue);
  }
  onKeydown(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === 'Escape') { this.isOpen = false; event.stopPropagation(); return; }
    if (keyEvent.key === 'ArrowDown' || keyEvent.key === 'ArrowUp') {
      event.preventDefault(); this.isOpen = true;
      const count = this.filteredOptions.length;
      this.activeIndex = count ? (this.activeIndex + (keyEvent.key === 'ArrowDown' ? 1 : -1) + count) % count : 0;
    }
    if (keyEvent.key === 'Enter' && this.isOpen) {
      const chosen = this.filteredOptions[this.activeIndex];
      if (chosen) { event.preventDefault(); this.choose(chosen); }
    }
  }
  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!(event.target instanceof Node) || !this.host.nativeElement.contains(event.target)) this.isOpen = false;
  }
}
