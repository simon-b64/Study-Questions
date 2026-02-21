import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-sync-conflict-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './sync-conflict-modal.html',
    styleUrl: './sync-conflict-modal.scss',
})
export class SyncConflictModalComponent {
    protected readonly modal = inject(NgbActiveModal);
}

