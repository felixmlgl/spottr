import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Upload, MoreHorizontal } from 'lucide-react';
import {
  LoadedPipelineData,
  getPipelineDetectionsAtTime,
  prettifyExerciseName,
} from '../services/pipelineAdapter';
import { DetectionSnapshot, PoseSkeleton } from '../types/schema';
import { videoSourceService } from '../services/videoSource';
import { blurBystanders, overlayRowsAtTime } from '../services/privacyBlur';
import { drawRawOverlay } from '../services/rawOverlay';
import { OverlayMode } from '../services/settings';

interface SessionPlayerProps {
  data: LoadedPipelineData;
  /** The member being followed (chosen on the intro screen) */
  personId: string;
  defaultOverlayMode: OverlayMode;
  repSound: boolean;
}

const BONES: [keyof PoseSkeleton, keyof PoseSkeleton][] = [
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

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function playRepChirp() {
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

/**
 * The annotated clip for one member: video + overlay, bystanders pixelated, set markers on the scrubber.
 * Technical controls (overlay style, speed, own video file) live behind "Details".
 */
export const SessionPlayer: React.FC<SessionPlayerProps> = ({ data, personId, defaultOverlayMode, repSound }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [videoLoadError, setVideoLoadError] = useState<boolean>(false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>(defaultOverlayMode);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(data.session.duration_s || 30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const lastRepRef = useRef<number>(0);

  const activeVideoUrl = customVideoUrl || data.videoUrl || '';
  const clipWidth = data.session.width || 1280;
  const clipHeight = data.session.height || 720;
  const hasSets = data.hasSets;

  const detections: DetectionSnapshot[] = getPipelineDetectionsAtTime(data.session, data.overlay, currentTime);
  const rawPerson = data.session.people.find((p) => String(p.id) === personId);
  const selectedDetection = detections.find((d) => d.person_id === personId);
  const sets = rawPerson?.sets || [];

  // Rep chirp when the counter goes up
  useEffect(() => {
    const reps = selectedDetection?.current_reps ?? 0;
    if (reps > lastRepRef.current && repSound) playRepChirp();
    lastRepRef.current = reps;
  }, [selectedDetection?.current_reps, repSound]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video && activeVideoUrl && !videoLoadError) {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(!isPlaying));
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
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomVideoUrl(URL.createObjectURL(file));
      setVideoLoadError(false);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  // Keep the clock in sync with the video (or run an internal timer without one)
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
          if (video.duration && !isNaN(video.duration)) setDuration(video.duration);
          if (video.ended) setIsPlaying(false);
        } else {
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

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const video = videoRef.current;
    const isVideoRenderable =
      video && activeVideoUrl && !videoLoadError && video.readyState >= 2 && !video.error;

    if (isVideoRenderable && video) {
      ctx.drawImage(video, 0, 0, w, h);
      // Privacy: everyone except the member is pixelated head to toe
      blurBystanders(
        ctx,
        video,
        overlayRowsAtTime(data.overlay, video.currentTime),
        Number(personId),
        data.session.width || w,
        data.session.height || h
      );
    } else {
      videoSourceService.renderSimulatedCCTVFrame(ctx, w, h, data.scenario.id, currentTime);
    }

    if (overlayMode === 'raw') {
      // Same clock as the privacy blur above
      drawRawOverlay(ctx, data.overlay, data.session, isVideoRenderable && video ? video.currentTime : currentTime);
      return;
    }

    detections.forEach((det) => {
      if (det.in_frame === false) return;

      const isSelected = det.person_id === personId;
      const bx = det.bbox.x * w;
      const by = det.bbox.y * h;
      const bw = det.bbox.w * w;
      const bh = det.bbox.h * h;

      if (isSelected) {
        ctx.strokeStyle = '#34C759';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = 'rgba(29, 29, 31, 0.88)';
        const tagText = hasSets ? `${det.exercise_name} • ${det.current_reps} reps` : `ID #${det.person_id}`;
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        const tw = ctx.measureText(tagText).width;
        ctx.fillRect(bx, by - 24, tw + 16, 22);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tagText, bx + 8, by - 8);
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      }

      // Skeleton for the member, or for everyone when nobody does sets
      if (det.skeleton && (isSelected || !hasSets)) {
        const s = det.skeleton;
        ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = isSelected ? 2 : 1.2;
        BONES.forEach(([a, b]) => {
          const pa = s[a];
          const pb = s[b];
          if (pa && pb) {
            ctx.beginPath();
            ctx.moveTo(pa.x * w, pa.y * h);
            ctx.lineTo(pb.x * w, pb.y * h);
            ctx.stroke();
          }
        });
        Object.values(s).forEach((pt) => {
          if (!pt) return;
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, isSelected ? 3.5 : 2, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#34C759' : '#06B6D4';
          ctx.fill();
        });
      }
    });
  }, [detections, personId, activeVideoUrl, videoLoadError, currentTime, data, overlayMode, hasSets]);

  useEffect(() => {
    let animId: number;
    const render = () => {
      drawFrame();
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [drawFrame]);

  const liveReps = selectedDetection?.current_reps ?? 0;
  const totalDuration = duration || 30;

  return (
    <div className="flex flex-col gap-4">
      {/* Video */}
      <div
        className="w-full rounded-[24px] overflow-hidden bg-black relative shadow-lg"
        style={{ aspectRatio: `${clipWidth} / ${clipHeight}` }}
      >
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
              if (target.duration && !isNaN(target.duration)) setDuration(target.duration);
            }}
            onError={() => setVideoLoadError(true)}
          />
        )}
        <canvas
          ref={canvasRef}
          width={clipWidth}
          height={clipHeight}
          className="w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Live rep badge */}
        {sets.length > 0 && (
          <div className="absolute bottom-3 right-3 flex items-baseline gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white">
            <span className="text-lg font-bold tabular-nums text-[#34C759]">{liveReps}</span>
            <span className="text-xs font-medium">reps</span>
          </div>
        )}
      </div>

      {/* Scrubber with set markers */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-xs text-[#6E6E73] font-mono w-9 text-right">{formatTime(currentTime)}</span>
        <div className="relative flex-1 h-5 flex items-center">
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-[#E5E5EA]" />
          {sets.map((s, i) => (
            <div
              key={i}
              className="absolute h-1.5 rounded-full bg-[#34C759]/45"
              style={{
                left: `${(s.start_s / totalDuration) * 100}%`,
                width: `${((s.end_s - s.start_s) / totalDuration) * 100}%`,
              }}
            />
          ))}
          <div
            className="absolute h-1.5 rounded-full bg-[#1D1D1F]"
            style={{ width: `${Math.min(100, (currentTime / totalDuration) * 100)}%` }}
          />
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            aria-label="Seek"
            className="relative w-full h-5 appearance-none bg-transparent cursor-pointer accent-[#1D1D1F] focus:outline-none"
          />
        </div>
        <span className="text-xs text-[#6E6E73] font-mono w-9">{formatTime(totalDuration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={togglePlay}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-sm font-medium transition-transform duration-150 active:scale-95 cursor-pointer shadow-sm"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
        <button
          onClick={handleReset}
          className="p-2.5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] transition-colors cursor-pointer"
          title="Restart"
          aria-label="Restart"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Set chips jump to each set */}
        {sets.map((s, i) => (
          <button
            key={i}
            onClick={() => handleSeek(Math.max(0, s.start_s - 1))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-semibold text-[#1D1D1F] cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
            Set {i + 1} · {s.reps} {prettifyExerciseName(s.exercise).toLowerCase()} · {formatTime(s.start_s)}
          </button>
        ))}

        {/* Details */}
        <div className="relative ml-auto">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            aria-expanded={detailsOpen}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium text-[#1D1D1F] cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
            Details
          </button>
          {detailsOpen && (
            <div className="absolute right-0 bottom-full mb-2 z-20 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl ring-1 ring-black/[0.06] p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#1D1D1F]">Overlay</span>
                <div className="flex items-center p-1 bg-[#F5F5F7] rounded-full" role="group" aria-label="Overlay style">
                  {(['styled', 'raw'] as OverlayMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setOverlayMode(mode)}
                      aria-pressed={overlayMode === mode}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                        overlayMode === mode ? 'bg-[#1D1D1F] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {mode === 'raw' ? 'Raw' : 'Styled'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#1D1D1F]">Speed</span>
                <div className="flex items-center p-1 bg-[#F5F5F7] rounded-full">
                  {[1, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                        playbackSpeed === spd ? 'bg-[#1D1D1F] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {spd}&times;
                    </button>
                  ))}
                </div>
              </div>
              {(!activeVideoUrl || videoLoadError || customVideoUrl) && (
                <>
                  <input type="file" ref={fileInputRef} accept="video/*" className="hidden" onChange={handleFileSelect} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium text-[#1D1D1F] cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {customVideoUrl ? 'Change video file' : 'Use your own video file'}
                  </button>
                </>
              )}
              <p className="text-[11px] text-[#86868B] leading-relaxed">
                {overlayMode === 'raw'
                  ? `Raw overlay.json${data.overlay?.fps ? ` · ${data.overlay.fps} fps` : ''}. Keypoints under 0.3 confidence were removed by the backend.`
                  : 'Styled overlay drawn from the same pipeline output.'}{' '}
                {clipWidth}&times;{clipHeight}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
