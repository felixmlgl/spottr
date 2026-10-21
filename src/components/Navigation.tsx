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
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <button className="cursor-pointer shrink-0" onClick={() => onSelectTab('main')} aria-label="Spottr, go to Main">
          <Logo />
        </button>

        <nav className="hidden md:flex items-center p-1 bg-surface rounded-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-current={currentTab === tab.id ? 'page' : undefined}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                currentTab === tab.id ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Demo member chip */}
        <div className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full bg-surface min-w-0">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-line shrink-0">
            {thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover object-top" />}
          </div>
          <span className="text-xs font-medium text-ink truncate">{personLabel}</span>
          <button
            onClick={onChangeSelection}
            className="px-2.5 py-1 rounded-full bg-white hover:bg-surface-2 text-[11px] font-semibold text-ink shadow-2xs cursor-pointer shrink-0"
          >
            Change
          </button>
        </div>
      </div>
    </header>

    {/* Mobile bottom tab bar */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-black/[0.06] px-2 py-1.5 flex items-center justify-around">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              isActive ? 'text-accent-ink' : 'text-ink-2'
            }`}
          >
            <Icon className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  </>
);
