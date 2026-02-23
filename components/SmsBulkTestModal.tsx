import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';

export type SmsPatternDef = {
  key: string; // settings key
  label: string;
  category: string;
  accent?: 'emerald' | 'blue' | 'amber' | 'gray';
  iconClass?: string;
  tokens: string[];
  previewTemplate?: string;
  bodyId?: string | number | null; // filled by settings
  configured?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  patterns: SmsPatternDef[];
  defaultSelectedKeys?: string[];
  // map from settings key => bodyId (string)
  getBodyId: (key: string) => string;
};

const SmsBulkTestModal: React.FC<Props> = ({ isOpen, onClose, patterns, defaultSelectedKeys, getBodyId }) => {
  const { token } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(defaultSelectedKeys || []);
  const [recipient, setRecipient] = useState<string>('');
  const [tokensByKey, setTokensByKey] = useState<Record<string, string[]>>({});
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const selected = useMemo(() => {
    const set = new Set(selectedKeys);
    return patterns.filter((p) => set.has(p.key));
  }, [patterns, selectedKeys]);

  const toggleKey = (k: string) => {
    setResult(null);
    setSelectedKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const reset = () => {
    setStep(1);
    setSelectedKeys(defaultSelectedKeys || []);
    setRecipient('');
    setTokensByKey({});
    setIsSending(false);
    setResult(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const ensureTokens = (key: string, len: number) => {
    setTokensByKey((prev) => {
      const cur = Array.isArray(prev[key]) ? prev[key] : [];
      if (cur.length === len) return prev;
      const next = [...cur];
      while (next.length < len) next.push('');
      return { ...prev, [key]: next.slice(0, len) };
    });
  };

  const goNext = () => {
    if (selectedKeys.length === 0) return;
    // pre-create token arrays
    selected.forEach((p) => ensureTokens(p.key, p.tokens.length));
    setStep(2);
  };

  const submit = async () => {
    if (!token) return;
    setIsSending(true);
    setResult(null);
    try {
      const tests = selected.map((p) => {
        const bodyId = Number(getBodyId(p.key));
        return {
          key: p.key,
          label: p.label,
          bodyId,
          tokens: (tokensByKey[p.key] || []).map((x) => String(x ?? '')),
        };
      });

      const res = await fetch('/api/sms/bulk-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: recipient.trim(), tests }),
      });
      const data = await res.json().catch(() => ({}));
      setResult({ ok: res.ok && data?.success, data });
    } catch (e: any) {
      setResult({ ok: false, data: { message: e?.message || 'خطای شبکه در تست گروهی' } });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="تست گروهی پیامک‌ها">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-200 border border-violet-200/60 dark:border-violet-900/30">
              <i className="fa-solid fa-vials" />
            </span>
            مرحله {step} از 2
          </div>
          <div className="app-subtle mt-1 text-xs">
            ابتدا پیامک‌هایی که می‌خواهید تست شوند را انتخاب کنید؛ سپس شماره گیرنده و متغیرها را وارد کنید.
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {patterns.map((p) => {
                const checked = selectedKeys.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => toggleKey(p.key)}
                    className={`text-right rounded-2xl border p-3 bg-white/60 dark:bg-gray-800/40 hover:brightness-105 transition ${checked ? 'border-emerald-400 dark:border-emerald-600' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {p.label}
                        </div>
                        <div className="app-subtle text-xs mt-1">{p.category} • متغیرها: {p.tokens.join('، ')}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${checked ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
                      >
                        <i className={`fa-solid ${checked ? 'fa-check' : 'fa-plus'}`} />
                        {checked ? 'انتخاب شد' : 'انتخاب'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={close} className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
                بستن
              </button>
              <button
                type="button"
                disabled={selectedKeys.length === 0}
                onClick={goNext}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                ادامه
                <i className="fa-solid fa-arrow-left mr-2" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="app-label">شماره گیرنده برای تست</label>
              <input className="app-input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0912..." dir="ltr" />
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
              {selected.map((p) => {
                const bodyId = getBodyId(p.key);
                const vals = tokensByKey[p.key] || [];
                ensureTokens(p.key, p.tokens.length);
                return (
                  <div key={p.key} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {p.label}
                      </div>
                      <div className="text-xs app-subtle" dir="ltr">BodyId: {bodyId || '—'}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {p.tokens.map((t, idx) => (
                        <div key={idx}>
                          <label className="app-label">{idx + 1}) {t}</label>
                          <input
                            className="app-input"
                            value={vals[idx] || ''}
                            onChange={(e) =>
                              setTokensByKey((prev) => {
                                const next = [...(prev[p.key] || [])];
                                while (next.length < p.tokens.length) next.push('');
                                next[idx] = e.target.value;
                                return { ...prev, [p.key]: next };
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {result ? (
              <div className={`rounded-xl p-3 text-sm ${result.ok ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'}`}>
                <div className="font-semibold">{result.ok ? 'نتیجه تست گروهی' : 'خطا در تست گروهی'}</div>
                <div className="mt-1">{result.data?.message || (result.ok ? 'انجام شد' : 'ناموفق')}</div>
                {Array.isArray(result.data?.results) ? (
                  <ul className="mt-2 space-y-1">
                    {result.data.results.map((r: any, i: number) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate">{r.label}</span>
                        <span className={`text-xs px-2 py-1 rounded-lg ${r.success ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                          {r.success ? 'موفق' : 'ناموفق'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
                <i className="fa-solid fa-arrow-right ml-2" />
                بازگشت
              </button>
              <button
                type="button"
                disabled={isSending || !recipient.trim() || selected.length === 0}
                onClick={submit}
                className="px-4 py-2 rounded-xl bg-primary text-white hover:brightness-110 disabled:opacity-50"
              >
                <i className={`fa-solid ${isSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} ml-2`} />
                {isSending ? 'در حال ارسال...' : 'ارسال تست‌ها'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default SmsBulkTestModal;
