/** AURA V2.4: one printable timetable engine for classes and teachers.
 * Static PDF drawing only; no Firestore writes, external links or added dependency.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { activeEdtSessions, dayKey, edtHourRange, edtPdfFilename, timeMinutes, type EdtSession } from './edt-week';

export interface EdtPdfRequest {
  kind: 'class' | 'teacher';
  subject: string;
  start: Date;
  end: Date;
  sessions: readonly EdtSession[];
}

interface PositionedEvent {
  item: EdtSession;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

function colorFor(type: string | null | undefined): {bg: [number, number, number]; accent: [number, number, number]} {
  const label = (type || '').toLowerCase();
  if (/(examen|exposé|soutenance)/i.test(label)) return {bg:[242,237,250],accent:[114,86,167]};
  if (/(td|tp)/i.test(label)) return {bg:[232,248,244],accent:[24,129,113]};
  return {bg:[237,243,255],accent:[31,82,167]};
}

function arrange(items: readonly EdtSession[]): PositionedEvent[] {
  const valid = items.map(item => {
    const end = timeMinutes(item.end_time);
    const start = timeMinutes(item.start_time) ?? (end === null ? null : Math.max(0, end - 60));
    return {item, start, end};
  }).filter((v): v is {item: EdtSession; start: number; end: number} => v.start !== null && v.end !== null && v.end > v.start)
    .sort((a,b) => a.start - b.start || a.end - b.end);
  const groups: typeof valid[] = [];
  let group: typeof valid = [];
  let groupEnd = -1;
  for (const candidate of valid) {
    if (group.length && candidate.start >= groupEnd) {groups.push(group);group=[];groupEnd=-1;}
    group.push(candidate);groupEnd = Math.max(groupEnd,candidate.end);
  }
  if (group.length) groups.push(group);
  return groups.flatMap(itemsInGroup => {
    const occupied: number[] = [];
    const allocated = itemsInGroup.map(event => {
      let lane = occupied.findIndex(end=>end<=event.start);
      if (lane===-1) {lane=occupied.length;occupied.push(event.end);} else occupied[lane]=event.end;
      return {...event,lane,lanes:0};
    });
    allocated.forEach(e=>e.lanes=occupied.length);
    return allocated;
  });
}

function headline(doc: jsPDF, text: string, x: number, y: number, width: number, maxLines=2): boolean {
  const lines = doc.splitTextToSize(text, width) as string[];
  const visible = lines.slice(0,maxLines);
  if (lines.length > maxLines) visible[visible.length - 1] = visible[visible.length - 1].slice(0,-2) + '...';
  doc.text(visible,x,y);
  return lines.length > maxLines;
}

export function exportWeeklyTimetablePdf(request: EdtPdfRequest): string {
  const entries = activeEdtSessions(request.sessions).filter(item => {
    const key = dayKey(item.date);
    return key >= format(request.start,'yyyy-MM-dd') && key <= format(request.end,'yyyy-MM-dd');
  });
  const doc = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const pageW = doc.internal.pageSize.getWidth();
  const ink: [number,number,number]=[22,43,76];
  const blue: [number,number,number]=[23,75,166];
  const light: [number,number,number]=[228,235,244];
  const left=13;
  const gridX=12, gridY=62, gridW=pageW-24, axisW=15;
  const dayW=(gridW-axisW)/7;
  const {startHour,endHour}=edtHourRange(entries);
  const totalHours=endHour-startHour;
  const hourH=Math.min(28,112/totalHours);
  const gridH=hourH*totalHours;
  const period = `${format(request.start,'dd MMM',{locale:fr})} — ${format(request.end,'dd MMM yyyy',{locale:fr})}`;
  const periodHours=entries.reduce((sum,p) => {
    const e=timeMinutes(p.end_time);const s=timeMinutes(p.start_time) ?? (e===null?null:e-60);
    return sum +(e!==null && s!==null && e>s ? e-s : 0);
  },0);
  const uniqueDays=new Set(entries.map(item=>dayKey(item.date))).size;
  const title=request.kind==='teacher'?'Emploi du temps enseignant':'Emploi du temps classe';
  const target=request.subject.trim() || (request.kind==='teacher'?'Enseignant':'Toutes les classes');
  const filename=edtPdfFilename(request.start,request.end,target,request.kind);

  doc.setFillColor(23,75,166);doc.roundedRect(left,11,11,11,2.4,2.4,'F');
  doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);doc.setFontSize(9);doc.text('U',left+5.5,18.5,{align:'center'});
  doc.setTextColor(...blue);doc.setFontSize(8);doc.text('UDMCI  /  PLANIFICATION ACADÉMIQUE',left+15,13.8);
  doc.setTextColor(...ink);doc.setFontSize(17);
  headline(doc,`${title} : ${target}`,left+15,22.5,205,1);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(102,119,143);
  doc.text(`Semaine du ${period}`,left+15,30);
  doc.setDrawColor(...light);doc.line(left,34,pageW-left,34);

  const metrics=[`${entries.length} séance${entries.length>1?'s':''}`,`${Math.round(periodHours/6)/10} heure${periodHours>60?'s':''}`,`${uniqueDays} jour${uniqueDays>1?'s':''} actif${uniqueDays>1?'s':''}`];
  metrics.forEach((label,i)=>{
    const x=left+i*94;
    doc.setFillColor(248,251,255);doc.setDrawColor(...light);doc.roundedRect(x,38,89,15,2,2,'FD');
    doc.setFillColor(231,239,253);doc.roundedRect(x+4,42,7,7,1.5,1.5,'F');
    doc.setTextColor(...blue);doc.setFont('helvetica','bold');doc.setFontSize(9.3);doc.text(label,x+15,47.6);
  });

  const dayHeader=13;
  doc.setFillColor(246,249,253);doc.setDrawColor(...light);
  doc.roundedRect(gridX,gridY,gridW,dayHeader,2,2,'FD');
  doc.setFont('helvetica','bold');doc.setTextColor(106,123,149);doc.setFontSize(8);
  doc.text('HEURES',gridX+axisW/2,gridY+8,{align:'center'});
  const days=Array.from({length:7},(_,i)=>addDays(request.start,i));
  days.forEach((date,i)=>{
    const x=gridX+axisW+i*dayW;
    doc.setDrawColor(...light);doc.line(x,gridY,x,gridY+dayHeader+gridH);
    doc.setTextColor(86,105,133);doc.setFontSize(8);doc.text(format(date,'EEE',{locale:fr}).replace('.','').toUpperCase(),x+dayW/2,gridY+5.3,{align:'center'});
    doc.setFontSize(10);doc.setTextColor(...ink);doc.text(format(date,'dd'),x+dayW/2,gridY+10,{align:'center'});
  });
  const chartY=gridY+dayHeader;
  for(let h=startHour;h<=endHour;h++) {
    const y=chartY+(h-startHour)*hourH;
    doc.setDrawColor(...light);doc.line(gridX,y,gridX+gridW,y);
    if(h<endHour) { doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(134,152,177);
      doc.text(`${String(h).padStart(2,'0')}:00`,gridX+axisW/2,y+4,{align:'center'});
    }
  }
  doc.line(gridX,chartY+gridH,gridX+gridW,chartY+gridH);
  doc.setDrawColor(...light);doc.line(gridX+gridW,gridY,gridX+gridW,chartY+gridH);
  let needsDetails=false;
  days.forEach((date,i)=>{
    const dateKey=format(date,'yyyy-MM-dd');
    const events=arrange(entries.filter(item=>dayKey(item.date)===dateKey));
    events.forEach(({item,start,end,lane,lanes})=>{
      const pad=0.75;
      const x=gridX+axisW+i*dayW+pad+(dayW-2*pad)*lane/lanes;
      const w=(dayW-2*pad)/lanes-0.6;
      const y=chartY+(start-startHour*60)/60*hourH+0.5;
      const h=Math.max(2,(end-start)/60*hourH-1);
      if(w<10 || h<14) needsDetails=true;
      const palette=colorFor(item.session_type);
      doc.setFillColor(...palette.bg);doc.setDrawColor(218,229,243);
      doc.roundedRect(x,y,w,h,1.6,1.6,'FD');
      doc.setFillColor(...palette.accent);doc.rect(x,y,1.1,h,'F');
      if(h>=8 && w>=10) {
        doc.setFontSize(7);doc.setFont('helvetica','bold');doc.setTextColor(...palette.accent);
        const type=String(item.session_type||'Cours');
        doc.text(type.slice(0,15),x+2.2,y+4.0);
        doc.setTextColor(...ink);doc.setFontSize(w<17?6.5:8);doc.setFont('helvetica','bold');
        const title=String(item.ue_name || item.title || 'Séance');
        const cut=headline(doc,title,x+2.2,y+7.8,Math.max(4,w-4),h>=20?2:1);
        if(cut) needsDetails=true;
        if(h>=24 && w>=14) {
          doc.setFontSize(6.8);doc.setFont('helvetica','normal');doc.setTextColor(101,119,146);
          const person=request.kind==='teacher' ? (item.classe_name || item.parcours || '') : `${item.teacher_first_name || ''} ${item.teacher_last_name || ''}`.trim();
          const personCut=headline(doc,String(person),x+2.2,y+18,Math.max(4,w-4),1);
          if(personCut) needsDetails=true;
        }
        if(h>=30 && w>=14) {
          doc.setFontSize(6.5);doc.setTextColor(94,111,141);
          doc.text(`${String(item.start_time||'').slice(0,5)}-${String(item.end_time||'').slice(0,5)}`,x+2.2,Math.min(y+h-2.5,y+25));
        }
      }
    });
  });

  const footerY=Math.min(201,chartY+gridH+8);
  doc.setFont('helvetica','normal');doc.setTextColor(107,124,147);doc.setFontSize(7.5);
  doc.text('Seances annulees exclues des emplois du temps. Historique disponible dans la supervision.',left,footerY);
  doc.text('UDMCI · 1',pageW-left,footerY,{align:'right'});
  if(!entries.length) {
    doc.setFontSize(11);doc.setTextColor(116,133,155);doc.text('Aucune séance active sur cette période.',pageW/2,chartY+gridH/2,{align:'center'});
  }

  // A busy timetable may need a second page to preserve the complete labels and hours.
  if(needsDetails || entries.length>12) {
    doc.addPage();
    doc.setFont('helvetica','bold');doc.setTextColor(...ink);doc.setFontSize(14);
    doc.text(`${title} : ${target}`,left,18);doc.setFontSize(9);doc.setTextColor(...blue);
    doc.text(`Détail des séances · ${period}`,left,25);
    const list=[...entries].sort((a,b)=>`${dayKey(a.date)} ${a.start_time||''}`.localeCompare(`${dayKey(b.date)} ${b.start_time||''}`));
    autoTable(doc,{
      startY:33, margin:{left,right:left}, theme:'striped',
      head:[['Date','Horaires','UE / Activité',request.kind==='teacher'?'Classe':'Enseignant','Type']],
      body:list.map(item=>[
        dayKey(item.date),
        `${String(item.start_time||'').slice(0,5)} — ${String(item.end_time||'').slice(0,5)}`,
        item.ue_name || item.title || 'Séance',
        request.kind==='teacher' ? (item.classe_name||item.parcours||'') : `${item.teacher_first_name||''} ${item.teacher_last_name||''}`.trim(),
        item.session_type || ''
      ]),
      styles:{font:'helvetica',fontSize:9,cellPadding:3,overflow:'linebreak'},
      headStyles:{fillColor:blue,textColor:[255,255,255]},
      alternateRowStyles:{fillColor:[246,249,253]},
      didDrawPage:data=>{const num=doc.getNumberOfPages(); doc.setFontSize(7);doc.setTextColor(110,126,147);doc.text(`UDMCI · ${num}`,pageW-left,202,{align:'right'});}
    });
  }
  doc.save(filename);
  return filename;
}
