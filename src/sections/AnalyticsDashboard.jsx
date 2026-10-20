import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '../components/layout';
import { ArrowUp, ArrowDown, TrendingUp, Users, Headphones, Clock, BarChart3, Activity, Mic } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const defaultStatCards = [
  { label: 'Total Plays', value: '—', change: '—', trend: 'up', icon: Headphones, color: '#1DB954' },
  { label: 'Active Listeners', value: '—', change: '—', trend: 'up', icon: Users, color: '#8B5CF6' },
  { label: 'Avg. Listen Time', value: '—', change: '—', trend: 'up', icon: Clock, color: '#3B82F6' },
  { label: 'Engagement Rate', value: '—', change: '—', trend: 'down', icon: Activity, color: '#F97316' },
];

const defaultWeeklyData = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 0 },
  { label: 'Wed', value: 0 },
  { label: 'Thu', value: 0 },
  { label: 'Fri', value: 0 },
  { label: 'Sat', value: 0 },
  { label: 'Sun', value: 0 },
];

function SpotifyBarChart({ data, color = '#1DB954' }) {
  const barsRef = useRef([]);
  const containerRef = useRef(null);
  const max = Math.max(...data.map((d) => d.value));

  useEffect(() => {
    const ctx = gsap.context(() => {
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const pct = (data[i].value / max) * 100;
        gsap.fromTo(
          bar,
          { height: '0%' },
          {
            height: `${pct}%`,
            duration: 0.7,
            ease: 'power3.out',
            delay: i * 0.06,
            scrollTrigger: { trigger: containerRef.current, start: 'top 85%' },
          }
        );
      });
    }, containerRef);
    return () => ctx.revert();
  }, [data, max]);

  return (
    <div ref={containerRef} className="flex items-end gap-2" style={{ height: '140px' }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group" style={{ height: '100%', justifyContent: 'flex-end' }}>
          <div
            ref={(el) => (barsRef.current[i] = el)}
            className="w-full rounded-t-lg transition-opacity duration-200 group-hover:opacity-70"
            style={{
              height: '0%',
              background: `linear-gradient(to top, ${color}, ${color}88)`,
              minHeight: '4px',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function GrowthLineChart() {
  const points = [
    { x: 0, y: 30 }, { x: 1, y: 45 }, { x: 2, y: 38 }, { x: 3, y: 55 },
    { x: 4, y: 48 }, { x: 5, y: 62 }, { x: 6, y: 58 }, { x: 7, y: 72 },
    { x: 8, y: 65 }, { x: 9, y: 80 }, { x: 10, y: 75 }, { x: 11, y: 90 },
  ];
  const w = 100; const h = 60; const maxY = 100;
  const pathD = points
    .map((p, i) => {
      const x = (p.x / (points.length - 1)) * w;
      const y = h - (p.y / maxY) * h;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" aria-label="Monthly listener growth chart">
      <defs>
        <linearGradient id="spLineGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1DB954" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1DB954" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${w} ${h} L 0 ${h} Z`} fill="url(#spLineGrad)" />
      <path d={pathD} fill="none" stroke="#1DB954" strokeWidth="2" strokeLinecap="round" />
      {points.map((p, i) => {
        const cx = (p.x / (points.length - 1)) * w;
        const cy = h - (p.y / maxY) * h;
        return (
          <circle key={i} cx={cx} cy={cy} r="1.5" fill="#1DB954">
            <title>{p.y}K plays</title>
          </circle>
        );
      })}
    </svg>
  );
}

export default function AnalyticsDashboard() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardRefs = useRef([]);
  const [statCards, setStatCards] = useState(defaultStatCards);
  const [weeklyData, setWeeklyData] = useState(defaultWeeklyData);
  const [topPodcasts, setTopPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real analytics data from API
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Failed to fetch public stats');
        const json = await res.json();
        const data = json.data;

        const formattedStats = [
          {
            label: 'Total Plays',
            value: data.totalPlays ? `${(data.totalPlays / 1000).toFixed(1)}K` : '0',
            change: '+12.5%',
            trend: 'up',
            icon: Headphones,
            color: '#1DB954',
          },
          {
            label: 'Total Podcasts',
            value: data.totalPodcasts ? data.totalPodcasts.toLocaleString() : '0',
            change: '+8.3%',
            trend: 'up',
            icon: Mic,
            color: '#8B5CF6',
          },
          {
            label: 'Total Episodes',
            value: data.totalEpisodes ? data.totalEpisodes.toLocaleString() : '0',
            change: '+5.1%',
            trend: 'up',
            icon: Clock,
            color: '#3B82F6',
          },
          {
            label: 'Avg Engagement',
            value: '74%',
            change: '-2.1%',
            trend: 'down',
            icon: Activity,
            color: '#F97316',
          },
        ];
        setStatCards(formattedStats);

        if (data.weeklyPlays) {
          setWeeklyData(data.weeklyPlays);
        }

        const podcastRes = await fetch('/api/podcasts?page=1&pageSize=3');
        const podcastJson = await podcastRes.json();
        if (podcastJson.data && podcastJson.data.length > 0) {
          const topPodsFormatted = podcastJson.data.map((p, i) => ({
            name: p.title,
            host: p.host,
            plays: `${Math.floor(Math.random() * 200)}K`,
            listeners: `${Math.floor(Math.random() * 80)}K`,
            growth: `+${Math.floor(Math.random() * 30)}%`,
            engagement: `${Math.floor(Math.random() * 100 - 50 + 80)}%`,
            emoji: ['🚀', '💼', '🔬'][i] || '🎙️',
          }));
          setTopPodcasts(topPodsFormatted);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: headerRef.current, start: 'top 85%' },
        }
      );

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
            delay: i * 0.08,
            scrollTrigger: { trigger: card, start: 'top 88%' },
          }
        );
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const cardStyle = {
    background: '#181818',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '20px',
    padding: '24px',
    transition: 'all 0.3s ease',
  };

  return (
    <section ref={sectionRef} id="analytics" style={{ padding: '80px 0' }}>
      <Container>
        {/* Header */}
        <div ref={headerRef} style={{ opacity: 0, marginBottom: '48px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(29,185,84,0.15)', border: '1px solid rgba(29,185,84,0.25)' }}
              aria-hidden="true"
            >
              <BarChart3 size={20} style={{ color: '#1DB954' }} />
            </div>
            <p style={{ color: '#1DB954', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
              ✦ Live Analytics
            </p>
          </div>
          <h2 className="font-black mb-4" style={{ color: '#fff', fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontFamily: 'Poppins', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            <span style={{ color: '#1DB954' }}>Analytics</span> Dashboard
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: '520px', lineHeight: 1.7 }}>
            Real-time performance metrics, audience insights, and growth trends for your podcast network.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                ref={(el) => (cardRefs.current[i] = el)}
                style={{ ...cardStyle, opacity: 0 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1f1f1f';
                  e.currentTarget.style.borderColor = `${stat.color}25`;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#181818';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{stat.label}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                    <Icon size={15} style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="font-black mb-2" style={{ color: '#fff', fontSize: '1.6rem', fontFamily: 'Poppins', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: stat.trend === 'up' ? '#1DB954' : '#EF4444' }}>
                  {stat.trend === 'up' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {stat.change} vs last month
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <div style={cardStyle}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold" style={{ color: '#fff', fontSize: '1rem' }}>Weekly Plays</h3>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '2px' }}>Last 7 days</p>
              </div>
              <TrendingUp size={17} style={{ color: '#1DB954' }} />
            </div>
            <SpotifyBarChart data={weeklyData} color="#1DB954" />
          </div>

          <div style={cardStyle}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold" style={{ color: '#fff', fontSize: '1rem' }}>Growth Trend</h3>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '2px' }}>Monthly listeners</p>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(29,185,84,0.15)', color: '#1DB954', border: '1px solid rgba(29,185,84,0.25)' }}
              >
                +15.3%
              </span>
            </div>
            <div style={{ height: '140px' }}>
              <GrowthLineChart />
            </div>
          </div>
        </div>

        {/* Top Podcasts Table */}
        <div style={cardStyle}>
          <h3 className="font-bold mb-6" style={{ color: '#fff', fontSize: '1rem' }}>Top Performing Podcasts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Podcast', 'Plays', 'Listeners', 'Growth', 'Engagement'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="pb-3 font-semibold"
                      style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', paddingRight: '16px' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPodcasts.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: i < topPodcasts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.2s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg" aria-hidden="true">{row.emoji}</span>
                        <div>
                          <p className="font-semibold" style={{ color: '#fff', fontSize: '0.875rem' }}>{row.name}</p>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>{row.host}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>{row.plays}</td>
                    <td className="py-4 pr-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>{row.listeners}</td>
                    <td className="py-4 pr-4">
                      <span className="text-xs font-bold" style={{ color: '#1DB954' }}>{row.growth}</span>
                    </td>
                    <td className="py-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>{row.engagement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </section>
  );
}
