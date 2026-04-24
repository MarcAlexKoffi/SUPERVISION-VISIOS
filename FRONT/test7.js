const fs = require('fs');
let code = fs.readFileSync('src/app/history/history.ts', 'utf8');

const regex = /async generateAsyncReportPDF\([\s\S]+?return doc\.output\('datauristring'\);\n  }/;

const newGen = `async generateAsyncReportPDF(s: any): Promise<string> {
    const doc = new jsPDF();
    
    // -- Header --
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 66, 165); // #0f42a5
    doc.text("FICHE DE SUPERVISION ASYNCHRONE", 105, 20, { align: 'center' });
    
    // -- General Info Box --
    let y = 50;
    doc.setDrawColor(200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, y, 182, 55, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Informations Générales", 20, y + 10);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    
    const teacherName = s.teacher_name || s.teacherId || 'Non spécifié';
    const ueName = s.ue_id || s.ueId || s.ue_name || 'Non spécifié';

    doc.text(\`Enseignant: \${teacherName}\`, 20, y + 20);
    doc.text(\`Module / UE: \${ueName}\`, 20, y + 28);
    doc.text(\`Semaine concernée: \${s.week}\`, 20, y + 36);
    doc.text(\`Classe: \${s.classe || 'N/A'}\`, 20, y + 44);
    doc.text(\`Effectif: \${s.effectif || 0} étudiant(s)\`, 80, y + 44);

    const renderStatus = s.status === 'Fait' ? 'Réalisé' : (s.status === 'Partiel' ? 'Partiellement réalisé' : (s.status === 'Non fait' ? 'Non réalisé' : (s.status || '-')));

    doc.setFont('helvetica', 'bold');
    doc.text(\`Statut: \${renderStatus}\`, 130, y + 20);
    doc.setFont('helvetica', 'normal');

    y += 65;
    
    // -- Observations --
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Observations et recommandations", 14, y);
    
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const obsLines = doc.splitTextToSize(s.observations || "Aucune observation n'a été signalée.", 182);
    doc.text(obsLines, 14, y);
    
    y += obsLines.length * 5 + 10;
    
    // -- Signatures --
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    
    doc.setDrawColor(200);
    doc.setLineDash([2, 2], 0);
    doc.line(14, y, 196, y);
    doc.setLineDash([], 0);
    
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Administration / Superviseur", 40, y, { align: 'center' });
    doc.text("Enseignant(e)", 170, y, { align: 'center' });
    
    // Superviseur Details
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    if (s.supervisorName) {
        doc.text(s.supervisorName, 40, y, { align: 'center' });
    }
    
    if (s.supervisorSignature) {
        try {
            doc.addImage(s.supervisorSignature, 'PNG', 20, y + 5, 40, 20);
        } catch(e) {}
    }
    
    // Enseignant Details
    if (s.teacherSignature) {
        try {
            doc.addImage(s.teacherSignature, 'PNG', 150, y + 5, 40, 20);
        } catch(e) {}
    }

    return doc.output('datauristring');
  }`;

code = code.replace(regex, newGen);
fs.writeFileSync('src/app/history/history.ts', code);
console.log('Patch complete.');
