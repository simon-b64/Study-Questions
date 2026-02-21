import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, authState } from '@angular/fire/auth';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '../store/auth-store';

@Injectable({providedIn: 'root'})
export class AuthService {
    private readonly auth = inject(Auth, {optional: true});
    private readonly authStore = inject(AuthStore);

    readonly user = this.authStore.user;
    readonly isLoading = this.authStore.isLoading;
    readonly isLoggedIn = this.authStore.isLoggedIn;

    readonly isAvailable = this.auth !== null;

    constructor() {
        if (this.auth) {
            authState(this.auth).pipe(takeUntilDestroyed()).subscribe(user => {
                this.authStore.updateUser(user);
            });
        } else {
            this.authStore.updateUser(null);
        }
    }

    async loginWithGoogle(): Promise<void> {
        if (!this.auth) return Promise.reject('Firebase is not configured.');
        return signInWithPopup(this.auth, new GoogleAuthProvider()).then(() => undefined);
    }

    logout(): Promise<void> {
        if (!this.auth) return Promise.reject('Firebase is not configured.');
        return signOut(this.auth);
    }
}
