import React from 'react';
import { LayoutDashboard, Smartphone } from 'lucide-react';
import { Link } from '../router';
import { IconDot, OpenArrow, TILE_TONES } from '../components/Tile';
import { PageHeader } from '../gyms/components/ui';
import { MEMBER_PROFILE } from '../mocks/memberData';

const DEMOS = [
  { to: '/demo', icon: Smartphone, label: 'Member app', title: `Be ${MEMBER_PROFILE.name} for a minute`, tone: 'lime' as const },
  { to: '/gyms/overview', icon: LayoutDashboard, label: 'Gym dashboard', title: 'Run the demo gym', tone: 'blue' as const },
];

/** The two full demos side by side: the member app and the gym dashboard. */
export const DemoCards: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {DEMOS.map((d) => (
      <Link key={d.to} to={d.to} className={`group p-6 flex flex-col min-h-[180px] ${TILE_TONES[d.tone]}`}>
        <span className="flex items-start justify-between text-ink">
          <IconDot icon={d.icon} tone={d.tone} />
          <OpenArrow />
        </span>
        <span className="mt-auto pt-6 text-sm font-medium text-ink-2">{d.label}</span>
        <span className="font-display text-2xl leading-tight text-ink mt-1">{d.title}</span>
      </Link>
    ))}
  </div>
);

/** "/demos": the link to send someone so they pick a side straight away. */
export const Demos: React.FC = () => (
  <div className="flex flex-col gap-8 pb-16">
    <PageHeader
      title="Pick a demo"
      subtitle="See what a gym-goer gets in their app, or what a gym owner sees on the dashboard. Both run on demo data."
    />
    <DemoCards />
  </div>
);
