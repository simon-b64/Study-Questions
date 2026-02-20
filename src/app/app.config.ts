import { ApplicationConfig, provideBrowserGlobalErrorListeners, EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

import { routes } from './app.routes';

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

// Populated before bootstrapApplication() is called in main.ts
let firebaseConfig: FirebaseConfig | null = null;
export function setFirebaseConfig(cfg: FirebaseConfig): void {
    firebaseConfig = cfg;
}
function isFirebaseConfigured(): boolean {
    return !!firebaseConfig?.apiKey;
}

function firebaseProviders(): (Provider | EnvironmentProviders)[] {
    if (!isFirebaseConfigured()) return [];
    return [
        provideFirebaseApp(() => initializeApp(firebaseConfig!)),
        provideAuth(() => getAuth()),
    ];
}

export function createAppConfig(): ApplicationConfig {
    return {
        providers: [
            provideBrowserGlobalErrorListeners(),
            provideRouter(routes),
            provideHttpClient(),
            ...firebaseProviders(),
        ]
    };
}
