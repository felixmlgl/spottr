import React from 'react';
import { LayoutDashboard, LucideIcon, Smartphone } from 'lucide-react';
import { Link } from '../router';
import { IconDot, OpenArrow, TILE_TONES, TileTone } from '../components/Tile';
import { PageHeader } from '../gyms/components/ui';
import { MEMBER_PROFILE } from '../mocks/memberData';

type Demo = { to: string; icon: LucideIcon; label: string; title: string; text?: string; tone: TileTone };

// At the end of the landing story, where the reader has already met Felix and the demo gym
const LANDING_DEMOS: Demo[] = [
  { to: '/demo', icon: Smartphone, label: 'Member app', title: `Be ${MEMBER_PROFILE.name} for a minute`, tone: 'lime' },
  { to: '/gyms/overview', icon: LayoutDashboard, label: 'Gym dashboard', title: 'Run the demo gym', tone: 'blue' },
];

// On "/demos", for someone who lands there straight from a shared link
const STANDALONE_DEMOS: Demo[] = [
  {
    to: '/demo',
    icon: Smartphone,
    label: 'For gym-goers',
    title: 'The member app',
    text: 'A workout the cameras logged on their own: reps, sets, the muscles worked and what to train next.',
    tone: 'lime',
  },
  {
    to: '/gyms/overview',
    icon: LayoutDashboard,
    label: 'For gym owners',
    title: 'The gym dashboard',
    text: 'How full the floor is, which zones members queue for, and who is about to stop showing up.',
    tone: 'blue',
  },
];

/** The two full demos side by side: the member app and the gym dashboard. */
export const DemoCards: React.FC<{ demos?: Demo[] }> = ({ demos = LANDING_DEMOS }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {demos.map((d) => (
      <Link key={d.to} to={d.to} className={`group p-6 flex flex-col min-h-[180px] ${TILE_TONES[d.tone]}`}>
        <span className="flex items-start justify-between text-ink">
          <IconDot icon={d.icon} tone={d.tone} />
          <OpenArrow />
        </span>
        <span className="mt-auto pt-6 text-sm font-medium text-ink-2">{d.label}</span>
        <span className="font-display text-2xl leading-tight text-ink mt-1">{d.title}</span>
        {d.text && <span className="text-[15px] text-ink-2 mt-2 max-w-sm">{d.text}</span>}
      </Link>
    ))}
  </div>
);

/** "/demos": the link to send someone so they pick a side straight away, without having seen the landing page. */
export const Demos: React.FC = () => (
  <div className="flex flex-col gap-8 pb-16">
    <PageHeader
      title="Try the Spottr demo"
      subtitle="Spottr turns the security cameras a gym already has into automatic workout tracking: nothing to wear, nothing to type. Pick the side you want to see. Both run on sample data."
    />
    <DemoCards demos={STANDALONE_DEMOS} />
  </div>
);
