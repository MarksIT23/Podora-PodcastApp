import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Mic, Users, BarChart3, Settings, LogOut, Rss, Sparkles,
  ChevronLeft, ChevronRight, Menu, Shield, Headphones, FileText, ListChecks, Database,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['admin', 'moderator'] },
  { to: '/admin/podcasts', label: 'Podcasts', icon: Mic, roles: ['admin', 'moderator'] },
  { to: '/admin/episodes', label: 'Episodes', icon: Headphones, roles: ['admin', 'moderator'] },
  { to: '/admin/feeds', label: 'Feeds', icon: Rss, roles: ['admin'] },
  { to: '/admin/highlights', label: 'Highlights', icon: Sparkles, roles: ['admin', 'moderator'] },
  { to: '/admin/highlights/collections', label: 'Collections', icon: Sparkles, roles: ['admin', 'moderator'] },
  { to: '/admin/reviews', label: 'Review Queue', icon: ListChecks, roles: ['admin', 'moderator'] },
  { to: '/admin/raw-data', label: 'Raw Data', icon: Database, roles: ['admin', 'moderator'] },
  { to: '/editor/articles', label: 'Articles', icon: FileText, roles: ['admin', 'moderator'] },
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  const filteredNavItems = NAV_ITEMS.filter(item => 
    !item.roles || item.roles.includes(user?.role || 'user')
  );

  return (
    <div className="min-h-screen bg-[var(--color-black-deep)] flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-56 bg-[var(--color-black-secondary)] border-r border-[var(--color-border)] flex flex-col transition-all duration-300 ${
          collapsed ? 'lg:w-16' : 'lg:w-56'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        role="navigation"
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div className="h-[var(--nav-height)] flex items-center px-4 border-b border-[var(--color-border)]">
          {collapsed ? (
            <span className="w-8 h-8 rounded-lg bg-[var(--color-accent-purple)] flex items-center justify-center text-white font-bold text-sm mx-auto" aria-label="Podora Admin">
              P
            </span>
          ) : (
            <a href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[var(--color-accent-purple)] flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">
                P
              </span>
              <span className="font-accent font-bold text-base text-[var(--color-accent-purple-light)]">
                Podora
              </span>
            </a>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-2 space-y-1" aria-label="Admin sidebar">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <a
                key={item.to}
                href={item.to}
                onClick={(e) => { e.preventDefault(); navigate(item.to); setMobileOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] transition-all duration-200 ${
                  active
                    ? 'bg-[var(--color-accent-purple)]/15 text-[var(--color-accent-purple-light)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--color-surface-hover)]'
                }`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                {!collapsed && <span className="text-small font-medium">{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="p-2 border-t border-[var(--color-border)]">
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent-purple)]/20 flex items-center justify-center text-small font-semibold text-[var(--color-accent-purple-light)] shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-small font-medium text-[var(--text-primary)] truncate">{user?.name || 'Admin'}</p>
                <span className="inline-flex items-center gap-1 text-caption text-[var(--color-accent-purple-light)]">
                  <Shield size={10} aria-hidden="true" /> {user?.role === 'admin' ? 'Admin' : 'Editor'}
                </span>
              </div>
            )}
          </div>
          <a
            href="/dashboard"
            onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
            className={`flex items-center gap-3 w-full mt-1 px-3 py-2 rounded-[var(--radius-lg)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--color-surface-hover)] transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            {!collapsed && <span className="text-small">User Dashboard</span>}
          </a>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full mt-1 px-3 py-2 rounded-[var(--radius-lg)] text-[var(--text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-hover)] transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
            aria-label="Log out"
          >
            <LogOut size={18} aria-hidden="true" />
            {!collapsed && <span className="text-small">Log Out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-8 border-t border-[var(--color-border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden h-[var(--nav-height)] flex items-center px-4 border-b border-[var(--color-border)] bg-[var(--color-black-secondary)]">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-[var(--text-primary)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)]"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <span className="ml-3 font-accent font-bold text-base text-[var(--color-accent-purple-light)]">
            Podora
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-10 overflow-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
