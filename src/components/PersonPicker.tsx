import React, { useState } from 'react';
import { UserCheck, Shield, Activity, Target, Users } from 'lucide-react';
import { PersonInfo } from '../types/schema';

interface PersonPickerProps {
  persons: PersonInfo[];
  selectedPersonId: string;
  onSelectPerson: (personId: string) => void;
  activeReps?: Record<string, number>;
  disabled?: boolean;
}

export const PersonPicker: React.FC<PersonPickerProps> = ({
  persons,
  selectedPersonId,
  onSelectPerson,
  activeReps = {},
  disabled = false,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Active lifters with reps > 0
  const activePersons = persons.filter((p) => (p.total_reps ?? 0) > 0);
  const displayedPersons = showAll || activePersons.length === 0 ? persons : activePersons;
  const hasInactiveHidden = activePersons.length > 0 && activePersons.length < persons.length;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              2. Detected Members in Frame
            </h2>
            <p className="text-xs text-zinc-400">
              Select who Spottr should focus and count reps for
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasInactiveHidden && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>{showAll ? 'Active only' : `Show all (${persons.length})`}</span>
            </button>
          )}

          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Anonymous Re-ID</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {displayedPersons.map((person) => {
          const isSelected = person.person_id === selectedPersonId;
          const currentRep = activeReps[person.person_id] ?? (person.total_reps ?? 0);

          // Get initials
          const initials = person.display_label
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase() || 'P';

          return (
            <button
              key={person.person_id}
              onClick={() => onSelectPerson(person.person_id)}
              disabled={disabled}
              className={`text-left p-3 rounded-lg border transition-all relative overflow-hidden group cursor-pointer ${
                isSelected
                  ? 'bg-zinc-800/90 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                  : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/30 text-zinc-300'
              }`}
            >
              {isSelected && (
                <div
                  className="absolute top-0 left-0 bottom-0 w-1"
                  style={{ backgroundColor: person.accent_color || '#06B6D4' }}
                />
              )}

              <div className="flex items-center justify-between mb-1.5 pl-1">
                <div className="flex items-center gap-2.5">
                  {/* Thumbnail Avatar or Initials Badge */}
                  {person.thumbnail ? (
                    <img
                      src={person.thumbnail}
                      alt={person.display_label}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-zinc-700 bg-zinc-800"
                      onError={(e) => {
                        // If thumbnail fails, hide image and show initials
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ring-2 ring-zinc-800"
                      style={{ backgroundColor: person.accent_color || '#06B6D4' }}
                    >
                      {initials}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-zinc-100">
                        {person.display_label}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {person.anonymous_tag}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  <Activity className="w-3 h-3" />
                  <span>{currentRep} REPS</span>
                </div>
              </div>

              <div className="pl-1 mt-2 text-xs flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-cyan-400" />
                  <span className="font-medium text-zinc-200">
                    {person.current_exercise}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {person.zone}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
