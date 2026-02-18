import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-navbar',
    imports: [RouterLink, RouterLinkActive, NgbCollapse],
    templateUrl: './navbar.html',
    styleUrl: './navbar.scss',
})
export class Navbar {
    isMenuCollapsed = signal(true);

    toggleMenu() {
        this.isMenuCollapsed.update(value => !value);
    }

    closeMenu() {
        this.isMenuCollapsed.set(true);
    }
}
