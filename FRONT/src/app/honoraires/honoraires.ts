import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AcademicSearchSelectComponent } from '../shared/components/academic-search-select/academic-search-select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { SupervisionService } from '../services/supervision.service';
import { AsyncSupervisionService } from '../services/async-supervision.service';
import { PlanningService } from '../services/planning.service';
import { UeService } from '../services/ue.service';
import { TeacherService } from '../services/teacher.service';
import { ClasseService } from '../services/classe.service';
import { AuthService } from '../services/auth.service';
import { Lot4Document, Lot4Filters, Lot4Line, Lot4Teacher, Lot4Ue, Lot4Supervision, prepareLot4, durationLabel } from '../shared/utils/lot4-documents';
import { exportLot4Pdf, Lot4PdfKind } from '../shared/utils/lot4-pdf';
import { buildPigierOfficialInput, buildPigierPlanningDraftInput } from '../shared/utils/pigier-honoraires-adapter';
import { findHistoricalMatches, reconcileHistoricalReport, type HistoricalMatches } from '../shared/utils/pigier-historical-match';
import { PigierOfficialDocument, type PigierOfficialInput, preparePigierOfficialHonoraires, renderPigierOfficialHonoraires, downloadPigierOfficialPdf } from '../shared/utils/pigier-honoraires-v2';

/** Relevés provisoires du LOT 4 - aucune liquidation financière avant validation des barèmes. */
@Component({
  selector: 'app-honoraires',
  standalone:true,
  imports:[CommonModule,FormsModule,AcademicSearchSelectComponent],
  templateUrl:'./honoraires.html',
  styleUrls:['./honoraires.scss']
})
export class HonorairesComponent implements OnInit,OnDestroy {
  filters:Lot4Filters={teacher:'',ue:'',start:'',end:''};
  private paramsFilters:Lot4Filters={};
  private dataSub?:Subscription;
  private authSub?:Subscription;
  private sources:{teachers:any[];ues:any[];classes:any[];plannings:any[];supervisions:any[];asyncSupervisions:any[]}={
    teachers:[],ues:[],classes:[],plannings:[],supervisions:[],asyncSupervisions:[]
  };
  teachers:Lot4Teacher[]=[];
  ues:Lot4Ue[]=[];
  honorairesTeachers: Array<{id:string; name:string}> = [];
  honorairesUes: Array<{id:string; name:string; code:string}> = [];
  onHonorairesTeacherSelected(value: string | number | null): void {
    this.filters.teacher=String(value ?? ''); this.refresh();
  }
  onHonorairesUeSelected(value: string | number | null): void {
    this.filters.ue=String(value ?? ''); this.refresh();
  }
  report:Lot4Document=prepareLot4({});
  isAdmin=false;
  loading=true;
  denied=false;
  loadError='';
  exportError='';
  exportSuccess='';
  officialWarnings:string[]=[];
  exportingOfficial=false;
  officialPreview: PigierOfficialDocument | null = null;
  officialPreviewError='';
  expandedLineId:string|null=null;
  private selectionVersion=0;
  private manualMatches=new Map<string,string>();
  historicalMatches:HistoricalMatches=findHistoricalMatches(this.sources);
  includeExceptions=true;
  readonly durationLabel=durationLabel;

  constructor(
    private route:ActivatedRoute,
    private router:Router,
    private auth:AuthService,
    private supervision:SupervisionService,
    private asyncSupervision:AsyncSupervisionService,
    private planning:PlanningService,
    private ueService:UeService,
    private teacherService:TeacherService,
    private classeService:ClasseService,
    private cdr:ChangeDetectorRef
  ) {}

  ngOnInit():void {
    const params=this.route.snapshot.queryParamMap;
    this.paramsFilters={
      teacher:params.get('teacher')||'',ue:params.get('course')||params.get('ue')||'',
      start:params.get('start')||'',end:params.get('end')||''
    };
    this.filters={...this.paramsFilters};
    this.authSub=this.auth.currentUser$.subscribe(profile=>{
      const approved=profile?.role==='admin';
      this.isAdmin=approved;
      this.denied=!!profile&&!approved;
      if(approved&&!this.dataSub)this.loadData();
      if(!approved&&this.dataSub){
        this.dataSub.unsubscribe();this.dataSub=undefined;
        this.sources={teachers:[],ues:[],classes:[],plannings:[],supervisions:[],asyncSupervisions:[]};
        this.report=prepareLot4({});this.teachers=[];this.ues=[];
        this.manualMatches.clear();this.historicalMatches=findHistoricalMatches(this.sources);
      }
      if(!approved)this.loading=false;
      this.cdr.markForCheck();
    });
  }
  ngOnDestroy():void {this.authSub?.unsubscribe();this.dataSub?.unsubscribe();}

  private loadData():void {
    this.loading=true;
    this.dataSub=combineLatest({
      teachers:this.teacherService.getAll(),ues:this.ueService.getAll(),
      classes:this.classeService.getAll(),plannings:this.planning.getPlannings(),
      supervisions:this.supervision.getAll(),asyncSupervisions:this.asyncSupervision.getAll()
    }).subscribe({
      next:data=>{
        this.sources=data;
        this.teachers=data.teachers;
        this.ues=data.ues;
        this.honorairesTeachers = data.teachers.filter(t=>!!t.id).map(t=>({id:String(t.id),
          name:String(t.name || [t.first_name || (t as any).firstName, t.last_name || (t as any).lastName].filter(Boolean).join(' ')).trim()}));
        this.honorairesUes = data.ues.filter(u=>!!u.id).map(u=>({id:String(u.id),code:String(u.code || ''),
          name:[u.code, u.name].filter(Boolean).join(' — ')}));
        this.loading=false;this.loadError='';
        this.resolveLegacyFilters();this.refresh();
        this.cdr.detectChanges();
      },
      error:e=>{
        this.loading=false;this.loadError='Impossible de charger toutes les données. Document et PDF désactivés pour éviter un relevé incomplet.';
        console.error('LOT4 lecture des prestations',e);
        this.cdr.detectChanges();
      }
    });
  }

  private resolveLegacyFilters():void {
    const norm=(s:string)=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(this.filters.teacher && !this.teachers.some(t=>t.id===this.filters.teacher)){
      const candidate=this.teachers.find(t=>norm(t.name||`${t.first_name||t.firstName||''} ${t.last_name||t.lastName||''}`)===norm(this.filters.teacher||''));
      if(candidate?.id)this.filters.teacher=candidate.id;
    }
    if(this.filters.ue && !this.ues.some(u=>u.id===this.filters.ue)){
      const candidate=this.ues.find(u=>norm(u.name||'')===norm(this.filters.ue||'')||norm(u.code||'')===norm(this.filters.ue||''));
      if(candidate?.id)this.filters.ue=candidate.id;
    }
  }

  /**
   * Le bouton principal ne melange jamais les prestations reconnues avec les
   * brouillons non attestes. Sans prestation attestee, le brouillon historique
   * reste disponible, avec son avertissement PROVISOIRE explicite.
   */
  private selectedPigierInput(): PigierOfficialInput {
    const attested=buildPigierOfficialInput(this.sources,this.report,this.filters,this.historicalMatches);
    if (attested.sessions.length) return attested;
    return buildPigierPlanningDraftInput(this.sources,this.report,this.filters,this.historicalMatches);
  }

  refresh():void {
    this.selectionVersion++;
    this.exportError='';this.exportSuccess='';this.officialWarnings=[];
    const normalizedFilters:Lot4Filters={
      teacher:this.filters.teacher||'',ue:this.filters.ue||'',start:this.filters.start||'',end:this.filters.end||''
    };
    // D'abord rapprocher TOUT le catalogue : filtrer avant exclurait les anciennes
    // fiches qui ne contiennent pas les IDs modernes.
    const rawReport=prepareLot4({...this.sources,filters:{}});
    this.historicalMatches=findHistoricalMatches(this.sources,this.manualMatches);
    this.report=reconcileHistoricalReport(this.sources,rawReport,this.historicalMatches,normalizedFilters);
    this.officialPreview=null;
    this.officialPreviewError='';
    if (this.filters.teacher && this.filters.ue && this.filters.start && this.filters.end &&
        this.filters.start <= this.filters.end) {
      try {
        const input=this.selectedPigierInput();
        this.officialPreview=preparePigierOfficialHonoraires(input);
      } catch (e) {
        this.officialPreviewError=e instanceof Error ? e.message : 'Selection invalide.';
      }
    }
  }
  get rows(){return this.includeExceptions?this.report.lines:this.report.eligible;}
  manualOptions(planId:string|null): readonly Lot4Supervision[] {
    return planId ? this.historicalMatches.ambiguousByPlanningId.get(planId) || [] : [];
  }
  selectedManualMatch(planId:string|null):string {return planId ? this.manualMatches.get(planId)||'' : '';}
  chooseManualMatch(planId:string|null,supervisionId:string):void {
    if (!planId) return;
    if (supervisionId) {
      const allowed=this.manualOptions(planId).some(s=>s.id===supervisionId);
      if (!allowed) {this.exportError='Correspondance invalide : actualisez les données.';return;}
      this.manualMatches.set(planId,supervisionId);
    } else this.manualMatches.delete(planId);
    this.refresh();
  }
  clearManualMatch(planId:string|null):void {
    if (!planId) return;
    this.manualMatches.delete(planId);
    this.refresh();
  }

  toggleDiagnosis(line:Lot4Line):void {
    this.expandedLineId=this.expandedLineId===line.id?null:line.id;
  }
  private returnToHonoraires():Record<string,string> {
    return {fromHonoraires:'1',honorairesTeacher:this.filters.teacher||'',
      honorairesUe:this.filters.ue||'',honorairesStart:this.filters.start||'',
      honorairesEnd:this.filters.end||''};
  }
  openPlanningLine(line:Lot4Line):void {
    if(!line.planningId)return;
    this.router.navigate(['/admin/plannings'],{queryParams:{
      ...this.returnToHonoraires(),planningId:line.planningId,week:line.date,
    }});
  }
  openHistoryLine(line:Lot4Line):void {
    if(!line.sourceId)return;
    this.router.navigate(['/admin/history'],{queryParams:{
      ...this.returnToHonoraires(),supervisionId:line.sourceId,
    }});
  }
  get readyForExport():boolean {
    return this.isAdmin&&!this.loading&&!this.loadError&&!!this.filters.teacher&&
      !!this.filters.start&&!!this.filters.end&&this.filters.start<=this.filters.end&&this.report.lines.length>0;
  }
  get readyForOfficialExport():boolean {
    // Le PDF officiel est TOUJOURS une fiche individuelle pour une seule UE.
    return this.isAdmin && !this.loading && !this.loadError && !this.exportingOfficial &&
      !!this.filters.teacher && !!this.filters.ue && !!this.filters.start && !!this.filters.end &&
      this.filters.start <= this.filters.end && !!this.officialPreview?.rows.length;
  }

  exportPdf(kind:Lot4PdfKind):void {
    if (kind==='fiche') { void this.exportOfficialPdf(); return; }
    this.exportError='';this.exportSuccess='';this.officialWarnings=[];
    if(!this.readyForExport){this.exportError='Sélectionnez un enseignant et une période valide avant de générer le PDF.';return;}
    try {
      // Le PDF Releve existant reste strictement inchange (LOT 4 provisoire).
      const name=exportLot4Pdf(this.report,kind);
      this.exportSuccess=`Relevé provisoire généré : ${name}`;
    }catch(e){this.exportError=e instanceof Error?e.message:'Échec de génération PDF.';}
  }

  private async exportOfficialPdf():Promise<void> {
    if (this.exportingOfficial) return;
    this.exportError='';this.exportSuccess='';this.officialWarnings=[];
    if (!this.readyForOfficialExport) {
      this.exportError=this.officialPreviewError || 'Sélectionnez un enseignant, une UE, une période et au moins une séance du planning.';
      return;
    }
    this.exportingOfficial=true;
    const selectionVersion=this.selectionVersion;
    this.cdr.markForCheck();
    try {
      const input=this.selectedPigierInput();
      const prepared=preparePigierOfficialHonoraires(input);
      this.officialWarnings=prepared.issues.map(x => x.message);
      if(!prepared.rows.length) {
        throw new Error('Aucune séance de cours trouvée dans le planning pour cet enseignant, cette UE et cette période.');
      }
      const pdf=await renderPigierOfficialHonoraires(input);
      // Eviter de telecharger des donnees confidentielles apres une deconnexion.
      if (!this.isAdmin) throw new Error('Votre session administrateur a changé. Reconnectez-vous.');
      if (selectionVersion!==this.selectionVersion) {
        throw new Error('Les filtres ont changé pendant la génération. Relancez le PDF avec la sélection actuelle.');
      }
      downloadPigierOfficialPdf(pdf);
      this.exportSuccess=`${pdf.provisional?'Fiche provisoire':'Fiche officielle'} Pigier CI générée : ${pdf.filename}`+
        (pdf.provisional ? ' — les lignes à vérifier ne constituent pas une preuve de réalisation.' : '.');
    }catch(e){
      this.exportError=e instanceof Error?e.message:'Échec de génération de la fiche officielle.';
    }finally{
      this.exportingOfficial=false;
      this.cdr.markForCheck();
    }
  }
  goBack():void {this.router.navigate(['/admin/history']);}
}
