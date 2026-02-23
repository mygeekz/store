import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';

type SmsLog = {
  id: number;
  createdAt: string;
  provider: string;
  eventType?: string;
  recipient: string;
  patternId?: string;
  success: number;
  error?: string;
  responseJson?: string;
  tokensJson?: string;
  requestJson?: string;
  httpStatus?: number;
  rawResponseText?: string;
  durationMs?: number;
  correlationId?: string;
  errorText?: string;
  relatedLogId?: number;
};

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('fa-IR');
  } catch {
    return iso;
  }
};

const safeJsonParse = (s?: string): any => {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
};

const SmsLogsPanel: React.FC = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<SmsLog[]>([]);
  const [successFilter, setSuccessFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [eventType, setEventType] = useState<string>('ALL');
  const [recipient, setRecipient] = useState<string>('');
  const [selected, setSelected] = useState<SmsLog | null>(null);
  const [isRetryingId, setIsRetryingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', '50');
    if (successFilter !== 'ALL') p.set('success', successFilter);
    if (eventType && eventType !== 'ALL') p.set('eventType', eventType);
    if (recipient.trim()) p.set('recipient', recipient.trim());
    return p.toString();
  }, [successFilter, eventType, recipient]);

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sms/logs?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setRows(Array.isArray(data.data) ? data.data : []);
      } else {
        setToast({ ok: false, msg: data?.message || 'خطا در دریافت لاگ پیامک' });
      }
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message || 'خطای شبکه در دریافت لاگ پیامک' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, token]);

  const retry = async (id: number) => {
    if (!token) return;
    setIsRetryingId(id);
    setToast(null);
    try {
      const res = await fetch(`/api/sms/logs/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setToast({ ok: true, msg: data?.message || 'ارسال مجدد انجام شد.' });
        await load();
      } else {
        setToast({ ok: false, msg: data?.message || 'ارسال مجدد ناموفق بود.' });
      }
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message || 'خطای شبکه در ارسال مجدد' });
    } finally {
      setIsRetryingId(null);
    }
  };

  const eventOptions = [
    'ALL',
    'TEST_PATTERN',
    'INSTALLMENT_COMPLETED',
    'INSTALLMENT_REMINDER',
    'INSTALLMENT_DUE_7',
    'INSTALLMENT_DUE_3',
    'INSTALLMENT_DUE_TODAY',
    'REPAIR_RECEIVED',
    'REPAIR_COST_ESTIMATED',
    'REPAIR_READY_FOR_PICKUP',
  ];

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-200 border border-violet-200/60 dark:border-violet-900/30">
              <i className="fa-solid fa-message" />
            </span>
            آخرین ارسال‌های پیامک
          </div>
          <div className="app-subtle mt-1">موفق/ناموفق بودن ارسال‌ها و جزئیات خطا اینجا ثبت می‌شود.</div>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-3 py-2 rounded-xl bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
        >
          <i className={`fa-solid ${isLoading ? 'fa-rotate fa-spin' : 'fa-rotate'} ml-1`} />
          {isLoading ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="app-label">وضعیت</label>
          <select className="app-input" value={successFilter} onChange={(e) => setSuccessFilter(e.target.value as any)}>
            <option value="ALL">همه</option>
            <option value="true">موفق</option>
            <option value="false">ناموفق</option>
          </select>
        </div>
        <div>
          <label className="app-label">نوع رویداد</label>
          <select className="app-input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {eventOptions.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="app-label">جستجو شماره</label>
          <input className="app-input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0912..." dir="ltr" />
        </div>
      </div>

      {toast ? (
        <div className={`mt-4 rounded-lg p-3 text-sm ${toast.ok ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'}`}>
          {toast.msg}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-right text-gray-600 dark:text-gray-300">
              <th className="py-2 px-2">تاریخ</th>
              <th className="py-2 px-2">رویداد</th>
              <th className="py-2 px-2">گیرنده</th>
              <th className="py-2 px-2">پترن</th>
              <th className="py-2 px-2">وضعیت</th>
              <th className="py-2 px-2">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ok = Number(r.success) === 1;
              return (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-2 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="py-2 px-2">{r.eventType || '—'}</td>
                  <td className="py-2 px-2" dir="ltr">{r.recipient}</td>
                  <td className="py-2 px-2" dir="ltr">{r.patternId || '—'}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-1 rounded-md text-xs ${ok ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                      <i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-xmark'} ml-1`} />
                      {ok ? 'موفق' : 'ناموفق'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setSelected(r)} className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
                        <i className="fa-solid fa-circle-info ml-1" />
                        جزئیات
                      </button>
                      <button
                        type="button"
                        disabled={isRetryingId === r.id}
                        onClick={() => retry(r.id)}
                        className="px-3 py-1.5 rounded-xl bg-primary text-white hover:brightness-110 disabled:opacity-60"
                      >
                        <i className={`fa-solid ${isRetryingId === r.id ? 'fa-paper-plane fa-bounce' : 'fa-paper-plane'} ml-1`} />
                        {isRetryingId === r.id ? 'در حال ارسال...' : 'ارسال مجدد'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center app-subtle">هیچ لاگی یافت نشد.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="جزئیات ارسال پیامک" widthClass="max-w-2xl">
        {selected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="app-label">تاریخ</div>
                <div className="text-sm" dir="ltr">{formatDate(selected.createdAt)}</div>
              </div>
              <div>
                <div className="app-label">گیرنده</div>
                <div className="text-sm" dir="ltr">{selected.recipient}</div>
              </div>
              <div>
                <div className="app-label">رویداد</div>
                <div className="text-sm">{selected.eventType || '—'}</div>
              </div>
              <div>
                <div className="app-label">پترن</div>
                <div className="text-sm" dir="ltr">{selected.patternId || '—'}</div>
              </div>

              <div>
                <div className="app-label">Correlation</div>
                <div className="text-sm" dir="ltr">{selected.correlationId || '—'}</div>
              </div>
              <div>
                <div className="app-label">HTTP / مدت</div>
                <div className="text-sm" dir="ltr">{(typeof selected.httpStatus === 'number' ? selected.httpStatus : '—')} / {(typeof selected.durationMs === 'number' ? `${selected.durationMs}ms` : '—')}</div>
              </div>
            </div>

            <div>
              <div className="app-label">متغیرها</div>
              <pre className="mt-1 p-3 rounded-xl bg-gray-100 dark:bg-gray-900/40 text-xs overflow-auto" dir="ltr">
                {JSON.stringify(safeJsonParse(selected.tokensJson), null, 2)}
              </pre>
            </div>

            <div>
              <div className="app-label">درخواست (Debug)</div>
              <pre className="mt-1 p-3 rounded-xl bg-gray-100 dark:bg-gray-900/40 text-xs overflow-auto" dir="ltr">
                {JSON.stringify(safeJsonParse(selected.requestJson), null, 2)}
              </pre>
            </div>

            <div>
              <div className="app-label">پاسخ خام (Raw)</div>
              <pre className="mt-1 p-3 rounded-xl bg-gray-100 dark:bg-gray-900/40 text-xs overflow-auto" dir="ltr">
                {selected.rawResponseText || '—'}
              </pre>
            </div>

            <div>
              <div className="app-label">پاسخ سرویس</div>
              <pre className="mt-1 p-3 rounded-xl bg-gray-100 dark:bg-gray-900/40 text-xs overflow-auto" dir="ltr">
                {JSON.stringify(safeJsonParse(selected.responseJson), null, 2)}
              </pre>
            </div>

            {(selected.error || selected.errorText) ? (
              <div className="rounded-lg p-3 text-sm bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200">
                {selected.error || selected.errorText}
              </div>
            ) : null}

            <div className="flex items-center justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">بستن</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default SmsLogsPanel;
