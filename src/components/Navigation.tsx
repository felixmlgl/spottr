import React from 'react';
import { Home, ClipboardList, Activity, History, Settings } from 'lucide-react';
import { Logo } from './Logo';

export type TabId = 'main' | 'plan' | 'recovery' | 'history' | 'settings';

interface NavigationProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  /** The demo member being followed */
  personLabel: string;
  thumbnail: string | null;
  onChangeSelection: () => void;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'main', label: 'Main', icon: Home },
  { id: 'plan', label: 'Plan', icon: ClipboardList },
  { id: 'recovery', label: 'Recovery', icon: Activity },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  personLabel,
  thumbnail,
  onChangeSelection,
}) => (
  <>
    {/* Desktop & tablet top bar */}
    <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3">
      {/* Floating glass capsule */}
      <div className="glass max-w-[1100px] mx-auto rounded-full h-14 pl-5 pr-2 flex items-center justify-between gap-4">
        <button className="cursor-pointer shrink-0" onClick={() => onSelectTab('main')} aria-label="Spottr, go to Main">
          <Logo />
        </button>

        <nav className="hidden md:flex items-center gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-current={currentTab === tab.id ? 'page' : undefined}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                currentTab === tab.id ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink hover:bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Demo member chip */}
        <div className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full bg-white/70 ring-1 ring-white min-w-0">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-line shrink-0 ring-2 ring-lime">
            {thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover object-top" />}
          </div>
          <span className="text-xs font-medium text-ink truncate">{personLabel}</span>
          <button
            onClick={onChangeSelection}
            className="px-3 py-1.5 rounded-full bg-ink hover:bg-ink-2 text-[11px] font-semibold text-white cursor-pointer shrink-0"
          >
            Change
          </button>
        </div>
      </div>
    </header>

    {/* Mobile: floating glass dock. The active tab opens into a labelled pill, the rest are icon circles. */}
    <nav className="md:hidden fixed bottom-4 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
      <div className="glass rounded-full p-1.5 flex items-center gap-1 pointer-events-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
              className={`h-11 rounded-full flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                isActive ? 'px-3.5 bg-accent-ink text-white' : 'w-11 text-ink-2 hover:bg-white/70'
              }`}
            >
              <Icon className="w-5 h-5 stroke-[1.75]" aria-hidden />
              {isActive && <span className="text-sm font-semibold">{tab.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  </>
);
