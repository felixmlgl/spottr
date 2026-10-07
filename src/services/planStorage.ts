/**
 * Persistence for the editable plan (Plan tab → "My plan").
 *
 * localStorage for now, behind load/save/clear so it can be swapped for an API later. The key is versioned: bump it
 * (and migrate) if the Plan shape changes.
 */

import { useCallback, useState } from 'react';
import { Plan } from '../types/plan';
import { DEFAULT_TEMPLATE_ID, planFromTemplate } from '../data/planTemplates';

const STORAGE_KEY = 'spottr.plan.v1';

const isNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function isPlan(value: unknown): value is Plan {
  const p = value as Plan;
  return (
    !!p &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    Array.isArray(p.days) &&
    p.days.every(
      (d) =>
        typeof d?.id === 'string' &&
        typeof d.name === 'string' &&
        Array.isArray(d.exercises) &&
        d.exercises.every(
          (e) =>
            typeof e?.id === 'string' &&
            typeof e.exerciseKey === 'string' &&
            isNumber(e.targetSets) &&
            isNumber(e.targetRepsMin) &&
            isNumber(e.targetRepsMax)
        )
    )
  );
}

/**
 * The saved plan, or null if the member hasn't picked one yet (then the Plan tab offers templates).
 * If storage is unavailable or the saved value is unreadable, falls back to the default template.
 */
export function loadPlan(): Plan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isPlan(parsed)) return parsed;
  } catch {
    // Storage disabled, or the saved value isn't JSON
  }
  return planFromTemplate(DEFAULT_TEMPLATE_ID);
}

export function savePlan(plan: Plan): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Storage full or disabled: the plan still works for this visit
  }
}

export function clearPlan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** The plan as React state; every update is saved. */
export function usePlan(): [Plan | null, (plan: Plan) => void] {
  const [plan, setPlan] = useState<Plan | null>(() => loadPlan());
  const update = useCallback((next: Plan) => {
    setPlan(next);
    savePlan(next);
  }, []);
  return [plan, update];
}
