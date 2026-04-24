const fs = require('fs');

let htmlContent = fs.readFileSync('src/app/history/history.html', 'utf8');

htmlContent = htmlContent.replace(
  /\{\{\s*selectedAsyncSupervision\.status\s*\|\|\s*'Non spécifié'\s*\}\}/g,
  "{{ selectedAsyncSupervision.status === 'Fait' ? 'Réalisé' : (selectedAsyncSupervision.status === 'Partiel' ? 'Partiellement réalisé' : (selectedAsyncSupervision.status === 'Non fait' ? 'Non réalisé' : (selectedAsyncSupervision.status || 'Non spécifié'))) }}"
);

fs.writeFileSync('src/app/history/history.html', htmlContent, 'utf8');
console.log('Fixed helper logic again... again...');
