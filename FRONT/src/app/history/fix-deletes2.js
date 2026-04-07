const fs = require('fs');
const path = 'c:\\Users\\koffi\\Documents\\PROJETS JS\\SUPERVISION-VISIOS\\FRONT\\src\\app\\history\\history.ts';
let content = fs.readFileSync(path, 'utf8');

const confirmDeleteBlock = `
  confirmDelete() {
    if (!this.supervisionToDelete) return;

    if (this.activeTab === 'synchrone') {
      this.supervisionService.delete(this.supervisionToDelete.id).subscribe({
        next: () => {
          this.supervisions = this.supervisions.filter(s => s.id !== this.supervisionToDelete.id);
          this.updateFilters();
          this.applyFilters();
          this.cancelDelete();
        },
        error: (err) => {
          console.error('Error deleting supervision', err);
          if (err.status === 403) {
            alert('Vous n\\'avez pas les droits pour supprimer cet enregistrement.');
          } else {
            alert('Erreur lors de la suppression');
          }
          this.cancelDelete();
        }
      });
    } else {
      this.asyncSupervisionService.delete(this.supervisionToDelete.id).subscribe({
        next: () => {
          this.asyncSupervisions = this.asyncSupervisions.filter(s => s.id !== this.supervisionToDelete.id);
          this.filteredAsyncSupervisions = [...this.asyncSupervisions];
          this.cancelDelete();
        },
        error: (err) => {
          console.error('Error deleting async supervision', err);
          if (err.code === 'permission-denied') {
            alert('Vous n\\'avez pas les droits pour supprimer cet enregistrement.');
          } else {
            alert('Erreur lors de la suppression');
          }
          this.cancelDelete();
        }
      });
    }
  }

  cancelDelete() {`;

content = content.replace('  cancelDelete() {', confirmDeleteBlock);

fs.writeFileSync(path, content, 'utf8');
console.log('added confirmDelete back');