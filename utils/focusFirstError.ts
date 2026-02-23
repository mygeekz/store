import type { FormErrors } from '../components/FormErrorSummary';

/**
 * Scroll/focus to the first error field.
 * Errors keys are matched to element ids by fieldIdMap; falls back to key.
 */
export function focusFirstError(errors: FormErrors, fieldIdMap?: Record<string, string>) {
  const keys = Object.keys(errors || {});
  if (keys.length === 0) return;
  const firstKey = keys[0];
  const id = fieldIdMap?.[firstKey] || firstKey;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = (el as any).focus ? el : (el.querySelector('input,select,textarea,button,[tabindex]') as any);
  if (focusable && typeof focusable.focus === 'function') {
    setTimeout(() => focusable.focus({ preventScroll: true }), 60);
  }
}
