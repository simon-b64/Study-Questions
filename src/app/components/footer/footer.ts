import { Component, ChangeDetectionStrategy, inject, InjectionToken } from '@angular/core';
import { RouterLink } from '@angular/router';

const CURRENT_YEAR = new InjectionToken<number>('CURRENT_YEAR', {
    providedIn: 'root',
    factory: () => new Date().getFullYear(),
});

@Component({
    selector: 'app-footer',
    imports: [RouterLink],
    templateUrl: './footer.html',
    styleUrl: './footer.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
    protected readonly currentYear = inject(CURRENT_YEAR);
}
