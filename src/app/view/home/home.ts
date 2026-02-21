import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CourseMetadata } from '../../model/questions';
import { COURSE_NAMES } from '../../utils/course-name.util';

@Component({
    selector: 'app-home',
    imports: [RouterLink],
    templateUrl: './home.html',
    styleUrl: './home.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeView {
    protected readonly courses: readonly CourseMetadata[] = Object.entries(COURSE_NAMES).map(
        ([id, name]) => ({ id, name })
    );
}
