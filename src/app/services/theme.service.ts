import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT);

    private readonly _theme = signal<Theme>(this.getInitialTheme());

    readonly theme = this._theme.asReadonly();
    readonly isDark = computed(() => this._theme() === 'dark');

    constructor() {
        effect(() => {
            const theme = this._theme();
            this.document.documentElement.setAttribute('data-bs-theme', theme);
            localStorage.setItem(STORAGE_KEY, theme);
        });
    }

    toggle(): void {
        this._theme.update(t => (t === 'light' ? 'dark' : 'light'));
    }

    private getInitialTheme(): Theme {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored === 'light' || stored === 'dark') return stored;

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
}

