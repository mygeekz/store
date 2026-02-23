import React, { useEffect, useMemo } from 'react';

export type WizardStep = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  anchorId?: string; // اگر داده شود، روی تغییر مرحله اسکرول می‌کند
};

type Props = {
  steps: WizardStep[];
  stepIndex: number;
  onStepChange: (i: number) => void;
  className?: string;
  sticky?: boolean;
  showBottomBar?: boolean;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const scrollToAnchor = (anchorId?: string) => {
  if (!anchorId) return;
  const el = document.getElementById(anchorId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const WorkflowWizard: React.FC<Props> = ({
  steps,
  stepIndex,
  onStepChange,
  className,
  sticky = true,
  showBottomBar = true,
}) => {
  const max = steps.length - 1;
  const current = steps[clamp(stepIndex, 0, max)];

  const canPrev = stepIndex > 0;
  const canNext = stepIndex < max;

  const progress = useMemo(() => {
    if (steps.length <= 1) return 100;
    return Math.round((stepIndex / (steps.length - 1)) * 100);
  }, [stepIndex, steps.length]);

  useEffect(() => {
    // روی باز شدن/تغییر مرحله به سکشن مربوط اسکرول کن
    scrollToAnchor(current?.anchorId);
  }, [current?.anchorId]);

  return (
    <div className={[className ?? '', sticky ? 'sticky top-3 z-20' : ''].join(' ')}>
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary-700 dark:text-primary-300 grid place-items-center">
              <i className={current?.icon ?? 'fa-solid fa-wand-magic-sparkles'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100 truncate">{current?.title}</div>
                  {current?.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{current.description}</div>}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  مرحله {stepIndex + 1} از {steps.length}
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {steps.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onStepChange(i)}
                  className={[
                    'shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-semibold transition',
                    active
                      ? 'bg-primary text-white border-primary/30 shadow-sm'
                      : done
                        ? 'bg-primary/5 text-primary-700 dark:text-primary-300 border-primary/20 hover:bg-primary/10'
                        : 'bg-white/60 dark:bg-slate-900/40 text-gray-700 dark:text-gray-200 border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-800/40',
                  ].join(' ')}
                  title={s.title}
                >
                  <span
                    className={[
                      'w-6 h-6 rounded-xl grid place-items-center text-[11px] border',
                      active
                        ? 'bg-white/15 border-white/20'
                        : done
                          ? 'bg-primary/10 border-primary/20'
                          : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10',
                    ].join(' ')}
                  >
                    {done ? <i className="fa-solid fa-check" /> : i + 1}
                  </span>
                  <span className="whitespace-nowrap">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showBottomBar && (
        <div className="mt-3">
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm px-4 py-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className={[
                'h-10 px-4 rounded-2xl text-sm font-bold border transition',
                canPrev
                  ? 'border-black/10 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 hover:bg-gray-50 dark:hover:bg-slate-800/40 text-gray-800 dark:text-gray-100'
                  : 'border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 text-gray-400 cursor-not-allowed',
              ].join(' ')}
              onClick={() => canPrev && onStepChange(stepIndex - 1)}
              disabled={!canPrev}
            >
              <i className="fa-solid fa-arrow-right ml-2" />
              قبلی
            </button>

            <button
              type="button"
              className={[
                'h-10 px-4 rounded-2xl text-sm font-bold border transition',
                canNext
                  ? 'border-primary/25 bg-primary text-white hover:bg-primary/90'
                  : 'border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 text-gray-400 cursor-not-allowed',
              ].join(' ')}
              onClick={() => canNext && onStepChange(stepIndex + 1)}
              disabled={!canNext}
            >
              بعدی
              <i className="fa-solid fa-arrow-left mr-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowWizard;
