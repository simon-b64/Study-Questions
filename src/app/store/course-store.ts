import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Course, CourseMetadata } from '../model/questions';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';

type CourseStore = {
    currentCourseMetadata: CourseMetadata | undefined;
    course: Course | undefined;
    isLoading: boolean;
    error: string | undefined;
}

const initialState: CourseStore = {
    currentCourseMetadata: undefined,
    course: undefined,
    isLoading: false,
    error: undefined
}

export const CourseStore = signalStore(
    {providedIn: 'root'},
    withState(initialState),
    withMethods((store, http = inject(HttpClient)) => ({
        loadCourse: rxMethod<CourseMetadata>(
            pipe(
                tap(() => {
                    patchState(store, {
                        isLoading: true,
                        error: undefined,
                        currentCourseMetadata: undefined,
                        course: undefined
                    });
                }),
                switchMap((metadata) =>
                    http.get<Course>(`/${metadata.id}.json`).pipe(
                        tap((course) => {
                            patchState(store, {
                                course,
                                currentCourseMetadata: metadata,
                                isLoading: false,
                                error: undefined
                            });
                        }),
                        catchError((error) => {
                            patchState(store, {
                                error: `Failed to load course: ${error.message}`,
                                isLoading: false,
                                course: undefined,
                                currentCourseMetadata: undefined
                            });
                            return of(null);
                        })
                    )
                )
            )
        ),
        reset: () => {
            patchState(store, initialState);
        }
    }))
)
