import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-privacy-policy',
    imports: [RouterLink],
    templateUrl: './privacy-policy.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyView {}

