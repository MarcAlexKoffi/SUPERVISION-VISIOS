/**
 * DOM-level week-picker overlay. Angular DOM views are NOT reparented: this popup
 * owns its nodes and binds native events, with callbacks re-entering Angular.
 * No external requests, storage, dynamic HTML or Firestore changes.
 */
export interface WeekPickerOverlayModel {
  monthLabel: () => string;
  days: () => Date[];
  isOutsideMonth: (date: Date) => boolean;
  isInSelectedWeek: (date: Date) => boolean;
  isToday: (date: Date) => boolean;
  onChangeMonth: (delta: number) => void;
  onSelectDay: (date: Date) => void;
  onToday: () => void;
}

export class WeekPickerOverlay {
  private popup: HTMLDivElement | null = null;
  private readonly ngContentAttribute: string | undefined;

  constructor(private readonly trigger: HTMLElement, private readonly model: WeekPickerOverlayModel) {
    // Preserve Angular's emulated stylesheet scope on the DOM-created popup.
    this.ngContentAttribute = trigger.getAttributeNames().find(name => name.startsWith('_ngcontent-'));
  }

  get element(): HTMLElement | null { return this.popup; }
  contains(target: Node): boolean { return !!this.popup?.contains(target); }

  private node<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (this.ngContentAttribute) element.setAttribute(this.ngContentAttribute, '');
    if (className) element.className = className;
    return element;
  }

  open(): void {
    if (typeof document === 'undefined' || this.popup) return;
    this.popup = this.node('div', 'aura-week-popup');
    this.popup.id = 'aura-planning-week-popup';
    this.popup.setAttribute('role', 'dialog');
    this.popup.setAttribute('aria-label', 'Choisir une date et afficher sa semaine');
    document.body.appendChild(this.popup);
    this.render();
    this.popup.querySelector<HTMLButtonElement>('.is-selected-week')?.focus({preventScroll:true});
  }

  close(): void {
    this.popup?.remove();
    this.popup = null;
  }

  render(): void {
    const popup = this.popup;
    if (!popup) return;
    const heading = this.node('div', 'aura-week-popup-heading');
    const monthButton = (delta:number, label:string, glyph:string): HTMLButtonElement => {
      const button = this.node('button');
      button.type = 'button';
      button.setAttribute('aria-label', label);
      button.dataset['monthDirection'] = String(delta);
      const icon = this.node('span', 'material-symbols-outlined');
      icon.textContent = glyph;
      button.appendChild(icon);
      button.addEventListener('click', event => {
        event.preventDefault();
        this.model.onChangeMonth(delta);
        // The owner re-renders via render(), so focus the replacement control.
        this.popup?.querySelector<HTMLButtonElement>(`[data-month-direction="${delta}"]`)?.focus({preventScroll:true});
      });
      return button;
    };
    heading.appendChild(monthButton(-1,'Mois précédent','chevron_left'));
    const title = this.node('strong');
    title.textContent = this.model.monthLabel();
    title.setAttribute('aria-live','polite');
    heading.appendChild(title);
    heading.appendChild(monthButton(1,'Mois suivant','chevron_right'));

    const grid = this.node('div', 'aura-week-popup-grid');
    for (const label of ['L','M','M','J','V','S','D']) {
      const weekday = this.node('span', 'aura-week-weekday');
      weekday.textContent = label;
      grid.appendChild(weekday);
    }
    for (const day of this.model.days()) {
      const button = this.node('button');
      button.type = 'button';
      button.textContent = String(day.getDate());
      const dayString = [String(day.getDate()).padStart(2,'0'),String(day.getMonth()+1).padStart(2,'0'),day.getFullYear()].join('/');
      button.setAttribute('aria-label', `Afficher la semaine du ${dayString}`);
      const selected = this.model.isInSelectedWeek(day);
      button.setAttribute('aria-pressed', String(selected));
      if (selected) button.classList.add('is-selected-week');
      if (this.model.isOutsideMonth(day)) button.classList.add('is-outside');
      if (this.model.isToday(day)) button.classList.add('is-today');
      // Native listener is bound to a popup owned by this helper, not a moved Angular view.
      button.addEventListener('click', event => {
        event.preventDefault();
        this.model.onSelectDay(new Date(day));
      });
      grid.appendChild(button);
    }

    const today = this.node('button', 'aura-week-popup-today');
    today.type = 'button';
    today.textContent = 'Aller à cette semaine';
    today.addEventListener('click', event => { event.preventDefault(); this.model.onToday(); });
    popup.replaceChildren(heading,grid,today);
    this.position();
  }

  position(): void {
    if (!this.popup || !this.trigger.isConnected || typeof window === 'undefined') return;
    const popup = this.popup;
    const rect = this.trigger.getBoundingClientRect();
    const width = Math.min(314, Math.max(220,window.innerWidth-24));
    const left = Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12));
    const popupHeight = popup.scrollHeight || popup.getBoundingClientRect().height || 365;
    const spaceBelow = window.innerHeight-rect.bottom-20;
    const spaceAbove = rect.top-20;
    const above = spaceBelow < popupHeight && spaceAbove > spaceBelow;
    const available = Math.max(160,above ? spaceAbove : spaceBelow);
    const height = Math.min(popupHeight, available);
    const top = above ? Math.max(12,rect.top-height-8) : Math.max(12,rect.bottom+8);
    Object.assign(popup.style,{
      width:`${width}px`,left:`${left}px`,top:`${top}px`,
      maxHeight:`${Math.max(160,Math.min(available,window.innerHeight-top-8))}px`,overflowY:'auto'
    });
  }
}
