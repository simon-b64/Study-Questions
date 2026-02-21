import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalData } from '../../services/confirm.service';

@Component({
    selector: 'app-confirm-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './confirm-modal.html',
    styleUrl: './confirm-modal.scss',
})
export class ConfirmModalComponent {
    protected readonly modal = inject(NgbActiveModal);

    // Set by NgbModal via componentInstance before the component initialises
    title!: string;
    message!: string;
    confirmLabel?: string;
    confirmClass?: string;
    cancelLabel?: string;
}



