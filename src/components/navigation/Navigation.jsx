import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { Container } from '../layout';
import SearchBar from '../SearchBar';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui';
import { Menu, X, LayoutDashboard, BookOpen, User, Shield, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', href: '/#home' },
  { label: 'Podcasts', href: '/#podcasts' },
  { label: 'Discover', href: '/#discover' },
  { label: 'Articles', href: '/articles' },
  { label: 'AI Highlights', href: '/highlights' },
  { label: 'Analytics', href: '/#analytics' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, isAdmin, isStaff, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileOpen(false);
  }
  const userMenuRef = useRef(null);
  const navRef = useRef(null);
  const logoRef = useRef(null);

  // GSAP logo entrance
  useEffect(() => {
    gsap.fromTo(
      logoRef.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', delay: 0.2 }
    );
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);



  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <header
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-[var(--z-nav)] h-[var(--nav-height)] transition-all duration-400`}
      style={{
        background: scrolled
          ? 'rgba(9, 9, 9, 0.92)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 40px rgba(0,0,0,0.6)' : 'none',
      }}
      role="banner"
    >
      <Container className="h-full">
        <nav className="flex items-center justify-between h-full gap-6" aria-label="Main navigation">
          {/* ── Logo ── */}
          <a
            ref={logoRef}
            href="/"
            className="flex items-center gap-2.5 group shrink-0"
            aria-label="Podora Home"
            style={{ opacity: 0 }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #1DB954 0%, #158a3e 100%)',
                boxShadow: '0 0 20px rgba(29,185,84,0.35)',
              }}
              aria-hidden="true"
            >
              <svg width="20" height="20" viewBox="0 0 42 42" fill="none">
                <path d="M8 21 Q21 8, 34 21" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M12 27 Q21 16, 30 27" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M16 33 Q21 24, 26 33" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span
              className="font-black text-white hidden sm:block transition-colors duration-300 group-hover:text-[#1DB954]"
              style={{ fontSize: '1.15rem', fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.02em' }}
            >
              Podora
            </span>
          </a>

          {/* ── Search ── */}
          <div className="flex-1 max-w-sm hidden lg:block" role="search">
            <SearchBar />
          </div>

          {/* ── Desktop Nav Items ── */}
          <ul className="hidden lg:flex items-center gap-1" role="list">
            {NAV_ITEMS.map((item) => {
              const isActive = location.hash === `#${item.href.split('#')[1]}`;
              return (
                <li key={item.href} role="none">
                  <a
                    href={item.href}
                    className="relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DB954] sp-underline"
                    style={{
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? '#fff' : 'rgba(255,255,255,0.6)'; }}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* ── Desktop CTA / User Menu ── */}
          {isAuthenticated ? (
            <div className="hidden lg:flex items-center gap-3 shrink-0 relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DB954]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <Avatar size="sm" name={user?.name} src={user?.avatar} />
                <span className="text-sm text-white font-medium">{user?.name?.split(' ')[0]}</span>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-52 rounded-2xl py-1 z-[var(--z-dropdown)]"
                    style={{
                      background: '#282828',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                    }}
                    role="menu"
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-sm text-white font-medium truncate">{user?.name}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</p>
                    </div>
                    {[
                      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
                      { icon: BookOpen, label: 'Library', path: '/library' },
                      { icon: User, label: 'Profile', path: '/profile' },
                      ...(user?.role === 'admin' ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
                      ...(user?.role === 'moderator' ? [{ icon: Shield, label: 'Editor', path: '/admin' }] : []),
                    ].map(({ icon: Icon, label, path }) => (
                      <button
                        key={path}
                        onClick={() => { setUserMenuOpen(false); navigate(path); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'transparent'; }}
                        role="menuitem"
                      >
                        <Icon size={15} /> {label}
                      </button>
                    ))}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150"
                      style={{ color: '#EF4444' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      role="menuitem"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="font-semibold text-sm transition-all duration-200"
                style={{
                  padding: '9px 22px',
                  borderRadius: '999px',
                  background: '#1DB954',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(29,185,84,0.35)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1ED760'; e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#1DB954'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                Get Started
              </button>
            </div>
          )}

          {/* ── Mobile Hamburger ── */}
          <button
            className="lg:hidden p-2 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DB954]"
            style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)' }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </nav>
      </Container>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden"
            style={{
              background: 'rgba(18,18,18,0.98)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Container className="py-5">
              <div className="mb-4" role="search">
                <SearchBar />
              </div>
              <ul className="flex flex-col gap-1 mb-5" role="list">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href} role="none">
                    <a
                      href={item.href}
                      className="block px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              {!isAuthenticated && (
                <div className="flex flex-col gap-3 px-2">
                  <button
                    onClick={() => { setMobileOpen(false); navigate('/auth'); }}
                    className="w-full py-3 text-center text-sm font-medium rounded-xl transition-all duration-200"
                    style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { setMobileOpen(false); navigate('/auth'); }}
                    className="w-full py-3 text-center text-sm font-bold rounded-xl"
                    style={{ background: '#1DB954', color: '#000' }}
                  >
                    Get Started
                  </button>
                </div>
              )}
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
