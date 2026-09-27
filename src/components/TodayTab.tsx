import React from 'react';
import { Play, Sparkles, ArrowRight, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { MEMBER_PROFILE, PAST_WORKOUTS, GYM_OCCUPANCY } from '../mocks/memberData';
import { PastWorkout, TrainingPlan } from '../types/schema';
import { BodyMap } from './BodyMap';
import { computeSessionMuscleIntensities } from '../data/exerciseMuscles';

interface TodayTabProps {
  latestWorkout?: PastWorkout;
  plan?: TrainingPlan;
  onWatchReplay: () => void;
  onNavigateToPlan: () => void;
  aiRecap?: string;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  latestWorkout = PAST_WORKOUTS[0],
  plan,
  onWatchReplay,
  onNavigateToPlan,
  aiRecap,
}) => {
  const recapText = aiRecap || latestWorkout.recap;

  // Compute muscle intensities for today's session (prefer real vision pipeline muscle_load if available)
  const muscleIntensities =
    latestWorkout.muscle_load && Object.keys(latestWorkout.muscle_load).length > 0
      ? latestWorkout.muscle_load
      : computeSessionMuscleIntensities(latestWorkout.exercises);

  // Determine tomorrow's planned workout
  const tomorrowWorkout = plan?.days.mon || {
    title: 'Pull day',
    day_label: 'Monday',
    is_rest: false,
    exercises: [],
  };

  return (
    <div className="flex flex-col gap-10 pb-16 animate-in fade-in duration-200">
      {/* Header Greeting */}
      <div className="pt-4">
        <p className="text-sm font-medium text-[#6E6E73] tracking-wide mb-1">
          {MEMBER_PROFILE.gymName}
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#1D1D1F] leading-[1.08]">
          Good afternoon, {MEMBER_PROFILE.name}
        </h1>
        <p className="text-base text-[#6E6E73] mt-2">
          Your workout was automatically recorded by the gym cameras.
        </p>
      </div>

      {/* "Up next: Pull day – tomorrow" Card linked to the plan */}
      <button
        onClick={onNavigateToPlan}
        className="w-full text-left bg-[#F5F5F7] hover:bg-[#EBEBEF] rounded-[22px] p-5 flex items-center justify-between gap-4 transition-all cursor-pointer group shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#34C759] shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
              Up next &bull; Tomorrow ({tomorrowWorkout.day_label || 'Monday'})
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] group-hover:text-[#34C759] transition-colors">
              {tomorrowWorkout.is_rest ? 'Rest day' : `${tomorrowWorkout.title} session`}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] group-hover:text-[#34C759] transition-colors">
          <span>View plan</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>

      {/* Hero Card for Latest Session */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col justify-between gap-8 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] tracking-wide uppercase">
              Latest session
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
              {latestWorkout.display_date}
            </h2>
          </div>

          <button
            onClick={onWatchReplay}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-sm font-medium transition-transform duration-150 active:scale-95 cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch session replay</span>
          </button>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-black/[0.05]">
          <div>
            <p className="text-xs sm:text-sm text-[#6E6E73]">Total reps</p>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-[#34C759] mt-1">
              {latestWorkout.total_reps}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-[#6E6E73]">Duration</p>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] mt-1">
              {latestWorkout.duration_minutes}
              <span className="text-lg sm:text-xl font-normal text-[#6E6E73] ml-1">min</span>
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-[#6E6E73]">Exercises</p>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] mt-1">
              {latestWorkout.exercises.length}
            </p>
          </div>
        </div>
      </div>

      {/* Exercises Done Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
            Exercises recorded
          </h3>
          <span className="text-xs font-medium text-[#6E6E73]">
            {latestWorkout.exercises.length} movements detected
          </span>
        </div>

        <div className="bg-[#F5F5F7] rounded-[24px] divide-y divide-black/[0.04] overflow-hidden">
          {latestWorkout.exercises.map((exercise, idx) => {
            const maxReps = Math.max(...exercise.reps_per_set, 1);
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/[0.01] transition-colors"
              >
                <div>
                  <h4 className="text-base font-semibold text-[#1D1D1F]">
                    {exercise.name}
                  </h4>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    {exercise.sets} sets &bull; {exercise.total_reps} total reps
                  </p>
                </div>

                {/* Sets sparkline / mini bars */}
                <div className="flex items-center gap-3">
                  <div className="flex items-end gap-1.5 h-8">
                    {exercise.reps_per_set.map((reps, sIdx) => {
                      const heightPercent = Math.round((reps / maxReps) * 100);
                      return (
                        <div
                          key={sIdx}
                          className="flex flex-col items-center gap-1 group relative"
                        >
                          <div
                            className="w-3 bg-[#34C759] rounded-sm transition-all duration-200"
                            style={{ height: `${Math.max(20, heightPercent)}%` }}
                          />
                          <span className="text-[10px] text-[#6E6E73]">
                            {reps}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-right min-w-[70px] pl-3 border-l border-black/[0.05]">
                    <span className="text-xs text-[#6E6E73] block">Sets &times; Reps</span>
                    <span className="text-sm font-semibold text-[#1D1D1F]">
                      {exercise.sets}&times;{Math.round(exercise.total_reps / exercise.sets)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature 2: Muscle Map: "Muscles trained today" */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
              Targeted muscle groups
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
              Muscles trained today
            </h3>
          </div>
          <span className="text-xs text-[#34C759] font-medium">
            Quads &bull; Glutes &bull; Hamstrings
          </span>
        </div>

        <div className="w-full py-2">
          <BodyMap values={muscleIntensities} mode="intensity" size="md" />
        </div>
      </div>

      {/* AI Recap Card */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#6E6E73] tracking-wide uppercase">
          <Sparkles className="w-4 h-4 text-[#34C759]" />
          <span>Smart workout recap</span>
        </div>

        <p className="text-base sm:text-lg text-[#1D1D1F] leading-relaxed font-normal">
          {recapText}
        </p>

        {latestWorkout.suggestion && (
          <div className="pt-3 border-t border-black/[0.06] mt-1">
            <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
              For next session
            </p>
            <p className="text-sm text-[#1D1D1F] mt-1 font-medium">
              {latestWorkout.suggestion}
            </p>
          </div>
        )}
      </div>

      {/* Compact "Gym right now" Card (Relocated from former Gym Tab) */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Gym right now</span>
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[#34C759]">
                {GYM_OCCUPANCY.current_percent}%
              </span>
              <span className="text-base font-semibold text-[#1D1D1F]">
                {GYM_OCCUPANCY.status_label}
              </span>
            </div>
          </div>
          <span className="text-xs text-[#6E6E73]">
            {MEMBER_PROFILE.gymName}
          </span>
        </div>

        {/* Compact Zone Status Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/[0.05]">
          {GYM_OCCUPANCY.zones.map((zone) => {
            const isAvail = zone.status === 'available';
            return (
              <div
                key={zone.id}
                className="bg-white rounded-xl p-3.5 flex items-center justify-between shadow-2xs"
              >
                <div>
                  <h4 className="text-xs font-semibold text-[#1D1D1F]">
                    {zone.name}
                  </h4>
                  <p className="text-[11px] text-[#6E6E73] mt-0.5">
                    {zone.status_text}
                  </p>
                </div>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAvail ? 'bg-[#34C759]' : 'bg-[#FF9500]'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
