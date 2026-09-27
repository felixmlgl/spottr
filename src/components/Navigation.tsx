import React from 'react';
import {
  Calendar,
  CalendarDays,
  Activity,
  LineChart,
  Dumbbell,
} from 'lucide-react';
import { MEMBER_PROFILE } from '../mocks/memberData';

export type TabId = 'today' | 'plan' | 'recovery' | 'progress' | 'workouts';

interface NavigationProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenReplay?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenReplay,
}) => {
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'plan', label: 'Plan', icon: CalendarDays },
    { id: 'recovery', label: 'Recovery', icon: Activity },
    { id: 'progress', label: 'Progress', icon: LineChart },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onSelectTab('today')}
          >
            <span className="text-xl font-bold tracking-tight text-[#1D1D1F]">
              Spottr
            </span>
          </div>

          {/* Segmented Tab Control (5 Tabs) */}
          <nav className="hidden md:flex items-center p-1 bg-[#F5F5F7] rounded-full">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-4 sm:px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#1D1D1F] shadow-sm'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User Profile / Quick Replay button */}
          <div className="flex items-center gap-3">
            {onOpenReplay && (
              <button
                onClick={onOpenReplay}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E8E8ED] transition-colors cursor-pointer"
              >
                <span>Live demo replay</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#F5F5F7] ring-1 ring-black/5 flex items-center justify-center text-xs font-semibold text-[#1D1D1F]">
                {MEMBER_PROFILE.name.charAt(0)}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-[#1D1D1F]">
                {MEMBER_PROFILE.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (5 Tabs) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-black/[0.06] px-2 py-1.5 flex items-center justify-around safe-area-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-[#34C759]' : 'text-[#6E6E73]'
              }`}
            >
              <Icon className="w-5 h-5 stroke-[1.75]" />
              <span className="text-[10px] font-medium tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
