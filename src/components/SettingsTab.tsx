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
    <h2 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide px-2">{title}</h2>
    <div className="bg-[#F5F5F7] rounded-[24px] divide-y divide-black/[0.05] overflow-hidden">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; hint?: string; children?: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="p-5 flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#1D1D1F]">{label}</p>
      {hint && <p className="text-xs text-[#6E6E73] mt-0.5">{hint}</p>}
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
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F]">Settings</h1>
    </div>

    <Section title="Demo">
      <div className="p-5 flex items-center gap-4">
        <div className="w-12 h-14 rounded-xl overflow-hidden bg-[#D2D2D7] shrink-0">
          {thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1D1D1F]">Following Person {personId}</p>
          <p className="text-xs text-[#6E6E73]">{clipTitle} clip</p>
        </div>
        <button
          onClick={onChangeSelection}
          className="px-4 py-2 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-xs font-semibold cursor-pointer"
        >
          Change
        </button>
      </div>
      <Link to="/gyms" className="p-5 flex items-center justify-between gap-4 hover:bg-black/[0.02]">
        <div>
          <p className="text-sm font-semibold text-[#1D1D1F]">Gym operator demo</p>
          <p className="text-xs text-[#6E6E73] mt-0.5">The same cameras, from the gym's side.</p>
        </div>
        <ArrowRight className="w-4 h-4 text-[#6E6E73]" />
      </Link>
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
                settings.bodyModel === model ? 'bg-[#1D1D1F] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
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
                settings.overlayMode === mode ? 'bg-[#1D1D1F] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
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
            settings.repSound ? 'bg-[#34C759]' : 'bg-[#D2D2D7]'
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
        <ShieldCheck className="w-5 h-5 text-[#34C759] shrink-0 mt-0.5" />
        <div className="text-sm text-[#1D1D1F] leading-relaxed flex flex-col gap-2">
          <p>The video stays inside the gym. Faces are pixelated, and everyone except you is blurred head to toe.</p>
          <p className="text-[#6E6E73]">
            To name an exercise, Spottr sends Gemini one small, blurred image per set: three frames of a single rep, cropped
            around you.
          </p>
        </div>
      </div>
    </Section>

    <Section title="Profile">
      <Row label="Name">
        <span className="text-sm text-[#6E6E73]">{MEMBER_PROFILE.name}</span>
      </Row>
      <Row label="Gym">
        <span className="text-sm text-[#6E6E73]">{MEMBER_PROFILE.gymName}</span>
      </Row>
    </Section>
  </div>
);
