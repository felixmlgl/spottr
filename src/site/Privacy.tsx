import React, { useEffect } from 'react';
import { Check, Clock } from 'lucide-react';
import { openRequestDemo } from '../requestDemo/RequestDemo';
import { PRIVACY_ANCHOR } from '../waitlist/Waitlist';
import { Card, PageHeader } from '../gyms/components/ui';
import { Disclosure } from '../components/Disclosure';

interface PrivacyItem {
  title: string;
  /** One line shown on the card; `body` then opens under "Details". Without it, `body` is shown as is. */
  summary?: string;
  body: string;
}

// Only list something under "Available today" if the current build actually does it.
// Blur claims mirror src/services/privacyBlur.ts (replay) and backend/vision/classify.py (snapshots, thumbnails).
export const AVAILABLE_TODAY: PrivacyItem[] = [
  {
    title: 'No face recognition',
    summary: 'Reps and sets come from body pose, not faces.',
    body: 'Spottr follows body pose (joint positions) to count reps and sets. It does not identify people by their face.',
  },
  {
    title: 'Workouts come from pose data',
    summary: 'No sensors on equipment and nothing for members to wear.',
    body: 'Sets, reps and zone occupancy are computed from body keypoints over time. There are no sensors on equipment and nothing for members to wear.',
  },
  {
    title: 'Gym staff see aggregates',
    summary: 'Counts and trends; slipping members by first name only.',
    body: 'The gym dashboard shows counts, trends and zone occupancy. The list of slipping members shows a first name and member number only, with no photos or video.',
  },
  {
    title: 'Bystanders pixelated in the replay',
    summary: 'Everyone except the selected member is pixelated.',
    body: 'In the member app\u2019s session replay, everyone except the selected member is pixelated head to toe as the video is drawn on screen. The selected member is shown unblurred.',
  },
  {
    title: 'Blurred snapshots for exercise labels',
    summary: 'Gemini gets one small image per set with faces pixelated, never video.',
    body: 'To label an exercise, the pipeline sends Google Gemini one small image per set: three frames of one rep, cropped around the lifter, with the lifter\u2019s face pixelated and everyone else pixelated head to toe. Member thumbnails get the same blur.',
  },
  {
    title: 'AI recaps use a text summary',
    summary: 'Recaps are written from exercise names and rep counts, not video.',
    body: "Optional workout recaps in the member app are written by Google's Gemini API from a short text summary (exercise names, rep counts, duration), not from video.",
  },
];

const IN_DEVELOPMENT: PrivacyItem[] = [
  {
    title: 'All processing on the Spottr box',
    body: 'The goal is that raw video never leaves the gym. Today\u2019s pipeline runs on recorded clips rather than a live camera stream.',
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

// Known gaps in today's blurring (see backend/README.md "Known limitations")
export const BLUR_LIMITS = [
  'Blurring only covers people the pose model detects. Someone hidden behind equipment, or missed for more than half a second, stays visible.',
  'In the replay, the blur is applied while drawing. The video file itself is not blurred.',
  'The annotated review video the pipeline can export is not blurred.',
];

// The members' waitlist: mirrors api/join-waitlist.ts, api/waitlist-link.ts, api/waitlist-gyms.ts and db/waitlist.sql
const WAITLIST: PrivacyItem[] = [
  {
    title: 'What we store',
    body: 'The gym and city you name, your first name and email, whether you ticked the box about your name, when you signed up and which page or link you came from.',
  },
  {
    title: 'What your gym hears',
    body: 'How many of its members asked. Your first name only if you ticked the box. We don\u2019t give gyms the list or your email.',
  },
  {
    title: 'What other visitors see',
    body: 'While typing their gym, people see gyms that have confirmed members, and how many once there are at least 3. Never names or emails.',
  },
  {
    title: 'What we use your email for',
    body: 'To send you a link that confirms your sign-up (the same email has a link to remove it), and later to tell you when Spottr is at your gym.',
  },
  {
    title: 'Where it\u2019s kept, and removal',
    body: 'In a Postgres database hosted by Neon in the US (Washington, D.C.); emails go out through Resend. The link in our email deletes your sign-up, or write to info@tryspottr.app.',
  },
];

const Section: React.FC<{ status: 'available' | 'development'; items: PrivacyItem[] }> = ({ status, items }) => {
  const available = status === 'available';
  const Icon = available ? Check : Clock;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center ${
            available ? 'bg-lime text-ink' : 'bg-white text-ink-2 ring-1 ring-black/[0.06]'
          }`}
        >
          <Icon className="w-4 h-4 stroke-[2.25]" aria-hidden />
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          {available ? 'Available today' : 'In development'}
        </h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <li key={item.title}>
            <Card className="h-full flex flex-col gap-2 !p-6">
              <h3 className="text-base font-semibold text-ink">{item.title}</h3>
              <p className="text-sm text-ink-2 leading-relaxed">{item.summary ?? item.body}</p>
              {item.summary && (
                <Disclosure className="mt-1">
                  <p className="text-sm text-ink-2 leading-relaxed">{item.body}</p>
                </Disclosure>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
};

const WaitlistSection: React.FC = () => {
  // The waitlist popup links here; the page loads lazily, so the browser can't jump to the section on its own
  useEffect(() => {
    if (window.location.hash === `#${PRIVACY_ANCHOR}`) document.getElementById(PRIVACY_ANCHOR)?.scrollIntoView();
  }, []);

  return (
    <section id={PRIVACY_ANCHOR} className="scroll-mt-24 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Waitlist for members</h2>
        <p className="text-sm text-ink-2 max-w-3xl">
          Members can ask for Spottr at the gym they train at. This is what happens with those sign-ups.
        </p>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WAITLIST.map((item) => (
          <li key={item.title}>
            <Card className="h-full flex flex-col gap-2 !p-6">
              <h3 className="text-base font-semibold text-ink">{item.title}</h3>
              <p className="text-sm text-ink-2 leading-relaxed">{item.body}</p>
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
      subtitle="What Spottr does today, and what's still being built. Updated as features ship."
    />
    <Section status="available" items={AVAILABLE_TODAY} />
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold tracking-tight text-ink">Limits of today&rsquo;s blurring</h2>
      <ul className="flex flex-col gap-2 list-disc pl-5 text-sm text-ink-2 leading-relaxed max-w-3xl">
        {BLUR_LIMITS.map((limit) => (
          <li key={limit}>{limit}</li>
        ))}
      </ul>
    </section>
    <Section status="development" items={IN_DEVELOPMENT} />
    <WaitlistSection />
    <p className="text-sm text-ink-2">
      Questions about data handling for your gym?{' '}
      <button type="button" onClick={() => openRequestDemo()} className="font-medium text-accent-ink hover:text-ink cursor-pointer">
        Request a demo
      </button>{' '}
      and we'll walk you through it.
    </p>
  </div>
);
