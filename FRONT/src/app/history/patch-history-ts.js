const fs = require('fs');
const path = 'c:\\Users\\koffi\\Documents\\PROJETS JS\\SUPERVISION-VISIOS\\FRONT\\src\\app\\history\\history.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add AsyncSupervisionService to imports
content = content.replace(
    "import { SupervisionService } from '../services/supervision.service';",
    "import { SupervisionService } from '../services/supervision.service';\nimport { AsyncSupervisionService } from '../services/async-supervision.service';"
);

// 2. Add properties
content = content.replace(
    'supervisions: any[] = [];',
    "activeTab: 'synchrone' | 'asynchrone' = 'synchrone';\n  asyncSupervisions: any[] = [];\n  filteredAsyncSupervisions: any[] = [];\n  \n  supervisions: any[] = [];"
);

// 3. Inject service
content = content.replace(
    'private supervisionService: SupervisionService,',
    "private supervisionService: SupervisionService,\n    private asyncSupervisionService: AsyncSupervisionService,"
);

// 4. Call loadAsyncHistory in ngOnInit
content = content.replace(
    'this.loadHistory();',
    "this.loadHistory();\n    this.loadAsyncHistory();"
);

// 5. Create loadAsyncHistory and properties
const loadMethod = `
  loadAsyncHistory() {
    this.subscriptions.add(
      this.asyncSupervisionService.getAll().subscribe({
        next: (data) => {
          this.asyncSupervisions = data;
          this.filteredAsyncSupervisions = [...this.asyncSupervisions];
        },
        error: (err: any) => console.error("Erreur chargement Async Supervisions", err)
      })
    );
  }

  get printAsyncSupervisions(): any[] {
    return [...this.filteredAsyncSupervisions].map(s => {
      const teacher = this.teachersData?.find(t => t.id === s.teacher_id);
      return {
        ...s,
        teacher_name: teacher ? (teacher.name || teacher.first_name + ' ' + teacher.last_name) : s.teacher_id,
        ue_name: s.ue_id
      };
    });
  }
`;
content = content.replace(
    'loadHistory() {',
    loadMethod + '\n\n  loadHistory() {'
);

fs.writeFileSync(path, content, 'utf8');
console.log('patched history.ts');
