import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, Input, LoadingSkeleton } from '../../components/ui';
import { fetchAdminHighlightById, updateAdminHighlight, approveHighlight, rejectHighlight, fetchHighlightCollections } from '../../services/data';
import { useToast } from '../../components/ui/Toast';
import TrimRange from '../../components/highlights/TrimRange';
import { Save, Check, X, ArrowLeft } from 'lucide-react';

export default function AdminHighlightEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: 0,
    endTime: 60,
    tags: [],
    collectionId: '',
    status: 'pending',
  });

  const isNew = id === 'new';

  useEffect(() => {
    fetchCollections();
    if (!isNew) {
      if (!id || id === 'undefined') {
        addToast('Invalid highlight ID.', 'error');
        navigate('/admin/highlights');
        return;
      }
      loadHighlight();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadHighlight = async () => {
    try {
      const res = await fetchAdminHighlightById(id);
      const hl = res.data;
      setForm({
        title: hl.title || '',
        description: hl.description || '',
        startTime: hl.startTime || 0,
        endTime: hl.endTime || 60,
        tags: typeof hl.tags === 'string' ? JSON.parse(hl.tags || '[]') : (hl.tags || []),
        collectionId: hl.collectionId || '',
        status: hl.status || 'pending',
      });
    } catch {
      addToast('Failed to load highlight.', 'error');
      navigate('/admin/highlights');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetchHighlightCollections();
      setCollections(res.data || []);
    } catch { /* ignore */ }
  };

  const handleSave = async (newStatus) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        status: newStatus || form.status,
      };
      if (isNew) {
        addToast('Please create highlights via episode detection.', 'error');
        return;
      }
      await updateAdminHighlight(id, payload);
      addToast('Highlight saved.', 'success');
      if (newStatus === 'approved') {
        await approveHighlight(id);
        addToast('Highlight approved.', 'success');
      } else if (newStatus === 'rejected') {
        await rejectHighlight(id);
        addToast('Highlight rejected.', 'success');
      }
      navigate('/admin/highlights');
    } catch {
      addToast('Failed to save highlight.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTagAdd = (tag) => {
    if (!tag.trim() || form.tags.includes(tag.trim())) return;
    setForm({ ...form, tags: [...form.tags, tag.trim()] });
  };

  const handleTagRemove = (tag) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading..." breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Highlights', to: '/admin/highlights' }, { label: 'Edit' }]} />
        <Card><LoadingSkeleton rows={10} columns={2} /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Highlight' : 'Edit Highlight'}
        description={isNew ? 'Create a new highlight manually' : `Status: ${form.status}`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/admin' },
          { label: 'Highlights', to: '/admin/highlights' },
          { label: isNew ? 'New' : 'Edit' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Main form */}
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Highlight title"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: '#fff', fontSize: '0.92rem', outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what this highlight covers"
                rows={4}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, resize: 'vertical',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: '#fff', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>Tags</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem',
                      background: 'rgba(59,130,246,0.15)', color: '#60A5FA',
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => handleTagRemove(tag)}
                      style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type a tag and press Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTagAdd(e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: '#fff', fontSize: '0.82rem', outline: 'none',
                }}
              />
            </div>

            <div>
              <TrimRange
                min={0}
                max={3600}
                startTime={form.startTime}
                endTime={form.endTime}
                step={1}
                label="Clip Range"
                onChange={({ startTime, endTime }) => setForm({ ...form, startTime, endTime })}
              />
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status card */}
          <Card padding={false}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Status
              </p>
              <p style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 500, margin: 0 }}>
                {form.status}
              </p>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>
                Collection
              </label>
              <select
                value={form.collectionId}
                onChange={(e) => setForm({ ...form, collectionId: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: '#fff', fontSize: '0.82rem', outline: 'none',
                }}
              >
                <option value="">No collection</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* Actions */}
          <Card padding={false}>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="primary" onClick={() => handleSave()} loading={saving} fullWidth>
                <Save size={16} /> Save Changes
              </Button>
              {form.status !== 'approved' && (
                <Button variant="success" onClick={() => handleSave('approved')} loading={saving} fullWidth>
                  <Check size={16} /> Approve & Save
                </Button>
              )}
              {form.status !== 'rejected' && (
                <Button variant="danger" onClick={() => handleSave('rejected')} loading={saving} fullWidth>
                  <X size={16} /> Reject
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate('/admin/highlights')} fullWidth>
                <ArrowLeft size={16} /> Back
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
