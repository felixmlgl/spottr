/**
 * The gym field of the waitlist popup. While a member types it suggests gyms other members confirmed
 * (GET /api/waitlist-gyms), so members of one gym end up with one spelling; picking one fills in the city too.
 * Without the list (offline, or nothing confirmed yet) it's a plain text field.
 */

import React, { useEffect, useId, useMemo, useState } from 'react';
import type { WaitlistGym } from '../../api/waitlist-gyms';
import { inputClass } from '../components/Popup';

const MAX_SUGGESTIONS = 6;

/** Loaded once per page visit, when the popup first opens; tried again next time if it failed */
let gymsRequest: Promise<WaitlistGym[]> | null = null;
const loadGyms = () =>
  (gymsRequest ??= fetch('/api/waitlist-gyms')
    .then((res) => res.json())
    .then((data: { ok?: boolean; gyms?: WaitlistGym[] }) => (data.ok && Array.isArray(data.gyms) ? data.gyms : []))
    .catch(() => {
      gymsRequest = null;
      return [];
    }));

export const useWaitlistGyms = () => {
  const [gyms, setGyms] = useState<WaitlistGym[]>([]);
  useEffect(() => {
    let live = true;
    loadGyms().then((list) => live && setGyms(list));
    return () => {
      live = false;
    };
  }, []);
  return gyms;
};

/** Same as in gymKey (api/join-waitlist.ts), so matching here agrees with how sign-ups are counted */
const normalize = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ'’]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** The listed gym that this gym and city name, if any */
export const findGym = (gyms: WaitlistGym[], gym: string, city: string) => {
  const g = normalize(gym);
  const c = normalize(city);
  return g ? gyms.find((x) => normalize(x.gym) === g && normalize(x.city) === c) : undefined;
};

/** Gyms whose name starts with what was typed first, then those with a word starting with it, then any match */
const suggest = (gyms: WaitlistGym[], typed: string) => {
  const q = normalize(typed);
  if (!q) return [];
  const rank = (g: WaitlistGym) => {
    const name = normalize(g.gym);
    return name.startsWith(q) ? 0 : name.includes(` ${q}`) ? 1 : name.includes(q) ? 2 : 3;
  };
  return gyms
    .map((g) => ({ g, r: rank(g) }))
    .filter((m) => m.r < 3)
    .sort((a, b) => a.r - b.r || (b.g.members ?? 0) - (a.g.members ?? 0))
    .slice(0, MAX_SUGGESTIONS)
    .map((m) => m.g);
};

export const GymPicker: React.FC<{
  label: string;
  gyms: WaitlistGym[];
  value: string;
  onChange: (gym: string) => void;
  onPick: (gym: WaitlistGym) => void;
}> = ({ label, gyms, value, onChange, onPick }) => {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useMemo(() => suggest(gyms, value), [gyms, value]);
  const shown = open && matches.length > 0;

  const pick = (gym: WaitlistGym) => {
    onPick(gym);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!shown) {
      if (e.key === 'ArrowDown' && matches.length) {
        e.preventDefault();
        setOpen(true);
        setActive(0);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      // Picks the gym instead of sending the form
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === 'Escape') {
      // Closes only the list, not the popup around it
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    // Not a <label> around everything like Field: the options would become part of the field's name
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-ink-2">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        required
        maxLength={150}
        autoComplete="off"
        className={inputClass}
        placeholder="Iron District Fitness"
      />
      {shown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Gyms on the waitlist"
          className="absolute z-20 top-full left-0 mt-1.5 w-full sm:w-max sm:min-w-full sm:max-w-[min(340px,calc(100vw-64px))] max-h-72 overflow-y-auto p-1.5 rounded-2xl bg-white ring-1 ring-black/[0.08] shadow-[0_18px_40px_-16px_rgb(16_24_64/0.3)]"
        >
          {matches.map((gym, i) => (
            <li
              key={`${gym.gym}|${gym.city}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Keeps the focus in the field, so it doesn't blur and close the list before the click lands
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(gym)}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 rounded-xl cursor-pointer ${i === active ? 'bg-accent/10' : ''}`}
            >
              <span className="block text-sm font-semibold text-ink">{gym.gym}</span>
              <span className="block text-xs text-ink-2">
                {gym.city}
                {gym.members && ` · ${gym.members} members asked`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
