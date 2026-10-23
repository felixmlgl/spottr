import React from 'react';
import { ChevronRight, Cpu, MapPin } from 'lucide-react';
import { Link } from '../../router';
import { CHAIN_LOCATIONS, ChainLocation, GYM } from '../../mocks/gym';
import { formatUsd, tierForMembers } from '../pricing';
import { Card, DemoBadge, Eyebrow, PageHeader, TrendChip } from '../components/ui';

const sum = (pick: (l: ChainLocation) => number) => CHAIN_LOCATIONS.reduce((s, l) => s + pick(l), 0);
const priceOf = (l: ChainLocation) => tierForMembers(l.members).price;
const pct = (v: number) => `${Math.round(v * 100)}%`;

const TOTALS = [
  { label: 'Members', value: sum((l) => l.members).toLocaleString('en-US') },
  { label: 'Visits this week', value: sum((l) => l.visitsThisWeek).toLocaleString('en-US') },
  { label: 'Slipping members', value: sum((l) => l.atRisk).toLocaleString('en-US') },
  { label: 'Spottr boxes', value: String(sum((l) => l.spottrBoxes)) },
];

const Stat: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-xs text-ink-2">{label}</dt>
    <dd className="text-xl font-bold tracking-tight text-ink tabular-nums mt-0.5">{children}</dd>
  </div>
);

const LocationCard: React.FC<{ location: ChainLocation }> = ({ location: l }) => {
  const atRiskShare = l.atRisk / l.members;
  const highestRisk = Math.max(...CHAIN_LOCATIONS.map((x) => x.atRisk / x.members));
  return (
    <Card className="flex flex-col gap-5 !p-6">
      <div className="flex flex-col items-start gap-2">
        <div>
          <p className="text-xs text-ink-2 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" aria-hidden />
            {GYM.name}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-ink mt-0.5">{l.city}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[11px] font-semibold text-ink ring-1 ring-black/[0.06] whitespace-nowrap">
          <Cpu className="w-3.5 h-3.5 text-accent" aria-hidden />
          {l.spottrBoxes} Spottr box{l.spottrBoxes > 1 ? 'es' : ''} · {l.cameras} cameras
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <Stat label="Members">{l.members.toLocaleString('en-US')}</Stat>
        <div>
          <Stat label="Visits this week">{l.visitsThisWeek.toLocaleString('en-US')}</Stat>
          <TrendChip value={l.visitsThisWeek} previous={l.visitsLastWeek} comparison="vs. last week" />
        </div>
        <Stat label="Visits per member">
          {l.sessionsPerMember.toFixed(1)}
          <span className="text-sm font-normal text-ink-2"> / week</span>
        </Stat>
        <div>
          <Stat label="Slipping members">{l.atRisk}</Stat>
          <p className={`text-xs mt-1 ${atRiskShare === highestRisk ? 'font-semibold text-ink' : 'text-ink-2'}`}>
            {pct(atRiskShare)} of members{atRiskShare === highestRisk ? ' · highest in the chain' : ''}
          </p>
        </div>
      </dl>

      {l.detailed ? (
        <Link
          to="/gyms/overview"
          className="mt-auto inline-flex items-center gap-0.5 text-sm font-medium text-accent-ink hover:text-ink self-start"
        >
          Open location dashboard
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <p className="mt-auto text-xs text-ink-2">Summary only</p>
      )}
    </Card>
  );
};

export const Locations: React.FC = () => (
  <div className="flex flex-col gap-8 pb-16">
    <PageHeader
      eyebrow={
        <>
          <span>{GYM.name} · {CHAIN_LOCATIONS.length} locations</span>
          <DemoBadge />
        </>
      }
      title="Locations"
      subtitle="Compare sites and see where members are slipping. Oakland is simulated in detail; the others are summaries."
    />

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {TOTALS.map((t) => (
        <div key={t.label} className="panel p-6">
          <Eyebrow>{t.label}</Eyebrow>
          <p className="num text-4xl sm:text-5xl text-ink mt-3">{t.value}</p>
          <p className="text-xs text-ink-2 mt-1">All {CHAIN_LOCATIONS.length} locations</p>
        </div>
      ))}
    </section>

    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {CHAIN_LOCATIONS.map((l) => (
        <LocationCard key={l.id} location={l} />
      ))}
    </section>

    <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <Eyebrow>Chain total</Eyebrow>
        <p className="text-base text-ink mt-1">
          {CHAIN_LOCATIONS.map((l) => `${l.city} ${formatUsd(priceOf(l))}`).join(' + ')} ={' '}
          <span className="font-bold">{formatUsd(sum(priceOf))} per month</span>
        </p>
        <p className="text-xs text-ink-2 mt-1">
          Each location is priced by its size ({CHAIN_LOCATIONS.map((l) => `${l.city}: ${tierForMembers(l.members).name}`).join(', ')}).
          Pilot pricing, hardware included.
        </p>
      </div>
      <Link
        to="/pricing"
        className="shrink-0 inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-accent-ink text-white text-sm font-semibold hover:bg-accent-deep transition-colors self-start sm:self-auto"
      >
        How a pilot works
        <ChevronRight className="w-4 h-4" />
      </Link>
    </Card>
  </div>
);
