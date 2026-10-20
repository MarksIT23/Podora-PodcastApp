import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '../components/layout';
import HighlightCard from '../components/highlights/HighlightCard';
import { ArrowLeft, Loader, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useAudio } from '../components/AudioPlayer';

export default function HighlightCollectionPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { play, seek } = useAudio();
  const [collection, setCollection] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [colRes, hlRes] = await Promise.all([
        api.get('/highlight-collections'),
        api.get('/highlights'),
      ]);
      const collections = colRes.data.data || [];
      const found = collections.find((c) => c.slug === slug);
      if (found) {
        setCollection(found);
        // Filter highlights by this collection
        const allHl = hlRes.data.data || [];
        setHighlights(allHl.filter((h) => h.collection?.id === found.id));
      } else {
        setCollection(null);
      }
    } catch (err) {
      console.error('Failed to fetch collection:', err);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 120, display: 'flex', justifyContent: 'center' }}>
        <Loader size={24} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
    );
  }

  if (!collection) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
        <Container>
          <button onClick={() => navigate('/highlights')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginBottom: 24 }}>
            <ArrowLeft size={16} /> Back to Highlights
          </button>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.35)' }}>Collection not found</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
      <Container>
        <button
          onClick={() => navigate('/highlights')}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginBottom: 24, padding: 0,
          }}
        >
          <ArrowLeft size={16} /> Back to Highlights
        </button>

        {/* Collection header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 8, height: 32, borderRadius: 4, background: collection.color || '#3B82F6' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              {collection.name}
            </h1>
          </div>
          {collection.description && (
            <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.45)', marginLeft: 20 }}>
              {collection.description}
            </p>
          )}
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginLeft: 20, marginTop: 4 }}>
            {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Highlights grid */}
        {highlights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Sparkles size={40} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.35)' }}>
              No highlights in this collection yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, paddingBottom: 40 }}>
            {highlights.map((h) => (
              <HighlightCard
                key={h.id}
                highlight={h}
                variant="compact"
                onPlay={handlePlay}
              />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
