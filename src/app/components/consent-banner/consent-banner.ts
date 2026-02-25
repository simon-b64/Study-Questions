import { Component, ChangeDetectionStrategy, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

const CONSENT_KEY = 'cookie_consent_dismissed';

@Component({
    selector: 'app-consent-banner',
    imports: [RouterLink],
    templateUrl: './consent-banner.html',
    styleUrl: './consent-banner.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentBanner {
    private readonly platformId = inject(PLATFORM_ID);
    protected readonly visible = signal<boolean>(this.shouldShow());

    protected dismiss(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(CONSENT_KEY, 'true');
        }
        this.visible.set(false);
    }

    private shouldShow(): boolean {
        if (!isPlatformBrowser(this.platformId)) return false;
        return localStorage.getItem(CONSENT_KEY) !== 'true';
    }
}

