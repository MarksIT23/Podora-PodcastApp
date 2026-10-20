import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Tag, ArrowRight, FileText, Search, ArrowLeft } from 'lucide-react';
import { fetchArticles } from '../services/editor-api';
import { staggerContainer, staggerItem } from '../animations';

export default function ArticlesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 12;

  useEffect(() => {
    setLoading(true);
    fetchArticles({ status: 'published', page, pageSize })
      .then((res) => {
        let data = res.data || [];
        const q = searchParams.get('q')?.toLowerCase();
        if (q) {
          data = data.filter(a =>
            a.title?.toLowerCase().includes(q) ||
            a.excerpt?.toLowerCase().includes(q)
          );
        }
        setArticles(data);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setArticles([]);
        setLoading(false);
      });
  }, [page, searchParams]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('page', '1');
    setSearchParams(params);
  };

  const goToPage = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(p));
    setSearchParams(params);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-6 bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Articles</h1>
            <p className="text-sm text-[var(--text-tertiary)]">Editorial content and show notes</p>
          </div>

          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-accent-purple)] transition-colors"
            />
          </form>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden animate-pulse">
                <div className="h-48 bg-[var(--color-border)]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-[var(--color-border)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--color-border)] rounded w-full" />
                  <div className="h-3 bg-[var(--color-border)] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-[var(--text-tertiary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No articles yet</h3>
            <p className="text-sm text-[var(--text-tertiary)]">
              {search ? 'No articles match your search.' : 'Articles will appear here once published.'}
            </p>
          </div>
        )}

        {/* Article grid */}
        {!loading && articles.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {articles.map((article) => (
              <motion.div
                key={article._id}
                variants={staggerItem}
                onClick={() => navigate(`/article/${article._id}`)}
                className="group rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden cursor-pointer hover:border-[var(--color-accent-purple)]/40 hover:shadow-lg hover:shadow-[var(--color-accent-purple)]/5 transition-all duration-300"
              >
                {article.coverImage ? (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={article.coverImage}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-[var(--color-accent-purple)]/10 to-[var(--color-accent-blue)]/10 flex items-center justify-center">
                    <FileText size={40} className="text-[var(--color-accent-purple)]/30" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3 text-caption text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(article.publishedAt || article.createdAt)}
                    </span>
                    {article.tags?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag size={12} />
                        {article.tags[0]}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--color-accent-purple-light)] transition-colors">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-caption font-medium text-[var(--color-accent-purple-light)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more <ArrowRight size={14} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-accent-purple)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-[var(--color-accent-purple)] text-white'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-accent-purple)]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-accent-purple)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
