import { lazy, Suspense, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from './animations';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AudioProvider } from './components/AudioPlayer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import ScrollToTop from './components/ScrollToTop';
import { ToastProvider } from './components/ui/Toast';
import AdminLayout from './components/layout/AdminLayout';
import BackgroundEffects from './components/BackgroundEffects';
import GSAPIntro from './components/GSAPIntro';

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserLibrary = lazy(() => import('./pages/user/UserLibrary'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPodcasts = lazy(() => import('./pages/admin/AdminPodcasts'));
const AdminEpisodes = lazy(() => import('./pages/admin/AdminEpisodes'));
const AdminPodcastForm = lazy(() => import('./pages/admin/AdminPodcastForm'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const EditorDashboard = lazy(() => import('./pages/admin/EditorDashboard'));
const EditorArticles = lazy(() => import('./pages/admin/EditorArticles'));
const EditorArticleEdit = lazy(() => import('./pages/admin/EditorArticleEdit'));
const AdminFeeds = lazy(() => import('./pages/admin/AdminFeeds'));
const AdminHighlights = lazy(() => import('./pages/admin/AdminHighlights'));
const AdminHighlightEditor = lazy(() => import('./pages/admin/AdminHighlightEditor'));
const AdminHighlightCollections = lazy(() => import('./pages/admin/AdminHighlightCollections'));
const AdminReviewQueue = lazy(() => import('./pages/admin/AdminReviewQueue'));
const AdminRawData = lazy(() => import('./pages/admin/AdminRawData'));
const PodcastDetailPage = lazy(() => import('./pages/PodcastDetailPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const CategoryBrowsePage = lazy(() => import('./pages/CategoryBrowsePage'));
const PodcastsPage = lazy(() => import('./pages/PodcastsPage'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const HighlightsPage = lazy(() => import('./pages/HighlightsPage'));
const HighlightDetailPage = lazy(() => import('./pages/HighlightDetailPage'));
const HighlightCollectionPage = lazy(() => import('./pages/HighlightCollectionPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-black-deep)]" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-purple)]/20 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--color-accent-purple)] border-t-transparent animate-spin" role="presentation" />
        </div>
        <p className="text-small text-[var(--text-tertiary)]">Loading...</p>
      </div>
    </div>
  );
}

function AppContent({ introComplete }) {
  const { user } = useAuth();

  return (
    <div className="relative z-10">
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <motion.div
                  key="home"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <HomePage introComplete={introComplete} />
                </motion.div>
              }
            />
            <Route
              path="/podcasts"
              element={
                <motion.div
                  key="podcasts"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <PodcastsPage />
                </motion.div>
              }
            />
            <Route
              path="/podcast/:id"
              element={
                <motion.div
                  key="podcast-detail"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <PodcastDetailPage />
                </motion.div>
              }
            />
            <Route
              path="/search"
              element={
                <motion.div
                  key="search"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <SearchResultsPage />
                </motion.div>
              }
            />
            <Route
              path="/articles"
              element={
                <motion.div
                  key="articles"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <ArticlesPage />
                </motion.div>
              }
            />
            <Route
              path="/article/:id"
              element={
                <motion.div
                  key="article-detail"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <ArticleDetailPage />
                </motion.div>
              }
            />
            <Route
              path="/highlights"
              element={
                <motion.div
                  key="highlights"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <HighlightsPage />
                </motion.div>
              }
            />
            <Route
              path="/highlights/collection/:slug"
              element={
                <motion.div
                  key="highlight-collection"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <HighlightCollectionPage />
                </motion.div>
              }
            />
            <Route
              path="/highlights/:id"
              element={
                <motion.div
                  key="highlight-detail"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <HighlightDetailPage />
                </motion.div>
              }
            />
            <Route
              path="/category/:slug"
              element={
                <motion.div
                  key="category"
                  initial={pageTransition.initial}
                  animate={pageTransition.animate}
                  exit={pageTransition.exit}
                >
                  <CategoryBrowsePage />
                </motion.div>
              }
            />
            <Route
              path="/auth"
              element={
                <motion.div
                  key="auth"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AuthPage />
                </motion.div>
              }
            />

            {/* User routes (protected) */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/dashboard"
                element={
                  <motion.div
                    key="dashboard"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <UserDashboard />
                  </motion.div>
                }
              />
              <Route
                path="/library"
                element={
                  <motion.div
                    key="library"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <UserLibrary />
                  </motion.div>
                }
              />
              <Route
                path="/profile"
                element={
                  <motion.div
                    key="profile"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <UserProfile />
                  </motion.div>
                }
              />
            </Route>

            {/* Admin routes (protected + admin role) */}
            <Route
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route
                path="/admin"
                element={
                  <motion.div
                    key="admin-dashboard"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    {user?.role === 'moderator' ? <EditorDashboard /> : <AdminDashboard />}
                  </motion.div>
                }
              />
              <Route
                path="/admin/podcasts"
                element={
                  <motion.div
                    key="admin-podcasts"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminPodcasts />
                  </motion.div>
                }
              />
              <Route
                path="/admin/podcasts/new"
                element={
                  <motion.div
                    key="admin-podcast-new"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminPodcastForm />
                  </motion.div>
                }
              />
              <Route
                path="/admin/podcasts/:id/edit"
                element={
                  <motion.div
                    key="admin-podcast-edit"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminPodcastForm />
                  </motion.div>
                }
              />
              <Route
                path="/admin/episodes"
                element={
                  <motion.div
                    key="admin-episodes"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminEpisodes />
                  </motion.div>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <motion.div
                    key="admin-users"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminUsers />
                  </motion.div>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <motion.div
                    key="admin-analytics"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminAnalytics />
                  </motion.div>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <motion.div
                    key="admin-settings"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminSettings />
                  </motion.div>
                }
              />
              <Route
                path="/admin/feeds"
                element={
                  <motion.div
                    key="admin-feeds"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminFeeds />
                  </motion.div>
                }
              />
              <Route
                path="/admin/highlights"
                element={
                  <motion.div
                    key="admin-highlights"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminHighlights />
                  </motion.div>
                }
              />
              <Route
                path="/admin/highlights/new"
                element={
                  <motion.div
                    key="admin-highlight-new"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminHighlightEditor />
                  </motion.div>
                }
              />
              <Route
                path="/admin/highlights/collections"
                element={
                  <motion.div
                    key="admin-highlight-collections"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminHighlightCollections />
                  </motion.div>
                }
              />
              <Route
                path="/admin/highlights/:id"
                element={
                  <motion.div
                    key="admin-highlight-edit"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminHighlightEditor />
                  </motion.div>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <motion.div
                    key="admin-reviews"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminReviewQueue />
                  </motion.div>
                }
              />
              <Route
                path="/admin/raw-data"
                element={
                  <motion.div
                    key="admin-raw-data"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <AdminRawData />
                  </motion.div>
                }
              />
              <Route
                path="/editor/articles"
                element={
                  <motion.div
                    key="editor-articles"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <EditorArticles />
                  </motion.div>
                }
              />
              <Route
                path="/editor/articles/:id"
                element={
                  <motion.div
                    key="editor-article-edit"
                    initial={pageTransition.initial}
                    animate={pageTransition.animate}
                    exit={pageTransition.exit}
                  >
                    <EditorArticleEdit />
                  </motion.div>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [introComplete, setIntroComplete] = useState(() => {
    return sessionStorage.getItem('podora_intro_played') === '1';
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('podora_intro_played', '1');
    setIntroComplete(true);
  };

  return (
    <AuthProvider>
      <AudioProvider>
        <ToastProvider>
        {!introComplete && <GSAPIntro onComplete={handleIntroComplete} />}
        <div
          className="min-h-screen text-[var(--text-primary)] font-body antialiased relative"
          style={{
            background: '#0a0a0a',
            opacity: introComplete ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <ScrollToTop />
          <BackgroundEffects />
          <AppContent introComplete={introComplete} />
        </div>
        </ToastProvider>
      </AudioProvider>
    </AuthProvider>
  );
}