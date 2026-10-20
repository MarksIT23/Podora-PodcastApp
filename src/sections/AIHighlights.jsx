import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '../components/layout';
import { Sparkles, Clock, Bookmark, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useAudio } from '../components/AudioPlayer';

gsap.registerPlugin(ScrollTrigger);

const typeColors = {
  key_point: '#3B82F6',
  quote: '#8B5CF6',
  summary: '#1DB954',
  sentiment_shift: '#F97316',
};

const typeEmojis = {
  key_point: '🎯',
  quote: '💬',
  summary: '📝',
  sentiment_shift: '📊',
};

export default function AIHighlights() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardRefs = useRef([]);
  const { play, seek } = useAudio();
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    try {
      const res = await api.get('/highlights', { params: { pageSize: 4 } });
      const data = res.data?.data || [];
      if (data.length > 0) {
        setHighlights(data);
      }
    } catch {
      // API not available — no highlights to show (section will show empty state)
    }
  };

  useEffect(() => {
    if (highlights.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 85%' },
        }
      );

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { opacity: 0, x: i % 2 === 0 ? -30 : 30, y: 20 },
          {
            opacity: 1, x: 0, y: 0,
            duration: 0.65,
            ease: 'power3.out',
            delay: i * 0.08,
            scrollTrigger: { trigger: card, start: 'top 88%' },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [highlights]);

  const handlePlay = (item) => {
    if (item.episode?.audioUrl && item.episode?.id) {
      play({
        id: item.episode.id,
        title: item.episode.title,
        audioUrl: item.episode.audioUrl,
        coverImage: item.episode.feed?.podcast?.coverImage || '',
      });
      if (item.startTime > 0) {
        setTimeout(() => seek(item.startTime), 300);
      }
    }
  };

  const getAccentColor = (item) => {
    if (item.segments?.[0]?.label && typeColors[item.segments[0].label]) {
      return typeColors[item.segments[0].label];
    }
    return '#3B82F6';
  };

  const getEmoji = (item) => {
    if (item.segments?.[0]?.label && typeEmojis[item.segments[0].label]) {
      return typeEmojis[item.segments[0].label];
    }
    return '🤖';
  };

  return (
    <section
      ref={sectionRef}
      id="ai-highlights"
      style={{ padding: '80px 0' }}
      aria-label="AI-powered episode highlights"
    >
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: '100%',
          background: 'radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.05) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <Container className="relative">
        {/* Header */}
        <div ref={headerRef} style={{ opacity: highlights.length > 0 ? 0 : 1, marginBottom: '56px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.25)',
              }}
              aria-hidden="true"
            >
              <Sparkles size={20} style={{ color: '#60A5FA' }} />
            </div>
            <p
              style={{
                color: '#60A5FA',
                fontSize: '0.72rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              ✦ Powered by AI
            </p>
          </div>

          <h2
            className="font-black mb-4"
            style={{
              color: '#fff',
              fontSize: 'clamp(2rem, 4vw, 3.25rem)',
              fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
            }}
          >
            AI <span style={{ color: '#60A5FA' }}>Highlights</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '520px' }}>
            Smart episode summaries, key moments, sentiment analysis, and actionable insights — generated automatically.
          </p>
        </div>

        {/* Cards grid */}
        {highlights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {highlights.map((item, i) => {
              const accentColor = getAccentColor(item);
              const emoji = getEmoji(item);
              const parsedTags = typeof item.tags === 'string' ? JSON.parse(item.tags || '[]') : (item.tags || []);

              return (
                <article
                  key={item.id}
                  ref={(el) => (cardRefs.current[i] = el)}
                  className="group relative overflow-hidden cursor-pointer"
                  style={{
                    background: '#181818',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '20px',
                    padding: '28px',
                    transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                    opacity: 0,
                  }}
                  aria-label={`Highlight: ${item.title}`}
                  onClick={() => handlePlay(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1f1f1f';
                    e.currentTarget.style.borderColor = `${accentColor}30`;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 24px 60px rgba(0,0,0,0.5)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#181818';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    className="absolute top-0 left-8 right-8 h-[2px] rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                      opacity: 0.7,
                    }}
                    aria-hidden="true"
                  />

                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl"
                      style={{
                        background: `${accentColor}15`,
                        border: `1px solid ${accentColor}25`,
                      }}
                      aria-hidden="true"
                    >
                      {emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-bold mb-2 leading-snug"
                        style={{ color: '#fff', fontSize: '0.95rem' }}
                      >
                        {item.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed mb-4"
                        style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}
                      >
                        {item.description || 'AI-highlighted moment from this episode.'}
                      </p>

                      {parsedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4" aria-label="Topics:">
                          {parsedTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{
                                background: `${accentColor}15`,
                                color: accentColor,
                                border: `1px solid ${accentColor}25`,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div
                        className="flex items-center justify-between pt-4"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex items-center gap-4">
                          {item.episode?.title && (
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {item.episode.title}
                            </span>
                          )}
                        </div>
                        <button
                          className="flex items-center gap-1.5 text-xs font-semibold transition-colors duration-200"
                          style={{ color: accentColor }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          aria-label={`Play ${item.title}`}
                        >
                          <Clock size={11} aria-hidden="true" />
                          Listen
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
            <Sparkles size={32} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 12 }} />
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)' }}>
              Highlights will appear once episodes are processed.
            </p>
          </div>
        )}

        {/* View all */}
        <div className="text-center mt-12">
          <a
            href="/highlights"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-all duration-200"
            style={{ color: '#60A5FA' }}
            onMouseEnter={(e) => { e.currentTarget.style.gap = '12px'; }}
            onMouseLeave={(e) => { e.currentTarget.style.gap = '8px'; }}
          >
            View All AI Highlights
            <ChevronRight size={16} aria-hidden="true" />
          </a>
        </div>
      </Container>
    </section>
  );
}
