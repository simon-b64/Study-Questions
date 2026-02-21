import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal';

export interface ConfirmModalData {
    title: string;
    message: string;
    confirmLabel?: string;
    confirmClass?: string;
    cancelLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
    private readonly modal = inject(NgbModal);

    /**
     * Opens a confirmation modal and resolves to `true` when confirmed,
     * or `false` when cancelled / dismissed.
     */
    async confirm(data: ConfirmModalData): Promise<boolean> {
        const ref = this.modal.open(ConfirmModalComponent, { centered: true });
        const instance: ConfirmModalComponent = ref.componentInstance;
        instance.title = data.title;
        instance.message = data.message;
        instance.confirmLabel = data.confirmLabel;
        instance.confirmClass = data.confirmClass;
        instance.cancelLabel = data.cancelLabel;
        try {
            return await ref.result as boolean;
        } catch {
            return false;
        }
    }
}
