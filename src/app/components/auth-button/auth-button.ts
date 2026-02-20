import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-auth-button',
    imports: [NgbDropdownModule],
    templateUrl: './auth-button.html',
    styleUrl: './auth-button.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthButtonComponent {
    private readonly authService = inject(AuthService);

    protected readonly isAvailable = this.authService.isAvailable;
    protected readonly isLoading = this.authService.isLoading;
    protected readonly isLoggedIn = this.authService.isLoggedIn;
    protected readonly user = this.authService.user;
    protected readonly displayName = computed(() => this.authService.user()?.displayName ?? null);
    protected readonly email = computed(() => this.authService.user()?.email ?? null);
    protected readonly photoURL = computed(() => this.authService.user()?.photoURL ?? null);
    protected readonly initials = computed(() => this.authService.user()?.displayName?.charAt(0) ?? '?');

    protected login(): void {
        this.authService.loginWithGoogle().catch(err => console.error('Login failed', err));
    }

    protected logout(): void {
        this.authService.logout().catch(err => console.error('Logout failed', err));
    }
}
