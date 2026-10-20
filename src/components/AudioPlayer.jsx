import { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Heart, ListMusic, Shuffle, Repeat, ChevronDown, ChevronUp,
  Disc, Music, Plus,
} from 'lucide-react';
import api from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

/* ============================================
   Audio Player Context & Provider
   ============================================ */
const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(() => {
    try {
      const saved = sessionStorage.getItem('podcast_current_track');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('podcast_player_volume');
    return saved !== null ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  const progressSaveRef = useRef(null);
  const podcastEpisodesRef = useRef([]);
  const currentTrackRef = useRef(null);
  const [podcastEpisodes, setPodcastEpisodes] = useState([]);

  // Restore audio source when track is revived from sessionStorage after page reload
  useEffect(() => {
    if (currentTrack?.audioUrl && audioRef.current && !audioRef.current.src) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.load();
    }
  }, []);

  // Persist current track to sessionStorage (survives page reloads)
  useEffect(() => {
    if (currentTrack) {
      sessionStorage.setItem('podcast_current_track', JSON.stringify(currentTrack));
    } else {
      sessionStorage.removeItem('podcast_current_track');
    }
  }, [currentTrack]);

  // Keep refs in sync with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Persist volume
  useEffect(() => {
    localStorage.setItem('podcast_player_volume', String(volume));
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Auto-save progress every 15 seconds
  useEffect(() => {
    if (!isPlaying || !currentTrack) {
      clearInterval(progressSaveRef.current);
      return;
    }
    progressSaveRef.current = setInterval(() => {
      if (audioRef.current && duration > 0) {
        const pct = Math.round((audioRef.current.currentTime / duration) * 100);
        api.post('/progress', { episodeId: currentTrack.id, progress: pct }).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(progressSaveRef.current);
  }, [isPlaying, currentTrack, duration]);

  // Fetch episodes for current track's podcast (for auto-advance & episode table)
  useEffect(() => {
    if (!currentTrack?.id) {
      podcastEpisodesRef.current = [];
      setPodcastEpisodes([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      let pid = currentTrack.podcastId;
      if (!pid) {
        try {
          const res = await api.get(`/admin/episodes/${currentTrack.id}`);
          if (!cancelled) pid = res.data.data?.podcastId;
        } catch {
          return;
        }
      }
      if (pid && !cancelled) {
        try {
          const res = await api.get('/admin/episodes', { params: { podcastId: pid, pageSize: 100 } });
          const list = res.data.data || [];
          if (!cancelled) {
            podcastEpisodesRef.current = list;
            setPodcastEpisodes(list);
          }
        } catch {
          podcastEpisodesRef.current = [];
          setPodcastEpisodes([]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentTrack?.id]);

  const play = useCallback((track) => {
    if (!audioRef.current) return;
    if (currentTrack?.id === track.id) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(0);
    audioRef.current.src = track.audioUrl;
    audioRef.current.load();
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    // Log play event
    api.post('/history', { episodeId: track.id }).catch(() => {});
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying, currentTrack]);

  const seek = useCallback((time) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((val) => {
    setVolumeState(val);
    if (audioRef.current) audioRef.current.volume = val;
    if (val > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const skipForward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
  }, []);

  const addToQueue = useCallback((track) => {
    setQueue((q) => {
      const next = [...q, track];
      queueRef.current = next;
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((index) => {
    setQueue((q) => {
      const next = q.filter((_, i) => i !== index);
      queueRef.current = next;
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    queueRef.current = [];
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    const q = queueRef.current;
    if (q.length > 0) {
      const next = q[0];
      queueRef.current = q.slice(1);
      setQueue(q.slice(1));
      if (audioRef.current && next.audioUrl) {
        setCurrentTrack(next);
        setCurrentTime(0);
        setDuration(0);
        audioRef.current.src = next.audioUrl;
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        api.post('/history', { episodeId: next.id }).catch(() => {});
      }
      return;
    }
    // Queue empty — try auto-advance to next episode from same podcast
    const episodes = podcastEpisodesRef.current;
    const track = currentTrackRef.current;
    if (episodes.length > 0 && track) {
      const idx = episodes.findIndex(e => e.id === track.id);
      if (idx >= 0 && idx < episodes.length - 1) {
        const next = episodes[idx + 1];
        if (audioRef.current && next.audioUrl) {
          setCurrentTrack(next);
          setCurrentTime(0);
          setDuration(0);
          audioRef.current.src = next.audioUrl;
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          api.post('/history', { episodeId: next.id }).catch(() => {});
        }
      }
    }
  }, []);

  const value = {
    currentTrack, isPlaying, currentTime, duration, volume, isMuted,
    queue, audioRef, podcastEpisodes,
    play, togglePlay, seek, setVolume, toggleMute,
    skipForward, skipBackward,
    addToQueue, removeFromQueue, clearQueue, stop,
  };

  return (
    <AudioContext.Provider value={value}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
      {children}
      <AudioPlayer />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}

/* ============================================
   Helper: format seconds → m:ss
   ============================================ */
function formatTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ============================================
   Now Playing Mini Bar — always visible
   ============================================ */
function NowPlayingBar({ onExpand }) {
  const { currentTrack, isPlaying, togglePlay, currentTime, duration, volume, isMuted, skipForward, skipBackward, seek, toggleMute, stop } = useAudio();
  const barRef = useRef(null);
  const coverRef = useRef(null);
  const progressRef = useRef(null);
  const glowRef = useRef(null);
  const spinnerTween = useRef(null);

  // Animate cover art spin
  useEffect(() => {
    if (!coverRef.current) return;
    if (isPlaying) {
      spinnerTween.current = gsap.to(coverRef.current, {
        rotation: 360,
        duration: 4,
        repeat: -1,
        ease: 'none',
      });
    } else {
      if (spinnerTween.current) spinnerTween.current.pause();
    }
    return () => { if (spinnerTween.current) spinnerTween.current.kill(); };
  }, [isPlaying]);

  // Animate glow pulse
  useEffect(() => {
    if (!glowRef.current) return;
    if (isPlaying) {
      gsap.to(glowRef.current, {
        boxShadow: '0 0 30px rgba(139,61,255,0.4), 0 0 60px rgba(139,61,255,0.15)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    } else {
      gsap.to(glowRef.current, { boxShadow: '0 0 15px rgba(139,61,255,0.15)', duration: 0.3 });
    }
  }, [isPlaying]);

  // Entry animation
  useEffect(() => {
    if (!barRef.current) return;
    gsap.fromTo(barRef.current, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  return (
    <>
      <div className="h-[var(--player-height)]" />
      <div
        ref={barRef}
        className="fixed bottom-0 left-0 right-0 z-[var(--z-overlay)] h-[var(--player-height)]"
    >
      <div className="h-full bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)] shadow-[var(--shadow-deep)]">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="absolute top-0 left-0 right-0 h-1 cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div className="h-full bg-[var(--color-border)] rounded-full">
            <div
              className="h-full rounded-full relative transition-[width] duration-100"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #8B3DFF, #00A8FF, #8B3DFF)',
                backgroundSize: '200% 100%',
              }}
            >
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                style={{ boxShadow: '0 0 15px rgba(139,61,255,0.6)' }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center h-full px-4 md:px-6 gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 w-[200px] md:w-[280px]">
            <div
              ref={glowRef}
              className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden shrink-0"
              style={{ borderRadius: '10px', boxShadow: '0 0 15px rgba(139,61,255,0.15)' }}
            >
            {currentTrack?.coverImage ? (
              <img
                ref={coverRef}
                src={currentTrack.coverImage}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                style={{ transformOrigin: 'center center' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.parentElement?.querySelector('.fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <div
              ref={currentTrack?.coverImage ? undefined : coverRef}
              className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-accent-purple)]/40 to-[var(--color-accent-orange)]/20 fallback ${currentTrack?.coverImage ? 'hidden' : ''}`}
              style={{ transformOrigin: 'center center' }}
            >
              <Music size={18} className="text-white/70" />
            </div>
            </div>
            <div className="min-w-0 hidden md:block">
              <p className="text-small font-medium text-[var(--text-primary)] truncate">
                {currentTrack?.title || 'Not Playing'}
              </p>
              <p className="text-caption text-[var(--text-tertiary)] truncate">
                {currentTrack?.host || currentTrack?.podcastTitle || ''}
              </p>
            </div>
          </div>

          {/* Controls */}
          <nav className="flex-1 flex items-center justify-center gap-3 md:gap-4">
            <button
              onClick={skipBackward}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Skip backward 10 seconds"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-purple), var(--color-accent-blue))',
                boxShadow: isPlaying ? '0 0 25px rgba(139,61,255,0.5)' : 'none',
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={18} className="text-white" />
              ) : (
                <Play size={18} className="text-white ml-0.5" fill="currentColor" />
              )}
            </button>

            <button
              onClick={skipForward}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward size={18} />
            </button>
          </nav>

          {/* Time + Volume */}
          <div className="hidden md:flex items-center gap-3 w-[200px] justify-end">
            <span className="text-caption text-[var(--text-tertiary)] tabular-nums min-w-[4rem] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            <button
              onClick={onExpand}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Expand player"
            >
              <ChevronUp size={16} />
            </button>

            <button
              onClick={stop}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--color-danger)] transition-colors ml-1"
              aria-label="Close player"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Mobile time */}
          <span className="md:hidden text-caption text-[var(--text-tertiary)] tabular-nums">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>
    </div>
    </>
  );
}

/* ============================================
   Full Player — expanded view
   ============================================ */
function FullPlayer({ onClose }) {
  const {
    currentTrack, isPlaying, togglePlay, currentTime, duration,
    volume, isMuted, setVolume, toggleMute,
    skipForward, skipBackward, seek,
    queue, addToQueue, removeFromQueue, clearQueue,
    play, podcastEpisodes,
  } = useAudio();
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const coverRef = useRef(null);
  const progressRef = useRef(null);
  const barsRef = useRef([]);
  const [isLiked, setIsLiked] = useState(false);
  const spinnerTween = useRef(null);
  const barTween = useRef(null);

  // Entry animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.fromTo(panelRef.current,
        { y: '100%' },
        { y: 0, duration: 0.5, ease: 'power4.out' }
      );
      gsap.fromTo(coverRef.current, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.2 });
    });
    return () => ctx.revert();
  }, []);

  // Cover spin
  useEffect(() => {
    if (!coverRef.current) return;
    if (isPlaying) {
      spinnerTween.current = gsap.to(coverRef.current, {
        rotation: 360, duration: 5, repeat: -1, ease: 'none',
      });
    } else {
      if (spinnerTween.current) spinnerTween.current.pause();
    }
    return () => { if (spinnerTween.current) spinnerTween.current.kill(); };
  }, [isPlaying]);

  // Animated waveform bars
  useEffect(() => {
    if (!barsRef.current.length) return;
    if (isPlaying) {
      barTween.current = gsap.to(barsRef.current, {
        scaleY: () => 0.3 + Math.random() * 0.7,
        duration: 0.2,
        ease: 'none',
        stagger: 0.03,
        repeat: -1,
        yoyo: true,
        transformOrigin: 'bottom',
      });
    } else {
      if (barTween.current) {
        barTween.current.kill();
        gsap.to(barsRef.current, { scaleY: 0.15, duration: 0.3, ease: 'power2.out', transformOrigin: 'bottom' });
      }
    }
    return () => { if (barTween.current) barTween.current.kill(); };
  }, [isPlaying]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  const handleProgressHover = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    progressRef.current.style.setProperty('--hover-pct', `${ratio * 100}%`);
  };

  const handleAddToQueue = () => {
    if (currentTrack) addToQueue(currentTrack);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[var(--z-overlay)] flex items-end"
      style={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-h-[85vh] bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)] rounded-t-3xl overflow-y-auto"
      >
        {/* Close bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-4 pb-2 bg-[var(--color-surface)]/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[var(--color-accent-purple)] animate-pulse" />
            <span className="text-caption text-[var(--text-tertiary)] font-medium uppercase tracking-widest">Now Playing</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label="Minimize player"
          >
            <ChevronDown size={20} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left column: Album art + Controls */}
            <div className="lg:w-[420px] shrink-0">
              <div className="flex flex-col sm:flex-row lg:flex-col items-center sm:items-start lg:items-center gap-6">
                {/* Album art */}
                <div className="shrink-0">
                  <div className="relative">
                    <div
                      className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139,61,255,0.3), rgba(0,168,255,0.15), rgba(139,61,255,0.1))',
                        boxShadow: '0 0 60px rgba(139,61,255,0.2), 0 25px 60px rgba(0,0,0,0.5)',
                      }}
                    >
                      {currentTrack?.coverImage ? (
                        <img
                          ref={coverRef}
                          src={currentTrack.coverImage}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                          style={{ transformOrigin: 'center center' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentElement?.querySelector('.fp-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        ref={currentTrack?.coverImage ? undefined : coverRef}
                        className={`w-full h-full flex items-center justify-center fp-fallback ${currentTrack?.coverImage ? 'hidden' : ''}`}
                        style={{ transformOrigin: 'center center' }}
                      >
                        <Disc size={60} className="text-white/30" />
                      </div>
                    </div>

                    {/* Glow ring */}
                    {isPlaying && (
                      <div
                        className="absolute -inset-4 rounded-[2rem] opacity-50"
                        style={{
                          background: 'radial-gradient(circle, rgba(139,61,255,0.15) 0%, transparent 70%)',
                          animation: 'pulse 2s ease-in-out infinite',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Info + Controls */}
                <div className="flex-1 w-full max-w-sm">
                  {/* Track info */}
                  <div className="mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-1 truncate">
                      {currentTrack?.title || 'Not Playing'}
                    </h2>
                    <p className="text-sm md:text-base text-[var(--text-secondary)]">
                      {currentTrack?.host || currentTrack?.podcastTitle || ''}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div
                      ref={progressRef}
                      className="relative h-2 bg-[var(--color-border)] rounded-full cursor-pointer group mb-2"
                      onClick={handleProgressClick}
                      onMouseMove={handleProgressHover}
                    >
                      <div
                        className="h-full rounded-full relative"
                        style={{
                          width: `${progressPct}%`,
                          background: 'linear-gradient(90deg, #8B3DFF, #00A8FF, #FF7A00, #8B3DFF)',
                          backgroundSize: '200% 100%',
                          transition: 'width 0.1s linear',
                        }}
                      >
                        <div
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                          style={{ boxShadow: '0 0 20px rgba(139,61,255,0.6)' }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-caption text-[var(--text-tertiary)] tabular-nums">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Main controls */}
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <button
                      onClick={skipBackward}
                      className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label="Skip backward 10 seconds"
                    >
                      <SkipBack size={22} />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-accent-purple), var(--color-accent-blue))',
                        boxShadow: isPlaying ? '0 0 40px rgba(139,61,255,0.5), 0 8px 32px rgba(139,61,255,0.3)' : '0 8px 32px rgba(0,0,0,0.3)',
                      }}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause size={26} className="text-white" />
                      ) : (
                        <Play size={26} className="text-white ml-1" fill="currentColor" />
                      )}
                    </button>
                    <button
                      onClick={skipForward}
                      className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label="Skip forward 10 seconds"
                    >
                      <SkipForward size={22} />
                    </button>
                  </div>

                  {/* Secondary controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsLiked(!isLiked)}
                        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors"
                        aria-label={isLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart
                          size={18}
                          className={isLiked ? 'text-[var(--color-accent-purple)] fill-[var(--color-accent-purple)]' : 'text-[var(--text-tertiary)]'}
                        />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleMute}
                          className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors"
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted || volume === 0 ? <VolumeX size={16} className="text-[var(--text-tertiary)]" /> : <Volume2 size={16} className="text-[var(--text-tertiary)]" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-16 h-1 appearance-none bg-[var(--color-border)] rounded-full cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                          style={{
                            background: `linear-gradient(to right, var(--color-accent-purple) ${(isMuted ? 0 : volume) * 100}%, var(--color-border) ${(isMuted ? 0 : volume) * 100}%)`,
                          }}
                          aria-label="Volume"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddToQueue}
                      className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors"
                      aria-label="Add to queue"
                    >
                      <ListMusic size={18} className="text-[var(--text-tertiary)]" />
                    </button>
                  </div>

                  {/* Waveform visualization */}
                  <div className="flex items-end justify-center gap-1 mt-6 h-10" aria-hidden="true">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div
                        key={i}
                        ref={(el) => (barsRef.current[i] = el)}
                        className="w-1 rounded-full"
                        style={{
                          height: '10px',
                          background: i % 4 === 0
                            ? 'var(--color-accent-purple)'
                            : i % 4 === 1
                              ? 'var(--color-accent-blue)'
                              : i % 4 === 2
                                ? 'var(--color-accent-orange)'
                                : 'var(--color-accent-purple)',
                          opacity: 0.7,
                          transformOrigin: 'bottom',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Episodes from this podcast */}
            <div className="flex-1 min-w-0 border-t lg:border-t-0 lg:border-l border-[var(--color-border)] pt-6 lg:pt-0 lg:pl-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-card font-semibold flex items-center gap-2">
                  <Music size={16} className="text-[var(--color-accent-purple-light)]" />
                  {currentTrack?.podcastTitle || currentTrack?.host || 'Episodes'}
                </h3>
                <span className="text-caption text-[var(--text-tertiary)]">{podcastEpisodes.length} episodes</span>
              </div>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                {podcastEpisodes.length === 0 ? (
                  <p className="text-caption text-[var(--text-tertiary)] py-8 text-center">
                    No episode data available for this podcast.
                  </p>
                ) : (
                  podcastEpisodes.map((ep, i) => {
                    const isCurrent = currentTrack?.id === ep.id;
                    return (
                      <div
                        key={ep.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors group ${
                          isCurrent
                            ? 'bg-[var(--color-accent-purple)]/10 ring-1 ring-[var(--color-accent-purple)]/30'
                            : 'hover:bg-[var(--color-surface-hover)] cursor-pointer'
                        }`}
                        onClick={() => { if (!isCurrent) play(ep); }}
                        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isCurrent) { e.preventDefault(); play(ep); } }}
                        tabIndex={isCurrent ? -1 : 0}
                        role="button"
                        aria-label={`${isCurrent ? 'Now playing: ' : 'Play '}${ep.title}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-[var(--color-accent-purple)]'
                            : 'bg-[var(--color-accent-purple)]/10 group-hover:bg-[var(--color-accent-purple)]/20'
                        }`}>
                          {isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          ) : (
                            <Play size={13} className="text-[var(--color-accent-purple-light)] ml-0.5" fill="currentColor" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium truncate ${isCurrent ? 'text-[var(--color-accent-purple-light)]' : 'text-[var(--text-primary)]'}`}>
                            {ep.title}
                          </p>
                          <p className="text-caption text-[var(--text-tertiary)]">
                            {ep.duration || ''}{ep.date ? ` · ${new Date(ep.date).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); addToQueue(ep); }}
                          className="p-1.5 rounded-md text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-accent-purple-light)] transition-all shrink-0"
                          aria-label={`Add ${ep.title} to queue`}
                          title="Add to queue"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-card font-semibold flex items-center gap-2">
                  <ListMusic size={16} className="text-[var(--color-accent-purple-light)]" />
                  Up Next ({queue.length})
                </h3>
                <button
                  onClick={clearQueue}
                  className="text-caption text-[var(--text-tertiary)] hover:text-[var(--color-danger)] transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {queue.map((track, i) => (
                  <motion.div
                    key={`${track.id}-${i}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors group"
                  >
                    <span className="text-caption text-[var(--text-tertiary)] w-5 text-right">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-purple)]/15 flex items-center justify-center shrink-0">
                      <Music size={14} className="text-[var(--color-accent-purple-light)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-small font-medium truncate">{track.title}</p>
                      <p className="text-caption text-[var(--text-tertiary)] truncate">{track.host || track.podcastTitle}</p>
                    </div>
                    <button
                      onClick={() => removeFromQueue(i)}
                      className="p-1.5 rounded-md text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-danger)] transition-all"
                      aria-label="Remove from queue"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   Audio Player — switches mini / full
   ============================================ */
export default function AudioPlayer() {
  const { currentTrack } = useAudio();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Short delay to allow GSAP intro to finish before player appears
    const timer = setTimeout(() => setMounted(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!currentTrack || !mounted) return null;

  if (expanded) {
    return <FullPlayer onClose={() => setExpanded(false)} />;
  }

  return <NowPlayingBar onExpand={() => setExpanded(true)} />;
}
