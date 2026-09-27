import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  Sliders,
  Sparkles,
  Camera,
  Activity,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DetectionSnapshot, PoseSkeleton, ScenarioMetadata } from '../types/schema';
import { videoSourceService } from '../services/videoSource';

interface VideoOverlayProps {
  scenario: ScenarioMetadata;
  selectedPersonId: string;
  detections: DetectionSnapshot[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onReset: () => void;
  onEndSession: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  customVideoUrl?: string | null;
}

export const VideoOverlay: React.FC<VideoOverlayProps> = ({
  scenario,
  selectedPersonId,
  detections,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onReset,
  onEndSession,
  playbackSpeed,
  onChangeSpeed,
  customVideoUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [showHUD, setShowHUD] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [videoLoadError, setVideoLoadError] = useState(false);

  // Sync custom video or mp4 if available
  useEffect(() => {
    setVideoLoadError(false);
  }, [scenario.id, customVideoUrl]);

  // Audio chirp synthesizer for completed rep feedback
  const lastRepRef = useRef<number>(0);
  const selectedDetection = detections.find((d) => d.person_id === selectedPersonId);

  useEffect(() => {
    if (!soundEnabled || !selectedDetection) return;
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
        // AudioContext restricted before first user gesture
      }
    }
    if (selectedDetection.current_reps === 0) {
      lastRepRef.current = 0;
    }
  }, [selectedDetection?.current_reps, soundEnabled, selectedDetection]);

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Render loop on Canvas
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // If no real video element or video errored, render high fidelity synthetic CCTV gym feed
    const video = videoRef.current;
    const isPlayingVideo = video && !videoLoadError && video.readyState >= 2 && !video.paused;

    if (isPlayingVideo && video) {
      ctx.drawImage(video, 0, 0, w, h);
    } else {
      videoSourceService.renderSimulatedCCTVFrame(ctx, w, h, scenario.id, currentTime);
    }

    // 1. CCTV HUD (Security camera telemetry)
    if (showHUD) {
      // Top Left: Security Camera Tag & Timecode
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(16, 16, 260, 48);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(16, 16, 260, 48);

      // REC Dot
      ctx.fillStyle = isPlaying ? '#ef4444' : '#71717a';
      ctx.beginPath();
      ctx.arc(32, 34, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(`${scenario.camera_tag}`, 46, 32);

      const mins = Math.floor(currentTime / 60);
      const secs = Math.floor(currentTime % 60);
      const ms = Math.floor((currentTime % 1) * 100);
      const timeStr = `REC 00:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
      ctx.fillStyle = '#10b981';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(timeStr, 46, 48);

      // Top Right: Edge Hardware pill
      const edgeBoxW = 200;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(w - edgeBoxW - 16, 16, edgeBoxW, 48);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(w - edgeBoxW - 16, 16, edgeBoxW, 48);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('EDGE AI: RASPBERRY PI 5', w - edgeBoxW - 6, 32);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`31ms | 29.8 FPS | RTSP ONVIF`, w - edgeBoxW - 6, 48);

      // Camera Reticles (Crosshairs at center and corners)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      const cornerLen = 14;
      // top-left
      ctx.beginPath();
      ctx.moveTo(8, 8 + cornerLen);
      ctx.lineTo(8, 8);
      ctx.lineTo(8 + cornerLen, 8);
      // top-right
      ctx.moveTo(w - 8 - cornerLen, 8);
      ctx.lineTo(w - 8, 8);
      ctx.lineTo(w - 8, 8 + cornerLen);
      // bottom-left
      ctx.moveTo(8, h - 8 - cornerLen);
      ctx.lineTo(8, h - 8);
      ctx.lineTo(8 + cornerLen, h - 8);
      // bottom-right
      ctx.moveTo(w - 8 - cornerLen, h - 8);
      ctx.lineTo(w - 8, h - 8);
      ctx.lineTo(w - 8, h - 8 - cornerLen);
      ctx.stroke();
    }

    // 2. Render Detections (Bounding Boxes & Skeletons)
    detections.forEach((det) => {
      const isSelected = det.person_id === selectedPersonId;
      const bx = det.bbox.x * w;
      const by = det.bbox.y * h;
      const bw = det.bbox.w * w;
      const bh = det.bbox.h * h;

      // Draw Bounding Box
      if (showBBoxes) {
        if (isSelected) {
          // Tactical corner brackets for focused lifter
          const corner = Math.min(22, bw * 0.25);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;

          ctx.beginPath();
          // top-left
          ctx.moveTo(bx, by + corner);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx + corner, by);
          // top-right
          ctx.moveTo(bx + bw - corner, by);
          ctx.lineTo(bx + bw, by);
          ctx.lineTo(bx + bw, by + corner);
          // bottom-left
          ctx.moveTo(bx, by + bh - corner);
          ctx.lineTo(bx, by + bh);
          ctx.lineTo(bx + corner, by + bh);
          // bottom-right
          ctx.moveTo(bx + bw - corner, by + bh);
          ctx.lineTo(bx + bw, by + bh);
          ctx.lineTo(bx + bw, by + bh - corner);
          ctx.stroke();

          // Semi-transparent box fill
          ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
          ctx.fillRect(bx, by, bw, bh);

          // Top label badge: Tracking ID + Exercise + Rep Count
          const label = `${det.exercise_name} • REPS: ${det.current_reps}`;
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(label).width;

          ctx.fillStyle = '#10b981';
          ctx.fillRect(bx, by - 22, textWidth + 14, 20);
          ctx.fillStyle = '#09090b';
          ctx.fillText(label, bx + 7, by - 8);
        } else {
          // Secondary detected lifter in background
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(bx, by, bw, bh);
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(24, 24, 27, 0.85)';
          ctx.fillRect(bx, by - 18, 90, 16);
          ctx.fillStyle = '#a1a1aa';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(`MEMBER #${det.person_id.toUpperCase()}`, bx + 4, by - 6);
        }
      }

      // Draw Pose Skeleton
      if (showSkeleton && det.skeleton && (isSelected || !showBBoxes)) {
        const s = det.skeleton;
        const color = isSelected ? '#34d399' : 'rgba(148, 163, 184, 0.6)';
        const jointFill = isSelected ? '#00f0ff' : '#94a3b8';

        // Bone connection pairs
        const bones: [keyof PoseSkeleton, keyof PoseSkeleton][] = [
          // Torso
          ['left_shoulder', 'right_shoulder'],
          ['left_shoulder', 'left_hip'],
          ['right_shoulder', 'right_hip'],
          ['left_hip', 'right_hip'],
          // Left Arm
          ['left_shoulder', 'left_elbow'],
          ['left_elbow', 'left_wrist'],
          // Right Arm
          ['right_shoulder', 'right_elbow'],
          ['right_elbow', 'right_wrist'],
          // Left Leg
          ['left_hip', 'left_knee'],
          ['left_knee', 'left_ankle'],
          // Right Leg
          ['right_hip', 'right_knee'],
          ['right_knee', 'right_ankle'],
        ];

        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.strokeStyle = color;

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

        // Draw Joint circles
        Object.entries(s).forEach(([name, pt]) => {
          if (!pt) return;
          const px = pt.x * w;
          const py = pt.y * h;

          ctx.beginPath();
          ctx.arc(px, py, isSelected ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = jointFill;
          ctx.fill();
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Angle arc annotation for selected active lifter
          if (
            isSelected &&
            ((name === 'left_knee' && scenario.id === 'scenario-1') ||
              (name === 'right_elbow' && scenario.id === 'scenario-2') ||
              (name === 'left_elbow' && scenario.id === 'scenario-3'))
          ) {
            ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.fillText(`${det.primary_angle.angle}°`, px + 10, py - 4);

            // Small circular indicator ring
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(px, py, 14, 0, Math.PI * (det.primary_angle.angle / 180));
            ctx.stroke();
          }
        });
      }
    });
  }, [
    scenario,
    selectedPersonId,
    detections,
    currentTime,
    isPlaying,
    showHUD,
    showBBoxes,
    showSkeleton,
    videoLoadError,
  ]);

  useEffect(() => {
    let animId: number;
    const render = () => {
      drawFrame();
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [drawFrame]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Viewport Aspect Canvas & Video */}
      <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
        {/* Hidden or underlying video element for real mp4 files if available */}
        <video
          ref={videoRef}
          src={customVideoUrl || scenario.video_url}
          className="hidden"
          playsInline
          muted
          loop
          onError={() => setVideoLoadError(true)}
        />

        {/* Tactical Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Overlay Badges & Big Projector Mode Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
          {/* Quick HUD toggles */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-zinc-800/80 text-xs">
            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              className={`px-2 py-1 rounded font-mono transition-colors ${
                showSkeleton
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Skeleton
            </button>
            <button
              onClick={() => setShowBBoxes(!showBBoxes)}
              className={`px-2 py-1 rounded font-mono transition-colors ${
                showBBoxes
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              BBoxes
            </button>
            <button
              onClick={() => setShowHUD(!showHUD)}
              className={`px-2 py-1 rounded font-mono transition-colors ${
                showHUD
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              CCTV HUD
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Feedback Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Toggle rep sound chirp"
              className="p-2 rounded-lg bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 text-zinc-300 hover:text-white transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen (Projector Mode)"
              className="p-2 rounded-lg bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 text-zinc-300 hover:text-white transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Media Controller Bar */}
      <div className="bg-zinc-900/95 border-t border-zinc-800 px-4 py-3 flex flex-col gap-2">
        {/* Scrubber Slider */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-400 w-12 text-right">
            {Math.floor(currentTime)}s
          </span>
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />
          <span className="font-mono text-xs text-zinc-400 w-12">
            {Math.floor(duration || 30)}s
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            {/* Main Start / Pause Simulation Button */}
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md active:scale-95 ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20 ring-2 ring-emerald-400/40'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Simulation</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Simulation</span>
                </>
              )}
            </button>

            {/* Reset / Replay */}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold font-mono border border-zinc-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center rounded-xl bg-zinc-800/80 p-0.5 border border-zinc-700 text-xs font-mono">
              {[1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onChangeSpeed(speed)}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-emerald-500 text-zinc-950 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* End Session Button */}
          <button
            onClick={onEndSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider transition-all hover:border-emerald-400"
          >
            <span>Finish & View Summary</span>
            <Activity className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
