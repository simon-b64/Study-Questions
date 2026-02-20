import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-sync-conflict-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="modal-header">
            <h5 class="modal-title">
                <i class="bi bi-cloud-arrow-up-fill me-2 text-primary"></i>
                Fortschritt synchronisieren
            </h5>
        </div>
        <div class="modal-body">
            <p class="mb-3">
                Es wurde sowohl <strong>lokaler</strong> als auch <strong>Cloud-Fortschritt</strong>
                für diesen Kurs gefunden. Welchen möchtest du verwenden?
            </p>
            <div class="d-grid gap-2">
                <button class="btn btn-primary text-start" (click)="modal.close('cloud')">
                    <i class="bi bi-cloud-fill me-2"></i>
                    <strong>Cloud-Fortschritt laden</strong>
                    <div class="small opacity-75 ms-4">Der lokale Fortschritt wird überschrieben.</div>
                </button>
                <button class="btn btn-outline-secondary text-start" (click)="modal.close('local')">
                    <i class="bi bi-laptop me-2"></i>
                    <strong>Lokalen Fortschritt behalten</strong>
                    <div class="small opacity-75 ms-4">Der Cloud-Fortschritt wird überschrieben.</div>
                </button>
            </div>
        </div>
    `,
})
export class SyncConflictModalComponent {
    protected readonly modal = inject(NgbActiveModal);
}

