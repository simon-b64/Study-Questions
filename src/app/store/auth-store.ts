import { User } from '@angular/fire/auth';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed } from '@angular/core';

type AuthState = {
    // undefined = auth state not yet known (loading)
    // null      = known to be logged out
    // User      = known to be logged in
    user: User | null | undefined;
}

const initialState: AuthState = {
    user: undefined,
}

export const AuthStore = signalStore(
    {providedIn: 'root'},
    withState(initialState),
    withComputed((store) => ({
        isLoading: computed(() => store.user() === undefined),
        isLoggedIn: computed(() => store.user() != null),
        isAuthenticated: computed(() => store.user() !== undefined),
    })),
    withMethods((store) => ({
        updateUser(user: User | null | undefined): void {
            patchState(store, {
                user
            });
        }
    }))
);
