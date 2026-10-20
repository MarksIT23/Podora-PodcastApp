import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '../components/layout';
import HighlightCard from '../components/highlights/HighlightCard';
import { ArrowLeft, Loader } from 'lucide-react';
import api from '../services/api';
import { useAudio } from '../components/AudioPlayer';

export default function HighlightDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { play, seek } = useAudio();
  const [highlight, setHighlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHighlight();
  }, [id]);

  const fetchHighlight = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/highlights/${id}`);
      setHighlight(res.data.data);
    } catch (err) {
      setError('Highlight not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (highlight?.episode?.audioUrl && highlight?.episode?.id) {
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
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80, display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <Loader size={24} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
    );
  }

  if (error || !highlight) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
        <Container>
          <button onClick={() => navigate('/highlights')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginBottom: 24 }}>
            <ArrowLeft size={16} /> Back to Highlights
          </button>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.35)' }}>{error || 'Highlight not found'}</p>
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
            display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginBottom: 24,
            padding: 0, transition: 'color 0.2s',
          }}
        >
          <ArrowLeft size={16} /> Back to Highlights
        </button>

        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <HighlightCard
            highlight={highlight}
            variant="detailed"
            onPlay={handlePlay}
          />

          {/* Episode context */}
          {highlight.episode && (
            <div
              style={{
                marginTop: 20, padding: '16px 20px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
              }}
            >
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontWeight: 500 }}>
                FULL EPISODE
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 500, margin: 0 }}>
                    {highlight.episode.title}
                  </p>
                  {highlight.episode.duration && (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                      {Math.floor(highlight.episode.duration / 60)} min
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    play({
                      id: highlight.episode.id,
                      title: highlight.episode.title,
                      audioUrl: highlight.episode.audioUrl,
                      coverImage: highlight.episode.feed?.podcast?.coverImage || '',
                    });
                  }}
                  style={{
                    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.82rem',
                  }}
                >
                  Listen Full
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
