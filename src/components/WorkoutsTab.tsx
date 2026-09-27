import React, { useState } from 'react';
import { ChevronRight, X, Clock, Dumbbell, Sparkles, Calendar } from 'lucide-react';
import { PAST_WORKOUTS } from '../mocks/memberData';
import { PastWorkout } from '../types/schema';
import { BodyMap } from './BodyMap';
import { computeSessionMuscleIntensities } from '../data/exerciseMuscles';

export const WorkoutsTab: React.FC = () => {
  const [selectedWorkout, setSelectedWorkout] = useState<PastWorkout | null>(null);

  // Group workouts by week_group
  const weekGroups = Array.from(
    new Set(PAST_WORKOUTS.map((w) => w.week_group))
  );

  const selectedMuscles = selectedWorkout
    ? computeSessionMuscleIntensities(selectedWorkout.exercises)
    : {};

  return (
    <div className="flex flex-col gap-8 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F]">
          Workouts
        </h1>
        <p className="text-base text-[#6E6E73] mt-2">
          {PAST_WORKOUTS.length} sessions logged over the past 4 weeks.
        </p>
      </div>

      {/* Grouped Workouts List */}
      <div className="flex flex-col gap-8">
        {weekGroups.map((group) => {
          const workoutsInGroup = PAST_WORKOUTS.filter((w) => w.week_group === group);
          return (
            <div key={group} className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-[#6E6E73] tracking-wide uppercase px-2">
                {group}
              </h3>

              <div className="bg-[#F5F5F7] rounded-[24px] divide-y divide-black/[0.04] overflow-hidden">
                {workoutsInGroup.map((workout) => {
                  const mainExercises = workout.exercises
                    .map((e) => e.name)
                    .join(', ');

                  return (
                    <button
                      key={workout.id}
                      onClick={() => setSelectedWorkout(workout)}
                      className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-black/[0.02] transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-[#1D1D1F]">
                            {workout.display_date}
                          </span>
                        </div>
                        <p className="text-sm text-[#6E6E73] truncate mt-0.5">
                          {mainExercises}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-semibold text-[#34C759] block">
                            {workout.total_reps} reps
                          </span>
                          <span className="text-xs text-[#6E6E73]">
                            {workout.duration_minutes} min
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Workout Detail Sheet / Modal */}
      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[28px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#6E6E73] tracking-wide uppercase">
                  Session detail
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
                  {selectedWorkout.display_date}
                </h2>
              </div>
              <button
                onClick={() => setSelectedWorkout(null)}
                className="p-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 gap-3 bg-[#F5F5F7] rounded-[20px] p-4 text-center">
              <div>
                <span className="text-xs text-[#6E6E73] block">Total reps</span>
                <span className="text-3xl font-bold text-[#34C759]">
                  {selectedWorkout.total_reps}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#6E6E73] block">Duration</span>
                <span className="text-3xl font-bold text-[#1D1D1F]">
                  {selectedWorkout.duration_minutes}
                  <span className="text-sm font-normal text-[#6E6E73] ml-1">min</span>
                </span>
              </div>
            </div>

            {/* Exercise Breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-3">
                Exercises & Sets
              </h3>
              <div className="bg-[#F5F5F7] rounded-[20px] divide-y divide-black/[0.04] overflow-hidden">
                {selectedWorkout.exercises.map((ex, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[#1D1D1F]">
                        {ex.name}
                      </h4>
                      <p className="text-xs text-[#6E6E73] mt-0.5">
                        Sets: {ex.reps_per_set.join(' / ')} reps
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#1D1D1F]">
                      {ex.total_reps} reps
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Timeline */}
            {selectedWorkout.timeline_points && selectedWorkout.timeline_points.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide mb-3">
                  Session timeline
                </h3>
                <div className="bg-[#F5F5F7] rounded-[20px] p-4 flex flex-col gap-2.5">
                  {selectedWorkout.timeline_points.map((pt, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                        <span className="font-medium text-[#1D1D1F]">{pt.exercise}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#6E6E73]">
                        <span>{pt.reps} reps</span>
                        <span className="font-mono text-[11px]">{pt.t} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Muscle Map for this Workout */}
            <div className="bg-[#F5F5F7] rounded-[20px] p-5 flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide self-start">
                Muscles targeted
              </span>
              <BodyMap values={selectedMuscles} mode="intensity" size="sm" />
            </div>

            {/* Workout Recap */}
            <div className="bg-[#F5F5F7] rounded-[20px] p-5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-[#34C759]" />
                <span>Camera analysis note</span>
              </div>
              <p className="text-sm text-[#1D1D1F] leading-relaxed">
                {selectedWorkout.recap}
              </p>
              {selectedWorkout.suggestion && (
                <p className="text-xs text-[#6E6E73] pt-2 border-t border-black/[0.04]">
                  Tip: {selectedWorkout.suggestion}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedWorkout(null)}
              className="w-full py-3 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
