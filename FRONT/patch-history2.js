const fs = require('fs');
let code = fs.readFileSync('src/app/history/history.ts', 'utf8');

const newInfoBoxObj = `          <div class="info-box">
            <div class="info-item">
              <div class="info-label">Enseignant</div>
              <div class="info-value">${teacherName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Statut</div>
              <div class="info-value" style="color: ${s.status === 'Fait' ? '#16a34a' : (s.status === 'Partiel' ? '#ca8a04' : '#dc2626')}">${renderStatus}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Module / UE</div>
              <div class="info-value">${ueName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Période / Semaine</div>
              <div class="info-value">${s.week}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Classe</div>
              <div class="info-value">${s.classe || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Effectif</div>
              <div class="info-value">${s.effectif || 0} étudiant(s)</div>
            </div>
          </div>`;

const newSigsStr = `          <div class="signatures">
            <div class="signature-box">
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #475569;">Administration / Superviseur</p>
                ${s.supervisorName ? '<p style="margin: 5px 0 0 0; font-size: 14px; color: #1e293b;">' + s.supervisorName + '</p>' : ''}
                ${s.supervisorSignature ? '<img src="' + s.supervisorSignature + '" style="max-height: 80px; margin-top: 10px;">' : '<p style="height: 80px; color: transparent;">Signature</p>'}
            </div>
            <div class="signature-box">
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #475569;">Enseignant(e)</p>
                ${s.teacherSignature ? '<img src="' + s.teacherSignature + '" style="max-height: 80px; margin-top: 10px;">' : '<p style="height: 80px; color: transparent;">Signature</p>'}
            </div>
          </div>`;

const splitPoint = code.indexOf('printAsyncSupervision(');
let before = code.substring(0, splitPoint);
let after = code.substring(splitPoint);

const rxInfoBox = /<div class="info-box">[\s\S]*?<div class="section">/;
after = after.replace(rxInfoBox, newInfoBoxObj + '\n          <div class="section">');

const rxSigs = /<div class="signatures">[\s\S]*?<script>/;
after = after.replace(rxSigs, newSigsStr + '\n          <script>');

code = before + after;

fs.writeFileSync('src/app/history/history.ts', code);
console.log('patched history ts safely');
