import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PageHeader, StatCard, Card } from '../../components/ui';
import { Headphones, Bookmark, Clock, TrendingUp, Play, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchListeningHistory, fetchPodcasts, fetchCategories, fetchSavedPodcasts, fetchPublicStats } from '../../services/data';
import { useAudio } from '../../components/AudioPlayer';
import { staggerContainer, staggerItem } from '../../animations';

function parseMinutes(duration) {
  if (!duration) return 0;
  const str = String(duration);
  if (str.includes(':')) {
    const [m, s] = str.split(':').map(Number);
    return (m || 0) + ((s || 0) / 60);
  }
  const n = Number(duration);
  return isNaN(n) ? 0 : n;
}

function buildWeeklySeries(history) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  for (const item of history) {
    const d = new Date(item.playedAt);
    if (d >= weekStart) {
      counts[d.getDay()]++;
    }
  }

  return dayNames.map((label, i) => ({ label, value: counts[i] }));
}

function WeeklyChart({ data }) {
  if (!data || !data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-24 mt-4">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-[var(--radius-sm)] bg-gradient-to-t from-[var(--color-accent-purple)] to-[var(--color-accent-purple-light)] transition-all duration-500"
            style={{ height: `${(d.value / maxVal) * 100}%` }}
            title={`${d.label}: ${d.value.toLocaleString()} plays`}
          />
          <span className="text-caption text-[var(--text-tertiary)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { play } = useAudio();
  const [history, setHistory] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [continueListening, setContinueListening] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [totalPodcasts, setTotalPodcasts] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchListeningHistory({ pageSize: 5 }),
      fetchListeningHistory({ pageSize: 100 }),
      fetchCategories(),
      fetchPodcasts({ pageSize: 1 }),
      fetchSavedPodcasts(),
      fetchPublicStats(),
    ]).then(([histRes, histAll, catRes, podsRes, savedRes, statsRes]) => {
      setHistory(histRes.data);
      setAllHistory(histAll.data || []);
      const inProgress = (histAll.data || [])
        .filter((h) => h.progress > 0 && h.progress < 100)
        .slice(0, 4);
      setContinueListening(inProgress);
      setTopCategories([...catRes.data].sort((a, b) => b.podcastCount - a.podcastCount).slice(0, 4));
      setTotalPodcasts(podsRes.total);
      setTotalEpisodes(statsRes.data?.totalEpisodes || 0);
      setSavedCount((savedRes.data || []).length);
      setLoading(false);
    }).catch((err) => {
      setError(err.message || 'Failed to load dashboard data');
      setLoading(false);
    });
  }, []);

  // Computed stats
  const weeklyChartData = useMemo(() => buildWeeklySeries(allHistory), [allHistory]);
  const listensThisWeek = useMemo(() => weeklyChartData.reduce((s, d) => s + d.value, 0), [weeklyChartData]);
  const hoursListened = useMemo(() => {
    let total = 0;
    for (const item of allHistory) {
      if (item.duration && item.progress > 0) {
        total += parseMinutes(item.duration) * (item.progress / 100);
      }
    }
    return Math.round(total / 60);
  }, [allHistory]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title={`${greeting()}, ${user?.name?.split(' ')[0] || 'User'} 👋`} description="Loading your dashboard..." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader title={`${greeting()}, ${user?.name?.split(' ')[0] || 'User'} 👋`} description="Something went wrong loading your data." />
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-danger)]/30 text-center">
          <p className="text-[var(--color-danger)] mb-2">Failed to load dashboard</p>
          <p className="text-small text-[var(--text-tertiary)]">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-accent-purple)] text-white text-small hover:brightness-110 transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'User'} 👋`}
        description="Here's a quick look at your listening activity."
      />

      {/* Row 1: Key stats — compact, shows the essentials */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={staggerItem}>
          <StatCard label="Listens This Week" value={String(listensThisWeek)} icon={Headphones} color="var(--color-accent-purple)" />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard label="Saved Episodes" value={String(allHistory.length)} icon={Bookmark} color="var(--color-accent-blue)" />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard label="Following" value={String(savedCount)} icon={TrendingUp} color="var(--color-accent-orange)" />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard label="Hours Listened" value={String(hoursListened)} icon={Clock} color="var(--color-success)" />
        </motion.div>
      </motion.div>

      {/* Row 2: Listening activity (2/3) + Top categories (1/3) */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Combined listening section — chart + recent history */}
        <section className="lg:col-span-2">
          <Card variant="elevated" className="p-0">
            <div className="p-5 pb-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-card font-semibold flex items-center gap-2">
                  <Play size={16} className="text-[var(--color-accent-purple-light)]" /> Your Listening
                </h2>
                <button onClick={() => navigate('/library')} className="text-small text-[var(--color-accent-purple-light)] hover:underline flex items-center gap-1 transition-colors">
                  View Library <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>

              {/* Weekly chart */}
              <WeeklyChart data={weeklyChartData} />
              <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex justify-between text-small">
                <span className="text-[var(--text-tertiary)]">Total this week</span>
                <span className="text-[var(--text-primary)] font-medium">{listensThisWeek.toLocaleString()} plays</span>
              </div>
            </div>

            {/* Recently played — compact list attached below chart */}
            <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]/50">
              {history.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => play({ id: item.episodeId || item.id, audioUrl: item.audioUrl, title: item.episodeTitle, host: item.podcastTitle, podcastId: item.podcastId, podcastTitle: item.podcastTitle, coverImage: item.coverImage })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play({ id: item.episodeId || item.id, audioUrl: item.audioUrl, title: item.episodeTitle, host: item.podcastTitle, podcastId: item.podcastId, podcastTitle: item.podcastTitle, coverImage: item.coverImage }); } }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.episodeTitle} — ${item.progress}% complete`}>
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-purple)]/15 flex items-center justify-center shrink-0" aria-hidden="true">
                    <Play size={13} className="text-[var(--color-accent-purple-light)] ml-0.5" fill="currentColor" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-small font-medium truncate">{item.episodeTitle}</p>
                    <p className="text-caption text-[var(--text-tertiary)]">{item.podcastTitle}</p>
                  </div>
                  <span className="text-caption text-[var(--text-tertiary)] shrink-0">{item.progress}%</span>
                </div>
              ))}
              {history.length >= 3 && (
                <button onClick={() => navigate('/library')} className="w-full text-center text-small text-[var(--color-accent-purple-light)] hover:underline py-2.5 transition-colors">
                  View all history
                </button>
              )}
            </div>
          </Card>
        </section>

        {/* Top categories — compact sidebar card */}
        <section>
          <Card variant="elevated">
            <h2 className="text-card font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--color-accent-orange)]" /> Top Categories
            </h2>
            <div className="space-y-4">
              {topCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: cat.color + '20' }} aria-hidden="true">
                    <span style={{ color: cat.color }}>●</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-medium truncate">{cat.name}</p>
                    <p className="text-caption text-[var(--text-tertiary)]">{cat.podcastCount} podcasts</p>
                  </div>
                  <span className="text-small text-[var(--text-secondary)]">{totalPodcasts > 0 ? Math.round((cat.podcastCount / totalPodcasts) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick stat summary */}
          <Card variant="elevated" className="mt-4 p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-caption text-[var(--text-tertiary)]">Total podcasts</p>
                <p className="text-card font-semibold text-[var(--text-primary)]">{totalPodcasts}</p>
              </div>
              <div>
                <p className="text-caption text-[var(--text-tertiary)]">Total episodes</p>
                <p className="text-card font-semibold text-[var(--text-primary)]">{totalEpisodes}</p>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {/* Row 3: Continue Listening — single horizontal row, compact */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-card font-semibold flex items-center gap-2">
            <Play size={16} className="text-[var(--color-accent-purple-light)]" /> Continue Listening
          </h2>
          <button onClick={() => navigate('/library')} className="text-small text-[var(--color-accent-purple-light)] hover:underline flex items-center gap-1 transition-colors">
            View All <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {continueListening.map((ep, i) => {
            const podcastCover = ep.podcastId
              ? `https://picsum.photos/seed/podcast${typeof ep.podcastId === 'string' ? ep.podcastId.slice(-1) : ep.podcastId}/400/400`
              : 'https://picsum.photos/seed/default/400/400';
            return (
              <div
                key={ep.id || ep.episodeId}
onClick={() => play({ id: ep.episodeId || ep.id, audioUrl: ep.audioUrl, title: ep.episodeTitle || ep.title, host: ep.podcastTitle || ep.host, podcastId: ep.podcastId, podcastTitle: ep.podcastTitle || ep.host, coverImage: ep.coverImage })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play({ id: ep.episodeId || ep.id, audioUrl: ep.audioUrl, title: ep.episodeTitle || ep.title, host: ep.podcastTitle || ep.host, podcastId: ep.podcastId, podcastTitle: ep.podcastTitle || ep.host, coverImage: ep.coverImage }); } }}
                className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={`Continue listening to ${ep.episodeTitle || ep.title}`}
              >
                <div className="aspect-video bg-gradient-to-br from-[var(--color-accent-purple)]/20 to-[var(--color-accent-blue)]/10 flex items-center justify-center relative">
                  <img src={podcastCover} alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-[var(--color-border)] bg-[var(--color-surface)]" aria-hidden="true" loading="lazy" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center shadow-[var(--glow-purple)]">
                      <Play size={18} className="text-white ml-0.5" fill="white" aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-small font-medium truncate">{ep.episodeTitle || ep.title}</p>
                  <p className="text-caption text-[var(--text-tertiary)] mb-2 truncate">{ep.podcastTitle || ep.host}</p>
                  <div className="w-full h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-accent-purple)] rounded-full transition-all" style={{ width: `${ep.progress}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
