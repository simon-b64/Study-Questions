import { Injectable, inject, signal, computed } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, authState, User } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly auth = inject(Auth, { optional: true });

    // undefined = auth state not yet known (loading)
    // null      = known to be logged out
    // User      = known to be logged in
    readonly user = this.auth
        ? toSignal<User | null | undefined>(authState(this.auth), { initialValue: undefined })
        : signal<User | null>(null).asReadonly();

    readonly isLoading = computed(() => this.user() === undefined);
    readonly isLoggedIn = computed(() => this.user() != null);

    readonly isAvailable = this.auth !== null;

    async loginWithGoogle(): Promise<void> {
        if (!this.auth) return Promise.reject('Firebase is not configured.');
        return signInWithPopup(this.auth, new GoogleAuthProvider()).then(() => undefined);
    }

    logout(): Promise<void> {
        if (!this.auth) return Promise.reject('Firebase is not configured.');
        return signOut(this.auth);
    }
}
