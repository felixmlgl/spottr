import React, { useState } from 'react';
import {
  Calendar,
  Check,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  X,
  Search,
  Dumbbell,
  Target,
  Sparkles,
} from 'lucide-react';
import { PlannedExercise, PlannedWorkout, TrainingPlan } from '../types/schema';
import { AVAILABLE_EXERCISES } from '../data/exerciseMuscles';
import { saveTrainingPlan } from '../services/planService';
import { PAST_WORKOUTS } from '../mocks/memberData';

interface PlanTabProps {
  plan: TrainingPlan;
  onUpdatePlan: (updatedPlan: TrainingPlan) => void;
}

export const PlanTab: React.FC<PlanTabProps> = ({ plan, onUpdatePlan }) => {
  const [selectedDayKey, setSelectedDayKey] = useState<keyof TrainingPlan['days'] | null>(null);
  const [editingDay, setEditingDay] = useState<PlannedWorkout | null>(null);
  const [isAddingExercise, setIsAddingExercise] = useState<boolean>(false);
  const [exerciseSearch, setExerciseSearch] = useState<string>('');

  const daysOrder: (keyof TrainingPlan['days'])[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  // Status for 7 day pills (Mon–Sun) based on mock logs
  const weekDayStatus: Record<
    keyof TrainingPlan['days'],
    { status: 'completed' | 'partial' | 'missed' | 'rest' | 'upcoming'; label: string; date: string }
  > = {
    mon: { status: 'completed', label: 'Mon', date: '21' },
    tue: { status: 'completed', label: 'Tue', date: '22' },
    wed: { status: 'completed', label: 'Wed', date: '23' },
    thu: { status: 'rest', label: 'Thu', date: '24' },
    fri: { status: 'completed', label: 'Fri', date: '25' },
    sat: { status: 'missed', label: 'Sat', date: '26' },
    sun: { status: 'completed', label: 'Sun', date: '27' }, // Today's workout completed
  };

  const handleOpenDay = (dayKey: keyof TrainingPlan['days']) => {
    setSelectedDayKey(dayKey);
    setEditingDay(JSON.parse(JSON.stringify(plan.days[dayKey])));
    setIsAddingExercise(false);
    setExerciseSearch('');
  };

  const handleSaveDay = () => {
    if (!selectedDayKey || !editingDay) return;
    const newDays = {
      ...plan.days,
      [selectedDayKey]: editingDay,
    };
    const updated: TrainingPlan = {
      ...plan,
      days: newDays,
    };
    onUpdatePlan(updated);
    saveTrainingPlan(updated);
    setSelectedDayKey(null);
    setEditingDay(null);
  };

  const handleToggleRest = () => {
    if (!editingDay) return;
    setEditingDay({
      ...editingDay,
      is_rest: !editingDay.is_rest,
      title: !editingDay.is_rest ? 'Rest' : 'Workout',
    });
  };

  const handleUpdateExerciseSets = (exerciseId: string, delta: number) => {
    if (!editingDay) return;
    setEditingDay({
      ...editingDay,
      exercises: editingDay.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, target_sets: Math.max(1, Math.min(10, ex.target_sets + delta)) }
          : ex
      ),
    });
  };

  const handleUpdateExerciseReps = (exerciseId: string, delta: number) => {
    if (!editingDay) return;
    setEditingDay({
      ...editingDay,
      exercises: editingDay.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, target_reps: Math.max(1, Math.min(50, ex.target_reps + delta)) }
          : ex
      ),
    });
  };

  const handleRemoveExercise = (exerciseId: string) => {
    if (!editingDay) return;
    setEditingDay({
      ...editingDay,
      exercises: editingDay.exercises.filter((ex) => ex.id !== exerciseId),
    });
  };

  const handleAddExercise = (template: (typeof AVAILABLE_EXERCISES)[0]) => {
    if (!editingDay) return;
    const newEx: PlannedExercise = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: template.name,
      exercise_id: template.id,
      target_sets: template.defaultSets,
      target_reps: template.defaultReps,
    };
    setEditingDay({
      ...editingDay,
      exercises: [...editingDay.exercises, newEx],
    });
    setIsAddingExercise(false);
    setExerciseSearch('');
  };

  const filteredExercises = AVAILABLE_EXERCISES.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pt-4">
        <p className="text-sm font-medium text-[#6E6E73] tracking-wide mb-1">
          Weekly schedule
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F]">
          Training plan
        </h1>
        <p className="text-base text-[#6E6E73] mt-2">
          Automatic camera tracking cross-referenced with your weekly goals.
        </p>
      </div>

      {/* "This Week" 7-Day Status Bar */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-7 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
            This week &bull; Sep 21 &ndash; 27
          </span>
          <span className="text-xs font-medium text-[#34C759]">
            5 of 6 workouts logged
          </span>
        </div>

        {/* 7 Day Pills */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {daysOrder.map((dayKey) => {
            const dayPlan = plan.days[dayKey];
            const info = weekDayStatus[dayKey];
            const isToday = dayKey === 'sun';

            return (
              <button
                key={dayKey}
                onClick={() => handleOpenDay(dayKey)}
                className={`flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer ${
                  info.status === 'completed'
                    ? 'bg-[#34C759] text-white shadow-xs'
                    : info.status === 'partial'
                    ? 'bg-white border-2 border-[#34C759] text-[#1D1D1F]'
                    : info.status === 'missed'
                    ? 'bg-[#E5E5EA] text-[#6E6E73]'
                    : 'bg-white text-[#6E6E73]'
                } ${isToday ? 'ring-2 ring-black/10' : ''}`}
              >
                <span className="text-[11px] font-medium opacity-80">
                  {info.label}
                </span>
                <span className="text-base sm:text-lg font-bold my-1">
                  {info.date}
                </span>
                <span className="text-[10px] truncate max-w-full font-medium">
                  {dayPlan.is_rest ? 'Rest' : dayPlan.title}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-[#6E6E73] pt-2 border-t border-black/[0.04]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
            <span>Completed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E5E5EA]" />
            <span>Missed / Rest</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#34C759]" />
            <span>Partial</span>
          </span>
        </div>
      </div>

      {/* Plan Adherence & Latest Session Comparison Card */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
              Adherence review
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
              5 of 6 planned workouts done
            </h2>
            <p className="text-sm text-[#6E6E73] mt-1">
              83% weekly completion rate &bull; Consistent execution
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-xs self-start sm:self-auto">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#E5E5EA]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#34C759]"
                  strokeDasharray="83, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-[#1D1D1F]">
                83%
              </span>
            </div>
            <div>
              <p className="text-xs text-[#6E6E73]">On-target sets</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">
                19 of 21 sets hit
              </p>
            </div>
          </div>
        </div>

        {/* Per-Exercise Target vs Done Breakdown for Latest Workout */}
        <div className="pt-4 border-t border-black/[0.05]">
          <h3 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide mb-3">
            Today's target vs camera verified reps
          </h3>
          <div className="bg-white rounded-2xl divide-y divide-black/[0.04] overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#1D1D1F]">
                  Barbell back squat
                </h4>
                <p className="text-xs text-[#6E6E73]">
                  Planned: 4 sets &times; 8 reps
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#34C759] flex items-center gap-1 justify-end">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Done: 4&times;8 (32 reps)</span>
                </span>
                <span className="text-[11px] text-[#6E6E73]">100% target</span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#1D1D1F]">
                  Romanian deadlift
                </h4>
                <p className="text-xs text-[#6E6E73]">
                  Planned: 3 sets &times; 8 reps
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#34C759] flex items-center gap-1 justify-end">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Done: 3&times;8 (24 reps)</span>
                </span>
                <span className="text-[11px] text-[#6E6E73]">100% target</span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#1D1D1F]">
                  Walking lunge
                </h4>
                <p className="text-xs text-[#6E6E73]">
                  Planned: 3 sets &times; 8 reps (24 reps)
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-[#1D1D1F]">
                  Done: 2&times;4 (8 reps)
                </span>
                <span className="text-[11px] text-[#FF9500]">Short on volume</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekday Schedule List (Mon - Sun) */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
            Weekly routine
          </h3>
          <span className="text-xs text-[#6E6E73]">Tap any day to edit</span>
        </div>

        <div className="bg-[#F5F5F7] rounded-[24px] divide-y divide-black/[0.04] overflow-hidden">
          {daysOrder.map((dayKey) => {
            const day = plan.days[dayKey];
            const isToday = dayKey === 'sun';

            return (
              <button
                key={dayKey}
                onClick={() => handleOpenDay(dayKey)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-black/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1D1D1F] w-24">
                      {day.day_label}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        day.is_rest
                          ? 'bg-[#E5E5EA] text-[#6E6E73]'
                          : 'bg-white text-[#1D1D1F] shadow-xs'
                      }`}
                    >
                      {day.is_rest ? 'Rest day' : day.title}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold text-[#34C759] uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>

                  {!day.is_rest && (
                    <p className="text-xs text-[#6E6E73] truncate mt-1 pl-0 sm:pl-26">
                      {day.exercises.map((e) => `${e.name} (${e.target_sets}×${e.target_reps})`).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[#6E6E73]">
                    {day.is_rest ? 'Recovery' : `${day.exercises.length} exercises`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Workout Editor Sheet (Modal) */}
      {selectedDayKey && editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[28px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#6E6E73] tracking-wide uppercase">
                  Edit routine &bull; {editingDay.day_label}
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
                  {editingDay.is_rest ? 'Rest Day' : editingDay.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedDayKey(null)}
                className="p-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rest Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-2xl">
              <div>
                <p className="text-sm font-semibold text-[#1D1D1F]">Rest day</p>
                <p className="text-xs text-[#6E6E73]">No exercises planned for this day</p>
              </div>
              <button
                onClick={handleToggleRest}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  editingDay.is_rest ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                    editingDay.is_rest ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Workout Details (If Not Rest) */}
            {!editingDay.is_rest && (
              <>
                {/* Title Input */}
                <div>
                  <label className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide block mb-1.5">
                    Workout Title
                  </label>
                  <input
                    type="text"
                    value={editingDay.title}
                    onChange={(e) => setEditingDay({ ...editingDay, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F7] text-sm font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#34C759]"
                    placeholder="e.g. Push, Pull, Legs, Upper"
                  />
                </div>

                {/* Exercises List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
                      Target exercises ({editingDay.exercises.length})
                    </span>
                    <button
                      onClick={() => setIsAddingExercise(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#34C759] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add exercise</span>
                    </button>
                  </div>

                  <div className="bg-[#F5F5F7] rounded-2xl divide-y divide-black/[0.04] overflow-hidden">
                    {editingDay.exercises.length === 0 ? (
                      <p className="p-4 text-xs text-[#6E6E73] text-center">
                        No exercises added yet. Tap "Add exercise" above.
                      </p>
                    ) : (
                      editingDay.exercises.map((ex) => (
                        <div key={ex.id} className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-[#1D1D1F] truncate">
                              {ex.name}
                            </h4>
                          </div>

                          {/* Steppers */}
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Sets Stepper */}
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg shadow-2xs">
                              <span className="text-[11px] text-[#6E6E73] font-medium mr-1">Sets</span>
                              <button
                                onClick={() => handleUpdateExerciseSets(ex.id, -1)}
                                className="w-5 h-5 flex items-center justify-center rounded text-[#6E6E73] hover:bg-[#F5F5F7] cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-[#1D1D1F] w-4 text-center">
                                {ex.target_sets}
                              </span>
                              <button
                                onClick={() => handleUpdateExerciseSets(ex.id, 1)}
                                className="w-5 h-5 flex items-center justify-center rounded text-[#6E6E73] hover:bg-[#F5F5F7] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Reps Stepper */}
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg shadow-2xs">
                              <span className="text-[11px] text-[#6E6E73] font-medium mr-1">Reps</span>
                              <button
                                onClick={() => handleUpdateExerciseReps(ex.id, -1)}
                                className="w-5 h-5 flex items-center justify-center rounded text-[#6E6E73] hover:bg-[#F5F5F7] cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-[#1D1D1F] w-5 text-center">
                                {ex.target_reps}
                              </span>
                              <button
                                onClick={() => handleUpdateExerciseReps(ex.id, 1)}
                                className="w-5 h-5 flex items-center justify-center rounded text-[#6E6E73] hover:bg-[#F5F5F7] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => handleRemoveExercise(ex.id)}
                              className="p-1.5 text-[#6E6E73] hover:text-[#FF3B30] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Exercise Search Picker */}
                {isAddingExercise && (
                  <div className="p-4 bg-[#F5F5F7] rounded-2xl flex flex-col gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
                        Choose exercise
                      </span>
                      <button
                        onClick={() => setIsAddingExercise(false)}
                        className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-[#86868B] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={exerciseSearch}
                        onChange={(e) => setExerciseSearch(e.target.value)}
                        placeholder="Search exercises..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white text-xs font-medium text-[#1D1D1F] focus:outline-none focus:ring-1 focus:ring-[#34C759]"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-black/[0.04] bg-white rounded-xl">
                      {filteredExercises.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleAddExercise(template)}
                          className="w-full text-left p-2.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] flex items-center justify-between cursor-pointer"
                        >
                          <span>{template.name}</span>
                          <span className="text-[10px] text-[#6E6E73]">{template.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSelectedDayKey(null)}
                className="flex-1 py-3 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-sm font-medium text-[#1D1D1F] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDay}
                className="flex-1 py-3 rounded-full bg-[#34C759] hover:bg-[#2FB34F] text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Save routine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
