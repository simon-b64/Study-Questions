/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { createAppConfig, setFirebaseConfig, FirebaseConfig } from './app/app.config';
import { App } from './app/app';

fetch('/config.json')
    .then(res => res.json() as Promise<{ firebase: FirebaseConfig }>)
    .then(({ firebase }) => {
        setFirebaseConfig(firebase);
        return bootstrapApplication(App, createAppConfig());
    })
    .catch(err => console.error(err));
