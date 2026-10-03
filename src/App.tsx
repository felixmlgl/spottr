/**
 * Spottr - Gym Member Experience
 * Your gym's cameras count for you.
 *
 * The demo starts on an intro screen where you pick a camera clip and the person to follow. The selection lives in
 * the URL (/?clip=squat&person=2), so a refresh or shared link reopens the same member. The member app then has
 * four tabs (Main, Recovery, History, Settings); the annotated replay is a sub-view (&view=replay), not a tab.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigation, TabId } from './components/Navigation';
import { MainTab } from './components/MainTab';
import { RecoveryTab } from './components/RecoveryTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { ReplayView } from './components/ReplayView';
import { DemoIntro } from './components/intro/DemoIntro';
import { TrainingPlan } from './types/schema';
import { navigate, useSearch } from './router';
import { findClip, useClipData } from './hooks/useClipData';
import { clipDataBaseUrl, pipelinePersonToWorkoutSummary } from './services/pipelineAdapter';
import { mainExercise, summaryToWorkout, workoutHistory } from './services/memberSession';
import { summaryService } from './services/summary';
import { loadTrainingPlan, saveTrainingPlan } from './services/planService';
import { useSettings } from './services/settings';

const appUrl = (clipId: string, personId: string) =>
  `/demo?clip=${encodeURIComponent(clipId)}&person=${encodeURIComponent(personId)}`;

// Whether the replay was opened from inside the app, so "Back" can pop history instead of pushing a new entry
let replayOpenedInApp = false;

export default function App() {
  const params = new URLSearchParams(useSearch());
  const clip = findClip(params.get('clip'));
  const personParam = params.get('person');
  const view = params.get('view');

  const [currentTab, setCurrentTab] = useState<TabId>('main');
  const [plan, setPlan] = useState<TrainingPlan>(() => loadTrainingPlan());
  const [settings, updateSettings] = useSettings();
  const [recap, setRecap] = useState<string>('');

  const data = useClipData(clip && personParam ? clip.id : null);
  const person = data?.session.people.find((p) => String(p.id) === personParam);

  const summary = useMemo(
    () => (data && person ? pipelinePersonToWorkoutSummary(person, data.session) : null),
    [data, person]
  );

  useEffect(() => {
    if (!summary) return;
    let alive = true;
    setRecap('');
    summaryService.generateRecap(summary).then((text) => alive && setRecap(text));
    return () => {
      alive = false;
    };
  }, [summary]);

  const history = useMemo(
    () => (summary ? workoutHistory(summaryToWorkout(summary, recap)) : []),
    [summary, recap]
  );

  const selectTab = (tab: TabId) => {
    setCurrentTab(tab);
    window.scrollTo(0, 0);
  };

  const handleUpdatePlan = (updatedPlan: TrainingPlan) => {
    setPlan(updatedPlan);
    saveTrainingPlan(updatedPlan);
  };

  // Intro: nothing chosen yet, "Change" pressed, or a stale link to someone who isn't in the clip
  const pickRequested = !clip || !personParam || view === 'pick';
  if (pickRequested || (data && !person)) {
    return (
      <DemoIntro
        initialClipId={clip?.id}
        initialPersonId={person ? personParam : null}
        onContinue={(clipId, personId) => {
          setCurrentTab('main');
          navigate(appUrl(clipId, personId));
        }}
      />
    );
  }

  const baseUrl = appUrl(clip.id, personParam);
  const openReplay = () => {
    replayOpenedInApp = true;
    navigate(`${baseUrl}&view=replay`);
  };
  const changeSelection = () => navigate(`${baseUrl}&view=pick`);

  if (view === 'replay') {
    return (
      <ReplayView
        data={data}
        personId={personParam}
        settings={settings}
        onBack={() => {
          if (replayOpenedInApp) {
            replayOpenedInApp = false;
            window.history.back();
          } else {
            navigate(baseUrl, { replace: true });
          }
        }}
      />
    );
  }

  if (!data || !person || !summary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#6E6E73]" />
      </div>
    );
  }

  const thumbnail = person.thumbnail ? `${clipDataBaseUrl(clip)}/${person.thumbnail}` : null;
  const personLabel = `Person ${person.id} · ${mainExercise(person) ?? clip.title}`;

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] flex flex-col font-sans selection:bg-[#34C759]/20 selection:text-[#1D1D1F]">
      <Navigation
        currentTab={currentTab}
        onSelectTab={selectTab}
        personLabel={personLabel}
        thumbnail={thumbnail}
        onChangeSelection={changeSelection}
      />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 pt-8 pb-24 md:pb-8">
        {currentTab === 'main' && (
          <MainTab
            person={person}
            history={history}
            onWatchReplay={openReplay}
            onOpenHistory={() => selectTab('history')}
          />
        )}

        {currentTab === 'recovery' && (
          <RecoveryTab plan={plan} onUpdatePlan={handleUpdatePlan} todayLoad={summary.muscle_load} />
        )}

        {currentTab === 'history' && <HistoryTab workouts={history} todayRecap={recap} onWatchReplay={openReplay} />}

        {currentTab === 'settings' && (
          <SettingsTab
            clipTitle={clip.title}
            personId={personParam}
            thumbnail={thumbnail}
            settings={settings}
            onChangeSettings={updateSettings}
            onChangeSelection={changeSelection}
          />
        )}
      </main>
    </div>
  );
}
