import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

import { SIDEBAR_ITEMS } from '../constants';
import { flattenNav } from '../utils/nav';
import { processQuery } from '../utils/search/processQuery';
import { getRecents } from '../utils/recents';
import { useFavorites } from '../contexts/FavoritesContext';
import { canAccessPath, filterNavItemsByRole } from '../utils/rbac';

type Props = { open: boolean; onClose: () => void; };

type DataSearchDomain = 'customer' | 'product' | 'phone' | 'service' | 'invoice' | 'repair' | 'installment';
type DataSearchItem = {
  id: number;
  domain: DataSearchDomain;
  title?: string;
  subtitle?: string;
  titleHL?: string;
  snippet?: string;
};

export const CommandPalette: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, token } = useAuth();
  const roleName = currentUser?.roleName;
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const visibleFavorites = useMemo(() => favorites.filter((f) => canAccessPath(roleName, f.path)), [favorites, roleName]);

  const flat = useMemo(() => {
    const filtered = filterNavItemsByRole(SIDEBAR_ITEMS, roleName);
    return flattenNav(filtered);
  }, [roleName]);
  const [q, setQ] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dataResults, setDataResults] = useState<DataSearchItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataErr, setDataErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const recents = useMemo(() => getRecents(), [open]);
  const processed = useMemo(() => processQuery(q), [q]);

  // --- Unified data search (server FTS) ---
  useEffect(() => {
    if (!open) return;
    const term = (processed.final || '').trim();
    if (!term || term.length < 2) {
      setDataResults([]);
      setDataLoading(false);
      setDataErr(null);
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }
    if (!token) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setDataLoading(true);
    setDataErr(null);

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=24`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as any));
          throw new Error(j?.message || 'خطا در جستجوی سراسری');
        }
        const j = await res.json();
        setDataResults(Array.isArray(j?.items) ? j.items : []);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setDataErr(e?.message || 'خطای ناشناخته');
        setDataResults([]);
      } finally {
        setDataLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [open, processed.final, token]);
  const results = useMemo(() => {
    const term = (processed.final || '').toLowerCase().trim();
    if (!term) return flat.slice(0, 30);
    return flat.filter(it => (`${it.title} ${it.parentTitle ?? ''} ${it.path}`).toLowerCase().includes(term)).slice(0, 50);
  }, [flat, processed.final]);
  const groupedData = useMemo(() => {
    const groups: Record<string, DataSearchItem[]> = {};
    dataResults.forEach((it) => {
      const k = it.domain;
      if (!groups[k]) groups[k] = [];
      groups[k].push(it);
    });
    return groups;
  }, [dataResults]);

  const domainTitle = (d: string) => {
    switch (d) {
      case 'customer': return 'مشتری‌ها';
      case 'invoice': return 'فاکتورها';
      case 'repair': return 'تعمیرات';
      case 'installment': return 'اقساط';
      case 'product': return 'کالاها';
      case 'phone': return 'گوشی‌ها';
      case 'service': return 'خدمات';
      default: return 'سایر';
    }
  };

  const goData = (it: DataSearchItem, action?: 'open' | 'payNext' | 'receipt' | 'print') => {
    // Primary open path per domain
    const openPath = (() => {
      switch (it.domain) {
        case 'customer': return `/customers/${it.id}`;
        case 'invoice': return `/invoices/${it.id}`;
        case 'repair': return `/repairs/${it.id}`;
        case 'installment': return `/installment-sales/${it.id}`;
        case 'product': return `/products?q=${encodeURIComponent((processed.final || '').trim())}`;
        case 'phone': return `/mobile-phones?q=${encodeURIComponent((processed.final || '').trim())}`;
        case 'service': return `/services?q=${encodeURIComponent((processed.final || '').trim())}`;
        default: return '/';
      }
    })();

    const actPath = (() => {
      if (it.domain === 'installment' && action === 'payNext') return `/installment-sales/${it.id}?pay=next`;
      if (it.domain === 'repair' && action === 'receipt') return `/repairs/${it.id}/receipt`;
      if (it.domain === 'invoice' && action === 'print') return `/invoices/${it.id}?autoPrint=1`;
      return openPath;
    })();

    navigate(actPath);
    onClose();
  };

  type CombinedItem =
    | { kind: 'data'; key: string; data: DataSearchItem }
    | { kind: 'nav'; key: string; nav: { title: string; parentTitle?: string; path: string; icon?: string } };

  const combinedItems = useMemo<CombinedItem[]>(() => {
    if (!q.trim()) return results.map((r) => ({ kind: 'nav', key: r.path, nav: r }));
    const data = dataResults.map((d) => ({ kind: 'data', key: `${d.domain}:${d.id}`, data: d } as CombinedItem));
    const nav = results.map((r) => ({ kind: 'nav', key: r.path, nav: r } as CombinedItem));
    // داده‌ها اول، بعد صفحات
    return [...data, ...nav];
  }, [q, dataResults, results]);

  // keep selection in range
  useEffect(() => {
    setActiveIndex((i) => {
      const max = Math.max(0, combinedItems.length - 1);
      return Math.min(i, max);
    });
  }, [combinedItems.length]);

  const go = (path: string) => { navigate(path); onClose(); };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <button aria-label="بستن" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          role="dialog" aria-modal="true"
          className="relative w-full max-w-2xl overflow-hidden rounded-[22px] bg-white/80 dark:bg-gray-900/60 shadow-2xl border border-gray-200/70 dark:border-gray-800/70 backdrop-blur-xl"
          initial={{ y: 14, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 14, scale: 0.98, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        >
          <div className="p-4 border-b border-gray-200/70 dark:border-gray-800/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-700 text-white flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-magnifying-glass" />
              </div>
              <div className="flex-1">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setActiveIndex(0); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
	                      setActiveIndex((i) => Math.min(i + 1, combinedItems.length - 1));
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveIndex((i) => Math.max(i - 1, 0));
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
	                      const target = combinedItems[activeIndex];
	                      if (!target) return;
	                      if (target.kind === 'nav') go(target.nav.path);
	                      else goData(target.data);
                    }
                  }}
                  placeholder="جستجوی سریع (صفحه، فاکتور، تعمیرات...)"
                  className="w-full bg-transparent outline-none text-base text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ↑↓ جابه‌جایی • Enter انتخاب • ⭐ علاقه‌مندی • Esc بستن
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">Ctrl</span>
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">Shift</span>
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">K</span>
              </div>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {visibleFavorites.length > 0 && !q.trim() && (
              <Section title="علاقه‌مندی‌ها">
                {favorites.slice(0, 8).map((it) => (
                  <Row
                    key={it.path}
                    title={it.title}
                    subtitle={it.parentTitle}
                    icon={it.icon}
                    starred
                    onStar={() => toggleFavorite({ key: it.path, title: it.title, path: it.path, icon: it.icon, parentTitle: it.parentTitle })}
                    onClick={() => go(it.path)}
                  />
                ))}
              </Section>
            )}

            {recents.length > 0 && !q.trim() && (
              <Section title="اخیراً باز شده">
                {recents.slice(0, 8).map((it) => (
                  <Row
                    key={it.path}
                    title={it.title}
                    subtitle={it.parentTitle}
                    icon={it.icon}
                    starred={isFavorite(it.path)}
                    onStar={() => toggleFavorite({ key: it.path, title: it.title, path: it.path, icon: it.icon, parentTitle: it.parentTitle })}
                    onClick={() => go(it.path)}
                  />
                ))}
              </Section>
            )}

	            <Section title={q.trim() ? 'نتایج' : 'همه صفحات'}>
	              {q.trim() && (
	                <div className="px-4 pb-2 pt-1 text-xs text-gray-500 dark:text-gray-400">
	                  {dataLoading ? 'در حال جستجو در مشتری/فاکتور/کالا/تعمیر/اقساط…' : dataErr ? dataErr : 'Enter = باز کردن • دکمه‌های کنار هر رکورد = اکشن سریع'}
	                </div>
	              )}

	              {combinedItems.map((it, idx) => {
	                const selected = idx === activeIndex;
	                if (it.kind === 'nav') {
	                  return (
	                    <Row
	                      key={it.key}
	                      title={it.nav.title}
	                      subtitle={it.nav.parentTitle}
	                      icon={it.nav.icon}
	                      starred={isFavorite(it.nav.path)}
	                      onStar={() => toggleFavorite({ key: it.nav.path, title: it.nav.title, path: it.nav.path, icon: it.nav.icon, parentTitle: it.nav.parentTitle })}
	                      onClick={() => go(it.nav.path)}
	                      selected={selected}
	                    />
	                  );
	                }
	                return (
	                  <DataRow
	                    key={it.key}
	                    item={it.data}
	                    selected={selected}
	                    onOpen={() => goData(it.data, 'open')}
	                    onQuick={(a) => goData(it.data, a)}
	                  />
	                );
	              })}

	              {!dataLoading && !dataErr && q.trim() && dataResults.length === 0 && results.length === 0 && (
	                <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">نتیجه‌ای پیدا نشد.</div>
	              )}
	              {!q.trim() && results.length === 0 && (
	                <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">نتیجه‌ای پیدا نشد.</div>
	              )}
	            </Section>
          </div>

          <div className="px-4 py-3 border-t border-gray-200/70 dark:border-gray-800/70 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">Esc</span>
              بستن
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">↑↓</span>
              انتخاب
              <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">Enter</span>
              رفتن
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="py-2">
    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400">{title}</div>
    <div className="px-2">{children}</div>
  </div>
);

const Row: React.FC<{
  title: string;
  subtitle?: string;
  icon?: string;
  starred?: boolean;
  selected?: boolean;
  onStar: () => void;
  onClick: () => void;
}> = ({ title, subtitle, icon, starred, selected, onStar, onClick }) => (
  <motion.div
    layout
    className={[
      'group flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer border transition',
      selected
        ? 'bg-gradient-to-l from-primary-600 to-primary-700 text-white border-primary/20 shadow-sm'
        : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 border-transparent',
    ].join(' ')}
    onClick={onClick}
  >
    <div
      className={[
        'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
        selected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
      ].join(' ')}
    >
      <i className={icon ?? 'fa-solid fa-circle'} />
    </div>
    <div className="flex-1 min-w-0">
      <div className={['text-sm font-semibold truncate', selected ? 'text-white' : 'text-gray-900 dark:text-gray-100'].join(' ')}>{title}</div>
      {subtitle && (
        <div className={['text-xs truncate', selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'].join(' ')}>{subtitle}</div>
      )}
    </div>
    <button
      type="button"
      className={[
        'w-9 h-9 rounded-2xl grid place-items-center transition',
        selected
          ? 'text-white/90 hover:bg-white/15'
          : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800',
      ].join(' ')}
      onClick={(e) => { e.stopPropagation(); onStar(); }}
      aria-label="علاقه‌مندی"
      title="علاقه‌مندی"
    >
      <i className={starred ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
    </button>
  </motion.div>
);

const domainBadge = (d: string) => {
  switch (d) {
    case 'customer': return { label: 'مشتری', icon: 'fa-solid fa-user' };
    case 'invoice': return { label: 'فاکتور', icon: 'fa-solid fa-file-invoice' };
    case 'repair': return { label: 'تعمیر', icon: 'fa-solid fa-screwdriver-wrench' };
    case 'installment': return { label: 'اقساط', icon: 'fa-solid fa-credit-card' };
    case 'product': return { label: 'کالا', icon: 'fa-solid fa-box' };
    case 'phone': return { label: 'گوشی', icon: 'fa-solid fa-mobile-screen-button' };
    case 'service': return { label: 'خدمت', icon: 'fa-solid fa-wand-magic-sparkles' };
    default: return { label: 'مورد', icon: 'fa-solid fa-circle' };
  }
};

const DataRow: React.FC<{
  item: DataSearchItem;
  selected?: boolean;
  onOpen: () => void;
  onQuick: (a: 'open' | 'payNext' | 'receipt' | 'print') => void;
}> = ({ item, selected, onOpen, onQuick }) => {
  const badge = domainBadge(item.domain);
  const showPayNext = item.domain === 'installment';
  const showReceipt = item.domain === 'repair';
  const showPrint = item.domain === 'invoice';

  return (
    <motion.div
      layout
      className={[
        'group flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer border transition',
        selected
          ? 'bg-gradient-to-l from-primary-600 to-primary-700 text-white border-primary/20 shadow-sm'
          : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 border-transparent',
      ].join(' ')}
      onClick={onOpen}
    >
      <div
        className={[
          'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
          selected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
        ].join(' ')}
      >
        <i className={badge.icon} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={[
              'text-[11px] px-2 py-0.5 rounded-full border shrink-0',
              selected
                ? 'border-white/25 bg-white/10 text-white/90'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300',
            ].join(' ')}
          >
            {badge.label}
          </span>
          <div
            className={['text-sm font-semibold truncate', selected ? 'text-white' : 'text-gray-900 dark:text-gray-100'].join(' ')}
          >
            {item.titleHL ? (
              <span dangerouslySetInnerHTML={{ __html: item.titleHL }} />
            ) : (
              item.title || `#${item.id}`
            )}
          </div>
        </div>
        {(item.subtitle || item.snippet) && (
          <div className={['text-xs truncate mt-0.5', selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'].join(' ')}>
            {item.subtitle || <span dangerouslySetInnerHTML={{ __html: item.snippet || '' }} />}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {showPayNext && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-primary/20 bg-primary/5 text-primary-700 dark:text-primary-300 hover:bg-primary/10',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('payNext'); }}
            title="ثبت قسط بعدی"
          >
            <i className="fa-solid fa-bolt ml-1" />
            قسط بعدی
          </button>
        )}
        {showReceipt && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('receipt'); }}
            title="رسید"
          >
            <i className="fa-solid fa-receipt ml-1" />
            رسید
          </button>
        )}
        {showPrint && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('print'); }}
            title="چاپ"
          >
            <i className="fa-solid fa-print ml-1" />
            چاپ
          </button>
        )}
        <button
          type="button"
          className={[
            'w-9 h-9 rounded-2xl grid place-items-center transition',
            selected
              ? 'text-white/90 hover:bg-white/15'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={(e) => { e.stopPropagation(); onQuick('open'); }}
          aria-label="باز کردن"
          title="باز کردن"
        >
          <i className="fa-solid fa-arrow-up-right-from-square" />
        </button>
      </div>
    </motion.div>
  );
};
