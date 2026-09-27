import React from 'react';
import { BodyMap } from './BodyMap';
import { calculateMuscleRecovery } from '../services/recovery';
import { TrainingPlan, MuscleId } from '../types/schema';
import { CheckCircle2, Clock, Sparkles, AlertCircle } from 'lucide-react';

interface RecoveryTabProps {
  plan?: TrainingPlan;
}

export const RecoveryTab: React.FC<RecoveryTabProps> = ({ plan }) => {
  const recoveryData = calculateMuscleRecovery(plan);

  // Build colorMap for BodyMap in recovery mode
  const colorMap: Partial<Record<MuscleId, string>> = {};
  const valuesMap: Partial<Record<MuscleId, number>> = {};

  Object.values(recoveryData.muscles).forEach((item) => {
    valuesMap[item.muscle_id] = item.recovery_percent / 100;
    if (item.recovery_percent < 25) colorMap[item.muscle_id] = '#FF3B30';
    else if (item.status === 'fatigued') colorMap[item.muscle_id] = '#FF9500';
    else if (item.status === 'recovering') colorMap[item.muscle_id] = '#FFCC00';
    else colorMap[item.muscle_id] = '#34C759';
  });

  return (
    <div className="flex flex-col gap-10 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pt-4">
        <p className="text-sm font-medium text-[#6E6E73] tracking-wide mb-1">
          Muscle readiness
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F]">
          Recovery
        </h1>
        <p className="text-base text-[#6E6E73] mt-2">
          Biomechanical recovery modeled from camera-verified training sets.
        </p>
      </div>

      {/* Main Interactive Body Map Card */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col items-center gap-6">
        <div className="w-full flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
              Full body status
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
              Readiness map
            </h3>
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-3 text-xs text-[#6E6E73]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              <span>Ready</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]" />
              <span>Recovering</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500]" />
              <span>Fatigued</span>
            </span>
          </div>
        </div>

        {/* The BodyMap component */}
        <div className="w-full py-2">
          <BodyMap
            values={valuesMap}
            colorMap={colorMap}
            mode="recovery"
            size="lg"
            getTooltipText={(muscleId) => {
              const item = recoveryData.muscles[muscleId];
              if (!item) return '';
              if (item.status === 'ready') return 'Ready to train';
              return `${item.recovery_percent}% (${item.hours_remaining}h left)`;
            }}
          />
        </div>
      </div>

      {/* Plan-linked Recommendation Card */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
          <Sparkles className="w-4 h-4 text-[#34C759]" />
          <span>Smart recommendation</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F]">
          {recoveryData.recommendation.headline}
        </h3>
        <p className="text-base text-[#6E6E73] leading-relaxed">
          {recoveryData.recommendation.details}
        </p>
      </div>

      {/* Muscle Readiness Lists (Ready vs Still Recovering) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ready to train */}
        <div className="bg-[#F5F5F7] rounded-[24px] p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
              <span>Ready to train ({recoveryData.readyList.length})</span>
            </h3>
            <span className="text-xs text-[#6E6E73]">100% recovered</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {recoveryData.readyList.map((m) => (
              <span
                key={m.muscle_id}
                className="px-3 py-1.5 rounded-full bg-white text-xs font-medium text-[#1D1D1F] shadow-2xs flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                <span>{m.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Still recovering */}
        <div className="bg-[#F5F5F7] rounded-[24px] p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF9500]" />
              <span>Still recovering ({recoveryData.recoveringList.length})</span>
            </h3>
            <span className="text-xs text-[#6E6E73]">Resting</span>
          </div>

          <div className="divide-y divide-black/[0.04]">
            {recoveryData.recoveringList.map((m) => (
              <div key={m.muscle_id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      m.status === 'fatigued' ? 'bg-[#FF9500]' : 'bg-[#FFCC00]'
                    }`}
                  />
                  <span className="font-semibold text-[#1D1D1F]">{m.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[#6E6E73]">
                  <span>{m.recovery_percent}%</span>
                  <span className="font-medium text-[#1D1D1F]">
                    ~{m.hours_remaining}h left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footnote */}
      <p className="text-xs text-[#86868B] text-center pt-2">
        Recovery estimates are simplified and not medical advice.
      </p>
    </div>
  );
};
