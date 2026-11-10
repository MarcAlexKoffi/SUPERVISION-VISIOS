/** Export PDF provisoire du LOT 4, partageant exactement les lignes du moteur. */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {Lot4Document, Lot4Line, Lot4Amount, durationLabel} from './lot4-documents';

export type Lot4PdfKind = 'releve'|'fiche';
const clean=(s:unknown)=>String(s??'').trim();
const pdfDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)?`${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`:d;
const safeFile=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'').slice(0,80)||'enseignant';
const summaryRow=(l:Lot4Line):string[]=>[
  pdfDate(l.date)+(l.periodEnd!==l.date&&l.periodEnd?` au ${pdfDate(l.periodEnd)}`:''),
  l.className,l.ueCode||l.ueName,l.description,
  l.startTime&&l.endTime?`${l.startTime} - ${l.endTime}`:'Période',
  l.kind==='asynchrone'?'Forfait':durationLabel(l.durationMinutes),
  l.eligibility==='eligible'?'Éligible':l.eligibility==='exclu'?'Exclu':'À vérifier'
];
export function exportLot4Pdf(document:Lot4Document,kind:Lot4PdfKind,amount?:Lot4Amount):string {
  if(!document.lines.length)throw new Error('Aucune prestation à exporter.');
  if(document.identity.teacher==='À renseigner')throw new Error('Sélectionnez un enseignant avant export.');
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const title=kind==='fiche'?'FICHE DE PRESTATIONS':'RELEVÉ DES PRESTATIONS ET HONORAIRES';
  const navy:[number,number,number]=[22,43,79];
  const drawHeader=()=>{
    doc.setFillColor(...navy);doc.rect(0,0,210,19,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(11);
    doc.text('CAMPUS EN LIGNE - ADMINISTRATION ACADÉMIQUE',12,12);
    doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(12);
    doc.text(title,12,28);
    doc.setFontSize(8);doc.setTextColor(165,54,43);
    doc.text('DOCUMENT PROVISOIRE - Modèle officiel et barèmes à valider',12,34);
  };
  const firstPageMeta=()=>{
    doc.setTextColor(52,65,85);doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text(`Enseignant : ${clean(document.identity.teacher)}`,12,41);
    doc.text(`Matricule : ${clean(document.identity.matricule)}`,112,41);
    doc.text(`UE : ${clean(document.identity.ue)}`,12,46);
    doc.text(`Période : ${pdfDate(document.identity.start)} - ${pdfDate(document.identity.end)}`,112,46);
  };
  drawHeader();firstPageMeta();
  const body=document.lines.map(summaryRow);
  autoTable(doc,{
    startY:53,
    head:[['Date / période','Classe','UE','Prestation','Horaires','Durée','Statut']],
    body,
    theme:'grid',
    styles:{font:'helvetica',fontSize:7,cellPadding:2,overflow:'linebreak',textColor:[28,41,60]},
    headStyles:{fillColor:navy,textColor:[255,255,255],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[247,249,252]},
    columnStyles:{0:{cellWidth:31},1:{cellWidth:27},2:{cellWidth:24},3:{cellWidth:34},4:{cellWidth:27},5:{cellWidth:20},6:{cellWidth:25}},
    margin:{left:10,right:10,top:40,bottom:24},
    showHead:'everyPage',
    didDrawPage:(data)=>{if(data.pageNumber>1)drawHeader();}
  });
  let y=Math.max(65,((doc as any).lastAutoTable?.finalY||60)+8);
  const nextBlock=(height:number)=>{if(y+height>274){doc.addPage();drawHeader();y=42;}};
  nextBlock(37);
  doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text('RÉCAPITULATIF DES PRESTATIONS ÉLIGIBLES',12,y);y+=7;
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(38,52,70);
  doc.text(`Séances synchrones : ${document.totalSyncCount}  |  Durée réelle : ${durationLabel(document.totalSyncMinutes)}`,12,y);y+=6;
  doc.text(`Périodes asynchrones réalisées : ${document.totalAsyncCount}`,12,y);y+=6;
  doc.text(`Prestations à vérifier : ${document.review.length}  |  Exclues : ${document.excluded.length}`,12,y);y+=6;
  if(amount?.payable){
    nextBlock(24);
    doc.setFont('helvetica','bold');doc.text(`Durée arrondie selon barème validé : ${durationLabel(amount.roundedMinutes)}`,12,y);y+=6;
    doc.text(`Montant synchrone : ${amount.syncFcfa?.toLocaleString('fr-FR')} FCFA`,12,y);y+=6;
    doc.text(`Montant asynchrone : ${amount.asyncFcfa?.toLocaleString('fr-FR')} FCFA`,12,y);y+=6;
    doc.setFontSize(11);doc.text(`TOTAL PRÉLIMINAIRE : ${amount.totalFcfa?.toLocaleString('fr-FR')} FCFA`,12,y);y+=7;
  }else{
    nextBlock(14);doc.setTextColor(165,54,43);
    doc.setFont('helvetica','bold');doc.text('Montants non calculés : barèmes à valider et contrôles à terminer.',12,y);y+=7;
  }
  const notes=[...document.warnings,...document.review.slice(0,5).map(l=>`${l.date} : ${l.reason}`)];
  if(notes.length){
    nextBlock(15);doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('POINTS DE CONTRÔLE',12,y);y+=5;
    doc.setFont('helvetica','normal');doc.setTextColor(80,92,106);doc.setFontSize(8);
    for(const note of notes.slice(0,8)){const wrapped=doc.splitTextToSize(`- ${note}`,184) as string[];nextBlock(wrapped.length*4+1);doc.text(wrapped,12,y);y+=wrapped.length*4+1;}
  }
  if(kind==='fiche'){
    nextBlock(32);y+=10;doc.setDrawColor(120,130,144);
    doc.line(15,y,85,y);doc.line(123,y,196,y);
    doc.setFontSize(8);doc.setTextColor(50,62,75);
    doc.text('Enseignant : date et signature',15,y+5);
    doc.text('Responsable : date et visa',123,y+5);
  }
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i);doc.setDrawColor(210,218,229);doc.line(12,282,198,282);
    doc.setTextColor(105,114,130);doc.setFontSize(7);doc.setFont('helvetica','normal');
    doc.text('Document de travail - aucune valeur de paiement sans validation administrative',12,287);
    doc.text(`Page ${i}/${pages}`,196,287,{align:'right'});
  }
  const period=[document.identity.start,document.identity.end].map(safeFile).join('_');
  const name=`${kind==='fiche'?'Fiche_Prestations':'Releve_Honoraires'}_${safeFile(document.identity.teacher)}_${period}.pdf`;
  doc.save(name);
  return name;
}
