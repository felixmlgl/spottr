import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { MEMBER_PROFILE } from '../mocks/memberData';
import { Link } from '../router';
import { AppSettings, BodyModel, OverlayMode } from '../services/settings';

interface SettingsTabProps {
  clipTitle: string;
  personId: string;
  thumbnail: string | null;
  settings: AppSettings;
  onChangeSettings: (patch: Partial<AppSettings>) => void;
  onChangeSelection: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-3">
    <h2 className="hud-label px-2">{title}</h2>
    <div className="panel divide-y divide-black/[0.05] overflow-hidden">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; hint?: string; children?: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="p-5 flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink">{label}</p>
      {hint && <p className="text-xs text-ink-2 mt-0.5">{hint}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const SettingsTab: React.FC<SettingsTabProps> = ({
  clipTitle,
  personId,
  thumbnail,
  settings,
  onChangeSettings,
  onChangeSelection,
}) => (
  <div className="flex flex-col gap-8 pb-16 max-w-2xl animate-in fade-in duration-200">
    <div className="pt-4">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">Settings</h1>
    </div>

    <Section title="Demo">
      <div className="p-5 flex items-center gap-4">
        <div className="w-12 h-14 rounded-xl overflow-hidden bg-line shrink-0">
          {thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Following Person {personId}</p>
          <p className="text-xs text-ink-2">{clipTitle} clip</p>
        </div>
        <button
          onClick={onChangeSelection}
          className="px-4 py-2 rounded-full bg-ink hover:bg-black text-white text-xs font-semibold cursor-pointer"
        >
          Change
        </button>
      </div>
      <Link to="/gyms" className="p-5 flex items-center justify-between gap-4 hover:bg-black/[0.02]">
        <div>
          <p className="text-sm font-semibold text-ink">Gym operator demo</p>
          <p className="text-xs text-ink-2 mt-0.5">A simulated demo gym, from the operator's side.</p>
        </div>
        <ArrowRight className="w-4 h-4 text-ink-2" />
      </Link>
    </Section>

    <Section title="Membership">
      <Row label="Spottr" hint="Free for you, through your gym. Your gym pays for Spottr, not you.">
        <span className="px-3 py-1 rounded-full bg-accent/12 text-xs font-semibold text-accent-ink">Free</span>
      </Row>
      <Row label="AI coach" hint="Coaching built on your logged workouts.">
        <span className="px-3 py-1 rounded-full bg-white text-xs font-semibold text-ink-2 ring-1 ring-black/[0.06] whitespace-nowrap">
          Premium · coming later
        </span>
      </Row>
    </Section>

    <Section title="Muscle maps">
      <Row label="Body model" hint="The figure used for muscles worked and recovery.">
        <div className="flex items-center p-1 bg-white rounded-full shadow-2xs" role="group" aria-label="Body model">
          {(['male', 'female'] as BodyModel[]).map((model) => (
            <button
              key={model}
              onClick={() => onChangeSettings({ bodyModel: model })}
              aria-pressed={settings.bodyModel === model}
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                settings.bodyModel === model ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {model === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </Row>
    </Section>

    <Section title="Replay">
      <Row label="Overlay style" hint="Raw draws the pipeline output as exported; Styled is a cleaner view.">
        <div className="flex items-center p-1 bg-white rounded-full shadow-2xs" role="group" aria-label="Overlay style">
          {(['styled', 'raw'] as OverlayMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeSettings({ overlayMode: mode })}
              aria-pressed={settings.overlayMode === mode}
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                settings.overlayMode === mode ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {mode === 'raw' ? 'Raw' : 'Styled'}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Rep sound" hint="A short chime each time a rep is counted.">
        <button
          role="switch"
          aria-checked={settings.repSound}
          aria-label="Rep sound"
          onClick={() => onChangeSettings({ repSound: !settings.repSound })}
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
            settings.repSound ? 'bg-accent' : 'bg-line'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              settings.repSound ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </Row>
    </Section>

    <Section title="Privacy">
      <div className="p-5 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="text-sm text-ink leading-relaxed flex flex-col gap-2">
          <p>In the replay, everyone the pose model detects except you is pixelated head to toe.</p>
          <p className="text-ink-2">
            To name an exercise, Spottr sends Gemini one small, blurred image per set: three frames of a single rep, cropped
            around you.
          </p>
        </div>
      </div>
    </Section>

    <Section title="Profile">
      <Row label="Name">
        <span className="text-sm text-ink-2">{MEMBER_PROFILE.name}</span>
      </Row>
      <Row label="Gym">
        <span className="text-sm text-ink-2">{MEMBER_PROFILE.gymName}</span>
      </Row>
    </Section>
  </div>
);
