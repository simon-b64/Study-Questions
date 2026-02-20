import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SyncConflictModalComponent } from '../components/sync-conflict-modal/sync-conflict-modal';

export type SyncConflictChoice = 'cloud' | 'local';

@Injectable({ providedIn: 'root' })
export class SyncConflictService {
    private readonly modal = inject(NgbModal);

    /**
     * Opens the sync conflict modal and returns which side the user chose.
     * Defaults to 'local' if the user dismisses the modal.
     */
    async askUser(): Promise<SyncConflictChoice> {
        const ref = this.modal.open(SyncConflictModalComponent, {
            backdrop: 'static',
            keyboard: false,
            centered: true,
        });
        try {
            return await ref.result as SyncConflictChoice;
        } catch {
            return 'local';
        }
    }
}

