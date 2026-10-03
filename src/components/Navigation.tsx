import React from 'react';
import { Home, Activity, History, Settings } from 'lucide-react';

export type TabId = 'main' | 'recovery' | 'history' | 'settings';

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
        <button
          className="text-xl font-bold tracking-tight text-[#1D1D1F] cursor-pointer"
          onClick={() => onSelectTab('main')}
        >
          Spottr
        </button>

        <nav className="hidden md:flex items-center p-1 bg-[#F5F5F7] rounded-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-current={currentTab === tab.id ? 'page' : undefined}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                currentTab === tab.id ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Demo member chip */}
        <div className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full bg-[#F5F5F7] min-w-0">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-[#D2D2D7] shrink-0">
            {thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover object-top" />}
          </div>
          <span className="text-xs font-medium text-[#1D1D1F] truncate">{personLabel}</span>
          <button
            onClick={onChangeSelection}
            className="px-2.5 py-1 rounded-full bg-white hover:bg-[#E8E8ED] text-[11px] font-semibold text-[#1D1D1F] shadow-2xs cursor-pointer shrink-0"
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
              isActive ? 'text-[#34C759]' : 'text-[#6E6E73]'
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
