import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Award, Flame, Calendar, Dumbbell } from 'lucide-react';
import {
  EXERCISE_PROGRESS_DATA,
  MEMBER_PROFILE,
  PERSONAL_BESTS,
} from '../mocks/memberData';

export const ProgressTab: React.FC = () => {
  const [selectedExercise, setSelectedExercise] = useState<'squat' | 'bench-press' | 'bicep-curl'>('squat');

  const exerciseOptions = [
    { id: 'squat' as const, label: 'Squat' },
    { id: 'bench-press' as const, label: 'Bench press' },
    { id: 'bicep-curl' as const, label: 'Bicep curl' },
  ];

  const chartData = EXERCISE_PROGRESS_DATA[selectedExercise] || [];

  return (
    <div className="flex flex-col gap-10 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F]">
          Progress
        </h1>
        <p className="text-base text-[#6E6E73] mt-2">
          Tracking your repetition volume and strength consistency.
        </p>
      </div>

      {/* Top Stats Trio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#F5F5F7] rounded-[24px] p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-[#6E6E73]">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Workouts this month
            </span>
            <Calendar className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F]">
              {MEMBER_PROFILE.workoutsThisMonth}
            </p>
            <p className="text-xs text-[#6E6E73] mt-1">4 sessions per week avg</p>
          </div>
        </div>

        <div className="bg-[#F5F5F7] rounded-[24px] p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-[#6E6E73]">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Current streak
            </span>
            <Flame className="w-4 h-4 text-[#34C759] stroke-[1.75]" />
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-[#34C759]">
              {MEMBER_PROFILE.currentStreakDays}
              <span className="text-lg font-normal text-[#6E6E73] ml-1">days</span>
            </p>
            <p className="text-xs text-[#6E6E73] mt-1">Active routine</p>
          </div>
        </div>

        <div className="bg-[#F5F5F7] rounded-[24px] p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-[#6E6E73]">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Total reps this month
            </span>
            <Dumbbell className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F]">
              {MEMBER_PROFILE.totalRepsThisMonth}
            </p>
            <p className="text-xs text-[#6E6E73] mt-1">+14% vs August</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
              Volume trend
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
              Reps per session
            </h3>
          </div>

          {/* Exercise Switcher */}
          <div className="flex items-center p-1 bg-white rounded-full shadow-xs self-start sm:self-auto">
            {exerciseOptions.map((opt) => {
              const isSelected = selectedExercise === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedExercise(opt.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1D1D1F] text-white'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Line Chart */}
        <div className="h-64 sm:h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis
                dataKey="date"
                stroke="#6E6E73"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#6E6E73"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 4', 'dataMax + 4']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white rounded-xl p-3 shadow-lg border border-black/[0.04]">
                        <p className="text-xs text-[#6E6E73]">{data.date}</p>
                        <p className="text-sm font-bold text-[#1D1D1F] mt-0.5">
                          {data.reps} reps
                        </p>
                        <p className="text-[11px] text-[#34C759] font-medium">
                          {data.label}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="reps"
                stroke="#34C759"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: '#FFFFFF',
                  stroke: '#34C759',
                  strokeWidth: 2.5,
                }}
                activeDot={{
                  r: 7,
                  fill: '#34C759',
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Personal Bests Section */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Award className="w-5 h-5 text-[#34C759] stroke-[1.75]" />
          <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
            Personal bests
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PERSONAL_BESTS.map((pb, idx) => (
            <div
              key={idx}
              className="bg-[#F5F5F7] rounded-[24px] p-6 flex flex-col justify-between gap-4"
            >
              <div>
                <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
                  {pb.date}
                </span>
                <h4 className="text-base font-semibold text-[#1D1D1F] mt-1">
                  {pb.exercise}
                </h4>
              </div>

              <div>
                <p className="text-3xl font-bold tracking-tight text-[#34C759]">
                  {pb.value}
                </p>
                <p className="text-xs text-[#6E6E73] mt-1 leading-relaxed">
                  {pb.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
