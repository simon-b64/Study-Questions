/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { createAppConfig, FirebaseConfig } from './app/app.config';
import { App } from './app/app';

fetch('/config.json')
    .then(res => res.json() as Promise<{ firebase: FirebaseConfig }>)
    .then(({ firebase }) => bootstrapApplication(App, createAppConfig(firebase)))
    .catch((err: unknown) => {
        console.error('Failed to load application configuration:', err);
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;padding:2rem;">
                <div style="max-width:480px;text-align:center;">
                    <h1 style="font-size:1.5rem;margin-bottom:1rem;">Anwendung konnte nicht geladen werden</h1>
                    <p style="color:#666;">Die Konfigurationsdatei konnte nicht geladen werden. Bitte versuche es später erneut.</p>
                </div>
            </div>`;
    });
