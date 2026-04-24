const fs = require('fs');
let tsContent = fs.readFileSync('src/app/history/history.ts', 'utf8');

tsContent = tsContent.replace(
  "const teacherName = s.teacher_name || s.teacherId || 'Non spÃ©cifiÃ©';",
  "const teacherName = this.getTeacherName(s) || 'Non spécifié';"
);
tsContent = tsContent.replace(
  "const ueName = s.ue_id || s.ueId || s.ue_name || 'Non spÃ©cifiÃ©';",
  "const ueName = this.getUeName(s) || 'Non spécifié';"
);

tsContent = tsContent.replace(/"Informations GÃ©nÃ©rales"/g, '"Informations Générales"');
tsContent = tsContent.replace(/Semaine concernÃ©e/g, 'Semaine concernée');
tsContent = tsContent.replace(/"Aucune observation n'a Ã©tÃ© signalÃ©e."/g, '"Aucune observation n\\'a été signalée."');
tsContent = tsContent.replace(/doc\.text\(\Statut: \$\{s\.status \|\| '-'\}\/g, "const displayStatus = s.status === 'Fait' ? 'Réalisé' : (s.status === 'Partiel' ? 'Partiellement réalisé' : (s.status === 'Non fait' ? 'Non réalisé' : (s.status || '-')));\n      doc.text(Statut: \");

// Fixing printAsyncSupervision
tsContent = tsContent.replace(/const teacherName = s\.teacher_name \|\| s\.teacherId \|\| 'N\/A';/g, "const teacherName = this.getTeacherName(s);");
tsContent = tsContent.replace(/const teacherName = s\.teacher_name \|\| s\.teacherId \|\| 'N\\/A';/g, "const teacherName = this.getTeacherName(s);");

tsContent = tsContent.replace(/const ueName = s\.ue_id \|\| s\.ueId \|\| s\.ue_name \|\| 'N\/A';/g, "const ueName = this.getUeName(s);");
tsContent = tsContent.replace(/const ueName = s\.ue_id \|\| s\.ueId \|\| s\.ue_name \|\| 'N\\/A';/g, "const ueName = this.getUeName(s);");

tsContent = tsContent.replace(/Fiche de Supervision Asynchrone - \$\{s.week\}<\/title>/g, '<meta charset="UTF-8">\\n        <title>Fiche de Supervision Asynchrone - </title>');
tsContent = tsContent.replace(/vÃ©rification/g, "vérification");
tsContent = tsContent.replace(/Modue \/ UE/g, "Module / UE");
tsContent = tsContent.replace(/PÃ©riode/g, "Période");
tsContent = tsContent.replace(/Ã©tÃ©/g, "été");
tsContent = tsContent.replace(/rÃ©digÃ©e/g, "rédigée");

tsContent = tsContent.replace(
  /<div class="info-value" style="color: \$\{s\.status === 'Fait' \? '#16a34a' : \(s\.status === 'Partiel' \? '#ca8a04' : '#dc2626'\)\}">\$\{s\.status\}<\/div>/g, 
  '<div class="info-value" style="color: "></div>'
);

fs.writeFileSync('src/app/history/history.ts', tsContent, 'utf8');
console.log('Done');

