import { ApplicationConfig, provideBrowserGlobalErrorListeners, EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideAppCheck, initializeAppCheck, ReCaptchaV3Provider } from '@angular/fire/app-check';

import { routes } from './app.routes';

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    recaptchaSiteKey?: string;
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
    const providers: (Provider | EnvironmentProviders)[] = [
        provideFirebaseApp(() => initializeApp(firebaseConfig!)),
        provideAuth(() => getAuth()),
    ];
    if (firebaseConfig!.recaptchaSiteKey) {
        providers.push(
            provideAppCheck(() => initializeAppCheck(undefined, {
                provider: new ReCaptchaV3Provider(firebaseConfig!.recaptchaSiteKey!),
                isTokenAutoRefreshEnabled: true,
            }))
        );
    }
    return providers;
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
