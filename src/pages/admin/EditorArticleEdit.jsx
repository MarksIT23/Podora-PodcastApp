import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader, Card, Button, Input, Tabs, Modal, Badge, LoadingSkeleton } from '../../components/ui';
import { fetchArticle, updateArticle, publishArticle, saveDraft, fetchDrafts } from '../../services/editor-api';
import { Save, Send, Eye, Archive, History, Plus, Trash2, GripVertical } from 'lucide-react';

export default function EditorArticleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    if (id) {
      Promise.all([
        fetchArticle(id),
        fetchDrafts(id),
      ]).then(([art, drs]) => {
        setArticle(art);
        setDrafts(drs || []);
        setLoading(false);
      }).catch(err => {
        console.error('Failed to load article:', err);
        setLoading(false);
      });
    }
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!article) return;
    setSaving(true);
    try {
      const updated = await updateArticle(article._id, article);
      setArticle(updated);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  }, [article]);

  const handlePublish = useCallback(async () => {
    if (!article) return;
    setSaving(true);
    try {
      await publishArticle(article._id);
      const updated = await fetchArticle(article._id);
      setArticle(updated);
    } catch (err) {
      console.error('Publish failed:', err);
    }
    setSaving(false);
  }, [article]);

  const handleSaveDraft = useCallback(async () => {
    if (!article) return;
    try {
      await saveDraft(article._id, article, 'editor');
      const drs = await fetchDrafts(article._id);
      setDrafts(drs || []);
    } catch (err) {
      console.error('Draft save failed:', err);
    }
  }, [article]);

  function updateField(field, value) {
    setArticle(prev => prev ? { ...prev, [field]: value } : prev);
  }

  function addBlock() {
    setArticle(prev => prev ? {
      ...prev,
      contentBlocks: [...(prev.contentBlocks || []), { type: 'text', order: (prev.contentBlocks?.length || 0), data: { content: '' } }],
    } : prev);
  }

  function updateBlock(index, data) {
    setArticle(prev => {
      if (!prev) return prev;
      const blocks = [...(prev.contentBlocks || [])];
      blocks[index] = { ...blocks[index], data: { ...blocks[index].data, ...data } };
      return { ...prev, contentBlocks: blocks };
    });
  }

  function removeBlock(index) {
    setArticle(prev => {
      if (!prev) return prev;
      const blocks = [...(prev.contentBlocks || [])];
      blocks.splice(index, 1);
      return { ...prev, contentBlocks: blocks };
    });
  }

  function moveBlock(index, direction) {
    setArticle(prev => {
      if (!prev) return prev;
      const blocks = [...(prev.contentBlocks || [])];
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return prev;
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return { ...prev, contentBlocks: blocks.map((b, i) => ({ ...b, order: i })) };
    });
  }

  if (loading) {
    return <LoadingSkeleton variant="page" count={6} />;
  }

  if (!article && !isNew) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-tertiary)]">Article not found.</p>
        <Button variant="ghost" onClick={() => navigate('/editor/articles')}>Back to Articles</Button>
      </div>
    );
  }

  const tabs = [
    { id: 'content', label: 'Content' },
    { id: 'meta', label: 'Metadata' },
    { id: 'seo', label: 'SEO' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={article?.title || 'New Article'}
        description={article?.status ? <Badge variant={article.status === 'published' ? 'success' : article.status === 'draft' ? 'neutral' : 'warning'}>{article.status}</Badge> : 'Draft'}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={!article?._id}>
              <History size={14} /> Save Draft
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDrafts(true)} disabled={drafts.length === 0}>
              <History size={14} /> History ({drafts.length})
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving || !article?._id}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save'}
            </Button>
            {article?.status !== 'published' && (
              <Button variant="primary" size="sm" onClick={handlePublish} disabled={saving}>
                <Send size={14} /> Publish
              </Button>
            )}
          </div>
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'content' && (
        <div className="space-y-4">
          <Input
            label="Title"
            value={article?.title || ''}
            onChange={e => updateField('title', e.target.value)}
            placeholder="Article title..."
          />

          <div className="flex items-start gap-3">
            {article?.coverImage ? (
              <div className="relative w-32 h-20 rounded-lg overflow-hidden shrink-0">
                <img src={article.coverImage} alt="" className="w-full h-full object-cover" />
                <button onClick={() => updateField('coverImage', '')} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <Trash2 size={10} className="text-white" />
                </button>
              </div>
            ) : null}
            <Input
              label="Cover Image URL"
              value={article?.coverImage || ''}
              onChange={e => updateField('coverImage', e.target.value)}
              placeholder="https://..."
              className="flex-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-card font-semibold">Content Blocks</h3>
            <Button variant="ghost" size="sm" onClick={addBlock}>
              <Plus size={14} /> Add Block
            </Button>
          </div>

          <div className="space-y-3">
            {(article?.contentBlocks || []).map((block, i) => (
              <Card key={i} variant="elevated" className="relative group">
                <div className="flex items-center gap-2 mb-2">
                  <button className="cursor-grab text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Drag to reorder">
                    <GripVertical size={14} />
                  </button>
                  <select
                    value={block.type}
                    onChange={e => {
                      const blocks = [...article.contentBlocks];
                      blocks[i] = { ...blocks[i], type: e.target.value };
                      updateField('contentBlocks', blocks);
                    }}
                    className="text-caption bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-2 py-1 text-[var(--text-primary)]"
                  >
                    <option value="text">Text</option>
                    <option value="heading">Heading</option>
                    <option value="image">Image</option>
                    <option value="quote">Quote</option>
                    <option value="embed">Embed</option>
                    <option value="list">List</option>
                  </select>
                  <div className="flex-1" />
                  {i > 0 && (
                    <button onClick={() => moveBlock(i, -1)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1">
                      ↑
                    </button>
                  )}
                  {i < (article?.contentBlocks?.length || 0) - 1 && (
                    <button onClick={() => moveBlock(i, 1)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1">
                      ↓
                    </button>
                  )}
                  <button onClick={() => removeBlock(i)} className="text-[var(--color-error)] hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>

                {block.type === 'heading' && (
                  <input
                    type="text"
                    value={block.data.content || ''}
                    onChange={e => updateBlock(i, { content: e.target.value })}
                    placeholder="Heading text..."
                    className="w-full bg-transparent text-h3 font-bold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                )}
                {block.type === 'text' && (
                  <textarea
                    value={block.data.content || ''}
                    onChange={e => updateBlock(i, { content: e.target.value })}
                    placeholder="Write your content here..."
                    rows={5}
                    className="w-full bg-transparent text-small text-[var(--text-primary)] outline-none resize-none placeholder:text-[var(--text-tertiary)]"
                  />
                )}
                {block.type === 'image' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={block.data.src || ''}
                      onChange={e => updateBlock(i, { src: e.target.value })}
                      placeholder="Image URL..."
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-small text-[var(--text-primary)] outline-none"
                    />
                    <input
                      type="text"
                      value={block.data.caption || ''}
                      onChange={e => updateBlock(i, { caption: e.target.value })}
                      placeholder="Caption (optional)"
                      className="w-full bg-transparent text-caption text-[var(--text-tertiary)] outline-none"
                    />
                  </div>
                )}
                {block.type === 'quote' && (
                  <div className="space-y-2">
                    <textarea
                      value={block.data.content || ''}
                      onChange={e => updateBlock(i, { content: e.target.value })}
                      placeholder="Quote text..."
                      rows={2}
                      className="w-full bg-transparent text-small italic text-[var(--text-primary)] border-l-2 border-[var(--color-accent-purple)] pl-4 outline-none resize-none"
                    />
                    <input
                      type="text"
                      value={block.data.attribution || ''}
                      onChange={e => updateBlock(i, { attribution: e.target.value })}
                      placeholder="— Attribution"
                      className="w-full bg-transparent text-caption text-[var(--text-tertiary)] outline-none"
                    />
                  </div>
                )}
                {block.type === 'embed' && (
                  <input
                    type="text"
                    value={block.data.url || ''}
                    onChange={e => updateBlock(i, { url: e.target.value })}
                    placeholder="https://... (YouTube, Twitter, etc.)"
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-small text-[var(--text-primary)] outline-none"
                  />
                )}
                {block.type === 'list' && (
                  <div className="space-y-1">
                    {(block.data.items || ['']).map((item, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="text-[var(--text-tertiary)]">•</span>
                        <input
                          type="text"
                          value={item}
                          onChange={e => {
                            const items = [...(block.data.items || [])];
                            items[j] = e.target.value;
                            updateBlock(i, { items });
                          }}
                          placeholder="List item..."
                          className="flex-1 bg-transparent text-small text-[var(--text-primary)] outline-none"
                        />
                        {j === (block.data.items?.length || 0) - 1 ? (
                          <button onClick={() => updateBlock(i, { items: [...(block.data.items || []), ''] })} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">+</button>
                        ) : (
                          <button onClick={() => {
                            const items = [...(block.data.items || [])];
                            items.splice(j, 1);
                            updateBlock(i, { items });
                          }} className="text-[var(--color-error)] hover:text-red-400"><Trash2 size={12} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
            {(article?.contentBlocks?.length || 0) === 0 && (
              <div className="text-center py-10 text-[var(--text-tertiary)]">
                <p className="text-small">No content blocks yet.</p>
                <Button variant="ghost" size="sm" onClick={addBlock} className="mt-2">
                  <Plus size={14} /> Add your first block
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'meta' && (
        <Card variant="elevated" className="space-y-4 p-6">
          <Input label="Excerpt" value={article?.excerpt || ''} onChange={e => updateField('excerpt', e.target.value)} placeholder="Brief summary..." multiline rows={2} />
          <Input label="Tags (comma separated)" value={(article?.tags || []).join(', ')} onChange={e => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="react, design, tutorial" />
          <div className="flex gap-4">
            <div className="flex-1">
              <Input label="Podcast ID (optional)" value={article?.podcastId || ''} onChange={e => updateField('podcastId', e.target.value)} placeholder="Link to podcast" />
            </div>
            <div className="flex-1">
              <Input label="Episode ID (optional)" value={article?.episodeId || ''} onChange={e => updateField('episodeId', e.target.value)} placeholder="Link to episode" />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'seo' && (
        <Card variant="elevated" className="space-y-4 p-6">
          <Input label="Meta Title" value={article?.seo?.metaTitle || ''} onChange={e => updateField('seo', { ...(article?.seo || {}), metaTitle: e.target.value })} placeholder="SEO title (defaults to article title)" />
          <Input label="Meta Description" value={article?.seo?.metaDescription || ''} onChange={e => updateField('seo', { ...(article?.seo || {}), metaDescription: e.target.value })} multiline rows={2} placeholder="Brief description for search results..." />
          <Input label="Canonical URL" value={article?.seo?.canonicalUrl || ''} onChange={e => updateField('seo', { ...(article?.seo || {}), canonicalUrl: e.target.value })} placeholder="https://..." />
        </Card>
      )}

      {showDrafts && (
        <Modal title="Version History" onClose={() => setShowDrafts(false)}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {drafts.map((d, i) => (
              <div key={d._id || i} className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <p className="text-small font-medium">Version {d.version}</p>
                  <span className="text-caption text-[var(--text-tertiary)]">{new Date(d.createdAt).toLocaleString()}</span>
                </div>
                {d.savedBy && <p className="text-caption text-[var(--text-tertiary)]">by {d.savedBy}</p>}
              </div>
            ))}
            {drafts.length === 0 && <p className="text-center text-[var(--text-tertiary)] py-6">No drafts saved yet.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
