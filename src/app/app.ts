import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { ConsentBanner } from './components/consent-banner/consent-banner';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Navbar, Footer, ConsentBanner],
    templateUrl: './app.html',
    styleUrl: './app.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
