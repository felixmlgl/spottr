import React from 'react';
import { PilotStepsCard, PriceCard } from '../components/BusinessCards';
import { PageHeader } from '../components/ui';

/** How a pilot runs and the price by gym size. "Request a demo" opens the popup that emails the team. */
export const RequestPilot: React.FC = () => (
  <div className="flex flex-col gap-8 pb-16">
    <PageHeader
      title="Pilot & pricing"
      subtitle="We're starting with a small group of gyms and gym chains in the Bay Area. Here's how a pilot runs and what Spottr costs at your size."
    />

    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <PilotStepsCard />
      <PriceCard className="lg:col-span-2" />
    </section>
  </div>
);
