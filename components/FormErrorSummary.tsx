import React from 'react';

export type FormErrors = Record<string, string>;

type Props = {
  errors: FormErrors;
  /** Map error keys to human labels, for nicer display */
  labels?: Record<string, string>;
  /** Map error keys to DOM element ids for scrolling/focus */
  fieldIdMap?: Record<string, string>;
  className?: string;
};

const scrollToField = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Focus if possible
  const focusable = (el as any).focus ? el : (el.querySelector('input,select,textarea,button,[tabindex]') as any);
  if (focusable && typeof focusable.focus === 'function') {
    setTimeout(() => focusable.focus({ preventScroll: true }), 50);
  }
};

const FormErrorSummary: React.FC<Props> = ({ errors, labels, fieldIdMap, className }) => {
  const keys = Object.keys(errors || {});
  if (keys.length === 0) return null;

  return (
    <div className={`app-card p-3 md:p-4 border border-red-200/60 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 ${className || ''}`.trim()}>
      <div className="flex items-center gap-2 text-red-700 dark:text-red-200 font-black text-sm">
        <i className="fa-solid fa-triangle-exclamation" />
        خطاهای فرم
      </div>

      <ul className="mt-2 space-y-1">
        {keys.map((k) => {
          const label = labels?.[k] || k;
          const msg = errors[k];
          const fieldId = fieldIdMap?.[k] || k;
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => scrollToField(fieldId)}
                className="w-full text-right text-[12px] md:text-sm text-red-700 dark:text-red-200 hover:underline"
              >
                <span className="font-bold">{label}:</span> {msg}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FormErrorSummary;
