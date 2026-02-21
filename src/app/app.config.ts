import { ApplicationConfig, provideBrowserGlobalErrorListeners, EnvironmentProviders, ErrorHandler, InjectionToken, Provider } from '@angular/core';
import { GlobalErrorHandler } from './services/global-error-handler';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
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

export const FIREBASE_CONFIG = new InjectionToken<FirebaseConfig>('FIREBASE_CONFIG');

function firebaseProviders(cfg: FirebaseConfig | null): (Provider | EnvironmentProviders)[] {
    if (!cfg?.apiKey) return [];
    const providers: (Provider | EnvironmentProviders)[] = [
        { provide: FIREBASE_CONFIG, useValue: cfg },
        provideFirebaseApp(() => initializeApp(cfg)),
        provideAuth(() => getAuth()),
        provideFirestore(() => getFirestore()),
    ];
    if (cfg.recaptchaSiteKey) {
        providers.push(
            provideAppCheck(() => initializeAppCheck(undefined, {
                provider: new ReCaptchaV3Provider(cfg.recaptchaSiteKey!),
                isTokenAutoRefreshEnabled: true,
            }))
        );
    }
    return providers;
}

export function createAppConfig(cfg: FirebaseConfig | null): ApplicationConfig {
    return {
        providers: [
            provideBrowserGlobalErrorListeners(),
            { provide: ErrorHandler, useClass: GlobalErrorHandler },
            provideRouter(routes),
            provideHttpClient(),
            ...firebaseProviders(cfg),
        ]
    };
}
