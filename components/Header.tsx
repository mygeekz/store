// components/Header.tsx
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';
import { processQuery } from '../utils/search/processQuery';
import { useFavorites } from '../contexts/FavoritesContext';
import { findNavByPath, normalizePath } from '../utils/nav';
import { SIDEBAR_ITEMS } from '../constants';
import { canAccessPath } from '../utils/rbac';

interface HeaderProps {
  pageTitle: string;
  onOpenCommandPalette?: () => void;
  /**
   * Called when the mobile sidebar toggle (hamburger) is clicked.
   * Optional because Header can be used on pages without a sidebar (e.g. login).
   */
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, onToggleSidebar, onOpenCommandPalette }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { currentUser, logout, isLoading: authProcessLoading, authReady } = useAuth();

  // صفحه فعلی برای علاقه‌مندی‌ها
  const currentPath = normalizePath(location.pathname);
  const currentNav = findNavByPath(SIDEBAR_ITEMS, currentPath);
  const canFavorite = Boolean(currentNav?.path) && currentNav!.path !== '/login' && canAccessPath(currentUser?.roleName, currentNav!.path!);

  // ← StyleContext برای تغییر تم
  const { style, setStyle } = useStyle();

  const toggleProfileMenu = () => setIsProfileMenuOpen(s => !s);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const p = processQuery(searchQuery);
    const q = p.final || p.normalized || '';
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // سوییچر تم: light → dark → system
  const cycleTheme = () => {
    const order: Array<typeof style.theme> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(style.theme) + 1) % order.length];
    setStyle('theme', next);
  };

  const ThemeIcon = () => {
    if (style.theme === 'light') return <i className="fa-regular fa-sun" />;
    if (style.theme === 'dark') return <i className="fa-regular fa-moon" />;
    return <i className="fa-solid fa-laptop" />;
  };

  if (authProcessLoading && !authReady) {
    return (
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-4 md:px-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{pageTitle || 'بارگذاری...'}</h2>
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
      </header>
    );
  }

  if (authReady && !currentUser) {
    return (
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-4 md:px-6">
        {/* When not authenticated, show the title only */}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{pageTitle || 'ورود به سیستم'}</h2>
      </header>
    );
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-4 md:px-6">
      {/* Mobile sidebar toggle */}
      {onToggleSidebar && currentUser && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden mr-2 flex items-center justify-center rounded-full text-gray-700 dark:text-gray-300 w-9 h-9 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
          aria-label="باز کردن منو"
        >
          <i className="fa-solid fa-bars" />
        </button>
      )}

      <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[52vw] sm:max-w-none">
            {pageTitle}
          </h2>

          {/* Breadcrumb (simple + RTL-friendly) */}
          {currentNav && (currentNav.parentTitle || currentNav.title) && (
            <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[60vw] sm:max-w-none">
              {currentNav.parentTitle ? (
                <>
                  <span className="font-semibold">{currentNav.parentTitle}</span>
                  <span className="mx-1 opacity-60">/</span>
                </>
              ) : null}
              <span>{currentNav.title ?? pageTitle}</span>
            </div>
          )}
        </div>
      {canFavorite && currentNav && (
        <button
          type="button"
          onClick={() =>
            toggleFavorite({
              key: currentNav.path,
              title: currentNav.title,
              path: currentNav.path,
              icon: currentNav.icon,
              parentTitle: currentNav.parentTitle,
            })
          }
          className="w-9 h-9 rounded-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm active:scale-[0.98]"
          title={isFavorite(currentNav.path) ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          aria-label="علاقه‌مندی"
        >
          <i className={isFavorite(currentNav.path) ? 'fa-solid fa-star text-amber-500' : 'fa-regular fa-star'} />
        </button>
      )}
        </div>

      </div>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-lg mx-auto px-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            placeholder="جستجو در محصولات..."
            value={searchQuery}
            onChange={(e) => {
              const v = e.target.value;
              setSearchQuery(v);
              const p = processQuery(v);
              setSuggestion(p.suggestion ?? null);
            }}
            className="w-full pr-10 pl-12 py-2 border-none rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-indigo-500 text-sm outline-none text-right"
            aria-label="جستجو در محصولات"
          />

          <button
            type="submit"
            className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
            aria-label="شروع جستجو"
          >
            <i className="fa-solid fa-search text-gray-400 hover:text-indigo-500" />
          </button>
          <button
            type="button"
            onClick={() => onOpenCommandPalette?.()}
            className="absolute inset-y-0 left-0 flex items-center pl-2 pr-2"
            aria-label="جستجوی سریع"
            title="جستجوی سریع (Ctrl+Shift+K)"
          >
            <span className="w-8 h-8 rounded-full bg-white/70 dark:bg-gray-700/70 border border-gray-200/70 dark:border-gray-600/60 backdrop-blur grid place-items-center text-gray-600 dark:text-gray-200 hover:shadow-sm transition">
              <i className="fa-solid fa-bolt" />
            </span>
          </button>

          {suggestion && suggestion !== searchQuery.trim().toLowerCase() && (
            <button
              type="button"
              onClick={() => setSearchQuery(suggestion!)}
              className="absolute -bottom-6 right-3 text-xs text-indigo-600 hover:underline"
              aria-label="اعمال پیشنهاد"
              title="اعمال پیشنهاد"
            >
              منظورت <strong>{suggestion}</strong> بود؟
            </button>
          )}
        </form>
      </div>

      {/* Mobile Search Trigger */}
      <div className="md:hidden flex-1 flex justify-end px-2">
        <button
          onClick={() => onOpenCommandPalette?.()}
          className="w-9 h-9 rounded-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
        >
          <i className="fa-solid fa-search" />
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle (متصل به StyleContext) */}
        <button
          onClick={cycleTheme}
          title={
            style.theme === 'light'
              ? 'حالت روشن (کلیک: تیره)'
              : style.theme === 'dark'
              ? 'حالت تیره (کلیک: سیستمی)'
              : 'حالت سیستمی (کلیک: روشن)'
          }
          aria-label="تغییر تم"
          className="w-9 h-9 rounded-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <ThemeIcon />
        </button>

        {/* Profile menu */}
        <div className="relative" ref={profileMenuRef}>
          {currentUser && (
            <>
<button
                onClick={toggleProfileMenu}
                className="flex items-center space-x-3 space-x-reverse cursor-pointer focus:outline-none p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
                aria-controls="profile-menu"
              >
                <i
                  className={`fa-solid fa-chevron-down text-gray-400 text-xs transition-transform ml-2 ${
                    isProfileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.roleName}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm overflow-hidden">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-user" />
                  )}
                </div>
              </button>

              {isProfileMenuOpen && (
                <div
                  id="profile-menu"
                  className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-1 z-50 border border-gray-200 dark:border-gray-700 text-right"
                  role="menu"
                >
                  <Link
                    to="/profile"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    <i className="fas fa-user-circle ml-2 text-indigo-500" />
                    پروفایل شما
                  </Link>

                  {currentUser.roleName === 'Admin' && (
                    <Link
                      to="/settings"
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 transition-colors"
                    >
                      <i className="fas fa-cog ml-2 text-indigo-500" />
                      تنظیمات
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full text-right block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-600 transition-colors"
                  >
                    <i className="fas fa-sign-out-alt ml-2 text-red-500" />
                    خروج از حساب
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
