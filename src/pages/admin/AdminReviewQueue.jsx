import { useState, useEffect } from 'react';
import { PageHeader, Card, DataTable, Button, Pagination, StatusBadge, LoadingSkeleton } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../components/ui/Toast';
import { fetchReviews, updateReview } from '../../services/data';
import { Flag, CheckCircle, XCircle } from 'lucide-react';

export default function AdminReviewQueue() {
  const addToast = useToast();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const pagination = usePagination({ totalItems: total, initialPageSize: 20 });

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetchReviews({
        page: pagination.page,
        pageSize: pagination.pageSize,
        status: filter,
      });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch {
      addToast('Failed to load review queue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, [pagination.page, pagination.pageSize, filter]);

  const handleReview = async (id, status) => {
    try {
      await updateReview(id, { status, reviewedBy: 'admin' });
      addToast(`Item ${status}.`, 'success');
      loadReviews();
    } catch {
      addToast('Failed to update review item.', 'error');
    }
  };

  const columns = [
    { key: 'title', label: 'Episode', render: (v) => (
      <span className="font-medium">{v}</span>
    )},
    { key: 'reason', label: 'Reason', render: (v) => v ? (
      <StatusBadge variant="warning">{v}</StatusBadge>
    ) : '-' },
    { key: 'status', label: 'Status', render: (v) => (
      <StatusBadge variant={v === 'pending' ? 'warning' : v === 'reviewed' ? 'success' : 'neutral'}>
        {v}
      </StatusBadge>
    )},
    { key: 'createdAt', label: 'Flagged', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'actions', label: 'Actions', render: (v, row) => row.status === 'pending' ? (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleReview(row.id, 'reviewed')} className="text-green-500 h-8 px-2">
          <CheckCircle size={14} />
          <span className="ml-1 text-[10px] uppercase font-bold tracking-wider">Approve</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleReview(row.id, 'dismissed')} className="text-red-500 h-8 px-2">
          <XCircle size={14} />
          <span className="ml-1 text-[10px] uppercase font-bold tracking-wider">Dismiss</span>
        </Button>
      </div>
    ) : (
      <span className="text-caption text-[var(--text-tertiary)]">Done</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Queue"
        description="Review flagged episodes and content."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Reviews' }]}
      />

      <div className="flex items-center gap-2">
        {['pending', 'reviewed', 'dismissed', ''].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => { setFilter(s); pagination.goTo(1); }}
          >
            {s || 'All'}
          </Button>
        ))}
      </div>

      <Card variant="elevated" className="p-0 overflow-hidden">
        {loading && data.length === 0 ? (
          <div className="p-10"><LoadingSkeleton variant="table-row" count={5} /></div>
        ) : (
          <DataTable columns={columns} data={data} emptyMessage="No items to review." />
        )}
      </Card>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={pagination.goTo} total={total} />
    </div>
  );
}
