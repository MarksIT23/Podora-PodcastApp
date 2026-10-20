import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '../components/layout';
import { Play, Headphones, TrendingUp, Zap, Pause } from 'lucide-react';
import { useAudio } from '../components/AudioPlayer';
import { fetchLatestEpisodes } from '../services/public';

gsap.registerPlugin(ScrollTrigger);

const waveHeights = [16, 28, 40, 24, 36, 20, 44, 30, 18, 38, 26, 42, 22, 34, 16, 40, 28, 20, 36, 24, 44, 18, 32, 14, 38, 26, 30, 22, 36, 18];

function formatTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function LiveWaveform({ isActive }) {
  const barsRef = useRef([]);

  useEffect(() => {
    const bars = barsRef.current;
    if (!bars.length) return;

    if (!isActive) {
      // Static bars — show a flat-ish resting state
      bars.forEach((bar) => {
        gsap.set(bar, { scaleY: 0.35 });
      });
      return;
    }

    bars.forEach((bar, i) => {
      gsap.to(bar, {
        scaleY: () => 0.25 + Math.random() * 0.75,
        duration: () => 0.3 + Math.random() * 0.4,
        ease: 'power1.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 0.05,
      });
    });

    return () => bars.forEach((bar) => bar && gsap.killTweensOf(bar));
  }, [isActive]);

  return (
    <div className="flex items-end gap-[3px]" style={{ height: '48px' }} aria-hidden="true">
      {waveHeights.map((h, i) => (
        <div
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          className="rounded-full"
          style={{
            width: '3px',
            height: `${h}px`,
            transformOrigin: 'bottom',
            background:
              i % 4 === 0
                ? '#1DB954'
                : i % 4 === 1
                  ? 'rgba(29,185,84,0.65)'
                  : i % 4 === 2
                    ? 'rgba(29,185,84,0.4)'
                    : 'rgba(29,185,84,0.2)',
          }}
        />
      ))}
    </div>
  );
}

export default function Hero({ introComplete }) {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const badgeRef = useRef(null);
  const headlineRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const line3Ref = useRef(null);
  const subRef = useRef(null);
  const ctaRef = useRef(null);
  const trustRef = useRef(null);
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const statsRowRef = useRef([]);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);
  const parallaxLayerRef = useRef(null);
  const cursorGlowRef = useRef(null);
  const cursorTrailRef = useRef(null);
  const [featuredEpisode, setFeaturedEpisode] = useState(null);
  const [episodeLoading, setEpisodeLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const { currentTrack, isPlaying, currentTime, duration, play, togglePlay } = useAudio();

  // Fetch a random episode to feature in the hero card
  useEffect(() => {
    fetchLatestEpisodes({ pageSize: 50 })
      .then((res) => {
        const episodes = res.data || [];
        if (episodes.length > 0) {
          const random = episodes[Math.floor(Math.random() * episodes.length)];
          setFeaturedEpisode(random);
        }
      })
      .catch(() => {})
      .finally(() => setEpisodeLoading(false));
  }, []);

  const isCurrentTrack = featuredEpisode && currentTrack?.id === featuredEpisode.id;

  // ─── Continuous ambient animations (orbs, card float, stats) ───
  // Runs immediately on mount — these don't need to wait for the intro.
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Background orbs float
      gsap.to(orb1Ref.current, {
        x: 40, y: -30,
        duration: 7,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
      gsap.to(orb2Ref.current, {
        x: -50, y: 40,
        duration: 9,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 2,
      });
      gsap.to(orb3Ref.current, {
        x: 30, y: 60,
        duration: 11,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 4,
      });

      // Card floating
      gsap.to(cardRef.current, {
        y: -14,
        duration: 4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.5,
      });

      // Stats counter (scroll-triggered)
      statsRowRef.current.forEach((el, i) => {
        if (!el) return;
        gsap.fromTo(
          el,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            delay: 1.2 + i * 0.12,
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // ─── Hero entrance timeline ───
  // Waits for the GSAPIntro overlay to finish before triggering.
  useEffect(() => {
    if (!introComplete) return;

    const ctx = gsap.context(() => {
      gsap.set(
        [badgeRef.current, line1Ref.current, line2Ref.current, line3Ref.current, subRef.current, ctaRef.current, trustRef.current],
        { opacity: 0, y: 40 }
      );
      gsap.set(cardRef.current, { opacity: 0, scale: 0.85, y: 60 });
      gsap.set(glowRef.current, { opacity: 0 });

      const tl = gsap.timeline();
      tl.to(badgeRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
        .to(line1Ref.current, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.35')
        .to(line2Ref.current, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
        .to(line3Ref.current, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
        .to(subRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4')
        .to(ctaRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4')
        .to(trustRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4')
        .to(glowRef.current, { opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=0.8')
        .to(
          cardRef.current,
          { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'back.out(1.5)' },
          '-=1.0'
        );
    }, sectionRef);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introComplete]);

  // ─── Mouse-reactive parallax + card tilt + cursor glow + trail ───
  // Uses gsap.quickTo for smooth, high-performance updates on every mousemove.
  useEffect(() => {
    const section = sectionRef.current;
    const glow = cursorGlowRef.current;
    const trail = cursorTrailRef.current;
    const layer = parallaxLayerRef.current;
    const card = cardRef.current;
    if (!section || !glow || !trail || !layer || !card) return;

    // Quick-to functions — one per axis per element
    const layerX = gsap.quickTo(layer, 'x', { duration: 2, ease: 'power3.out' });
    const layerY = gsap.quickTo(layer, 'y', { duration: 2, ease: 'power3.out' });
    const cardRotX = gsap.quickTo(card, 'rotateX', { duration: 1.5, ease: 'power2.out' });
    const cardRotY = gsap.quickTo(card, 'rotateY', { duration: 1.5, ease: 'power2.out' });

    // Main glow follows quickly, trail lags behind for a comet-like feel
    const glowX = gsap.quickTo(glow, 'x', { duration: 0.5, ease: 'power2.out' });
    const glowY = gsap.quickTo(glow, 'y', { duration: 0.5, ease: 'power2.out' });
    const trailX = gsap.quickTo(trail, 'x', { duration: 1.4, ease: 'power2.out' });
    const trailY = gsap.quickTo(trail, 'y', { duration: 1.4, ease: 'power2.out' });

    // Same quickTo approach for scale/opacity — much smoother than gsap.to
    // on every mousemove because the underlying tween is never killed & restarted.
    const glowScale = gsap.quickTo(glow, 'scale', { duration: 0.4, ease: 'power2.out' });
    const glowOpacity = gsap.quickTo(glow, 'opacity', { duration: 0.4, ease: 'power2.out' });
    const trailScale = gsap.quickTo(trail, 'scale', { duration: 0.6, ease: 'power2.out' });
    const trailOpacity = gsap.quickTo(trail, 'opacity', { duration: 0.6, ease: 'power2.out' });

    // ── Speed-reactive scaling ──
    // Glows flare up when you move fast, settle when still.
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;

    const handleMouseMove = (e) => {
      const now = performance.now();
      const dt = Math.max(now - lastTime, 16);

      let speed = 0;
      if (lastTime > 0) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        speed = Math.sqrt(dx * dx + dy * dy) / dt;
      }

      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = now;

      // Speed → scale mapping (smooth, clamped)
      const factor = Math.min(speed * 4, 2.0);
      glowScale(0.85 + factor * 0.4);
      glowOpacity(0.35 + factor * 0.25);
      trailScale(0.9 + factor * 0.25);
      trailOpacity(0.15 + factor * 0.2);

      // Parallax + tilt
      const { left, top, width, height } = section.getBoundingClientRect();
      const nx = ((e.clientX - left) / width - 0.5) * 2;
      const ny = ((e.clientY - top) / height - 0.5) * 2;

      layerX(nx * 30);
      layerY(ny * 20);
      cardRotX(-ny * 8);
      cardRotY(nx * 8);

      // Glow positions centred on cursor
      glowX(e.clientX - 125);
      glowY(e.clientY - 125);
      trailX(e.clientX - 200);
      trailY(e.clientY - 200);
    };

    // ── Click burst ──
    // Expands and brightens both glows on click.
    const handleClick = () => {
      gsap.to(glow, {
        scale: 1.6,
        opacity: 0.7,
        duration: 0.12,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      gsap.to(trail, {
        scale: 2.0,
        opacity: 0.4,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  const [analytics, setAnalytics] = useState(null);
  const [quickStats, setQuickStats] = useState([
    { icon: Headphones, label: '50K+ Episodes', color: '#1DB954' },
    { icon: TrendingUp, label: '10K+ Creators', color: '#8B5CF6' },
    { icon: Zap, label: 'AI Powered', color: '#3B82F6' },
  ]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const payload = json?.data ?? {};
        if (!mounted) return;
        setAnalytics(payload);
        const plays = payload.totalPlays ? payload.totalPlays.toLocaleString() : '0';
        const creators = payload.totalCreators || payload.totalUsers || 0;
        setQuickStats([
          { icon: Headphones, label: `${plays} plays`, color: '#1DB954' },
          { icon: TrendingUp, label: `${creators.toLocaleString()} creators`, color: '#8B5CF6' },
          { icon: Zap, label: 'AI Powered', color: '#3B82F6' },
        ]);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ paddingTop: 'var(--nav-height)', paddingBottom: '6rem' }}
      aria-label="Hero section"
    >
      {/* ── Cursor trail (slow, larger, purple — comet tail feel) ── */}
      <div
        ref={cursorTrailRef}
        className="fixed pointer-events-none z-[9997]"
        style={{
          width: '400px',
          height: '400px',
          top: 0,
          left: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.03) 40%, transparent 55%)',
        }}
        aria-hidden="true"
      />

      {/* ── Cursor glow (fast, green) ── */}
      <div
        ref={cursorGlowRef}
        className="fixed pointer-events-none z-[9998]"
        style={{
          width: '250px',
          height: '250px',
          top: 0,
          left: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,185,84,0.2) 0%, rgba(29,185,84,0.06) 35%, transparent 55%)',
        }}
        aria-hidden="true"
      />

      {/* ── Ambient orbs with mouse parallax ── */}
      <div ref={parallaxLayerRef} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          ref={orb1Ref}
          className="absolute rounded-full"
          style={{
            width: '700px', height: '700px',
            top: '-200px', left: '-200px',
            background: 'radial-gradient(circle, rgba(29,185,84,0.12) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          ref={orb2Ref}
          className="absolute rounded-full"
          style={{
            width: '600px', height: '600px',
            bottom: '-150px', right: '-150px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          ref={orb3Ref}
          className="absolute rounded-full"
          style={{
            width: '400px', height: '400px',
            top: '40%', left: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)',
            filter: 'blur(50px)',
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <Container>
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">

          {/* ── Left: Content ── */}
          <div className="relative z-10">

            {/* Badge */}
            <div
              ref={badgeRef}
              className="inline-flex items-center gap-2.5 mb-8"
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                background: 'rgba(29,185,84,0.12)',
                border: '1px solid rgba(29,185,84,0.25)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#1DB954', boxShadow: '0 0 8px rgba(29,185,84,0.8)' }}
              />
              <span
                className="font-medium tracking-wide"
                style={{ color: '#1DB954', fontSize: '0.78rem', letterSpacing: '0.06em' }}
              >
                POWERED BY AI TECHNOLOGY
              </span>
            </div>

            {/* Headline — split lines for GSAP */}
            <h1 ref={headlineRef} className="text-hero mb-8" style={{ color: '#fff' }}>
              <span ref={line1Ref} className="block">DISCOVER</span>
              <span ref={line2Ref} className="block" style={{ color: 'rgba(255,255,255,0.45)' }}>
                THE FUTURE
              </span>
              <span
                ref={line3Ref}
                className="block"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #1DB954 0%, #1ED760 40%, #63D4F5 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                OF PODCASTS
              </span>
            </h1>

            {/* Subtext */}
            <p
              ref={subRef}
              className="text-body-large mb-10"
              style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '520px', lineHeight: 1.75 }}
            >
              AI-powered analytics, smart highlights, and seamless discovery.
              Experience the next generation of audio content.
            </p>

            {/* CTAs */}
            <div ref={ctaRef} className="flex flex-wrap gap-4 mb-12">
              <button
                onClick={() => {
                  document.getElementById('podcasts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="group relative inline-flex items-center gap-3 font-semibold overflow-hidden"
                style={{
                  padding: '14px 32px',
                  borderRadius: '999px',
                  background: '#1DB954',
                  color: '#000',
                  fontSize: '0.95rem',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 0 30px rgba(29,185,84,0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1ED760';
                  e.currentTarget.style.transform = 'scale(1.04)';
                  e.currentTarget.style.boxShadow = '0 0 50px rgba(29,185,84,0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1DB954';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(29,185,84,0.4)';
                }}
              >
                {/* Spotlight sweep */}
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                    transform: 'translateX(-100%)',
                    transition: 'none',
                  }}
                  ref={(el) => {
                    if (el) {
                      const btn = el.parentElement;
                      btn?.addEventListener('mouseenter', () => {
                        gsap.fromTo(el, { x: '-100%' }, { x: '200%', duration: 0.6, ease: 'power2.inOut' });
                      });
                    }
                  }}
                />
                <Play size={18} fill="black" className="relative z-10" />
                <span className="relative z-10">Explore Podcasts</span>
              </button>

              <button
                onClick={() => navigate('/podcasts')}
                className="inline-flex items-center gap-3 font-semibold"
                style={{
                  padding: '14px 32px',
                  borderRadius: '999px',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: '0.95rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Watch Demo
              </button>
            </div>

            {/* Trust indicator */}
            <div ref={trustRef} className="flex items-center gap-4">
              <div className="flex -space-x-3" aria-hidden="true">
                {['#1DB954', '#8B5CF6', '#3B82F6', '#F97316', '#EC4899'].map((color, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      backgroundColor: color,
                      borderColor: '#121212',
                      fontSize: '0.6rem',
                    }}
                  >
                    {['SC', 'JW', 'MR', 'AT', 'EP'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p
                  className="font-semibold"
                  style={{ color: '#fff', fontSize: '0.875rem' }}
                >
                  10,000+ creators
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                  already onboard
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3 mt-10">
              {quickStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    ref={(el) => (statsRowRef.current[i] = el)}
                    className="flex items-center gap-2"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Icon size={14} style={{ color: stat.color }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 500 }}>
                      {stat.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Podcast Card Visual ── */}
          <div className="relative flex items-center justify-center">
            {/* Glow behind card */}
            <div
              ref={glowRef}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: '420px', height: '420px',
                background: 'radial-gradient(circle, rgba(29,185,84,0.2) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)',
                filter: 'blur(50px)',
              }}
              aria-hidden="true"
            />

            <div
              ref={cardRef}
              className="relative"
              style={{ width: '380px', maxWidth: '90vw', transformStyle: 'preserve-3d' }}
            >
              {/* Main card */}
              <div
                className="rounded-3xl overflow-hidden"
                onClick={() => {
                  if (featuredEpisode?.podcastId) {
                    navigate(`/podcast/${featuredEpisode.podcastId}`);
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && featuredEpisode?.podcastId) {
                    e.preventDefault();
                    navigate(`/podcast/${featuredEpisode.podcastId}`);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${featuredEpisode?.podcastTitle || 'podcast'}`}
                style={{
                  cursor: 'pointer',
                  background: 'linear-gradient(145deg, #1a1a1a 0%, #282828 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
                }}
              >
                {/* Album art area */}
                <div
                  className="relative"
                  style={{ height: '220px', overflow: 'hidden' }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(29,185,84,0.25) 0%, rgba(139,92,246,0.25) 50%, rgba(59,130,246,0.2) 100%)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {featuredEpisode && featuredEpisode.coverImage && !imgError ? (
                      <img
                        src={featuredEpisode.coverImage}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center"
                        style={{
                          background: 'rgba(29,185,84,0.2)',
                          border: '1px solid rgba(29,185,84,0.3)',
                          backdropFilter: 'blur(8px)',
                          boxShadow: '0 0 40px rgba(29,185,84,0.3)',
                        }}
                      >
                        <span style={{ fontSize: '2.5rem' }}>🎙️</span>
                      </div>
                    )}
                  </div>
                  {/* Gradient overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: '60px',
                      background: 'linear-gradient(to bottom, transparent, #1a1a1a)',
                    }}
                  />
                </div>

                {/* Card content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-white mb-1 truncate pr-2" style={{ fontSize: '1.05rem' }}>
                        {featuredEpisode?.podcastTitle || 'Podcast'}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }} className="truncate">
                        {featuredEpisode?.title || 'Episode'}
                      </p>
                    </div>
                    {isCurrentTrack && isPlaying && (
                      <div
                        className="w-3 h-3 rounded-full animate-pulse shrink-0"
                        style={{ background: '#1DB954', boxShadow: '0 0 8px rgba(29,185,84,0.8)', marginTop: '4px' }}
                      />
                    )}
                  </div>

                  {/* Waveform */}
                  <LiveWaveform isActive={isCurrentTrack && isPlaying} />

                  {/* Progress */}
                  <div className="mt-4">
                    <div
                      className="rounded-full overflow-hidden"
                      style={{ height: '3px', background: 'rgba(255,255,255,0.12)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: isCurrentTrack && duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                          background: '#1DB954',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>
                        {isCurrentTrack ? formatTime(currentTime) : '0:00'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>
                        {featuredEpisode?.duration ? formatTime(Number(featuredEpisode.duration)) : ''}
                      </span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-6 mt-5">
                    <button style={{ color: 'rgba(255,255,255,0.4)' }} aria-label="Previous" disabled>
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                      </svg>
                    </button>
                    <button
                      className="flex items-center justify-center"
                      style={{
                        width: '52px', height: '52px',
                        borderRadius: '50%',
                        background: '#1DB954',
                        boxShadow: isCurrentTrack && isPlaying
                          ? '0 0 40px rgba(29,185,84,0.7)'
                          : '0 0 24px rgba(29,185,84,0.5)',
                        transition: 'all 0.2s ease',
                        color: '#000',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!featuredEpisode) return;
                        if (isCurrentTrack) {
                          togglePlay();
                        } else {
                          play(featuredEpisode);
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.boxShadow = '0 0 40px rgba(29,185,84,0.7)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = isCurrentTrack && isPlaying
                          ? '0 0 40px rgba(29,185,84,0.7)'
                          : '0 0 24px rgba(29,185,84,0.5)';
                      }}
                      aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
                    >
                      {isCurrentTrack && isPlaying ? (
                        <Pause size={22} fill="black" />
                      ) : (
                        <Play size={22} fill="black" />
                      )}
                    </button>
                    <button style={{ color: 'rgba(255,255,255,0.4)' }} aria-label="Next" disabled>
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zm7.5 6h2V6h-2v12z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating badge — AI */}
              <div
                className="absolute -top-5 -right-5 rounded-2xl px-4 py-2.5"
                style={{
                  background: '#282828',
                  border: '1px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <p className="font-semibold" style={{ color: '#A78BFA', fontSize: '0.78rem' }}>✦ AI Powered</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>Smart Highlights</p>
              </div>

              {/* Floating badge — Live */}
              <div
                className="absolute -bottom-5 -left-5 rounded-2xl px-4 py-2.5 flex items-center gap-2.5"
                style={{
                  background: '#282828',
                  border: '1px solid rgba(29,185,84,0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#1DB954', boxShadow: '0 0 6px rgba(29,185,84,0.8)' }}
                />
                <div>
                  <p className="font-semibold" style={{ color: '#fff', fontSize: '0.78rem' }}>Now Playing</p>
                  <p style={{ color: '#1DB954', fontSize: '0.68rem' }}>1,204 listeners</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '120px',
          background: 'linear-gradient(to bottom, transparent, rgba(10,10,10,0.8))',
        }}
        aria-hidden="true"
      />
    </section>
  );
}
