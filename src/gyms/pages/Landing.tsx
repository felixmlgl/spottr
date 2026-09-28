import React from 'react';
import { ArrowRight, BarChart3, Camera, ChevronRight, Cpu, Dumbbell, HeartHandshake, Sparkles } from 'lucide-react';
import { Link } from '../../router';
import { Card } from '../components/ui';

const BENEFITS = [
  {
    icon: HeartHandshake,
    title: 'Member retention',
    body: 'See who is drifting away weeks before they cancel, and reach out while it still matters.',
  },
  {
    icon: BarChart3,
    title: 'Equipment utilization',
    body: 'Know which racks members queue for and which machines sit idle, hour by hour.',
  },
  {
    icon: Sparkles,
    title: 'Premium member experience',
    body: 'Every set and rep logged automatically in the member app. No wearables, no manual tracking.',
  },
];

const STEPS = [
  {
    icon: Camera,
    title: 'Your existing cameras',
    body: 'Spottr works with the cameras already covering your floor. No new sensors on the equipment.',
  },
  {
    icon: Cpu,
    title: 'Spottr edge box',
    body: 'A small box on your network turns movement into sets, reps and zone occupancy.',
  },
  {
    icon: Dumbbell,
    title: 'Insights',
    body: 'Operators get dashboards and retention alerts. Members get their workouts logged automatically.',
  },
];

export const Landing: React.FC = () => (
  <div className="flex flex-col gap-20 pb-16">
    {/* Hero */}
    <section className="pt-10 sm:pt-16 text-center flex flex-col items-center">
      <span className="text-sm font-medium text-[#34C759] mb-4">Spottr for Gyms · Bay Area pilot</span>
      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1D1D1F] max-w-3xl leading-[1.05]">
        Turn your existing cameras into a retention engine
      </h1>
      <p className="text-lg sm:text-xl text-[#6E6E73] mt-5 max-w-2xl">
        Spottr shows you how your floor is really used and which members are slipping away. Your members get
        every workout logged automatically.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
        <Link
          to="/gyms/overview"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#34C759] text-white font-semibold hover:bg-[#2DB14F] transition-colors"
        >
          Explore the demo
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/gyms/pilot"
          className="inline-flex items-center gap-1 px-5 py-3 rounded-full text-[#1D1D1F] font-medium hover:bg-[#F5F5F7] transition-colors"
        >
          Request a pilot
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </section>

    {/* Benefits */}
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {BENEFITS.map(({ icon: Icon, title, body }) => (
        <Card key={title} className="flex flex-col gap-4">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#34C759] stroke-[1.75]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">{title}</h2>
            <p className="text-sm text-[#6E6E73] mt-1.5 leading-relaxed">{body}</p>
          </div>
        </Card>
      ))}
    </section>

    {/* How it works */}
    <section className="flex flex-col gap-8">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F]">How it works</h2>
        <p className="text-base text-[#6E6E73] mt-2">Three pieces. Nothing for your members to wear.</p>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <React.Fragment key={title}>
            <li className="bg-[#F5F5F7] rounded-[24px] p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">Step {i + 1}</span>
                <Icon className="w-5 h-5 text-[#1D1D1F] stroke-[1.75]" />
              </div>
              <h3 className="text-base font-semibold text-[#1D1D1F]">{title}</h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">{body}</p>
            </li>
            {i < STEPS.length - 1 && (
              <li aria-hidden className="hidden md:flex items-center justify-center text-[#D1D1D6]">
                <ArrowRight className="w-5 h-5" />
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
      <div className="text-center">
        <Link
          to="/gyms/overview"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1D1D1F] text-white font-semibold hover:bg-black transition-colors"
        >
          Explore the demo
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-[#6E6E73] mt-3">
          Walk through the operator dashboard for Iron District Fitness, Oakland (fictional gym, simulated data).
        </p>
      </div>
    </section>
  </div>
);
