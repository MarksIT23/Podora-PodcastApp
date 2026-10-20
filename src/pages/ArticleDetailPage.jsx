import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ArrowLeft, Calendar, Clock, Tag, FileText } from 'lucide-react';
import { fetchArticle } from '../services/editor-api';
import { Button } from '../components/ui';

function renderContentBlock(block, index) {
  const { type, data, order } = block;

  switch (type) {
    case 'text':
      return (
        <p key={index} className="text-base leading-relaxed text-[var(--text-secondary)] mb-5">
          {data?.content || ''}
        </p>
      );

    case 'heading':
      return (
        <h2 key={index} className="text-xl font-bold text-[var(--text-primary)] mt-8 mb-4">
          {data?.content || ''}
        </h2>
      );

    case 'quote':
      return (
        <blockquote key={index} className="border-l-4 border-[var(--color-accent-purple)] pl-5 py-3 my-6 bg-[var(--color-accent-purple)]/5 rounded-r-2xl">
          <p className="text-lg font-medium text-[var(--text-primary)] italic leading-relaxed">
            {data?.content || ''}
          </p>
          {data?.attribution && (
            <cite className="text-sm text-[var(--text-tertiary)] mt-2 block not-italic">
              — {data.attribution}
            </cite>
          )}
        </blockquote>
      );

    case 'image':
      return (
        <figure key={index} className="my-6">
          <img
            src={data?.src || data?.url || ''}
            alt={data?.alt || ''}
            className="w-full rounded-2xl object-cover max-h-[500px]"
            loading="lazy"
          />
          {data?.caption && (
            <figcaption className="text-caption text-[var(--text-tertiary)] text-center mt-2">
              {data.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'embed':
      return (
        <div key={index} className="my-6 aspect-video rounded-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
          {data?.html ? (
            <div dangerouslySetInnerHTML={{ __html: data.html }} className="w-full h-full" />
          ) : data?.url ? (
            <iframe
              src={data.url}
              className="w-full h-full"
              allowFullScreen
              title={data?.title || 'Embedded content'}
              loading="lazy"
            />
          ) : null}
        </div>
      );

    case 'list':
      const items = data?.items || data?.content?.split('\n') || [];
      return (
        <ul key={index} className="space-y-2 my-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-base text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-purple)] mt-2.5 shrink-0" />
              <span>{typeof item === 'string' ? item : item.content || ''}</span>
            </li>
          ))}
        </ul>
      );

    default:
      return null;
  }
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const heroRef = useRef(null);
  const coverRef = useRef(null);
  const headerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchArticle(id)
      .then((data) => {
        setArticle(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load article');
        setLoading(false);
      });
  }, [id]);

  // GSAP entrance animations
  useEffect(() => {
    if (loading || !article) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (coverRef.current) {
        tl.fromTo(coverRef.current,
          { scale: 0.95, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6 }
        );
      }
      tl.fromTo(headerRef.current?.children || [],
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        '-=0.3'
      );
      tl.fromTo(contentRef.current?.children || [],
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.05 },
        '-=0.2'
      );
    });
    return () => ctx.revert();
  }, [loading, article]);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-24 bg-[var(--color-border)] rounded" />
            <div className="h-[300px] bg-[var(--color-border)] rounded-2xl" />
            <div className="h-8 bg-[var(--color-border)] rounded w-3/4" />
            <div className="h-4 bg-[var(--color-border)] rounded w-1/3" />
            <div className="space-y-3">
              <div className="h-4 bg-[var(--color-border)] rounded w-full" />
              <div className="h-4 bg-[var(--color-border)] rounded w-5/6" />
              <div className="h-4 bg-[var(--color-border)] rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-[var(--text-tertiary)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Article not found</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-6">{error || 'This article could not be loaded.'}</p>
          <Button variant="ghost" onClick={() => navigate('/articles')}>
            <ArrowLeft size={16} className="mr-2" /> Back to articles
          </Button>
        </div>
      </div>
    );
  }

  const blocks = article.contentBlocks || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/articles')}
          className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to articles
        </button>

        {/* Cover image */}
        {article.coverImage && (
          <div ref={coverRef} className="mb-8">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full rounded-2xl object-cover max-h-[400px] shadow-xl"
            />
          </div>
        )}

        {/* Header */}
        <header ref={headerRef}>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-caption text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(article.publishedAt || article.createdAt)}
            </span>
            {article.tags?.length > 0 && (
              <div className="flex items-center gap-2">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-medium bg-[var(--color-accent-purple)]/10 text-[var(--color-accent-purple-light)]"
                  >
                    <Tag size={10} />
                    {t}
                  </span>
                ))}
              </div>
            )}
            {article.status && (
              <span className="px-2 py-0.5 rounded-full text-[0.7rem] font-medium bg-[var(--color-success)]/10 text-[var(--color-success)]">
                {article.status}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight mb-4">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
              {article.excerpt}
            </p>
          )}
        </header>

        {/* Content blocks */}
        <div ref={contentRef} className="mt-8">
          {blocks.length > 0 ? (
            blocks
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((block, i) => renderContentBlock(block, i))
          ) : (
            <p className="text-[var(--text-tertiary)] text-center py-12">
              This article has no content yet.
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-[var(--color-border)]">
          <Button variant="ghost" onClick={() => navigate('/articles')}>
            <ArrowLeft size={16} className="mr-2" /> All articles
          </Button>
        </footer>
      </div>
    </div>
  );
}
