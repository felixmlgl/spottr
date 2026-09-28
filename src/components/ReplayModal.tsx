import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  ArrowLeft,
  Upload,
  Users,
  AlertCircle,
  Loader2,
  Camera,
  FastForward,
  Info,
} from 'lucide-react';
import { PIPELINE_CLIPS, PipelineClip } from '../config';
import {
  LoadedPipelineData,
  getPipelineDetectionsAtTime,
  loadPipelineClip,
  pipelinePersonToWorkoutSummary,
} from '../services/pipelineAdapter';
import {
  DetectionSnapshot,
  PoseSkeleton,
  WorkoutSummary as WorkoutSummaryType,
} from '../types/schema';
import { videoSourceService } from '../services/videoSource';
import { blurBystanders, overlayRowsAtTime } from '../services/privacyBlur';

interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySessionToSummary: (summary: WorkoutSummaryType) => void;
  initialClipId?: string;
}

export const ReplayModal: React.FC<ReplayModalProps> = ({
  isOpen,
  onClose,
  onApplySessionToSummary,
  initialClipId = PIPELINE_CLIPS[0].id,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedClipId, setSelectedClipId] = useState<string>(initialClipId);
  const [loadedData, setLoadedData] = useState<LoadedPipelineData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [customVideoUrls, setCustomVideoUrls] = useState<Record<string, string>>({});
  const [videoLoadError, setVideoLoadError] = useState<boolean>(false);

  const [selectedPersonId, setSelectedPersonId] = useState<string>('1');
  const [showAllPeople, setShowAllPeople] = useState<boolean>(false);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Audio chirp synthesizer for completed rep feedback
  const lastRepRef = useRef<number>(0);

  // Load pipeline clip data when clip selection changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setVideoLoadError(false);
    setIsPlaying(false);
    setCurrentTime(0);

    const clip = PIPELINE_CLIPS.find((c) => c.id === selectedClipId) || PIPELINE_CLIPS[0];

    loadPipelineClip(clip)
      .then((data) => {
        if (!isMounted) return;
        setLoadedData(data);
        setDuration(data.session.duration_s || 30);

        // Auto-select person with the most total_reps
        const sortedPeople = [...data.session.people].sort(
          (a, b) => (b.total_reps || 0) - (a.total_reps || 0)
        );
        const bestPerson = sortedPeople[0];
        const defaultPersonId = bestPerson ? String(bestPerson.id) : '1';
        setSelectedPersonId(defaultPersonId);

        // If nobody has sets (e.g. crowd), enable "Show all people" by default
        if (!data.hasSets) {
          setShowAllPeople(true);
        } else {
          setShowAllPeople(false);
        }

        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedClipId, isOpen]);

  // Determine active video source
  const currentClip = PIPELINE_CLIPS.find((c) => c.id === selectedClipId) || PIPELINE_CLIPS[0];
  const activeVideoUrl = customVideoUrls[selectedClipId] || loadedData?.videoUrl || '';

  // Width, height and aspect ratio from session
  const clipWidth = loadedData?.session.width || 1280;
  const clipHeight = loadedData?.session.height || 720;

  // Get current detection snapshots from pipeline adapter
  const detections: DetectionSnapshot[] = loadedData
    ? getPipelineDetectionsAtTime(loadedData.session, loadedData.overlay, currentTime)
    : [];

  const rawPerson = loadedData?.session.people.find((p) => String(p.id) === selectedPersonId);
  const selectedDetection = detections.find((d) => d.person_id === selectedPersonId) || detections[0];
  const selectedPerson = loadedData?.scenario.persons.find((p) => p.person_id === selectedPersonId) ||
    loadedData?.scenario.persons[0];

  // Find first set for "Jump to set" button
  const firstSet = rawPerson?.sets?.[0];
  const jumpTargetTime = firstSet ? Math.max(0, firstSet.start_s - 2) : null;

  // Sound chirp on rep increment
  useEffect(() => {
    if (!selectedDetection) return;
    if (selectedDetection.current_reps > lastRepRef.current) {
      lastRepRef.current = selectedDetection.current_reps;
      try {
        const audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } catch {
        // AudioContext restricted before user gesture
      }
    }
    if (selectedDetection.current_reps === 0) {
      lastRepRef.current = 0;
    }
  }, [selectedDetection?.current_reps, selectedDetection]);

  // Handle video element play / pause / seek sync
  const togglePlay = () => {
    const video = videoRef.current;
    if (video && activeVideoUrl && !videoLoadError) {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play().then(() => setIsPlaying(true)).catch(() => {
          setIsPlaying(!isPlaying);
        });
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (videoRef.current && activeVideoUrl && !videoLoadError) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleJumpToSet = () => {
    if (jumpTargetTime !== null) {
      handleSeek(jumpTargetTime);
    }
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrls((prev) => ({ ...prev, [selectedClipId]: url }));
      setVideoLoadError(false);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  // Sync animation timer when playing simulated or video
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const delta = ((now - lastTs) / 1000) * playbackSpeed;
      lastTs = now;

      const video = videoRef.current;
      const hasWorkingRealVideo = video && activeVideoUrl && !videoLoadError && video.readyState >= 2;

      if (isPlaying) {
        if (hasWorkingRealVideo && video) {
          setCurrentTime(video.currentTime);
          if (video.duration && !isNaN(video.duration)) {
            setDuration(video.duration);
          }
          if (video.ended) {
            setIsPlaying(false);
          }
        } else {
          // Internal accurate timer when running without real video
          setCurrentTime((prev) => {
            const next = prev + delta;
            if (next >= duration) {
              setIsPlaying(false);
              return duration;
            }
            return next;
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, duration, activeVideoUrl, videoLoadError]);

  // Canvas drawing loop with resolution normalization
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const video = videoRef.current;
    const isVideoRenderable =
      video && activeVideoUrl && !videoLoadError && video.readyState >= 2 && !video.error;

    if (isVideoRenderable && video) {
      ctx.drawImage(video, 0, 0, w, h);

      // Privacy: everyone except the selected member is pixelated head to toe
      if (loadedData) {
        blurBystanders(
          ctx,
          video,
          overlayRowsAtTime(loadedData.overlay, video.currentTime),
          Number(selectedPersonId),
          loadedData.session.width || w,
          loadedData.session.height || h
        );
      }
    } else {
      // Clean high-fidelity gym view when video is loading or fallback
      videoSourceService.renderSimulatedCCTVFrame(
        ctx,
        w,
        h,
        selectedClipId,
        currentTime
      );
    }

    const nobodyHasSets = loadedData ? !loadedData.hasSets : false;

    // 1. Overlay Detections (Bounding Box + Skeleton)
    detections.forEach((det) => {
      // If person is not in current frame, don't draw any box/skeleton for them
      if (det.in_frame === false) return;

      const isSelected = det.person_id === selectedPersonId;
      const bx = det.bbox.x * w;
      const by = det.bbox.y * h;
      const bw = det.bbox.w * w;
      const bh = det.bbox.h * h;

      if (isSelected) {
        // Crisp green box for focused person
        ctx.strokeStyle = '#34C759';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bx, by, bw, bh);

        // Name and reps tag
        ctx.fillStyle = 'rgba(29, 29, 31, 0.88)';
        const tagText = nobodyHasSets
          ? `ID #${det.person_id}`
          : `${det.exercise_name} • ${det.current_reps} reps`;
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        const tw = ctx.measureText(tagText).width;
        ctx.fillRect(bx, by - 24, tw + 16, 22);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tagText, bx + 8, by - 8);
      } else {
        // Subtle dotted box for other members in frame
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      }

      // Draw skeleton: if selected, or if in crowd mode (nobody has sets) show all skeletons
      if (det.skeleton && (isSelected || nobodyHasSets)) {
        const s = det.skeleton;
        const bones: [keyof PoseSkeleton, keyof PoseSkeleton][] = [
          ['left_shoulder', 'right_shoulder'],
          ['left_shoulder', 'left_hip'],
          ['right_shoulder', 'right_hip'],
          ['left_hip', 'right_hip'],
          ['left_shoulder', 'left_elbow'],
          ['left_elbow', 'left_wrist'],
          ['right_shoulder', 'right_elbow'],
          ['right_elbow', 'right_wrist'],
          ['left_hip', 'left_knee'],
          ['left_knee', 'left_ankle'],
          ['right_hip', 'right_knee'],
          ['right_knee', 'right_ankle'],
        ];

        ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = isSelected ? 2 : 1.2;

        bones.forEach(([jointA, jointB]) => {
          const ptA = s[jointA];
          const ptB = s[jointB];
          if (ptA && ptB) {
            ctx.beginPath();
            ctx.moveTo(ptA.x * w, ptA.y * h);
            ctx.lineTo(ptB.x * w, ptB.y * h);
            ctx.stroke();
          }
        });

        // Keypoint circles
        Object.values(s).forEach((pt) => {
          if (!pt) return;
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, isSelected ? 3.5 : 2, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#34C759' : '#06B6D4';
          ctx.fill();
        });
      }
    });
  }, [detections, selectedPersonId, activeVideoUrl, videoLoadError, selectedClipId, currentTime, loadedData]);

  useEffect(() => {
    let animId: number;
    const render = () => {
      drawFrame();
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [drawFrame]);

  if (!isOpen) return null;

  // Finish session and apply WorkoutSummary
  const handleFinishAndApply = () => {
    if (!loadedData) return;
    const person = loadedData.session.people.find((p) => String(p.id) === selectedPersonId) ||
      loadedData.session.people[0];

    if (person) {
      const summary = pipelinePersonToWorkoutSummary(person, loadedData.session);
      onApplySessionToSummary(summary);
    }
    onClose();
  };

  // Person filtering: show only people with total_reps > 0 by default, or all for crowd
  const allPersons = loadedData?.scenario.persons || [];
  const activePersons = allPersons.filter((p) => (p.total_reps ?? 0) > 0);
  const displayedPersons = showAllPeople || activePersons.length === 0 ? allPersons : activePersons;
  const hasFilteredOut = activePersons.length > 0 && activePersons.length < allPersons.length;
  const isCrowdMode = loadedData ? !loadedData.hasSets : false;

  const currentExerciseDisplay =
    selectedDetection?.in_frame === false
      ? 'Out of frame'
      : selectedDetection?.exercise_name || selectedPerson?.current_exercise || 'Exercise';

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1D1D1F] hover:text-black cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Done</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1D1D1F]">
              Session replay
            </span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#34C759]" />}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Remote session note if fallback used or crowd mode note */}
        {loadedData?.errorNote && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F5F7] text-xs text-[#6E6E73] border border-black/[0.04]">
            <AlertCircle className="w-4 h-4 text-[#8E8E93] shrink-0" />
            <span>{loadedData.errorNote}</span>
          </div>
        )}

        {isCrowdMode && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F5F7] text-xs text-[#6E6E73] border border-black/[0.04]">
            <Info className="w-4 h-4 text-[#0071E3] shrink-0" />
            <span>No sets detected – tracking only</span>
          </div>
        )}

        {/* Video Area (Sized to clip's exact aspect ratio e.g. 640/352 or 1280/720) */}
        <div
          className="w-full rounded-[24px] overflow-hidden bg-black relative shadow-lg"
          style={{ aspectRatio: `${clipWidth} / ${clipHeight}` }}
        >
          {/* Real video element */}
          {activeVideoUrl && (
            <video
              ref={videoRef}
              src={activeVideoUrl}
              crossOrigin="anonymous"
              preload="auto"
              playsInline
              muted
              className="hidden"
              onLoadedMetadata={(e) => {
                const target = e.target as HTMLVideoElement;
                if (target.duration && !isNaN(target.duration)) {
                  setDuration(target.duration);
                }
              }}
              onError={() => {
                setVideoLoadError(true);
              }}
            />
          )}

          {/* Canvas Rendering Feed */}
          <canvas
            ref={canvasRef}
            width={clipWidth}
            height={clipHeight}
            className="w-full h-full object-contain pointer-events-none select-none"
          />

          {/* Camera Title Pill */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
            <span>{loadedData?.scenario.title || currentClip.title}</span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {clipWidth}&times;{clipHeight}
            </span>
          </div>

          {/* Choose Video Fallback Overlay Banner */}
          {(!activeVideoUrl || videoLoadError || currentClip.localData) && (
            <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
              <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black text-white text-xs font-medium backdrop-blur-md border border-white/20 shadow-md cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#34C759]" />
                <span>
                  {customVideoUrls[selectedClipId] ? 'Change video' : 'Choose video'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Scrubber Bar */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-[#6E6E73] font-medium w-8 text-right font-mono">
            {Math.floor(currentTime)}s
          </span>
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#E5E5EA] rounded-full appearance-none cursor-pointer accent-[#34C759] focus:outline-none"
          />
          <span className="text-xs text-[#6E6E73] font-medium w-8 font-mono">
            {Math.floor(duration || 30)}s
          </span>
        </div>

        {/* Hero Rep Counter & Playback Controls */}
        <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Big Number & Exercise */}
          <div className="flex items-baseline gap-4">
            <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-[#34C759]">
              {selectedDetection?.current_reps ?? (selectedPerson?.total_reps ?? 0)}
            </span>
            <div>
              <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
                Live reps counted
              </p>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F]">
                {currentExerciseDisplay}
              </h2>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={togglePlay}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-sm font-medium transition-transform duration-150 active:scale-95 cursor-pointer shadow-sm"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play</span>
                </>
              )}
            </button>

            {/* Jump to set button */}
            {jumpTargetTime !== null && (
              <button
                onClick={handleJumpToSet}
                title={`Jump to set (${Math.round(jumpTargetTime)}s)`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white hover:bg-[#E8E8ED] text-[#1D1D1F] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <FastForward className="w-3.5 h-3.5 text-[#34C759]" />
                <span>Jump to set</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="p-2.5 rounded-full bg-white hover:bg-[#E8E8ED] text-[#1D1D1F] transition-colors cursor-pointer shadow-2xs"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Pills */}
            <div className="flex items-center p-1 bg-white rounded-full shadow-2xs">
              {[1, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-[#1D1D1F] text-white'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {spd}&times;
                </button>
              ))}
            </div>

            {/* View Summary Button */}
            <button
              onClick={handleFinishAndApply}
              className="px-4 py-2.5 rounded-full bg-[#34C759] hover:bg-[#2FB34F] text-white text-sm font-medium transition-colors cursor-pointer shadow-sm"
            >
              View summary
            </button>
          </div>
        </div>

        {/* Clean Pill Selectors: Camera & Tracked Person */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Camera View Selector */}
          <div className="bg-[#F5F5F7] rounded-[24px] p-5 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
                Camera view
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_CLIPS.map((clip) => {
                const isSelected = clip.id === selectedClipId;
                return (
                  <button
                    key={clip.id}
                    onClick={() => setSelectedClipId(clip.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D1D1F] text-white shadow-xs'
                        : 'bg-white text-[#1D1D1F] hover:bg-[#E8E8ED]'
                    }`}
                  >
                    {clip.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tracked Person Selector with Avatar & Filter */}
          <div className="bg-[#F5F5F7] rounded-[24px] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#6E6E73]" />
                <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
                  Tracked person
                </span>
              </div>
              {hasFilteredOut && (
                <button
                  onClick={() => setShowAllPeople(!showAllPeople)}
                  className="text-[11px] font-medium text-[#0071E3] hover:underline cursor-pointer"
                >
                  {showAllPeople ? 'Active only' : `Show all (${allPersons.length})`}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {displayedPersons.map((p) => {
                const isSelected = p.person_id === selectedPersonId;
                const initials = p.display_label
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'P';

                return (
                  <button
                    key={p.person_id}
                    onClick={() => setSelectedPersonId(p.person_id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D1D1F] text-white shadow-xs'
                        : 'bg-white text-[#1D1D1F] hover:bg-[#E8E8ED]'
                    }`}
                  >
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt={p.display_label}
                        className="w-4 h-4 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span
                        className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white"
                        style={{ backgroundColor: p.accent_color || '#34C759' }}
                      >
                        {initials}
                      </span>
                    )}
                    <span>{p.display_label}</span>
                    <span className={`text-[10px] opacity-75 font-mono`}>
                      ({p.total_reps ?? 0} reps)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-xs text-[#86868B] text-center pt-2 pb-8">
          Edge vision pipeline active. In production, Spottr runs on gym security cameras via Raspberry Pi edge devices.
        </p>
      </div>
    </div>
  );
};
