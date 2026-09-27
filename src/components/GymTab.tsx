import React from 'react';
import { Building2, CheckCircle2, Clock } from 'lucide-react';
import { GYM_OCCUPANCY, MEMBER_PROFILE } from '../mocks/memberData';

export const GymTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-10 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pt-4">
        <p className="text-sm font-medium text-[#6E6E73] tracking-wide mb-1">
          {MEMBER_PROFILE.gymName}
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F]">
          Gym activity
        </h1>
        <p className="text-base text-[#6E6E73] mt-2">
          Real-time floor occupancy and equipment availability from camera vision.
        </p>
      </div>

      {/* Hero Occupancy Card */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
              Current floor occupancy
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-5xl sm:text-6xl font-bold tracking-tight text-[#34C759]">
                {GYM_OCCUPANCY.current_percent}%
              </span>
              <span className="text-lg font-semibold text-[#1D1D1F]">
                {GYM_OCCUPANCY.status_label}
              </span>
            </div>
          </div>
          <p className="text-xs text-[#6E6E73]">
            Updated 2 minutes ago
          </p>
        </div>

        {/* Hourly Traffic Bar Chart */}
        <div className="pt-4 border-t border-black/[0.05]">
          <div className="flex items-center gap-1.5 mb-4 text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
            <Clock className="w-3.5 h-3.5" />
            <span>Usually busy at</span>
          </div>

          <div className="flex items-end gap-1.5 sm:gap-2 h-36 pt-4">
            {GYM_OCCUPANCY.hourly_traffic.map((item, idx) => {
              const isNow = item.is_now;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                >
                  <div
                    className={`w-full rounded-md transition-all duration-300 ${
                      isNow ? 'bg-[#34C759]' : 'bg-[#E5E5EA] group-hover:bg-[#D1D1D6]'
                    }`}
                    style={{ height: `${item.percent}%` }}
                    title={`${item.hour}: ${item.percent}% capacity`}
                  />
                  <span
                    className={`text-[10px] truncate ${
                      isNow ? 'font-bold text-[#1D1D1F]' : 'text-[#6E6E73]'
                    }`}
                  >
                    {idx % 3 === 0 || isNow ? item.hour : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Equipment Zones Availability */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
            Zone availability
          </h3>
          <span className="text-xs font-medium text-[#6E6E73]">
            Live floor status
          </span>
        </div>

        <div className="bg-[#F5F5F7] rounded-[24px] divide-y divide-black/[0.04] overflow-hidden">
          {GYM_OCCUPANCY.zones.map((zone) => {
            const isAvailable = zone.status === 'available';
            return (
              <div
                key={zone.id}
                className="p-5 sm:p-6 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-base font-semibold text-[#1D1D1F]">
                    {zone.name}
                  </h4>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    {zone.status_text}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAvailable ? 'bg-[#34C759]' : 'bg-[#FF9500]'
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isAvailable ? 'text-[#34C759]' : 'text-[#1D1D1F]'
                    }`}
                  >
                    {isAvailable ? 'Open' : 'Moderate'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
