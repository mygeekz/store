import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type SavedView<T> = {
  id: string;
  name: string;
  state: T;
  createdAt: number;
};

function safeParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function uid() {
  return Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(6);
}

export function useSavedViews<T>(storageKey: string) {
  const [views, setViews] = useState<SavedView<T>[]>(() => safeParse<SavedView<T>[]>(localStorage.getItem(storageKey), []));

  const persist = (next: SavedView<T>[]) => {
    setViews(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  return {
    views,
    addView: (name: string, state: T) => {
      const next: SavedView<T>[] = [{ id: uid(), name, state, createdAt: Date.now() }, ...views].slice(0, 20);
      persist(next);
    },
    removeView: (id: string) => persist(views.filter(v => v.id !== id)),
    clearViews: () => persist([]),
  };
}

type Props<T> = {
  storageKey: string;
  currentState: T;
  onApply: (state: T) => void;
  className?: string;
  label?: string;
};

export default function SavedViewsBar<T>({ storageKey, currentState, onApply, className, label = 'نما' }: Props<T>) {
  const { views, addView, removeView } = useSavedViews<T>(storageKey);
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');

  const selected = useMemo(() => views.find(v => v.id === selectedId), [views, selectedId]);

  return (
    <div className={className ?? ''}>
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800/70 bg-white/70 dark:bg-gray-900/40 backdrop-blur-xl shadow-sm">
        <div className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Picker */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-3 flex items-center text-gray-400">
              <i className="fa-solid fa-bookmark" />
            </div>
            <select
              value={selectedId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedId(id);
                const v = views.find(x => x.id === id);
                if (v) onApply(v.state);
              }}
              className="w-full h-11 rounded-2xl pr-10 pl-3 text-sm bg-white/80 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">{label}‌های ذخیره‌شده…</option>
              {views.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <i className="fa-regular fa-circle-check" />
                ذخیره/اعمال سریع فیلترها
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">برای حذف، روی سطل زباله بزن</span>
            </div>
          </div>

          {/* Create */}
          <div className="flex flex-col sm:flex-row gap-2 lg:min-w-[340px]">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                <i className="fa-solid fa-pen" />
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="نام نما (مثلاً امروز)"
                className="w-full h-11 rounded-2xl pr-10 pl-3 text-sm bg-white/80 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const n = name.trim();
                if (!n) return;
                addView(n, currentState);
                setName('');
              }}
              className="h-11 px-4 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-700 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition"
              title="ذخیره فیلتر فعلی"
            >
              <span className="inline-flex items-center gap-2">
                <i className="fa-solid fa-bookmark" />
                ذخیره
              </span>
            </button>

            <AnimatePresence>
              {selected && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  onClick={() => { removeView(selected.id); setSelectedId(''); }}
                  className="h-11 px-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-200 active:scale-[0.99] transition"
                  title="حذف نمای انتخاب‌شده"
                >
                  <i className="fa-solid fa-trash" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chips */}
        <AnimatePresence initial={false}>
          {views.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="px-3 sm:px-4 pb-3 sm:pb-4"
            >
              <div className="h-px bg-gray-200/70 dark:bg-gray-800/70 mb-3" />
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {views.slice(0, 12).map((v) => {
                  const isSelected = v.id === selectedId;
                  return (
                    <div
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(v.id);
                          onApply(v.state);
                        }
                      }}
                      onClick={() => { setSelectedId(v.id); onApply(v.state); }}
                      className={[
                        'group inline-flex items-center gap-2 h-9 px-3 rounded-2xl border text-xs font-semibold transition whitespace-nowrap cursor-pointer select-none outline-none',
                        'focus:ring-2 focus:ring-primary/30',
                        isSelected
                          ? 'border-primary/30 bg-primary/10 text-primary dark:bg-primary/15'
                          : 'border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-950/30 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/60',
                      ].join(' ')}
                      title="اعمال نما"
                    >
                      <span className={['h-2.5 w-2.5 rounded-full', isSelected ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'].join(' ')} />
                      <span className="max-w-[180px] truncate">{v.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeView(v.id); if (selectedId === v.id) setSelectedId(''); }}
                        className="opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 grid place-items-center text-gray-400 hover:text-red-500"
                        title="حذف"
                        aria-label="حذف"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
