import { useCallback } from 'react';
import { useUiStore } from '../store/ui';
import {
  createOnboardingDriver,
  ONBOARDING_TOUR_ID,
  createEditorOnboardingDriver,
  EDITOR_TOUR_ID,
} from '../lib/tours';

export function useTour() {
  const { completedTours, markTourCompleted, resetTour } = useUiStore();

  const startTour = useCallback(
    (tourId: string, opts?: { force?: boolean }) => {
      if (!opts?.force && completedTours.includes(tourId)) return;

      const factory =
        tourId === ONBOARDING_TOUR_ID ? createOnboardingDriver :
        tourId === EDITOR_TOUR_ID    ? createEditorOnboardingDriver :
        null;
      if (!factory) return;

      factory(() => markTourCompleted(tourId)).drive();
    },
    [completedTours, markTourCompleted],
  );

  const isTourCompleted = useCallback(
    (tourId: string) => completedTours.includes(tourId),
    [completedTours],
  );

  return { startTour, isTourCompleted, resetTour };
}
