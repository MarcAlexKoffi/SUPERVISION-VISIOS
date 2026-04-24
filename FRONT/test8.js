const fs = require('fs');
let code = fs.readFileSync('src/app/async-supervision-form/async-supervision-form.ts', 'utf8');

// 1. Add AuthService import
if (!code.includes("import { AuthService }")) {
    code = code.replace("import { Router } from '@angular/router';", "import { Router } from '@angular/router';\nimport { AuthService } from '../services/auth.service';");
}

// 2. Inject AuthService in constructor
const rxConstructor = /constructor\(\s*private asyncSupervisionService: AsyncSupervisionService,\s*private ueService: UeService,\s*private teacherService: TeacherService,\s*private classeService: ClasseService,\s*private router: Router\s*\) \{\}/;
const newConstructor = `constructor(
    private asyncSupervisionService: AsyncSupervisionService,
    private ueService: UeService,
    private teacherService: teacherService,
    private classeService: ClasseService,
    private router: Router,
    private authService: AuthService
  ) {}`;

// For robustness since I may have mis-transcribed the exact text:
code = code.replace(/constructor\([\s\S]*?\{/, `constructor(
    private asyncSupervisionService: AsyncSupervisionService,
    private ueService: UeService,
    private teacherService: TeacherService,
    private classeService: ClasseService,
    private router: Router,
    private authService: AuthService
  ) {`);

// 3. Set formData.supervisorName in ngOnInit
const rxNgOnInit = /ngOnInit\(\) \{([\s\S]*?)loadClasses\(\);([\s\S]*?)setDefaultWeek\(\);\n  \}/;
code = code.replace(rxNgOnInit, `ngOnInit() {$1loadClasses();$2setDefaultWeek();\n    const user = this.authService.currentUserValue;\n    if (user && (user.username || user.firstName)) {\n      this.formData.supervisorName = user.username || (user.firstName + ' ' + user.lastName);\n    }\n  }`);

// 4. Update it in resetForm as well
const rxResetForm = /resetForm\(\) \{[\s\S]*?this\.formData = \{[\s\S]*?teacherSignature: ''\n    \};/;
code = code.replace(rxResetForm, `resetForm() {
    const user = this.authService.currentUserValue;
    this.formData = {
      teacherId: null,
      ueId: null,
      week: '',
      status: '',
      observations: '',
      classe: '',
      effectif: 0,
      supervisorName: user ? (user.username || (user.firstName + ' ' + user.lastName)) : '',
      supervisorSignature: '',
      teacherSignature: ''
    };`);

fs.writeFileSync('src/app/async-supervision-form/async-supervision-form.ts', code);
console.log('async-supervision-form ts patched for supervisorName');
