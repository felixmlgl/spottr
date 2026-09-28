import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Link } from '../../router';
import { useToast } from '../components/Toast';
import { Card, PageHeader } from '../components/ui';

const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white text-sm text-[#1D1D1F] placeholder:text-[#A1A1A6] ring-1 ring-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#34C759] transition-shadow';

const Field: React.FC<{ label: string; children: React.ReactNode; optional?: boolean }> = ({ label, children, optional }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold text-[#6E6E73]">
      {label}
      {optional && <span className="font-normal"> (optional)</span>}
    </span>
    {children}
  </label>
);

export const RequestPilot: React.FC = () => {
  const toast = useToast();
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get('name') || '').trim();
    setSubmittedName(name);
    toast('Pilot request received');
  };

  return (
    <div className="flex flex-col gap-8 pb-16 max-w-2xl">
      <PageHeader
        title="Request a pilot"
        subtitle="We're starting with a small group of gyms in the Bay Area. Tell us about yours."
      />

      {submittedName !== null ? (
        <Card className="flex flex-col items-start gap-4">
          <CheckCircle2 className="w-8 h-8 text-[#34C759]" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
              Thanks{submittedName ? `, ${submittedName.split(' ')[0]}` : ''}.
            </h2>
            <p className="text-sm text-[#6E6E73] mt-1.5 leading-relaxed">
              Your pilot request is in. Next up is a short call to look at your floor and camera setup.
            </p>
            <p className="text-xs text-[#6E6E73] mt-3">Demo mode: this form doesn't send anything.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/gyms/overview"
              className="px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-sm font-semibold hover:bg-black transition-colors"
            >
              Back to the demo
            </Link>
            <button
              onClick={() => setSubmittedName(null)}
              className="px-4 py-2 rounded-full bg-white text-[#1D1D1F] text-sm font-medium hover:bg-[#E8E8ED] transition-colors cursor-pointer"
            >
              Submit another
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your name">
                <input name="name" required autoComplete="name" className={inputClass} placeholder="Jordan Lee" />
              </Field>
              <Field label="Work email">
                <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="jordan@yourgym.com" />
              </Field>
              <Field label="Gym name">
                <input name="gym" required autoComplete="organization" className={inputClass} placeholder="Iron District Fitness" />
              </Field>
              <Field label="City">
                <input name="city" required className={inputClass} placeholder="Oakland" />
              </Field>
              <Field label="Number of locations">
                <select name="locations" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Select…
                  </option>
                  <option>1</option>
                  <option>2–5</option>
                  <option>6–20</option>
                  <option>20+</option>
                </select>
              </Field>
              <Field label="Active members per location">
                <select name="members" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Select…
                  </option>
                  <option>Under 500</option>
                  <option>500–1,500</option>
                  <option>1,500–5,000</option>
                  <option>5,000+</option>
                </select>
              </Field>
            </div>
            <Field label="Anything we should know?" optional>
              <textarea
                name="notes"
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Camera setup, goals, timeline…"
              />
            </Field>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#6E6E73]">Demo mode: nothing is sent.</p>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-[#34C759] text-white text-sm font-semibold hover:bg-[#2DB14F] transition-colors cursor-pointer"
              >
                Request pilot
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
