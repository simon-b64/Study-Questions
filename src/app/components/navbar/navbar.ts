import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-navbar',
    imports: [RouterLink, RouterLinkActive, NgbCollapse],
    templateUrl: './navbar.html',
    styleUrl: './navbar.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
    protected readonly isMenuCollapsed = signal<boolean>(true);

    protected toggleMenu(): void {
        this.isMenuCollapsed.update(collapsed => !collapsed);
    }

    protected closeMenu(): void {
        this.isMenuCollapsed.set(true);
    }
}
