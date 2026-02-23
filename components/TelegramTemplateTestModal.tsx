import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  template: string;
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

const TelegramTemplateTestModal: React.FC<Props> = ({ isOpen, onClose, title, template }) => {
  const { token } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const placeholders = useMemo(() => {
    const m = String(template || '').match(/\{(\w+)\}/g) || [];
    const keys = m.map((x) => x.replace(/[{}]/g, '')).filter(Boolean);
    return uniq(keys);
  }, [template]);

  const previewText = useMemo(() => {
    return String(template || '').replace(/\{(\w+)\}/g, (_m, p) => {
      return values[p] !== undefined ? String(values[p]) : '';
    });
  }, [template, values]);

  const canSend = useMemo(() => !!token && !!String(template || '').trim(), [token, template]);

  const onChange = (k: string, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
  };

  const send = async () => {
    if (!canSend) return;
    setIsSending(true);
    setResult(null);
    try {
      const res = await apiFetch('/api/telegram/test-message', {
        method: 'POST',
        body: JSON.stringify({ text: previewText }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ارسال تلگرام');
      setResult({ ok: true, message: js?.message || 'ارسال شد.' });
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || 'ناموفق' });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="rounded-xl border bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-700 mb-2">پیش‌نمایش پیام</div>
          <pre className="whitespace-pre-wrap text-sm text-slate-800">{previewText || '—'}</pre>
        </div>

        {placeholders.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {placeholders.map((k) => (
              <div key={k} className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">{k}</div>
                <input
                  value={values[k] || ''}
                  onChange={(e) => onChange(k, e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder={`مقدار برای {${k}}`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
          >
            بستن
          </button>
          <button
            disabled={!canSend || isSending}
            onClick={send}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSending ? 'در حال ارسال…' : 'ارسال تست به تلگرام'}
          </button>
        </div>

        {result && (
          <div className={`rounded-xl border p-3 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
            {result.message}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TelegramTemplateTestModal;
