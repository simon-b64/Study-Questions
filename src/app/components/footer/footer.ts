import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-footer',
    imports: [],
    templateUrl: './footer.html',
    styleUrl: './footer.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
    protected readonly currentYear = new Date().getFullYear();
}
