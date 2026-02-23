// pages/Outbox.tsx
import React, { useEffect, useMemo, useState } from 'react';
import PageKit from '../components/ui/PageKit';
import { apiFetch } from '../utils/apiFetch';
import toast from 'react-hot-toast';

type OutboxRow = {
  id: number;
  channel: 'sms' | 'telegram' | string;
  eventType: string;
  targetId?: string | number | null;
  payloadJson?: string | null;
  status: 'pending' | 'processing' | 'done' | 'failed' | string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'در انتظار' },
  { value: 'processing', label: 'در حال ارسال' },
  { value: 'failed', label: 'ناموفق' },
  { value: 'done', label: 'ارسال شده' },
  { value: 'ALL', label: 'همه' },
];

export default function OutboxPage() {
  const [status, setStatus] = useState<string>('pending');
  const [channel, setChannel] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRows = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/notifications/outbox?status=${encodeURIComponent(status)}&limit=500`);
      if (!res?.success) throw new Error(res?.message || 'خطا در دریافت صف ارسال');
      setRows(res.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'خطا در دریافت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((r) => {
      if (channel !== 'ALL' && String(r.channel) !== channel) return false;
      if (!q) return true;
      const hay = [
        r.id,
        r.channel,
        r.eventType,
        r.status,
        r.targetId,
        r.lastError,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, channel]);

  const retryOne = async (id: number) => {
    try {
      const t = toast.loading('در حال ارسال مجدد...');
      const res = await apiFetch(`/api/notifications/outbox/${id}/retry`, { method: 'POST' });
      toast.dismiss(t);
      if (!res?.success) throw new Error(res?.message || 'ناموفق');
      toast.success('در صف ارسال قرار گرفت');
      fetchRows();
    } catch (e: any) {
      toast.error(e?.message || 'خطا در ارسال مجدد');
    }
  };

  const retryFailedAll = async () => {
    const failed = filtered.filter((r) => r.status === 'failed');
    if (failed.length === 0) return toast('مورد ناموفق برای ارسال مجدد وجود ندارد');
    const t = toast.loading(`در حال صف‌بندی ${failed.length} مورد...`);
    try {
      for (const r of failed) {
        // eslint-disable-next-line no-await-in-loop
        await apiFetch(`/api/notifications/outbox/${r.id}/retry`, { method: 'POST' });
      }
      toast.dismiss(t);
      toast.success('همه موارد ناموفق دوباره در صف قرار گرفتند');
      fetchRows();
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(e?.message || 'خطا در ارسال مجدد گروهی');
    }
  };

  return (
    <PageKit
      title="صف ارسال (Outbox)"
      subtitle="مدیریت پیام‌های در انتظار، ناموفق و ارسال‌شده برای پیامک و تلگرام"
      query={query}
      onQueryChange={setQuery}
      filtersSlot={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
            title="وضعیت"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
            title="کانال"
          >
            <option value="ALL">همه کانال‌ها</option>
            <option value="sms">SMS</option>
            <option value="telegram">Telegram</option>
          </select>

          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
            onClick={fetchRows}
            disabled={isLoading}
          >
            بروزرسانی
          </button>
        </div>
      }
      toolbarRight={
        <button
          className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:opacity-95 disabled:opacity-50"
          onClick={retryFailedAll}
          disabled={isLoading}
          title="ارسال مجدد همه موارد ناموفق"
        >
          Retry Failed
        </button>
      }
      isLoading={isLoading}
      isEmpty={!isLoading && filtered.length === 0}
      emptyTitle="صف ارسال خالی است"
      emptyDescription="هیچ پیام در وضعیت انتخاب‌شده وجود ندارد."
    >
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-right">کانال</th>
                <th className="px-3 py-2 text-right">رویداد</th>
                <th className="px-3 py-2 text-right">وضعیت</th>
                <th className="px-3 py-2 text-right">تلاش</th>
                <th className="px-3 py-2 text-right">زمان تلاش بعدی</th>
                <th className="px-3 py-2 text-right">خطا</th>
                <th className="px-3 py-2 text-right">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{r.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="rounded-lg border px-2 py-1 text-xs">
                      {String(r.channel).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.eventType}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.attempts}/{r.maxAttempts}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.nextAttemptAt ? new Date(r.nextAttemptAt).toLocaleString('fa-IR') : '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[420px] truncate" title={r.lastError || ''}>
                    {r.lastError || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.status === 'failed' || r.status === 'pending' ? (
                      <button
                        className="rounded-xl border px-3 py-2 text-xs hover:bg-slate-50"
                        onClick={() => retryOne(r.id)}
                      >
                        Retry
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageKit>
  );
}
