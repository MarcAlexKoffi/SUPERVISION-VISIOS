/**
 * SUPERVISION-VISIOS / Pigier CI - fiche officielle V2 (DESIGN_VALIDATED 10-11-2026).
 * Module de presentation UNIQUEMENT : aucune lecture ou ecriture Firestore.
 * Les objets recus doivent etre adaptes depuis les donnees deja chargees par Honoraires.
 * Le PDF obtenu est un document A4 image haute resolution base sur le gabarit officiel.
 */

export interface PigierTeacher {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string; // Pour les fiches historiques avec un nom complet non decoupe.
  matricule?: string | null;
}

export interface PigierScheduleProof {
  id: string;
  teacherId: string;
  ueId: string;
  date: string;  // YYYY-MM-DD, date civile du planning
  classId?: string | null;
  classVerified?: boolean; // uniquement si le nom historique est resolu sans ambiguite
  classLabel: string;
  activityType: string; // valeur reelle du planning, jamais un libelle invente
  startTime: string; // HH:mm du planning
  endTime: string;   // HH:mm du planning
  actualMinutes: number | null; // duree ATTESTEE dans la fiche de supervision
  supervisionId: string | null; // ID de la fiche de supervision liee
  status: string; // Annule, Supervise, A superviser... ; pas la preuve a lui seul
  kind: 'synchronous' | 'examination' | 'asynchronous' | 'other';
}

export interface PigierOfficialInput {
  teacher: PigierTeacher;
  ue: { id: string; name: string };
  period: { from: string; to: string }; // dates ISO inclusives
  sessions: readonly PigierScheduleProof[];
  courseWeeks?: number | null; // duree connue issue du parametrage/Planning
  mode?: 'validated' | 'draft'; // Brouillon distinct du justificatif certifie
}

export interface PigierOfficialRow {
  sessionId: string;
  supervisionId: string;
  dateIso: string;
  day: string;
  date: string;
  classLabel: string;
  activityType: string;
  hours: string;
  actualDuration: string;
  verified: boolean; // une presence dans le planning ne vaut pas preuve
}

export interface PigierIssue { sessionId?: string; message: string }

export interface PigierOfficialDocument {
  teacherName: string;
  teacherMatricule: string;
  ueName: string;
  periodLabel: string;
  filename: string;
  rows: PigierOfficialRow[];
  totalVisios: number;
  provisional: boolean;
  unverifiedCount: number;
  weeksCalculated: number | null;
  weeksDisplayed: number | null;
  issues: PigierIssue[];
}

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const;
const PAGE_WIDTH = 595.32;
const PAGE_HEIGHT = 841.92;
const ROWS_PER_PAGE = 14;
const DEFAULT_TEMPLATE = '/assets/pigier/honoraires-modele-officiel-vierge.png';

export function pigierPageCount(rowCount: number): number {
  if (!Number.isInteger(rowCount) || rowCount < 0) throw new Error('Nombre de seances invalide.');
  return Math.max(1, Math.ceil(rowCount / ROWS_PER_PAGE));
}

function civilDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Date ISO invalide : ${iso}`);
  const year = +m[1], month = +m[2], day = +m[3];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Date civile inexistante : ${iso}`);
  }
  return date;
}

export function pigierFrenchDay(iso: string): string { return DAYS[civilDate(iso).getUTCDay()]; }
export function pigierFrenchDate(iso: string): string {
  civilDate(iso);
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function clock(time: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m || +m[1] > 23 || +m[2] > 59) throw new Error(`Heure invalide : ${time}`);
  return `${m[1]}h${m[2]}`;
}
export function pigierPlannedHours(start: string, end: string): string {
  return `${clock(start)}-${clock(end)}`;
}

export function pigierActualDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
    throw new Error('Duree de supervision effective invalide.');
  }
  return `${Math.floor(minutes / 60)}H${String(minutes % 60).padStart(2, '0')}`;
}

/** Plancher administratif UNIQUEMENT si une duree en semaines a pu etre etablie. */
export function pigierDisplayWeeks(weeks: number | null | undefined): number | null {
  if (weeks === null || weeks === undefined) return null;
  if (!Number.isInteger(weeks) || weeks < 0) throw new Error('Duree en semaines incorrecte.');
  return Math.max(7, weeks);
}

function isoWeekMonday(iso: string): string {
  const d = civilDate(iso);
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

function filenamePart(name: string): string {
  const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!clean) throw new Error('Nom enseignant non exploitable pour le fichier PDF.');
  return clean.slice(0, 75);
}

function statusIsCancelled(s: string): boolean {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'annule';
}
function statusIsSupervised(s: string): boolean {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'supervise';
}

function required(s: string, label: string): string {
  const v = (s || '').trim();
  if (!v) throw new Error(`${label} manquant.`);
  return v;
}

/**
 * Les lignes ne sont eligibles que si la seance synchrone est liee a une vraie fiche
 * et a une duree attestee. Les examens et les seances non supervises sont exclus.
 * Cette fonction ne modifie AUCUN objet de l'appelant.
 */
export function preparePigierOfficialHonoraires(input: PigierOfficialInput): PigierOfficialDocument {
  const teacherName = required(input.teacher.fullName?.trim() ||
    [input.teacher.firstName, input.teacher.lastName].map(x => (x || '').trim()).filter(Boolean).join(' '),
    'Nom complet enseignant');
  required(input.teacher.id, 'Identifiant enseignant');
  required(input.ue.id, 'Identifiant UE');
  const ueName = required(input.ue.name, 'Matiere');
  civilDate(input.period.from);
  civilDate(input.period.to);
  if (input.period.from > input.period.to) throw new Error('Periode inversee.');
  if (input.courseWeeks !== undefined && input.courseWeeks !== null &&
      (!Number.isInteger(input.courseWeeks) || input.courseWeeks < 0)) {
    throw new Error('Duree du cours invalide.');
  }

  const issues: PigierIssue[] = [];
  const rows: PigierOfficialRow[] = [];
  const seenSessionIds = new Set<string>();
  const seenSupervisionIds = new Set<string>();
  const draftMode = input.mode === 'draft';
  for (const s of input.sessions) {
    if (s.teacherId !== input.teacher.id || s.ueId !== input.ue.id) continue;
    if (!s.id?.trim()) { issues.push({message: 'Seance sans identifiant stable : exclue.'}); continue; }
    if (seenSessionIds.has(s.id)) { issues.push({sessionId:s.id,message:'Seance dupliquee : exclue.'}); continue; }
    seenSessionIds.add(s.id);
    let date: string;
    try { date = civilDate(s.date).toISOString().slice(0,10); }
    catch { issues.push({sessionId:s.id,message:'Date du planning invalide : exclue.'}); continue; }
    if (date < input.period.from || date > input.period.to) continue;
    if (statusIsCancelled(s.status) || s.kind === 'examination' ||
        s.kind === 'asynchronous' || s.kind === 'other') continue;
    if (s.kind !== 'synchronous') {
      issues.push({sessionId:s.id,message:'Type de seance incertain : exclue.'}); continue;
    }
    // Une prestation est attestée si, et seulement si, le Planning est marque
    // Supervise et qu'une fiche correspondante a ete authentifiee par l'adaptateur.
    // Classe, type, horaires et minutes absentes restent des informations de PDF.
    let verified = statusIsSupervised(s.status) && !!s.supervisionId?.trim();
    if (verified && seenSupervisionIds.has(s.supervisionId!)) {
      verified = false;
      issues.push({sessionId:s.id,message:'Fiche de supervision deja utilisee : doublon exclu.'});
    }
    if (!verified && !draftMode) {
      const reason = !statusIsSupervised(s.status) ? 'Statut du Planning non supervise' :
        'Aucune fiche de supervision correspondante';
      issues.push({sessionId:s.id,message:`${reason} : exclue.`});
      continue;
    }
    try {
      const classLabel = s.classLabel?.trim() || 'À renseigner';
      const activityType = s.activityType?.trim() || 'À renseigner';
      const hours = s.startTime && s.endTime ? pigierPlannedHours(s.startTime, s.endTime) : 'À renseigner';
      const validMinutes = Number.isInteger(s.actualMinutes) && s.actualMinutes !== null &&
        s.actualMinutes > 0 && s.actualMinutes <= 1440;
      const actualDuration = verified && validMinutes ? pigierActualDuration(s.actualMinutes!) : 'À vérifier';
      if (verified) {
        seenSupervisionIds.add(s.supervisionId!);
        if (!validMinutes) issues.push({sessionId:s.id,message:'Duree effective absente : aucune valeur inventee.'});
      } else issues.push({sessionId:s.id,message:'Seance prevue : fiche de supervision a confirmer.'});
    rows.push({
        sessionId:s.id, supervisionId:verified ? s.supervisionId! : '', dateIso:date,
        day:pigierFrenchDay(date), date:pigierFrenchDate(date), classLabel,
        activityType, hours, actualDuration, verified,
      });
    } catch (error) {
      issues.push({sessionId:s.id,message:`${error instanceof Error?error.message:'Donnees manquantes'} : exclue.`});
    }
  }
  rows.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.hours.localeCompare(b.hours) || a.sessionId.localeCompare(b.sessionId));
  const unverifiedCount = rows.filter(row => !row.verified).length;
  const provisional = draftMode && unverifiedCount > 0;
  const totalVisios = rows.filter(row => row.verified).length;
  const weeksCalculated = input.courseWeeks ?? (rows.length ? new Set(rows.map(row => isoWeekMonday(row.dateIso))).size : null);
  const weeksDisplayed = pigierDisplayWeeks(weeksCalculated);
  const filename = `Fiche_honoraires_${filenamePart(teacherName)}_${input.period.from.replace(/-/g, '')}-${input.period.to.replace(/-/g, '')}${provisional ? '_PROVISOIRE' : ''}.pdf`;
  return {
    teacherName, teacherMatricule: input.teacher.matricule?.trim() || '', ueName,
    periodLabel: `${pigierFrenchDate(input.period.from)} - ${pigierFrenchDate(input.period.to)}`,
    filename, rows, totalVisios, provisional, unverifiedCount, weeksCalculated, weeksDisplayed, issues,
  };
}

/** Ecrit un PDF A4 valide contenant les JPEG haute resolution des pages deja dessinees. */
export function makePigierRasterPdf(jpegs: readonly Uint8Array[]): Uint8Array {
  if (!jpegs.length || jpegs.some(b => b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8)) {
    throw new Error('Image JPEG de page invalide.');
  }
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let size = 0;
  const write = (data: string | Uint8Array): void => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    size += bytes.length;
  };
  const obj = (id: number, content: string): void => {
    offsets[id] = size;
    write(`${id} 0 obj\n${content}\nendobj\n`);
  };
  write(new Uint8Array([37,80,68,70,45,49,46,52,10,37,226,227,207,211,10])); // %PDF-1.4
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const kids = jpegs.map((_, i) => `${3 + 3*i} 0 R`).join(' ');
  obj(2, `<< /Type /Pages /Count ${jpegs.length} /Kids [${kids}] >>`);
  jpegs.forEach((jpeg, i) => {
    const pageId = 3 + 3*i, contentId = pageId+1, imgId = pageId+2;
    obj(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    const command = `q\n${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`;
    obj(contentId, `<< /Length ${encoder.encode(command).length} >>\nstream\n${command}endstream`);
    offsets[imgId] = size;
    write(`${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1654 /Height 2339 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    write(jpeg);
    write('\nendstream\nendobj\n');
  });
  const xref = size, totalObjects = 3 + jpegs.length * 3;
  write(`xref\n0 ${totalObjects}\n0000000000 65535 f \n`);
  for (let id = 1; id < totalObjects; id++) {
    write(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) { result.set(chunk, position); position += chunk.length; }
  return result;
}

interface TextBox {
  x: number; y: number; maxWidth: number; size: number;
  minSize?: number; maxLines?: number;
  /** Only for header values that have their own fixed two-line space. */
  multilineFirstBaseline?: number;
  lineGap?: number;
  balanceLines?: boolean;
  align?: 'left' | 'center'; // Only table values are centered, never the official header.
}

/** Le retour a la ligne est limite aux cellules ; jamais de texte tronque ou d'ellipsis. */
function textField(ctx: CanvasRenderingContext2D, value: string, box: TextBox): void {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return;
  const maxLines = box.maxLines ?? 1;
  for (let sz = box.size; sz >= (box.minSize ?? 9); sz -= 0.2) {
    ctx.font = `400 ${sz.toFixed(2)}px Lato, Arial, sans-serif`;
    const lines: string[] = [];
    for (const word of text.split(' ')) {
      if (!lines.length) { lines.push(word); continue; }
      const joined = `${lines[lines.length - 1]} ${word}`;
      if (ctx.measureText(joined).width <= box.maxWidth) lines[lines.length - 1] = joined;
      else lines.push(word);
    }
    if (lines.length > maxLines || lines.some(line => ctx.measureText(line).width > box.maxWidth)) continue;
    // Header-only: avoid a dangling final word when an UE genuinely needs 2 lines.
    if (box.balanceLines && lines.length === 2) {
      const words = text.split(' ');
      let best = lines;
      let bestDelta = Math.abs(ctx.measureText(lines[0]).width - ctx.measureText(lines[1]).width);
      for (let split = 1; split < words.length; split++) {
        const first = words.slice(0, split).join(' ');
        const second = words.slice(split).join(' ');
        const left = ctx.measureText(first).width;
        const right = ctx.measureText(second).width;
        const difference = Math.abs(left - right);
        if (left <= box.maxWidth && right <= box.maxWidth && difference < bestDelta) {
          best = [first, second];
          bestDelta = difference;
        }
      }
      lines.splice(0, lines.length, ...best);
    }
    ctx.fillStyle = '#151b27';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = box.align ?? 'left';
    const textX = box.align === 'center' ? box.x + box.maxWidth / 2 : box.x;
    if (lines.length === 1) ctx.fillText(lines[0], textX, box.y);
    else {
      const lineGap = box.lineGap ?? (sz + 0.4);
      const baseline = box.multilineFirstBaseline ?? (box.y - (lineGap * (lines.length - 1)) / 2);
      lines.forEach((line, i) => ctx.fillText(line, textX, baseline + i*lineGap));
    }
    return;
  }
  throw new Error(`Texte trop long pour une cellule du modele officiel : ${text}`);
}

function drawOfficialFields(ctx: CanvasRenderingContext2D, doc: PigierOfficialDocument, pageIndex: number, pageCount: number): void {
  const pageRows = doc.rows.slice(pageIndex*ROWS_PER_PAGE, (pageIndex+1)*ROWS_PER_PAGE);
  // Pigier CI official header: keep teacher on a SINGLE baseline and give the UE
  // its own area below. Never center a multi-line UE upwards into the teacher.
  // The extra width is available before the separate right-side period block.
  textField(ctx, doc.teacherName, {
    x:154.2, y:99.0, maxWidth:187, size:10.1, minSize:8.4, maxLines:1,
  });
  textField(ctx, doc.ueName, {
    x:154.2, y:116.6, maxWidth:183, size:10.6, minSize:8.8, maxLines:2,
    multilineFirstBaseline:113.6, lineGap:12.8, balanceLines:true,
  });
  if (doc.teacherMatricule) textField(ctx, doc.teacherMatricule, {x:496,y:101.5,maxWidth:67,size:10.3,minSize:9});
  textField(ctx, doc.periodLabel, {x:448,y:127.4,maxWidth:115,size:9.5,minSize:9});
  pageRows.forEach((r, i) => {
    const y = 217.0 + i*20.85;
    textField(ctx,r.day, {x:36,y,maxWidth:49,size:10.9,minSize:9,align:'center'});
    textField(ctx,r.date, {x:94,y,maxWidth:58,size:10.2,minSize:9.2,align:'center'});
    textField(ctx,r.classLabel, {x:158,y,maxWidth:126,size:10.8,minSize:9,maxLines:2,align:'center'});
    textField(ctx,r.activityType, {x:294,y,maxWidth:122,size:10.7,minSize:9,maxLines:2,align:'center'});
    textField(ctx,r.hours, {x:425,y,maxWidth:77,size:10.4,minSize:9,align:'center'});
    textField(ctx,r.actualDuration, {x:514,y,maxWidth:46,size:r.verified?10.9:8.2,minSize:r.verified?9:7.1,align:'center'});
  });
  if (pageIndex === pageCount-1) {
    textField(ctx, doc.provisional ? 'À vérifier' : `${doc.totalVisios} visios`,
      {x:511.8,y:512,maxWidth:54,size:doc.provisional?8.6:10.6,minSize:doc.provisional?7.3:9});
    if (doc.weeksDisplayed !== null) {
      textField(ctx, `${doc.weeksDisplayed} semaines`, {x:508.4,y:536.1,maxWidth:58,size:10.6,minSize:9});
    }
  } else {
    // Sur les pages d'extension, ne pas dupliquer la zone de paiement/signatures.
    ctx.fillStyle = '#fff';
    ctx.fillRect(10,500,PAGE_WIDTH-10,PAGE_HEIGHT-500);
    textField(ctx, `Suite des prestations - page ${pageIndex+1}/${pageCount}`, {x:24,y:519,maxWidth:300,size:10,minSize:9});
  }
  if (doc.provisional) {
    // Mention visible mais hors des champs deja remplis du document officiel.
    // Un brouillon ne doit jamais etre confondu avec une preuve de paiement.
    ctx.save();
    ctx.fillStyle = '#a11b26';
    ctx.textAlign = 'left';
    ctx.font = '700 10px Arial, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('PROVISOIRE - A VERIFIER AVANT PAIEMENT', 186, 143);
    ctx.restore();
  }
}

async function loadOfficialTemplate(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger le gabarit Pigier CI : ${url}`));
    img.src = url;
  });
}

export interface PigierGeneratedPdf { bytes: Uint8Array; filename: string; pages: number; issues: PigierIssue[]; provisional:boolean }

/** Cree le PDF en memoire depuis les donnees CERTIFIEES passees par Honoraires. */
export async function renderPigierOfficialHonoraires(input: PigierOfficialInput, templateUrl = DEFAULT_TEMPLATE): Promise<PigierGeneratedPdf> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('La generation du PDF Pigier CI exige un navigateur.');
  }
  const doc = preparePigierOfficialHonoraires(input);
  const template = await loadOfficialTemplate(templateUrl);
  if (template.naturalWidth !== 1654 || template.naturalHeight !== 2339) {
    throw new Error('Le gabarit charge n\'est pas la reference officielle attendue (200 DPI).');
  }
  const pages = pigierPageCount(doc.rows.length);
  const jpegs: Uint8Array[] = [];
  for (let index = 0; index < pages; index++) {
    const canvas = document.createElement('canvas');
    canvas.width = template.naturalWidth;
    canvas.height = template.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Contexte Canvas indisponible.');
    ctx.drawImage(template,0,0,canvas.width,canvas.height);
    ctx.setTransform(canvas.width/PAGE_WIDTH, 0, 0, canvas.height/PAGE_HEIGHT, 0, 0);
    drawOfficialFields(ctx,doc,index,pages);
    const url = canvas.toDataURL('image/jpeg',0.96);
    if (!url.startsWith('data:image/jpeg;base64,')) throw new Error('Export JPEG impossible.');
    const decoded = atob(url.split(',')[1]);
    const jpeg = new Uint8Array(decoded.length);
    for (let i=0;i<decoded.length;i++) jpeg[i]=decoded.charCodeAt(i);
    jpegs.push(jpeg);
  }
  return {bytes:makePigierRasterPdf(jpegs),filename:doc.filename,pages,issues:doc.issues,provisional:doc.provisional};
}

/** Demande seulement un telechargement navigateur, ne touche pas a Firestore. */
export function downloadPigierOfficialPdf(pdf: PigierGeneratedPdf): void {
  if (typeof document === 'undefined') throw new Error('Telechargement navigateur indisponible.');
  const blob = new Blob([pdf.bytes as unknown as BlobPart],{type:'application/pdf'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = pdf.filename;
  document.body.appendChild(a);
  a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
