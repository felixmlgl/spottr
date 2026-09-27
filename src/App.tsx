/**
 * Spottr - Gym Member Experience
 * Your gym's cameras count for you.
 * Apple-style light design for gym members to view auto-logged workouts, weekly plan,
 * muscle recovery readiness, volume progress, and live session replay.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigation, TabId } from './components/Navigation';
import { TodayTab } from './components/TodayTab';
import { PlanTab } from './components/PlanTab';
import { RecoveryTab } from './components/RecoveryTab';
import { ProgressTab } from './components/ProgressTab';
import { WorkoutsTab } from './components/WorkoutsTab';
import { ReplayModal } from './components/ReplayModal';
import { SCENARIOS } from './mocks/scenarios';
import { PAST_WORKOUTS } from './mocks/memberData';
import { PastWorkout, ScenarioMetadata, TrainingPlan, WorkoutSummary } from './types/schema';
import { getTrackingProvider } from './services/tracking';
import { summaryService } from './services/summary';
import { loadTrainingPlan, saveTrainingPlan } from './services/planService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('today');
  const [isReplayOpen, setIsReplayOpen] = useState<boolean>(false);

  // Training Plan state (persisted with localStorage)
  const [plan, setPlan] = useState<TrainingPlan>(() => loadTrainingPlan());

  // Scenarios and Tracking
  const [scenarios] = useState<ScenarioMetadata[]>(SCENARIOS);
  const [currentScenarioId, setCurrentScenarioId] = useState<string>(SCENARIOS[0].id);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    SCENARIOS[0].persons[0].person_id
  );

  // Playback & simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Dynamic latest workout for Today tab
  const [latestWorkout, setLatestWorkout] = useState<PastWorkout>(PAST_WORKOUTS[0]);
  const [aiRecap, setAiRecap] = useState<string>('');

  const scenario = scenarios.find((s) => s.id === currentScenarioId) || scenarios[0];
  const duration = scenario.duration_s;

  const trackingProvider = getTrackingProvider();
  const detections = trackingProvider.getDetectionsAtTime(scenario.id, currentTime);

  // Handle plan update
  const handleUpdatePlan = (updatedPlan: TrainingPlan) => {
    setPlan(updatedPlan);
    saveTrainingPlan(updatedPlan);
  };

  // Handle scenario switch
  const handleSelectScenario = (scenarioId: string) => {
    setCurrentScenarioId(scenarioId);
    const newScenario = scenarios.find((s) => s.id === scenarioId) || scenarios[0];
    setSelectedPersonId(newScenario.persons[0].person_id);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Simulation playback loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const updateSimulation = useCallback(() => {
    const now = performance.now();
    const deltaSeconds = ((now - lastTimeRef.current) / 1000) * playbackSpeed;
    lastTimeRef.current = now;

    setCurrentTime((prev) => {
      const next = prev + deltaSeconds;
      if (next >= duration) {
        setIsPlaying(false);
        return duration;
      }
      return next;
    });

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateSimulation);
    }
  }, [isPlaying, duration, playbackSpeed]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(updateSimulation);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, updateSimulation]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // When session completes or user taps "View summary" in Replay View:
  const handleApplySessionToSummary = (summary: WorkoutSummary) => {
    const exercises = summary.sessions.length > 0
      ? summary.sessions.map((s) => ({
          name: s.exercise_name,
          exercise_id: s.exercise_id,
          sets: 1,
          reps_per_set: [s.rep_count],
          total_reps: s.rep_count,
        }))
      : [
          {
            name: 'Squat',
            exercise_id: 'squat',
            sets: 1,
            reps_per_set: [summary.total_reps],
            total_reps: summary.total_reps,
          },
        ];

    const updatedWorkout: PastWorkout = {
      ...latestWorkout,
      total_reps: summary.total_reps,
      duration_minutes: Math.max(1, Math.round(summary.total_duration_s / 60) || 1),
      display_date: 'Today, Just now',
      exercises,
      muscle_load: summary.muscle_load,
    };

    setLatestWorkout(updatedWorkout);

    // Generate fresh smart recap
    summaryService.generateRecap(summary).then((text) => {
      setAiRecap(text);
    });

    setCurrentTab('today');
  };

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] flex flex-col font-sans selection:bg-[#34C759]/20 selection:text-[#1D1D1F]">
      {/* Navigation Top Bar & Mobile Bottom Bar */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenReplay={() => setIsReplayOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-8">
        {currentTab === 'today' && (
          <TodayTab
            latestWorkout={latestWorkout}
            plan={plan}
            onWatchReplay={() => setIsReplayOpen(true)}
            onNavigateToPlan={() => setCurrentTab('plan')}
            aiRecap={aiRecap}
          />
        )}

        {currentTab === 'plan' && (
          <PlanTab
            plan={plan}
            onUpdatePlan={handleUpdatePlan}
          />
        )}

        {currentTab === 'recovery' && (
          <RecoveryTab plan={plan} />
        )}

        {currentTab === 'progress' && (
          <ProgressTab />
        )}

        {currentTab === 'workouts' && (
          <WorkoutsTab />
        )}
      </main>

      {/* Replay View Modal */}
      <ReplayModal
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        onApplySessionToSummary={handleApplySessionToSummary}
      />
    </div>
  );
}
