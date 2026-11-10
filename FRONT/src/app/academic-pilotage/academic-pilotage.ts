import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UeService } from '../services/ue.service';
import { ClasseService } from '../services/classe.service';
import { PlanningService } from '../services/planning.service';
import { SupervisionService } from '../services/supervision.service';
import { AcademicTrackingService } from '../services/academic-tracking.service';
import { AuthService } from '../services/auth.service';
import { Academic3BConfig, AcademicAlert, AcademicBoard, AcademicGroup,
  AcademicKitItem, AcademicKitItemStatus, AcademicRow, AcademicUe,
  buildAcademicBoard, isIsoDate, normalizedConfig, sameAcademicExam } from '../shared/utils/academic-3b';

@Component({
  selector: 'app-academic-pilotage', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './academic-pilotage.html', styleUrl: './academic-pilotage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcademicPilotage implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  readonly kitStatusOptions: {value: AcademicKitItemStatus; label: string}[] = [
    {value:'unknown',label:'Non évalué'}, {value:'present',label:'Présent'},
    {value:'incomplete',label:'Incomplet'}, {value:'missing',label:'Absent'}
  ];
  readonly progressLabels: Record<string,string> = {
    'terminee':'Terminée','en_cours':'En cours','non_commencee':'Non commencée','a_parametrer':'À paramétrer'
  };
  readonly kitLabels: Record<string,string> = {
    complet:'Complet', incomplet:'Incomplet', manquant:'Manquant', a_renseigner:'À évaluer'
  };
  loading = true;
  error = '';
  supervisionWarning = false;
  board: AcademicBoard|null = null;
  sourceUes: AcademicUe[]=[];
  sourceClasses: any[]=[];
  sourcePlans: any[]=[];
  sourceSupervisions: any[]=[];
  currentDate = this.todayLocal();
  search = '';
  parcoursFilter = '';
  semesterFilter = '';
  phaseFilter = '';
  classFilter = '';
  statusFilter = '';
  currentPage = 1;
  readonly pageSize=15;
  editorUe: AcademicUe | null = null;
  editor: Academic3BConfig | null = null;
  editorRevision = 0;
  editorExamDate = '';
  editorExamSession = 'Session ordinaire';
  editorExamPeriod = '';
  editorExamClass = '';
  newKitName = '';
  classSearch = '';
  get matchingClasses(): any[] {
    const q=this.classSearch.trim().toLocaleLowerCase('fr');
    return q ? this.sourceClasses.filter(c=>String(c.name||'').toLocaleLowerCase('fr').includes(q)) : this.sourceClasses;
  }
  saving = false;
  saveError = '';
  saveSuccess = '';

  constructor(
    private ues: UeService,
    private classes: ClasseService,
    private planning: PlanningService,
    private supervisions: SupervisionService,
    private tracking: AcademicTrackingService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  private todayLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  get isAdmin(): boolean { return this.auth.currentUserValue?.role === 'admin'; }
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  load(): void {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
    this.loading=true; this.error=''; this.supervisionWarning=false;
    this.currentDate=this.todayLocal();
    const safeSupervisions=this.supervisions.getAll().pipe(catchError(err=>{
      this.supervisionWarning=true;
      console.warn('Supervisions non accessibles au tableau de pilotage',err);
      return of([] as any[]);
    }));
    this.subscriptions.add(combineLatest({
      ues:this.ues.getAll(),
      classes:this.classes.getAll(),
      plannings:this.planning.getPlannings(),
      supervisions:safeSupervisions
    }).subscribe({
      next:data=>{
        this.sourceUes=data.ues;
        this.sourceClasses=data.classes;
        this.sourcePlans=data.plannings;
        this.sourceSupervisions=data.supervisions;
        this.board=buildAcademicBoard({ues:data.ues,classes:data.classes,
          plannings:data.plannings,supervisions:data.supervisions,today:this.currentDate});
        this.loading=false; this.cdr.markForCheck();
      },
      error: err=>{
        console.error('Pilotage académique indisponible',err);
        this.error='Impossible de charger les données académiques. Aucun indicateur ne sera remplacé par des zéros.';
        this.loading=false; this.board=null; this.cdr.markForCheck();
      }
    }));
  }
  get parcoursOptions(): string[] { return [...new Set((this.board?.rows || []).map(r=>r.department))].sort(); }
  get semesterOptions(): string[] { return [...new Set((this.board?.rows || []).map(r=>r.semester))].sort(); }
  get phaseOptions(): string[] { return [...new Set((this.board?.rows || []).map(r=>r.phase))].sort(); }
  get classOptions(): string[] { return [...new Set((this.board?.rows || []).map(r=>r.class_name))].sort(); }
  get filteredRows(): AcademicRow[] {
    const q=this.search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return (this.board?.rows||[]).filter(r=>{
      const hay=[r.ue_name,r.ue_code,r.teacher_name,r.department,r.class_name]
        .join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      return (!q||hay.includes(q)) && (!this.parcoursFilter||r.department===this.parcoursFilter) &&
        (!this.semesterFilter||r.semester===this.semesterFilter) &&
        (!this.phaseFilter||r.phase===this.phaseFilter) &&
        (!this.classFilter||r.class_name===this.classFilter) &&
        (!this.statusFilter||r.status===this.statusFilter);
    });
  }
  get filteredAlerts(): AcademicAlert[] {
    const visible=new Set(this.filteredRows.map(r=>r.id));
    return (this.board?.alerts||[]).filter(a=>visible.has(`${a.ue_id}|${a.class_key}`));
  }
  get filteredExams(): AcademicBoard['upcomingExams'] {
    const ids=new Set(this.filteredRows.map(r=>`${r.ue_id}|${r.class_name}`));
    return (this.board?.upcomingExams||[]).filter(e=>ids.has(`${e.ue_id}|${e.class_name}`));
  }
  get filteredGroups(): AcademicGroup[] {
    const allowed=new Set(this.filteredRows.map(r=>JSON.stringify([r.department,r.semester,r.phase,r.class_key])));
    return (this.board?.phaseGroups||[]).filter(g=>allowed.has(g.id));
  }
  get filteredSemesters(): AcademicGroup[] {
    const allowed=new Set(this.filteredRows.map(r=>JSON.stringify([r.department,r.semester,'',r.class_key])));
    return (this.board?.semesterGroups||[]).filter(g=>allowed.has(g.id));
  }
  get displayedRows(): AcademicRow[] { return this.filteredRows.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize); }
  get pageCount(): number { return Math.max(1,Math.ceil(this.filteredRows.length/this.pageSize)); }
  resetPage(): void { this.currentPage=1; }
  changePage(delta: number): void { this.currentPage=Math.max(1,Math.min(this.pageCount,this.currentPage+delta)); }
  resetFilters(): void { this.search='';this.parcoursFilter='';this.semesterFilter='';this.phaseFilter='';this.classFilter='';this.statusFilter='';this.resetPage(); }
  get summary(): {total:number;completed:number;inProgress:number;notStarted:number;unconfigured:number;critical:number} {
    const r=this.filteredRows;
    return {total:r.length,completed:r.filter(x=>x.status==='terminee').length,
      inProgress:r.filter(x=>x.status==='en_cours').length,
      notStarted:r.filter(x=>x.status==='non_commencee').length,
      unconfigured:r.filter(x=>x.status==='a_parametrer').length,
      critical:this.filteredAlerts.filter(a=>a.severity==='critique').length};
  }
  trackById(_index: number, item: AcademicRow): string { return item.id; }
  statusLabel(r: AcademicRow): string { return this.progressLabels[r.status]; }
  kitLabel(r: AcademicRow): string { return this.kitLabels[r.kit]; }
  forecastLabel(r: AcademicRow): string {
    return r.forecastSource==='estimated'?'Estimation':r.forecastSource==='planned'?'Programmée':r.forecastSource==='completed'?'Réalisée':'Non calculable';
  }
  get alertsPreview(): AcademicAlert[] {return this.filteredAlerts.slice(0,12);}
  get examsPreview(): AcademicBoard['upcomingExams'] {return this.filteredExams.slice(0,12);}
  /** Les examens issus du Planning sont visibles mais ne sont pas modifiables dans le paramétrage UE. */
  get plannedEditorExams() {
    if (!this.editorUe?.id) return [];
    const result=new Map<string,AcademicRow['exams'][number]>();
    for (const row of this.board?.rows||[]) {
      if (row.ue_id!==this.editorUe.id) continue;
      for (const e of row.exams) if (e.source==='planning') result.set(e.id,e);
    }
    return [...result.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }

  openEditor(row: AcademicRow): void {
    if (!this.isAdmin) return;
    const ue=this.sourceUes.find(item=>item.id===row.ue_id);
    if (!ue) return;
    this.editorUe=ue;
    this.editorRevision=Number(ue.academic3b_revision ?? 0);
    this.editor=normalizedConfig(ue.academic3b);
    this.editor=JSON.parse(JSON.stringify(this.editor)) as Academic3BConfig;
    this.editorExamDate='';this.editorExamSession='Session ordinaire';
    this.editorExamPeriod='';this.editorExamClass=row.class_id||'';this.classSearch='';this.newKitName='';
    this.saveError='';this.saveSuccess='';
    this.cdr.markForCheck();
  }
  closeEditor(): void {if (this.saving) return;this.editor=null;this.editorUe=null;this.saveError='';}
  toggleClass(id: string, enabled:boolean): void {
    if (!this.editor) return;
    const old=this.editor.class_ids||[];
    this.editor.class_ids=enabled?[...new Set([...old,id])]:old.filter(x=>x!==id);
  }
  hasClass(id:string): boolean {return !!this.editor?.class_ids?.includes(id);}
  addExam(): void {
    if (!this.editor) return;
    if (!isIsoDate(this.editorExamDate)) {this.saveError='Saisissez une date d’examen valide.';return;}
    if (!this.editorExamSession.trim()) {this.saveError='La session est obligatoire.';return;}
    if ([...(this.editor.exams||[]), ...this.plannedEditorExams].some(e=>sameAcademicExam(e, {
      id:'nouvel-examen',date:this.editorExamDate,session:this.editorExamSession.trim(),
      class_id:this.editorExamClass,period:this.editorExamPeriod.trim()
    }))) {
      this.saveError='Cette session d’examen existe déjà à cette date pour la classe choisie.';return;
    }
    this.editor.exams=[...(this.editor.exams||[]),{
      id:`exam-${Date.now()}-${Math.floor(Math.random()*100000)}`,
      date:this.editorExamDate,session:this.editorExamSession.trim(),period:this.editorExamPeriod.trim(),
      class_id:this.editorExamClass||'',notes:''
    }];
    this.editorExamDate='';this.editorExamPeriod='';this.saveError='';
  }
  removeExam(id:string): void {if (this.editor) this.editor.exams=(this.editor.exams||[]).filter(e=>e.id!==id);}
  kitTrack(_i:number,item:AcademicKitItem):string {return item.key;}
  addKitItem(): void {
    if (!this.editor) return;
    const name=this.newKitName.trim();
    if (!name) {this.saveError='Le nom du document est obligatoire.';return;}
    if ((this.editor.kit_items||[]).some(i=>i.label.toLowerCase()===name.toLowerCase())) {
      this.saveError='Cet élément du kit existe déjà.';return;
    }
    this.editor.kit_items=[...(this.editor.kit_items||[]),{
      key:`custom-${Date.now()}-${Math.floor(Math.random()*10000)}`,
      label:name,required:true,status:'unknown'
    }];
    this.newKitName='';this.saveError='';
  }
  removeKitItem(key:string): void {
    if (!this.editor) return;
    this.editor.kit_items=(this.editor.kit_items||[]).filter(i=>i.key!==key);
  }
  async save(): Promise<void> {
    if (!this.isAdmin || !this.editor || !this.editorUe?.id || this.saving) return;
    this.saving=true;this.saveError='';this.saveSuccess='';this.cdr.markForCheck();
    try {
      await this.tracking.saveConfig(this.editorUe.id,this.editor,this.editorRevision);
      this.saveSuccess='Paramètres enregistrés. Les indicateurs sont recalculés à partir du Planning.';
      this.editor=null;this.editorUe=null;
      // Data stream refreshes when the UE changes. Keep the success message visible.
    } catch(error) {
      this.saveError=error instanceof Error?error.message:'Enregistrement impossible. Aucune donnée n’a été confirmée.';
    } finally {this.saving=false;this.cdr.markForCheck();}
  }
}
