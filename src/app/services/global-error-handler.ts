import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private readonly ngZone = inject(NgZone);

    handleError(error: unknown): void {
        const message = error instanceof Error ? error.message : String(error);

        // Ignore chunk-load errors caused by stale deployments — a full page
        // reload will pick up the fresh chunks automatically.
        if (message.includes('ChunkLoadError') || message.includes('Loading chunk')) {
            window.location.reload();
            return;
        }

        console.error('[GlobalErrorHandler]', error);

        // Surface the error to the user inside Angular's zone so that
        // change detection picks up any signal / template update.
        this.ngZone.run(() => {
            // We only log for now; extend here to show a toast/banner if needed.
        });
    }
}



