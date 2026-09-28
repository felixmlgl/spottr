import React from 'react';
import { Check, Clock } from 'lucide-react';
import { Link } from '../../router';
import { Card, PageHeader } from '../components/ui';

interface PrivacyItem {
  title: string;
  body: string;
}

// Only list something under "Available today" if the current build actually does it.
const AVAILABLE_TODAY: PrivacyItem[] = [
  {
    title: 'No face recognition',
    body: 'Spottr follows body pose (joint positions) to count reps and sets. It does not identify people by their face.',
  },
  {
    title: 'Workouts come from pose data',
    body: 'Sets, reps and zone occupancy are computed from body keypoints over time. There are no sensors on equipment and nothing for members to wear.',
  },
  {
    title: 'Operators see aggregates',
    body: 'The operator dashboard shows counts, trends and zone occupancy. The at-risk list shows a first name and member number only, with no photos or video.',
  },
  {
    title: 'AI recaps use a text summary',
    body: "Optional workout recaps in the member app are written by Google's Gemini API from a short text summary (exercise names, rep counts, duration), not from video.",
  },
];

const IN_DEVELOPMENT: PrivacyItem[] = [
  {
    title: 'All processing on the Spottr edge box',
    body: 'The goal is that raw video never leaves the gym. Today’s prototype runs on recorded clips, and exercise labels come from a cloud model (Google Gemini).',
  },
  {
    title: 'Member opt-in and opt-out',
    body: 'Members choose whether their workouts are linked to their account, and can switch it off at any time.',
  },
  {
    title: 'Data retention windows',
    body: 'Fixed retention periods for pose data and workout logs, with automatic deletion.',
  },
  {
    title: 'Export and deletion requests',
    body: 'Self-serve export and deletion of a member’s data from the member app.',
  },
];

const Section: React.FC<{ status: 'available' | 'development'; items: PrivacyItem[] }> = ({ status, items }) => {
  const available = status === 'available';
  const Icon = available ? Check : Clock;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
          {available ? 'Available today' : 'In development'}
        </h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <li key={item.title}>
            <Card className="h-full flex flex-col gap-3 !p-6">
              <span
                className={`self-start inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  available ? 'bg-[#34C759]/15 text-[#1E7A35]' : 'bg-white text-[#6E6E73] ring-1 ring-black/[0.06]'
                }`}
              >
                <Icon className="w-3 h-3 stroke-[2.25]" />
                {available ? 'Available today' : 'In development'}
              </span>
              <h3 className="text-base font-semibold text-[#1D1D1F]">{item.title}</h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">{item.body}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const Privacy: React.FC = () => (
  <div className="flex flex-col gap-12 pb-16">
    <PageHeader
      title="Privacy"
      subtitle="Spottr is in its pilot phase. This page describes what the current build does and marks what is still being built. We update it as features ship."
    />
    <Section status="available" items={AVAILABLE_TODAY} />
    <Section status="development" items={IN_DEVELOPMENT} />
    <p className="text-sm text-[#6E6E73]">
      Questions about data handling for your gym?{' '}
      <Link to="/gyms/pilot" className="font-medium text-[#248A3D] hover:text-[#1D1D1F]">
        Request a pilot
      </Link>{' '}
      and we'll walk you through it.
    </p>
  </div>
);
