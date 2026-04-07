const fs = require('fs');

let tsContent = fs.readFileSync('src/app/history/history.ts', 'utf8');

const helperMethods = \
  getTeacherName(s: any): string {
    if (!s) return 'N/A';
    let name = s.teacher_name;
    if (!name || name === s.teacher_id) {
        const teacher = this.teachersData?.find((t: any) => t.id === s.teacher_id || t.id === s.teacherId);
        name = teacher ? (teacher.name || teacher.first_name + ' ' + teacher.last_name) : (s.teacher_id || s.teacherId || 'Non spécifié');
    }
    return name;
  }

  getUeName(s: any): string {
    if (!s) return 'N/A';
    let name = s.ue_name;
    if (!name || name === s.ue_id) {
        const ue = this.uesData?.find((u: any) => u.id === s.ue_id || u.id === s.ueId);
        name = ue ? (ue.name || ue.code) : (s.ue_name || s.ue_id || s.ueId || 'Non spécifié');
    }
    return name;
  }
\;

if (!tsContent.includes('getTeacherName')) {
  tsContent = tsContent.replace('  viewAsyncDetails(supervision: any) {', helperMethods + '\\n  viewAsyncDetails(supervision: any) {');
  fs.writeFileSync('src/app/history/history.ts', tsContent, 'utf8');
}

let htmlContent = fs.readFileSync('src/app/history/history.html', 'utf8');

htmlContent = htmlContent.replace(
  /\{\{\s*s\.teacher_name\s*\|\|\s*s\.teacherId\s*\|\|\s*'N\/A'\s*\}\}/g,
  '{{ getTeacherName(s) }}'
);

htmlContent = htmlContent.replace(
  /\{\{\s*selectedAsyncSupervision\.teacher_name\s*\|\|\s*selectedAsyncSupervision\.teacherId\s*\|\|\s*'N\/A'\s*\}\}/g,
  '{{ getTeacherName(selectedAsyncSupervision) }}'
);

htmlContent = htmlContent.replace(
  /\{\{\s*selectedAsyncSupervision\.ue_name\s*\|\|\s*selectedAsyncSupervision\.ue_id\s*\|\|\s*selectedAsyncSupervision\.ueId\s*\|\|\s*'N\/A'\s*\}\}/g,
  '{{ getUeName(selectedAsyncSupervision) }}'
);

htmlContent = htmlContent.replace(
  /\{\{\s*s\.status\s*\}\}/g,
  "{{ s.status === 'Fait' ? 'Réalisé' : (s.status || 'Non spécifié') }}"
);

htmlContent = htmlContent.replace(
  /\{\{\s*selectedAsyncSupervision\.status\s*\|\|\s*'Non spécifié'\s*\}\}/g,
  "{{ selectedAsyncSupervision.status === 'Fait' ? 'Réalisé' : (selectedAsyncSupervision.status || 'Non spécifié') }}"
);

fs.writeFileSync('src/app/history/history.html', htmlContent, 'utf8');
console.log('Fixed helper logic');
