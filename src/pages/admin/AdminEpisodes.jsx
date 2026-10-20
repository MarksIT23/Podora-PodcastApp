import { useState, useEffect } from 'react';
import { PageHeader, Card, DataTable, Button, SearchInput, Pagination, LoadingSkeleton, StatusBadge, Tooltip } from '../../components/ui';
import { fetchEpisodes as fetchAdminEpisodes, updateAdminEpisode, detectHighlightsForEpisode as triggerHighlightDetection } from '../../services/data';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../components/ui/Toast';
import { Eye, EyeOff, Sparkles, Headphones, Calendar, Clock } from 'lucide-react';

export default function AdminEpisodes() {
  const addToast = useToast();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const pagination = usePagination({ totalItems: total, initialPageSize: 15 });
  const [detectingId, setDetectingId] = useState(null);

  const loadEpisodes = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminEpisodes({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: debouncedSearch,
      });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch {
      addToast('Failed to load episodes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEpisodes(); }, [pagination.page, pagination.pageSize, debouncedSearch]);

  const handleTogglePublish = async (episode) => {
    try {
      const newStatus = episode.status === 'published' ? 'hidden' : 'published';
      await updateAdminEpisode(episode.id, { status: newStatus });
      addToast(`Episode ${newStatus === 'published' ? 'published' : 'hidden'}.`, 'success');
      loadEpisodes();
    } catch {
      addToast('Failed to update episode.', 'error');
    }
  };

  const handleDetectHighlights = async (episodeId) => {
    setDetectingId(episodeId);
    try {
      const res = await triggerHighlightDetection(episodeId);
      addToast(`${res.data.highlightsCreated} highlights created!`, 'success');
    } catch {
      addToast('Failed to detect highlights.', 'error');
    } finally {
      setDetectingId(null);
    }
  };

  const columns = [
    { key: 'title', label: 'Title', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-[var(--color-accent-blue)]/10 flex items-center justify-center shrink-0">
          <Headphones size={14} className="text-[var(--color-accent-blue-light)]" />
        </div>
        <div className="min-w-0">
          <p className="text-small font-medium truncate">{v}</p>
          <p className="text-caption text-[var(--text-tertiary)] truncate">
            {row.feed?.podcast?.title || 'Unknown Podcast'}
          </p>
        </div>
      </div>
    )},
    { key: 'publishedAt', label: 'Published', render: (v) => (
      <div className="flex items-center gap-1.5 text-caption text-[var(--text-tertiary)]">
        <Calendar size={12} />
        {v ? new Date(v).toLocaleDateString() : 'Draft'}
      </div>
    )},
    { key: 'duration', label: 'Duration', render: (v) => {
      if (!v) return '-';
      const m = Math.floor(v / 60);
      const s = v % 60;
      return <span className="text-caption font-mono">{m}:{s.toString().padStart(2, '0')}</span>;
    }},
    { key: 'published', label: 'Status', render: (v, row) => (
      <div className="flex items-center gap-2">
        <StatusBadge variant={v ? 'success' : 'neutral'}>
          {v ? 'Published' : 'Hidden'}
        </StatusBadge>
        <Tooltip content={v ? 'Hide from users' : 'Publish to users'}>
          <button
            onClick={() => handleTogglePublish(row)}
            className="p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {v ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </Tooltip>
      </div>
    )},
    { key: 'actions', label: 'Actions', render: (v, row) => (
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleDetectHighlights(row.id)}
          disabled={detectingId === row.id}
          className="h-8 px-2"
        >
          {detectingId === row.id ? (
            <div className="w-3 h-3 border-2 border-t-transparent border-[var(--color-accent-purple-light)] rounded-full animate-spin" />
          ) : (
            <Sparkles size={14} className="text-[var(--color-accent-purple-light)]" />
          )}
          <span className="ml-1.5 text-[10px] uppercase font-bold tracking-wider">Detect AI</span>
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Episodes" 
        description="Manage all ingested episodes and AI highlights."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Episodes' }]}
      />

      <div className="flex items-center gap-4">
        <div className="w-80">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Search episodes..." 
          />
        </div>
      </div>

      <Card variant="elevated" className="p-0 overflow-hidden">
        {loading && data.length === 0 ? (
          <div className="p-10"><LoadingSkeleton variant="table-row" count={5} /></div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data}
            emptyMessage="No episodes found."
          />
        )}
      </Card>

      <Pagination 
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.goTo}
        total={total}
      />
    </div>
  );
}
