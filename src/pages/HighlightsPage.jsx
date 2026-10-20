import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../components/layout';
import HighlightCard from '../components/highlights/HighlightCard';
import { Sparkles, Search, ChevronDown, Loader, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAudio } from '../components/AudioPlayer';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'endTime-startTime', label: 'Duration' },
];

export default function HighlightsPage() {
  const navigate = useNavigate();
  const { play, seek } = useAudio();
  const [highlights, setHighlights] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCollection, setActiveCollection] = useState(null);
  const [sort, setSort] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchHighlights();
    fetchCollections();
  }, [page, activeCollection, sort]);

  const fetchHighlights = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (activeCollection) params.collectionId = activeCollection;
      const res = await api.get('/highlights', { params });
      setHighlights(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch highlights:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await api.get('/highlight-collections');
      setCollections(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    }
  };

  const handlePlay = (highlight) => {
    if (highlight.episode?.audioUrl && highlight.episode?.id) {
      play({
        id: highlight.episode.id,
        title: highlight.episode.title,
        audioUrl: highlight.episode.audioUrl,
        coverImage: highlight.episode.feed?.podcast?.coverImage || '',
      });
      if (highlight.startTime > 0) {
        setTimeout(() => seek(highlight.startTime), 300);
      }
    }
  };

  const filtered = highlights.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.title?.toLowerCase().includes(q) ||
      h.description?.toLowerCase().includes(q) ||
      (h.episode?.title || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'confidence') return b.confidence - a.confidence;
    if (sort === 'endTime-startTime') {
      const durA = (a.endTime || 0) - (a.startTime || 0);
      const durB = (b.endTime || 0) - (b.startTime || 0);
      return durB - durA;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
      <Container>
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginBottom: 24, padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Sparkles size={24} style={{ color: '#3B82F6' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              AI Highlights
            </h1>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.45)', maxWidth: 500, margin: '0 auto' }}>
            Intelligent clips and key moments extracted from your podcast episodes
          </p>
        </div>

        {/* Search + Sort bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              placeholder="Search highlights..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 38px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: '#fff', fontSize: '0.85rem', outline: 'none',
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                padding: '10px 32px 10px 14px', borderRadius: 10, appearance: 'none',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Collection filters */}
        {collections.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveCollection(null)}
              style={{
                padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)',
                background: !activeCollection ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: !activeCollection ? '#60A5FA' : 'rgba(255,255,255,0.5)',
                fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              All
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => setActiveCollection(col.id)}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)',
                  background: activeCollection === col.id ? `${col.color}25` : 'transparent',
                  color: activeCollection === col.id ? col.color : 'rgba(255,255,255,0.5)',
                  fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {col.name}
              </button>
            ))}
          </div>
        )}

        {/* Highlights grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader size={24} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Sparkles size={40} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.35)' }}>
              {search ? 'No highlights match your search' : 'No highlights yet. They will appear once episodes are processed.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {sorted.map((highlight) => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                variant="compact"
                onPlay={handlePlay}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, paddingBottom: 40 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: page <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                cursor: page <= 1 ? 'default' : 'pointer', fontSize: '0.82rem',
              }}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', padding: '0 12px' }}>
              Page {page} of {Math.ceil(total / pageSize)}
            </span>
            <button
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage(page + 1)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: page >= Math.ceil(total / pageSize) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
                cursor: page >= Math.ceil(total / pageSize) ? 'default' : 'pointer', fontSize: '0.82rem',
              }}
            >
              Next
            </button>
          </div>
        )}
      </Container>
    </div>
  );
}
