import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { AuthButtonComponent } from '../auth-button/auth-button';
import { ThemeService } from '../../services/theme.service';

@Component({
    selector: 'app-navbar',
    imports: [RouterLink, RouterLinkActive, NgbCollapse, AuthButtonComponent],
    templateUrl: './navbar.html',
    styleUrl: './navbar.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
    protected readonly isMenuCollapsed = signal<boolean>(true);
    protected readonly themeService = inject(ThemeService);

    protected toggleMenu(): void {
        this.isMenuCollapsed.update(collapsed => !collapsed);
    }

    protected closeMenu(): void {
        this.isMenuCollapsed.set(true);
    }
}
