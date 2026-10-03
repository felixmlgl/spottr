import React, { useState } from 'react';
import { ChevronDown, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { BodyMap } from './BodyMap';
import { WeeklyPlan } from './WeeklyPlan';
import { calculateMuscleRecovery } from '../services/recovery';
import { TrainingPlan, MuscleId } from '../types/schema';

interface RecoveryTabProps {
  plan: TrainingPlan;
  onUpdatePlan: (updatedPlan: TrainingPlan) => void;
  /** Muscle load of today's tracked session */
  todayLoad?: Partial<Record<MuscleId, number>>;
}

export const RecoveryTab: React.FC<RecoveryTabProps> = ({ plan, onUpdatePlan, todayLoad }) => {
  const [showDetails, setShowDetails] = useState(false);
  const recoveryData = calculateMuscleRecovery(plan, todayLoad);

  const colorMap: Partial<Record<MuscleId, string>> = {};
  const valuesMap: Partial<Record<MuscleId, number>> = {};
  Object.values(recoveryData.muscles).forEach((item) => {
    valuesMap[item.muscle_id] = item.recovery_percent / 100;
    if (item.recovery_percent < 25) colorMap[item.muscle_id] = '#FF3B30';
    else if (item.status === 'fatigued') colorMap[item.muscle_id] = '#FF9500';
    else if (item.status === 'recovering') colorMap[item.muscle_id] = '#FFCC00';
    else colorMap[item.muscle_id] = '#34C759';
  });

  const tomorrow = plan.days.mon;

  return (
    <div className="flex flex-col gap-8 pb-16 animate-in fade-in duration-200">
      <div className="pt-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F]">Recovery</h1>
        <p className="text-base text-[#6E6E73] mt-2">What's ready to train, and what's next on your plan.</p>
      </div>

      {/* Ready to train */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-6 items-center">
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#34C759]" />
                Readiness
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] mt-1">
                {recoveryData.recommendation.headline}
              </h2>
              <p className="text-base text-[#6E6E73] mt-2 leading-relaxed">{recoveryData.recommendation.details}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {recoveryData.readyList.map((m) => (
                <span
                  key={m.muscle_id}
                  className="px-3 py-1.5 rounded-full bg-white text-xs font-medium text-[#1D1D1F] shadow-2xs flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                  {m.name}
                </span>
              ))}
              {recoveryData.recoveringList.map((m) => (
                <span
                  key={m.muscle_id}
                  className="px-3 py-1.5 rounded-full bg-white text-xs font-medium text-[#6E6E73] shadow-2xs flex items-center gap-1.5"
                >
                  <span className={`w-2 h-2 rounded-full ${m.status === 'fatigued' ? 'bg-[#FF9500]' : 'bg-[#FFCC00]'}`} />
                  {m.name}
                </span>
              ))}
            </div>
          </div>

          <BodyMap
            values={valuesMap}
            colorMap={colorMap}
            mode="recovery"
            size="md"
            getTooltipText={(muscleId) => {
              const item = recoveryData.muscles[muscleId];
              if (!item) return '';
              if (item.status === 'ready') return 'Ready to train';
              return `${item.recovery_percent}% (${item.hours_remaining}h left)`;
            }}
          />
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-black/[0.05]">
          <button
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1D1D1F] cursor-pointer"
          >
            {showDetails ? 'Hide details' : 'Details'}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                Ready ({recoveryData.readyList.length})
              </h3>
              <p className="text-xs text-[#6E6E73]">{recoveryData.readyList.map((m) => m.name).join(', ') || 'None yet'}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 flex flex-col gap-1">
              <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#FF9500]" />
                Still recovering ({recoveryData.recoveringList.length})
              </h3>
              {recoveryData.recoveringList.map((m) => (
                <div key={m.muscle_id} className="py-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1D1D1F]">{m.name}</span>
                  <span className="text-[#6E6E73]">
                    {m.recovery_percent}% · ~{m.hours_remaining}h left
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Up next */}
      <div className="bg-[#F5F5F7] rounded-[22px] p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-2xs shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
        </div>
        <div>
          <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
            Up next · Tomorrow ({tomorrow.day_label})
          </span>
          <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F]">
            {tomorrow.is_rest
              ? 'Rest day'
              : `${tomorrow.title} · ${tomorrow.exercises.length} exercise${tomorrow.exercises.length === 1 ? '' : 's'}`}
          </h3>
        </div>
      </div>

      <WeeklyPlan plan={plan} onUpdatePlan={onUpdatePlan} />

      <p className="text-xs text-[#86868B] text-center">Recovery estimates are simplified and not medical advice.</p>
    </div>
  );
};
