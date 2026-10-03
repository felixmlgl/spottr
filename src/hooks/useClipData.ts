/**
 * Cached pipeline data per demo clip, shared by the intro picker, the tabs and the replay view.
 * Each clip is fetched at most once per page load.
 */

import { useEffect, useState } from 'react';
import { PIPELINE_CLIPS, PipelineClip } from '../config';
import {
  LoadedPipelineData,
  PipelineSession,
  loadPipelineClip,
  loadPipelineSession,
} from '../services/pipelineAdapter';

const sessionCache = new Map<string, Promise<PipelineSession>>();
const clipCache = new Map<string, Promise<LoadedPipelineData>>();
const resolvedClips = new Map<string, LoadedPipelineData>();

export function findClip(clipId: string | null | undefined): PipelineClip | undefined {
  return PIPELINE_CLIPS.find((c) => c.id === clipId);
}

function fetchSession(clip: PipelineClip): Promise<PipelineSession> {
  let p = sessionCache.get(clip.id);
  if (!p) {
    p = loadPipelineSession(clip);
    sessionCache.set(clip.id, p);
  }
  return p;
}

/** Starts loading a clip's full data (session + ~800 KB overlay) without waiting for it. */
export function prefetchClip(clipId: string): Promise<LoadedPipelineData> | null {
  const clip = findClip(clipId);
  if (!clip) return null;
  let p = clipCache.get(clip.id);
  if (!p) {
    p = loadPipelineClip(clip).then((data) => {
      resolvedClips.set(clip.id, data);
      return data;
    });
    clipCache.set(clip.id, p);
  }
  return p;
}

/** session.json for every demo clip, keyed by clip id (missing until loaded). */
export function useClipSessions(): Record<string, PipelineSession> {
  const [sessions, setSessions] = useState<Record<string, PipelineSession>>({});

  useEffect(() => {
    let alive = true;
    PIPELINE_CLIPS.forEach((clip) => {
      fetchSession(clip).then((session) => {
        if (alive) setSessions((prev) => ({ ...prev, [clip.id]: session }));
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  return sessions;
}

/** Full pipeline data for one clip (null while loading or when clipId is unknown). */
export function useClipData(clipId: string | null): LoadedPipelineData | null {
  const [data, setData] = useState<LoadedPipelineData | null>(() =>
    clipId ? resolvedClips.get(clipId) ?? null : null
  );

  useEffect(() => {
    if (!clipId) {
      setData(null);
      return;
    }
    const cached = resolvedClips.get(clipId);
    setData(cached ?? null);
    if (cached) return;

    let alive = true;
    prefetchClip(clipId)?.then((loaded) => {
      if (alive) setData(loaded);
    });
    return () => {
      alive = false;
    };
  }, [clipId]);

  return data;
}
