import { useState, useEffect } from 'react';
import { PageHeader, Card, DataTable, Button, SearchInput, Pagination, LoadingSkeleton } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../components/ui/Toast';
import { fetchRawEpisodes } from '../../services/data';
import { Database, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminRawData() {
  const addToast = useToast();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const debouncedSearch = useDebounce(search);
  const pagination = usePagination({ totalItems: total, initialPageSize: 20 });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchRawEpisodes({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: debouncedSearch,
      });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch {
      addToast('Failed to load raw data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [pagination.page, pagination.pageSize, debouncedSearch]);

  const columns = [
    { key: 'title', label: 'Title', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'feedId', label: 'Feed ID', render: (v) => <code className="text-caption text-[var(--text-tertiary)]">{v?.slice(0, 8)}...</code> },
    { key: 'publishedAt', label: 'Published', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'actions', label: 'Raw', render: (v, row) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
        className="h-8 px-2"
      >
        {expandedId === row.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span className="ml-1 text-[10px] uppercase font-bold tracking-wider">View</span>
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Podcast Data"
        description="View raw ingested episode data from RSS feeds."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Raw Data' }]}
      />

      <div className="flex items-center gap-4">
        <div className="w-80">
          <SearchInput value={search} onChange={setSearch} placeholder="Search episodes..." />
        </div>
      </div>

      <Card variant="elevated" className="p-0 overflow-hidden">
        {loading && data.length === 0 ? (
          <div className="p-10"><LoadingSkeleton variant="table-row" count={5} /></div>
        ) : (
          <DataTable columns={columns} data={data} emptyMessage="No raw data available." />
        )}
      </Card>

      {expandedId && (() => {
        const item = data.find(d => d.id === expandedId);
        if (!item) return null;
        return (
          <Card variant="elevated" className="overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)]">
              <h3 className="font-medium">{item.title}</h3>
            </div>
            <pre className="p-4 text-caption font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(item, null, 2)}
            </pre>
          </Card>
        );
      })()}

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={pagination.goTo} total={total} />
    </div>
  );
}
