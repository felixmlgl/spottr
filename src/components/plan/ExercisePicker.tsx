import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { MUSCLE_NAMES } from '../../data/exerciseMuscles';
import { MUSCLE_GROUPS, PLAN_EXERCISES, PlanExerciseInfo } from '../../data/planExercises';

interface ExercisePickerProps {
  /** Exercises already in the day; shown as added and not selectable */
  taken: string[];
  /** When swapping: the exercise being replaced (highlighted, not selectable) */
  current?: string;
  onPick: (key: string) => void;
}

/** Searchable exercise list grouped by muscle group (lives inside a BottomSheet). */
export const ExercisePicker: React.FC<ExercisePickerProps> = ({ taken, current, onPick }) => {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (e: PlanExerciseInfo) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.group.toLowerCase().includes(q) ||
      e.primary.some((m) => MUSCLE_NAMES[m].toLowerCase().includes(q));
    return MUSCLE_GROUPS.map((group) => ({
      group,
      exercises: PLAN_EXERCISES.filter((e) => e.group === group && matches(e)),
    })).filter((g) => g.exercises.length > 0);
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-[#F5F5F7] text-[#6E6E73] focus-within:ring-2 focus-within:ring-[#34C759]">
        <Search className="w-4 h-4 shrink-0" />
        <span className="sr-only">Search exercises</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercise or muscle"
          className="flex-1 min-w-0 bg-transparent text-[16px] text-[#1D1D1F] placeholder:text-[#86868B] outline-none"
        />
      </label>

      {groups.length === 0 && <p className="text-sm text-[#6E6E73] px-1">No exercise matches “{query}”.</p>}

      {groups.map(({ group, exercises }) => (
        <section key={group}>
          <h3 className="px-1 mb-1 text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">{group}</h3>
          <ul>
            {exercises.map((e) => {
              const isCurrent = e.key === current;
              const isTaken = !isCurrent && taken.includes(e.key);
              return (
                <li key={e.key}>
                  <button
                    onClick={() => onPick(e.key)}
                    disabled={isCurrent || isTaken}
                    className="w-full min-h-12 flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-[#F5F5F7] cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block text-[15px] font-medium truncate ${
                          isCurrent || isTaken ? 'text-[#86868B]' : 'text-[#1D1D1F]'
                        }`}
                      >
                        {e.name}
                      </span>
                      <span className="block text-xs text-[#6E6E73] truncate">
                        {e.primary.map((m) => MUSCLE_NAMES[m]).join(' · ')}
                        {!e.trackedByCamera && ' · not tracked by camera yet'}
                      </span>
                    </span>
                    {(isCurrent || isTaken) && (
                      <span className="flex items-center gap-1 text-xs font-medium text-[#86868B] shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        {isCurrent ? 'Current' : 'In this day'}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
