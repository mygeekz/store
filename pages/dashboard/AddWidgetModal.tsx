import React, { useMemo, useState } from 'react';
import type { WidgetDef, WidgetId } from './registry';

type Props = {
  open: boolean;
  onClose: () => void;
  available: WidgetDef[];
  onAdd: (id: WidgetId) => void;
};

const accentToClasses = (accent: WidgetDef['accent']) => {
  switch (accent) {
    case 'emerald':
      return { bg: 'from-emerald-500/20 to-teal-500/20', icon: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-500/20' };
    case 'violet':
      return { bg: 'from-violet-500/20 to-fuchsia-500/20', icon: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-500/20' };
    case 'rose':
      return { bg: 'from-rose-500/20 to-pink-500/20', icon: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-500/20' };
    case 'sky':
      return { bg: 'from-sky-500/20 to-indigo-500/20', icon: 'text-sky-700 dark:text-sky-300', ring: 'ring-sky-500/20' };
    case 'amber':
      return { bg: 'from-amber-500/20 to-orange-500/20', icon: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-500/20' };
    case 'teal':
      return { bg: 'from-teal-500/20 to-cyan-500/20', icon: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-500/20' };
    case 'indigo':
    default:
      return { bg: 'from-indigo-500/20 to-fuchsia-500/20', icon: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-500/20' };
  }
};

export default function AddWidgetModal({ open, onClose, available, onAdd }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('همه');

  const categories = useMemo(() => {
    const set = new Set<string>(available.map((w) => w.category));
    return ['همه', ...Array.from(set)];
  }, [available]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return available
      .filter((w) => (cat === 'همه' ? true : w.category === cat))
      .filter((w) => {
        if (!s) return true;
        return (
          w.title.toLowerCase().includes(s) ||
          w.category.toLowerCase().includes(s) ||
          (w.id || '').toLowerCase().includes(s)
        );
      });
  }, [available, q, cat]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-3">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div
        dir="rtl"
        className="relative w-[min(980px,96vw)] rounded-3xl bg-white/85 dark:bg-gray-950/70 backdrop-blur-xl shadow-[0_20px_90px_rgba(0,0,0,0.22)] ring-1 ring-black/5 dark:ring-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-black/5 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 ring-1 ring-black/5 dark:ring-white/10">
                  <i className="fa-solid fa-grid-2 text-indigo-700 dark:text-indigo-300" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">افزودن کارت</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                    کارت‌های مورد نیازت رو انتخاب کن — بعداً می‌تونی با Drag مرتبشون کنی.
                  </p>
                </div>
              </div>
            </div>

            <button
              className="w-10 h-10 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition flex items-center justify-center"
              onClick={onClose}
              title="بستن"
            >
              <i className="fa-solid fa-xmark text-gray-700 dark:text-gray-200" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجو در کارت‌ها..."
                className="w-full h-12 pr-11 pl-3 rounded-2xl bg-black/5 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm"
              />
            </div>

            <div className="flex gap-2 overflow-auto no-scrollbar">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={[
                    'h-12 px-4 rounded-2xl text-sm font-bold transition ring-1 whitespace-nowrap',
                    cat === c
                      ? 'bg-indigo-600 text-white ring-indigo-600/30 shadow-sm'
                      : 'bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-200 ring-black/5 dark:ring-white/10 hover:bg-black/5 dark:hover:bg-white/10',
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {filtered.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center rounded-3xl bg-black/5 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-500/15 to-gray-500/5 ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center">
                <i className="fa-solid fa-box-open text-gray-600 dark:text-gray-300" />
              </div>
              <div className="mt-3 text-sm font-extrabold text-gray-900 dark:text-white">چیزی پیدا نشد</div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">عبارت جستجو یا دسته‌بندی رو تغییر بده.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((w) => {
                const a = accentToClasses(w.accent);
                return (
                  <div
                    key={w.id}
                    className="group rounded-3xl bg-white/70 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 p-4 hover:shadow-lg hover:shadow-black/5 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={[
                            'w-11 h-11 rounded-2xl flex items-center justify-center',
                            'bg-gradient-to-br',
                            a.bg,
                            'ring-1 ring-black/5 dark:ring-white/10',
                          ].join(' ')}
                        >
                          <i className={`${w.icon || 'fa-solid fa-square-poll-vertical'} ${a.icon}`} />
                        </span>

                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{w.title}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <span className="px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10">
                              {w.category}
                            </span>
                            <span className="opacity-70">•</span>
                            <span className="opacity-80">کارت</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onAdd(w.id)}
                        className="h-10 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold transition flex items-center gap-2 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      >
                        <i className="fa-solid fa-plus" />
                        افزودن
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            نکته: در حالت ویرایش می‌تونی کارت‌ها رو Drag کنی و اندازه‌شون رو تغییر بدی.
          </div>
          <button
            className="h-10 px-4 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition text-sm font-extrabold"
            onClick={onClose}
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
