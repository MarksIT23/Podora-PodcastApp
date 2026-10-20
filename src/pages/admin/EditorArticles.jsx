import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Badge, Button, LoadingSkeleton, EmptyState } from '../../components/ui';
import { fetchArticles, createArticle } from '../../services/editor-api';
import { staggerContainer, staggerItem } from '../../animations';
import { FileText, Plus, Search, Edit3, Eye, Archive } from 'lucide-react';

const STATUS_MAP = {
  draft: { label: 'Draft', variant: 'neutral' },
  review: { label: 'In Review', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  archived: { label: 'Archived', variant: 'default' },
};

export default function EditorArticles() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { loadArticles(); }, [statusFilter]);

  async function loadArticles() {
    setLoading(true);
    try {
      const res = await fetchArticles({ status: statusFilter || undefined, pageSize: 50 });
      setArticles(res.data || []);
    } catch (err) {
      console.error('Failed to load articles:', err);
    }
    setLoading(false);
  }

  async function handleCreate() {
    try {
      const article = await createArticle({ title: 'Untitled', status: 'draft' });
      navigate(`/editor/articles/${article._id}`);
    } catch (err) {
      console.error('Failed to create article:', err);
    }
  }

  const filtered = articles.filter(a =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Articles"
        description="Write and manage editorial content."
        actions={
          <Button variant="primary" size="md" onClick={handleCreate}>
            <Plus size={16} aria-hidden="true" /> New Article
          </Button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] text-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--color-accent-blue)] transition-colors"
          />
        </div>
        {['', 'draft', 'review', 'published', 'archived'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-caption font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[var(--color-accent-blue)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--text-secondary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {s ? STATUS_MAP[s]?.label || s : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No articles yet" description="Create your first article to start publishing." action={<Button variant="primary" onClick={handleCreate}><Plus size={16} /> Create Article</Button>} />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
          {filtered.map(a => (
            <motion.div key={a._id} variants={staggerItem}>
              <Card variant="elevated" className="hover:border-[var(--color-border)] cursor-pointer group" onClick={() => navigate(`/editor/articles/${a._id}`)}>
                <div className="flex items-center gap-4">
                  {a.coverImage ? (
                    <img src={a.coverImage} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-[var(--text-tertiary)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--color-accent-blue-light)] transition-colors">
                      {a.title || 'Untitled'}
                    </p>
                    {a.excerpt && (
                      <p className="text-caption text-[var(--text-tertiary)] truncate mt-0.5">{a.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <Badge variant={STATUS_MAP[a.status]?.variant || 'neutral'} size="sm">
                        {STATUS_MAP[a.status]?.label || a.status}
                      </Badge>
                      {a.tags?.slice(0, 3).map(t => (
                        <span key={t} className="text-[0.6rem] text-[var(--text-tertiary)]">#{t}</span>
                      ))}
                      <span className="text-caption text-[var(--text-tertiary)]">
                        Updated {new Date(a.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm"><Edit3 size={14} /></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
