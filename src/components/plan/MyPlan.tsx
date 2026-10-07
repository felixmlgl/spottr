import React, { useState } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Plan, PlanDay, PlanExercise } from '../../types/plan';
import { MUSCLE_NAMES } from '../../data/exerciseMuscles';
import { planExerciseInfo } from '../../data/planExercises';
import { DEFAULT_TEMPLATE_ID, newPlanId, PLAN_TEMPLATES, planFromTemplate, PlanTemplateId } from '../../data/planTemplates';
import { RecoveryCalculationResult } from '../../services/recovery';
import { dayGroups, dayReadiness } from '../../services/planSchedule';
import { BottomSheet, SheetAction } from './BottomSheet';
import { ExercisePicker } from './ExercisePicker';

interface MyPlanProps {
  plan: Plan | null;
  onChange: (plan: Plan) => void;
  /** The day the "Next session" card shows; highlighted */
  upcomingDayId: string | null;
  recovery: RecoveryCalculationResult;
}

type Sheet =
  | { kind: 'day'; dayId: string; rename?: boolean; confirmDelete?: boolean }
  | { kind: 'exercise'; dayId: string; exerciseId: string }
  | { kind: 'picker'; dayId: string; replaceId?: string }
  | { kind: 'reset'; templateId?: PlanTemplateId };

const SETS_MAX = 10;
const REPS_MAX = 50;

export const formatTarget = (e: Pick<PlanExercise, 'targetSets' | 'targetRepsMin' | 'targetRepsMax'>) =>
  `${e.targetSets} × ${e.targetRepsMin === e.targetRepsMax ? e.targetRepsMin : `${e.targetRepsMin}–${e.targetRepsMax}`}`;

/** "a", "a & b", "a, b & c" */
export const joinAmp = (words: string[]) =>
  words.length > 1 ? `${words.slice(0, -1).join(', ')} & ${words[words.length - 1]}` : words[0] ?? '';

const moveItem = <T,>(items: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const Stepper: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, onChange }) => (
  <div className="flex items-center justify-between gap-3 py-1">
    <span className="text-[15px] font-medium text-[#1D1D1F]">{label}</span>
    <div className="flex items-center gap-1 bg-[#F5F5F7] rounded-full p-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer ${label.toLowerCase()}`}
        className="w-11 h-11 rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-default"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-8 text-center text-lg font-bold tabular-nums text-[#1D1D1F]" aria-live="polite">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${label.toLowerCase()}`}
        className="w-11 h-11 rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-default"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);

/** First use: pick a starting template. */
const TemplateChooser: React.FC<{ onPick: (id: PlanTemplateId) => void }> = ({ onPick }) => (
  <div className="flex flex-col gap-3">
    <p className="text-sm text-[#6E6E73]">Pick a starting point. You can change every day and exercise afterwards.</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {PLAN_TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          className={`text-left rounded-2xl bg-white p-4 min-h-12 hover:shadow-sm transition-shadow cursor-pointer ${
            t.id === DEFAULT_TEMPLATE_ID ? 'ring-2 ring-[#34C759]' : ''
          }`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-base font-bold text-[#1D1D1F]">{t.name}</span>
            {t.id === DEFAULT_TEMPLATE_ID && (
              <span className="px-2 py-0.5 rounded-full bg-[#34C759]/12 text-[10px] font-semibold text-[#1E8E3E] uppercase tracking-wide">
                Default
              </span>
            )}
          </span>
          <span className="block text-sm text-[#1D1D1F] mt-1">{t.days.map((d) => d.name).join(' → ')}</span>
          <span className="block text-xs text-[#6E6E73] mt-1">{t.description}</span>
        </button>
      ))}
    </div>
  </div>
);

const DayCard: React.FC<{
  day: PlanDay;
  index: number;
  isUpcoming: boolean;
  recovery: RecoveryCalculationResult;
  onOpenDay: () => void;
  onOpenExercise: (exerciseId: string) => void;
  onAddExercise: () => void;
}> = ({ day, index, isUpcoming, recovery, onOpenDay, onOpenExercise, onAddExercise }) => {
  const groups = dayGroups(day);
  const readiness = day.exercises.length ? dayReadiness(day, recovery) : null;
  return (
    <li
      className={`bg-white rounded-2xl overflow-hidden ${isUpcoming ? 'ring-2 ring-[#34C759]' : ''}`}
      aria-current={isUpcoming ? 'step' : undefined}
    >
      <div className="flex items-center gap-3 pl-4 pr-1 pt-3 pb-2">
        <span
          className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
            isUpcoming ? 'bg-[#34C759] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F]'
          }`}
        >
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-[#1D1D1F] truncate">{day.name}</h4>
            {isUpcoming && (
              <span className="px-2 py-0.5 rounded-full bg-[#34C759]/12 text-[10px] font-semibold text-[#1E8E3E] uppercase tracking-wide">
                Up next
              </span>
            )}
          </div>
          <p className="text-xs text-[#6E6E73] line-clamp-2">
            {day.exercises.length
              ? `${day.exercises.length} exercise${day.exercises.length > 1 ? 's' : ''} · ${joinAmp(groups)}`
              : 'No exercises yet'}
            {readiness &&
              (readiness.recovering.length
                ? ` · ${readiness.recovering.length} muscle${readiness.recovering.length > 1 ? 's' : ''} recovering`
                : ' · ready')}
          </p>
        </div>
        <button
          onClick={onOpenDay}
          aria-label={`Options for ${day.name}`}
          className="w-11 h-11 rounded-full flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] cursor-pointer shrink-0"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {day.exercises.length > 0 && (
        <ul className="divide-y divide-black/[0.04] border-t border-black/[0.04]">
          {day.exercises.map((e) => {
            const info = planExerciseInfo(e.exerciseKey);
            return (
              <li key={e.id}>
                <button
                  onClick={() => onOpenExercise(e.id)}
                  className="w-full min-h-14 flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#FAFAFA] cursor-pointer"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#1D1D1F] truncate">{info.name}</span>
                    <span className="block text-xs text-[#6E6E73] truncate">
                      {info.primary.map((m) => MUSCLE_NAMES[m]).join(' · ')}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-[#1D1D1F] shrink-0">{formatTarget(e)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={onAddExercise}
        className="w-full min-h-12 flex items-center gap-2 px-4 border-t border-black/[0.04] text-sm font-medium text-[#1E8E3E] hover:bg-[#FAFAFA] cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Add exercise
      </button>
    </li>
  );
};

/** "My plan": every day of the member's rotation, editable in place via bottom sheets. */
export const MyPlan: React.FC<MyPlanProps> = ({ plan, onChange, upcomingDayId, recovery }) => {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const close = () => setSheet(null);

  if (!plan) {
    return <TemplateChooser onPick={(id) => onChange(planFromTemplate(id))} />;
  }

  const updateDay = (dayId: string, fn: (day: PlanDay) => PlanDay) =>
    onChange({ ...plan, days: plan.days.map((d) => (d.id === dayId ? fn(d) : d)) });

  const updateExercise = (dayId: string, exerciseId: string, patch: Partial<PlanExercise>) =>
    updateDay(dayId, (d) => ({
      ...d,
      exercises: d.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)),
    }));

  const openDay = (day: PlanDay, rename = false) => {
    setRenameValue(day.name);
    setSheet({ kind: 'day', dayId: day.id, rename });
  };

  const addDay = () => {
    const day: PlanDay = { id: newPlanId('day'), name: `Day ${plan.days.length + 1}`, exercises: [] };
    onChange({ ...plan, days: [...plan.days, day] });
    openDay(day, true);
  };

  const pickExercise = (dayId: string, key: string, replaceId?: string) => {
    const info = planExerciseInfo(key);
    if (replaceId) {
      // Swap keeps the targets the member already set
      updateExercise(dayId, replaceId, { exerciseKey: key });
      setSheet({ kind: 'exercise', dayId, exerciseId: replaceId });
      return;
    }
    const exercise: PlanExercise = {
      id: newPlanId('ex'),
      exerciseKey: key,
      targetSets: info.defaultSets,
      targetRepsMin: info.defaultRepsMin,
      targetRepsMax: info.defaultRepsMax,
    };
    updateDay(dayId, (d) => ({ ...d, exercises: [...d.exercises, exercise] }));
    close();
  };

  const sheetDay = sheet && 'dayId' in sheet ? plan.days.find((d) => d.id === sheet.dayId) : undefined;
  const sheetDayIndex = sheetDay ? plan.days.indexOf(sheetDay) : -1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#6E6E73]">
          <span className="font-semibold text-[#1D1D1F]">{plan.name}</span> · {plan.days.length} day
          {plan.days.length === 1 ? '' : 's'}, repeating in order
        </p>
        <button
          onClick={() => setSheet({ kind: 'reset' })}
          className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white hover:bg-[#E8E8ED] text-sm font-medium text-[#1D1D1F] shadow-2xs cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {plan.days.length === 0 && (
        <p className="text-sm text-[#6E6E73] bg-white rounded-2xl p-4">Your plan has no days. Add one to get started.</p>
      )}

      <ol className="flex flex-col gap-3">
        {plan.days.map((day, i) => (
          <DayCard
            key={day.id}
            day={day}
            index={i}
            isUpcoming={day.id === upcomingDayId}
            recovery={recovery}
            onOpenDay={() => openDay(day)}
            onOpenExercise={(exerciseId) => setSheet({ kind: 'exercise', dayId: day.id, exerciseId })}
            onAddExercise={() => setSheet({ kind: 'picker', dayId: day.id })}
          />
        ))}
      </ol>

      <button
        onClick={addDay}
        className="w-full min-h-12 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D2D2D7] text-sm font-semibold text-[#1D1D1F] hover:bg-white cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Add day
      </button>

      {/* Day options: rename, reorder, delete */}
      {sheet?.kind === 'day' && sheetDay && (
        <BottomSheet
          title={sheet.confirmDelete ? `Delete ${sheetDay.name}?` : sheetDay.name}
          subtitle={
            sheet.confirmDelete
              ? `Its ${sheetDay.exercises.length} exercise${sheetDay.exercises.length === 1 ? '' : 's'} will be removed from your plan.`
              : `Day ${sheetDayIndex + 1} of ${plan.days.length}`
          }
          onClose={close}
        >
          {sheet.confirmDelete ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSheet({ ...sheet, confirmDelete: false })}
                className="h-12 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-sm font-semibold text-[#1D1D1F] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onChange({ ...plan, days: plan.days.filter((d) => d.id !== sheetDay.id) });
                  close();
                }}
                className="h-12 rounded-full bg-[#FF3B30] hover:bg-[#E0352B] text-sm font-semibold text-white cursor-pointer"
              >
                Delete day
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <form
                className="flex items-center gap-2 mb-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = renameValue.trim();
                  if (name) updateDay(sheetDay.id, (d) => ({ ...d, name }));
                  close();
                }}
              >
                <label className="flex-1 flex items-center gap-2 h-12 px-3.5 rounded-xl bg-[#F5F5F7] focus-within:ring-2 focus-within:ring-[#34C759]">
                  <Pencil className="w-4 h-4 text-[#6E6E73] shrink-0" />
                  <span className="sr-only">Day name</span>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus={sheet.rename}
                    onFocus={(e) => sheet.rename && e.target.select()}
                    maxLength={40}
                    className="flex-1 min-w-0 bg-transparent text-[16px] font-medium text-[#1D1D1F] outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="h-12 px-5 rounded-full bg-[#1D1D1F] hover:bg-black text-sm font-semibold text-white cursor-pointer"
                >
                  Save
                </button>
              </form>
              <SheetAction
                icon={ChevronUp}
                label="Move up"
                disabled={sheetDayIndex <= 0}
                onClick={() => onChange({ ...plan, days: moveItem(plan.days, sheetDayIndex, sheetDayIndex - 1) })}
              />
              <SheetAction
                icon={ChevronDown}
                label="Move down"
                disabled={sheetDayIndex >= plan.days.length - 1}
                onClick={() => onChange({ ...plan, days: moveItem(plan.days, sheetDayIndex, sheetDayIndex + 1) })}
              />
              <SheetAction
                icon={Trash2}
                label="Delete day"
                danger
                onClick={() => setSheet({ ...sheet, confirmDelete: true })}
              />
            </div>
          )}
        </BottomSheet>
      )}

      {/* Exercise: targets, swap, reorder, remove */}
      {sheet?.kind === 'exercise' &&
        sheetDay &&
        (() => {
          const exIndex = sheetDay.exercises.findIndex((e) => e.id === sheet.exerciseId);
          const exercise = sheetDay.exercises[exIndex];
          if (!exercise) return null;
          const info = planExerciseInfo(exercise.exerciseKey);
          const patch = (p: Partial<PlanExercise>) => updateExercise(sheetDay.id, exercise.id, p);
          return (
            <BottomSheet
              title={info.name}
              subtitle={`${sheetDay.name} · ${info.primary.map((m) => MUSCLE_NAMES[m]).join(' · ') || info.group}`}
              onClose={close}
            >
              <div className="flex flex-col gap-1">
                <Stepper label="Sets" value={exercise.targetSets} min={1} max={SETS_MAX} onChange={(v) => patch({ targetSets: v })} />
                <Stepper
                  label="Reps from"
                  value={exercise.targetRepsMin}
                  min={1}
                  max={REPS_MAX}
                  onChange={(v) => patch({ targetRepsMin: v, targetRepsMax: Math.max(v, exercise.targetRepsMax) })}
                />
                <Stepper
                  label="Reps to"
                  value={exercise.targetRepsMax}
                  min={exercise.targetRepsMin}
                  max={REPS_MAX}
                  onChange={(v) => patch({ targetRepsMax: v })}
                />
                <p className="text-sm text-[#6E6E73] py-2">
                  Target: <span className="font-semibold text-[#1D1D1F] tabular-nums">{formatTarget(exercise)}</span> reps
                </p>
                <div className="h-px bg-black/[0.06] my-1" />
                <SheetAction
                  icon={ArrowLeftRight}
                  label="Swap exercise"
                  onClick={() => setSheet({ kind: 'picker', dayId: sheetDay.id, replaceId: exercise.id })}
                />
                <SheetAction
                  icon={ChevronUp}
                  label="Move up"
                  disabled={exIndex <= 0}
                  onClick={() =>
                    updateDay(sheetDay.id, (d) => ({ ...d, exercises: moveItem(d.exercises, exIndex, exIndex - 1) }))
                  }
                />
                <SheetAction
                  icon={ChevronDown}
                  label="Move down"
                  disabled={exIndex >= sheetDay.exercises.length - 1}
                  onClick={() =>
                    updateDay(sheetDay.id, (d) => ({ ...d, exercises: moveItem(d.exercises, exIndex, exIndex + 1) }))
                  }
                />
                <SheetAction
                  icon={Trash2}
                  label="Remove from day"
                  danger
                  onClick={() => {
                    updateDay(sheetDay.id, (d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== exercise.id) }));
                    close();
                  }}
                />
                <button
                  onClick={close}
                  className="mt-3 h-12 rounded-full bg-[#1D1D1F] hover:bg-black text-sm font-semibold text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            </BottomSheet>
          );
        })()}

      {/* Exercise picker: add or swap */}
      {sheet?.kind === 'picker' && sheetDay && (
        <BottomSheet
          title={sheet.replaceId ? 'Swap exercise' : `Add to ${sheetDay.name}`}
          subtitle="Exercises the gym cameras can recognise"
          onClose={close}
        >
          <ExercisePicker
            taken={sheetDay.exercises.map((e) => e.exerciseKey)}
            current={sheetDay.exercises.find((e) => e.id === sheet.replaceId)?.exerciseKey}
            onPick={(key) => pickExercise(sheetDay.id, key, sheet.replaceId)}
          />
        </BottomSheet>
      )}

      {/* Reset to a template, with a confirm step */}
      {sheet?.kind === 'reset' &&
        (() => {
          const template = PLAN_TEMPLATES.find((t) => t.id === sheet.templateId);
          return (
            <BottomSheet
              title={template ? `Replace your plan with ${template.name}?` : 'Reset to a template'}
              subtitle={
                template
                  ? 'Your current days, exercises and targets will be replaced. This can’t be undone.'
                  : 'Start over from one of the templates.'
              }
              onClose={close}
            >
              {template ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSheet({ kind: 'reset' })}
                    className="h-12 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-sm font-semibold text-[#1D1D1F] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onChange(planFromTemplate(template.id));
                      close();
                    }}
                    className="h-12 rounded-full bg-[#FF3B30] hover:bg-[#E0352B] text-sm font-semibold text-white cursor-pointer"
                  >
                    Replace plan
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {PLAN_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSheet({ kind: 'reset', templateId: t.id })}
                      className="text-left min-h-12 rounded-2xl bg-[#F5F5F7] hover:bg-[#EBEBEF] px-4 py-3 cursor-pointer"
                    >
                      <span className="block text-[15px] font-bold text-[#1D1D1F]">{t.name}</span>
                      <span className="block text-xs text-[#6E6E73] mt-0.5">{t.days.map((d) => d.name).join(' → ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </BottomSheet>
          );
        })()}
    </div>
  );
};
