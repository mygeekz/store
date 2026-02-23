// components/Sidebar.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { SIDEBAR_ITEMS } from '../constants';
import { NavItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { useStyle } from '../contexts/StyleContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { findNavByPath, normalizePath } from '../utils/nav';
import { canAccessPath, filterNavItemsByRole } from '../utils/rbac';

type Accent = { from: string; to: string; ring: string; glowFrom: string; glowTo: string };

/** 🎨 الگوی برند (به primary وصل است) */
const PRIMARY_ACCENT: Accent = {
  from: 'from-primary-500',
  to: 'to-primary-600',
  ring: 'ring-primary/30 dark:ring-primary/40',
  glowFrom: 'from-primary-400',
  glowTo: 'to-primary-600',
};

// نکته: برای آیتم‌های گروهی/زیرمنوها هم می‌توانیم همان تم والد را استفاده کنیم.
const ACCENTS: Record<string, Accent> = {
  dashboard: PRIMARY_ACCENT,

  'products-group':     { from: 'from-sky-500',      to: 'to-cyan-600',     ring: 'ring-cyan-200 dark:ring-cyan-700',       glowFrom: 'from-sky-400',     glowTo: 'to-cyan-600' },
  products:            { from: 'from-sky-500',      to: 'to-cyan-600',     ring: 'ring-cyan-200 dark:ring-cyan-700',       glowFrom: 'from-sky-400',     glowTo: 'to-cyan-600' },
  'mobile-phones':     { from: 'from-emerald-500',  to: 'to-teal-600',     ring: 'ring-teal-200 dark:ring-teal-700',       glowFrom: 'from-emerald-400', glowTo: 'to-teal-600' },

  'repairs-services':  { from: 'from-amber-500',    to: 'to-orange-600',   ring: 'ring-amber-200 dark:ring-amber-700',     glowFrom: 'from-amber-400',   glowTo: 'to-orange-600' },
  repairs:             { from: 'from-amber-500',    to: 'to-orange-600',   ring: 'ring-amber-200 dark:ring-amber-700',     glowFrom: 'from-amber-400',   glowTo: 'to-orange-600' },
  services:            { from: 'from-pink-500',     to: 'to-rose-600',     ring: 'ring-rose-200 dark:ring-rose-700',       glowFrom: 'from-pink-400',    glowTo: 'to-rose-600' },

  sales:               { from: 'from-blue-600',     to: 'to-indigo-600',   ring: 'ring-blue-200 dark:ring-blue-700',       glowFrom: 'from-blue-500',    glowTo: 'to-indigo-600' },
  'sales-cash':         { from: 'from-blue-600',     to: 'to-indigo-600',   ring: 'ring-blue-200 dark:ring-blue-700',       glowFrom: 'from-blue-500',    glowTo: 'to-indigo-600' },
  'installment-sales': { from: 'from-fuchsia-500',  to: 'to-purple-600',   ring: 'ring-fuchsia-200 dark:ring-fuchsia-700', glowFrom: 'from-fuchsia-400', glowTo: 'to-purple-600' },

  people:              { from: 'from-violet-500',   to: 'to-purple-600',   ring: 'ring-violet-200 dark:ring-violet-700',   glowFrom: 'from-violet-400',  glowTo: 'to-purple-600' },
  customers:           { from: 'from-violet-500',   to: 'to-purple-600',   ring: 'ring-violet-200 dark:ring-violet-700',   glowFrom: 'from-violet-400',  glowTo: 'to-purple-600' },
  partners:            { from: 'from-slate-500',    to: 'to-gray-700',     ring: 'ring-slate-200 dark:ring-slate-700',     glowFrom: 'from-slate-400',   glowTo: 'to-gray-700' },

  reports:             { from: 'from-cyan-600',     to: 'to-blue-700',     ring: 'ring-cyan-200 dark:ring-cyan-700',       glowFrom: 'from-cyan-500',    glowTo: 'to-blue-700' },
  'reports-home':       { from: 'from-cyan-600',     to: 'to-blue-700',     ring: 'ring-cyan-200 dark:ring-cyan-700',       glowFrom: 'from-cyan-500',    glowTo: 'to-blue-700' },
  'smart-analysis':    { from: 'from-emerald-600',  to: 'to-lime-600',     ring: 'ring-emerald-200 dark:ring-emerald-700', glowFrom: 'from-emerald-500', glowTo: 'to-lime-600' },

  invoices:            { from: 'from-rose-500',     to: 'to-red-600',      ring: 'ring-rose-200 dark:ring-rose-700',       glowFrom: 'from-rose-400',    glowTo: 'to-red-600' },
  notifications:       { from: 'from-rose-500',     to: 'to-pink-600',     ring: 'ring-rose-200 dark:ring-rose-700',       glowFrom: 'from-rose-400',    glowTo: 'to-pink-600' },

  settings:            { from: 'from-gray-500',     to: 'to-slate-600',    ring: 'ring-gray-200 dark:ring-gray-700',       glowFrom: 'from-gray-400',    glowTo: 'to-slate-600' },
  'settings-style':     { from: 'from-gray-500',     to: 'to-slate-600',    ring: 'ring-gray-200 dark:ring-gray-700',       glowFrom: 'from-gray-400',    glowTo: 'to-slate-600' },
  'audit-log':          { from: 'from-gray-500',     to: 'to-slate-600',    ring: 'ring-gray-200 dark:ring-gray-700',       glowFrom: 'from-gray-400',    glowTo: 'to-slate-600' },
};

const getAccent = (id: string, parentId?: string): Accent => {
  if (ACCENTS[id]) return ACCENTS[id];
  if (parentId && ACCENTS[parentId]) return ACCENTS[parentId];
  return PRIMARY_ACCENT;
};

const isActivePath = (pathname: string, itemPath?: string) => {
  if (!itemPath) return false;
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
};

const isItemActive = (pathname: string, item: NavItem): boolean => {
  if (isActivePath(pathname, item.path)) return true;
  if (item.children?.length) return item.children.some((c) => isItemActive(pathname, c));
  return false;
};

const filterNavItems = (items: NavItem[], forbiddenIds: string[]): NavItem[] => {
  const forbidden = new Set(forbiddenIds);
  const walk = (arr: NavItem[]): NavItem[] =>
    arr
      .filter((it) => !forbidden.has(it.id))
      .map((it) => {
        const children = it.children?.length ? walk(it.children) : undefined;
        const next: NavItem = { ...it, children };
        // اگر یک گروه هیچ فرزندی نداشت و مسیر هم نداشت، حذفش می‌کنیم
        if ((!next.path || next.path.trim() === '') && (!next.children || next.children.length === 0)) {
          return null;
        }
        // اگر گروه خالی شد ولی مسیر دارد، نگه می‌داریم.
        return next;
      })
      .filter(Boolean) as NavItem[];
  return walk(items);
};

interface SidebarProps {
  /** Controls whether the sidebar is visible on mobile. On desktop this value is ignored */
  isOpen: boolean;
  /** Callback when the mobile sidebar wants to close */
  onClose?: () => void;

  /** Desktop mini mode (icon-only) */
  collapsed?: boolean;
  /** Called when user toggles collapse (desktop) */
  onToggleCollapse?: () => void;
  /** Explicit collapsed width (so layout matches MainLayout) */
  collapsedWidthPx?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, collapsed = false, onToggleCollapse, collapsedWidthPx = 92 }) => {
  const { currentUser, token, authReady } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { style, computeSidebarWidthPx } = useStyle();
  // Favorites (برای نمایش علاقه‌مندی‌ها در بالای منو)
  const { favorites, removeFavorite } = useFavorites();

  const roleName = currentUser?.roleName;
  const filteredNavItems = useMemo(() => filterNavItemsByRole(SIDEBAR_ITEMS, roleName), [roleName]);
  const visibleItems = useMemo(() => filteredNavItems, [filteredNavItems]);
  const visibleFavorites = useMemo(() => favorites.filter((f) => canAccessPath(roleName, f.path)), [favorites, roleName]);
  const sidebarWidth = collapsed ? collapsedWidthPx : computeSidebarWidthPx();

  // Sidebar search (filters menu items by name)
  const [menuQuery, setMenuQuery] = useState('');

  // فروشگاه
  const [storeName, setStoreName] = useState('فروشگاه کوروش');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // وضعیت باز/بسته بودن گروه‌ها
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Search inside sidebar (fast filter)
  const [navQuery, setNavQuery] = useState('');

  const filteredByQuery = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return visibleItems;

    const walk = (items: NavItem[], parentId?: string): NavItem[] => {
      return items
        .map((it) => {
          const nameMatch = it.name?.toLowerCase().includes(q);
          const childMatches = it.children?.length ? walk(it.children, it.id) : [];
          const keep = nameMatch || childMatches.length > 0;
          if (!keep) return null;
          return { ...it, children: childMatches.length ? childMatches : it.children };
        })
        .filter(Boolean) as NavItem[];
    };
    return walk(visibleItems);
  }, [navQuery, visibleItems]);

  // دریافت تنظیمات فروشگاه
  useEffect(() => {
    const fetchStoreSettings = async () => {
      if (!authReady || !currentUser || currentUser.roleName !== 'Admin' || !token) {
        setIsLoadingSettings(false);
        return;
      }
      setIsLoadingSettings(true);
      try {
        const response = await apiFetch('/api/settings');
        if (!response.ok) throw new Error(`پاسخ شبکه صحیح نبود (${response.status})`);
        const result = await response.json();
        if (result.success && result.data) {
          setStoreName(result.data.store_name || 'فروشگاه کوروش');
          setLogoUrl(result.data.store_logo_path ? `/uploads/${result.data.store_logo_path}?t=${Date.now()}` : null);
        } else {
          throw new Error(result.message || 'خطا در قالب پاسخ تنظیمات');
        }
      } catch (error) {
        console.error('خطا در دریافت تنظیمات فروشگاه:', error);
        setStoreName('فروشگاه کوروش');
        setLogoUrl(null);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchStoreSettings();
  }, [token, currentUser, authReady]);

  // باز کردن خودکار گروه مربوط به مسیر جاری
  useEffect(() => {
    const pathname = location.pathname;
    const collectActiveGroups = (items: NavItem[], parents: string[] = []): string[] => {
      let open: string[] = [];
      for (const it of items) {
        const active = isItemActive(pathname, it);
        if (active && it.children?.length) open.push(it.id);
        if (it.children?.length) open = open.concat(collectActiveGroups(it.children, [...parents, it.id]));
      }
      return open;
    };

    const toOpen = new Set(collectActiveGroups(visibleItems));
    setOpenGroups((prev) => {
      const next = { ...prev };
      toOpen.forEach((id) => (next[id] = true));
      return next;
    });
  }, [location.pathname, visibleItems]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const Row: React.FC<{
    item: NavItem;
    depth: number;
    parentId?: string;
  }> = ({ item, depth, parentId }) => {
    const acc = getAccent(item.id, parentId);
    const active = isItemActive(location.pathname, item);
    const hasChildren = !!item.children?.length;
    const isOpen = !!openGroups[item.id];

    const iconPx = depth === 0 ? style.sidebarIconPx : Math.round(style.sidebarIconPx * 0.82);
    const labelClass = depth === 0 ? 'text-[13px] font-medium' : 'text-[12px] font-medium opacity-90';
    const indent = depth === 0 ? '' : 'pr-5';

    const onClick = (e: React.MouseEvent) => {
      if (hasChildren) {
        // Mini sidebar: go to group hub (or first child) instead of expanding hidden children
        if (collapsed && depth === 0) {
          const target = item.path || item.children?.find((c) => c.path)?.path;
          if (target) {
            navigate(target);
          }
          if (onClose) onClose();
          e.preventDefault();
          return;
        }

        // Normal: toggle group + optionally navigate
        toggleGroup(item.id);
        if (item.path) {
          navigate(item.path);
        }
        e.preventDefault();
        return;
      }

      // آیتم عادی
      if (onClose) onClose();
    };

    // رندر دکمه/لینک
    const content = (
      <div
        className={[
          'group relative flex items-center w-full rounded-xl whitespace-nowrap cursor-pointer text-right overflow-hidden transition-colors',
          depth === 0 ? 'px-3 py-2.5' : 'px-3 py-2',
          indent,
          active
            ? 'bg-primary/10 dark:bg-primary/15 text-gray-900 dark:text-gray-100'
            : 'text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/10 hover:text-gray-900 dark:hover:text-gray-100',
        ].join(' ')}
        title={collapsed && depth === 0 ? item.name : undefined}
      >
        {/* آیکون */}
        <span
          className={[
            'icon-bubble relative shrink-0 grid place-items-center rounded-xl text-white',
            'bg-gradient-to-br shadow-sm transition-all duration-300',
            acc.from,
            acc.to,
          ].join(' ')}
          style={{ width: iconPx, height: iconPx }}
        >
          {item.icon ? (
            <i className={item.icon} style={{ fontSize: Math.round(iconPx * 0.38) }} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
          )}
          {/* گلو */}
          <span
            className={[
              'pointer-events-none absolute -inset-[2px] rounded-xl opacity-0',
              'bg-gradient-to-br',
              acc.glowFrom,
              acc.glowTo,
              'blur-[10px] group-hover:opacity-30 transition-opacity',
            ].join(' ')}
          />
        </span>

        {!collapsed && (
          <span className={['mr-3', labelClass, 'flex items-center gap-2'].join(' ')}>
            <span>{item.name}</span>
          </span>
        )}

        {/* Chevron برای گروه‌ها */}
        {hasChildren && !collapsed && (
          <i
            className={[
              'fa-solid fa-chevron-down mr-auto ml-1 text-[12px] opacity-70 transition-transform',
              isOpen ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
          />
        )}

        {/* رینگ Active */}
        {active ? <span className={['absolute inset-0 rounded-xl ring-2', acc.ring].join(' ')} /> : null}
      </div>
    );

    return (
      <li className="relative">
        {hasChildren ? (
          <button type="button" onClick={onClick} className="w-full text-right">
            {content}
          </button>
        ) : (
          <NavLink to={item.path || '#'} onClick={onClick} className="block">
            {content}
          </NavLink>
        )}

        {/* زیرمنو */}
        {hasChildren && !collapsed && (
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="mt-1 space-y-1 pr-2 overflow-hidden"
              >
                {item.children!.map((child) => (
                  <Row key={child.id} item={child} depth={depth + 1} parentId={item.id} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        )}
      </li>
    );
  };

  return (
    <div
      className={[
        'bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col fixed h-full right-0 print:hidden',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        'md:translate-x-0 md:transform-none',
        'z-40',
      ].join(' ')}
      // روی موبایل، سایدبار نباید از عرض صفحه بزرگ‌تر شود (به‌خصوص وقتی کاربر پهنای pill را زیاد کرده).
      // maxWidth با vw تضمین می‌کند Drawer همیشه خوش‌دست بماند.
      style={{ width: sidebarWidth, maxWidth: collapsed ? `${collapsedWidthPx}px` : '86vw' }}
    >
      <div className={[
        'h-16 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 gap-3',
        collapsed ? 'px-2' : 'px-4',
      ].join(' ')}>
        <div className="flex items-center gap-3 min-w-0">
          {isLoadingSettings ? (
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
          ) : logoUrl ? (
            <img src={logoUrl} alt="لوگو" className="h-10 w-10 object-contain rounded-md" />
          ) : (
            <div className="h-10 w-10 bg-primary/10 flex items-center justify-center rounded-md">
              <i className="fa-solid fa-store text-primary text-xl" />
            </div>
          )}
          {!collapsed && <h1 className="text-xl font-bold text-primary truncate">{storeName}</h1>}
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop collapse */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:grid w-9 h-9 rounded-full place-items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title={collapsed ? 'باز کردن سایدبار' : 'جمع کردن سایدبار'}
              aria-label="تغییر حالت سایدبار"
            >
              <i className={collapsed ? 'fa-solid fa-angles-left' : 'fa-solid fa-angles-right'} />
            </button>
          )}

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="md:hidden w-9 h-9 rounded-full grid place-items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">

        {/* Sidebar search (desktop) */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <div className="relative">
              <input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="جستجو در منو…"
                className="w-full rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 px-10 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="جستجو در منو"
              />
              <i className="fa-solid fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {navQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setNavQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full grid place-items-center text-gray-500 hover:bg-gray-200/70 dark:hover:bg-gray-700"
                  aria-label="پاک کردن جستجو"
                  title="پاک کردن"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          </div>
        )}

        {!collapsed && visibleFavorites.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-2 pb-2"
            >
              <div className="px-2 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-gray-500 dark:text-gray-400">
                  <span className="w-8 h-8 rounded-2xl bg-gradient-to-l from-amber-500 to-orange-600 text-white grid place-items-center shadow-sm">
                    <i className="fa-solid fa-star" />
                  </span>
                  علاقه‌مندی‌ها
                </div>
                <span className="text-[11px] px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {visibleFavorites.length.toLocaleString('fa-IR')}
                </span>
              </div>

              <ul className="space-y-1">
                {visibleFavorites.slice(0, 10).map((f) => {
                  const path = normalizePath(f.path);
                  const nav = findNavByPath(SIDEBAR_ITEMS, path);
                  const acc = getAccent(nav?.id ?? f.key);
                  return (
                    <li key={f.path}>
                      <NavLink
                        to={f.path}
                        className={({ isActive }) =>
                          [
                            'group relative flex items-center gap-3 px-3 py-2 rounded-2xl overflow-hidden transition',
                            isActive
                              ? `bg-gradient-to-l ${acc.from} ${acc.to} text-white shadow-sm ring-1 ${acc.ring}`
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/60',
                          ].join(' ')
                        }
                      >
                        <span className={[
                          'w-9 h-9 rounded-2xl grid place-items-center shadow-sm',
                          'bg-white/70 dark:bg-gray-900/30',
                        ].join(' ')}>
                          <i className={f.icon ?? 'fa-regular fa-star'} />
                        </span>
                        <span className="text-[12px] font-semibold truncate flex-1">{f.title}</span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFavorite(f.path);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition w-8 h-8 rounded-2xl grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 text-current"
                          title="حذف از علاقه‌مندی‌ها"
                          aria-label="حذف از علاقه‌مندی‌ها"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>

                        {/* subtle glow */}
                        <span className={[
                          'pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition',
                          'bg-gradient-to-l from-white/0 to-white/20',
                        ].join(' ')} />
                      </NavLink>
                    </li>
                  );
                })}
              </ul>

              <div className="my-3 h-px bg-gray-200 dark:bg-gray-800" />
            </motion.div>
          )}

        <ul
          className={style.sidebarVariant === 'pill' ? (collapsed ? 'space-y-2 pr-2 pl-2' : 'space-y-2 pr-4 pl-3') : (collapsed ? 'space-y-1 pr-2 pl-2' : 'space-y-1 pr-3 pl-2')}
        >
          {filteredByQuery.map((item) => (
            <Row key={item.id} item={item} depth={0} />
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="p-2 border-t border-primary/40">
          <div className="bg-primary/5 p-2 rounded-lg text-right">
          <a
            href="tel:09361583838"
            className="mt-3 w-full block text-center bg-primary text-white py-2 px-4 text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            تماس با پشتیبانی (۰۹۳۶۱۵۸۳۸۳۸)
          </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
