import React, {useEffect, useMemo, useRef, useState} from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { exportToExcel } from '../../utils/exporters';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';

type Row = {
  id: number;
  customerId: number;
  createdAt: string;
  createdByUsername?: string | null;
  note: string;
  nextFollowupDate?: string | null;
  status: 'open' | 'closed';
  customerName?: string;
  customerPhone?: string;
};

const isoStartOfDay = (d: Date) => moment(d).startOf('day').toDate().toISOString();
const isoEndOfDay = (d: Date) => moment(d).endOf('day').toDate().toISOString();


const getRowTone = (r: { status: string; nextFollowupDate?: string | null }) => {
  if (r.status !== 'open') return '';
  if (!r.nextFollowupDate) return 'bg-slate-50/60 dark:bg-slate-900/30';
  const due = new Date(r.nextFollowupDate).getTime();
  const now = Date.now();
  if (Number.isFinite(due) && due < now) return 'bg-rose-50 dark:bg-rose-900/10';
  if (Number.isFinite(due) && due - now <= 24 * 60 * 60 * 1000) return 'bg-amber-50 dark:bg-amber-900/10';
  return '';
};

export default function FollowupsReport() {
  const { token, currentUser } = useAuth();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});

  const today = useMemo(() => new Date(), []);
  const weekEnd = useMemo(() => moment().add(7, 'day').toDate(), []);

  const [status, setStatus] = useState<'open'|'closed'|'all'>('open');
  const [dateField, setDateField] = useState<'next'|'created'>('next');
  const [fromDate, setFromDate] = useState<Date | null>(today);
  const [toDate, setToDate] = useState<Date | null>(weekEnd);
  const [owner, setOwner] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [noDueOnly, setNoDueOnly] = useState(false);


  const [newCustomerId, setNewCustomerId] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newNextDate, setNewNextDate] = useState<Date | null>(new Date());
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editNextDate, setEditNextDate] = useState<Date | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  
  
  
  
  const quickSetDue = async (row: Row, daysFromNow: number) => {
    if (!token) return;
    try {
      const next = moment().add(daysFromNow, 'day').endOf('day').toDate().toISOString();
      const res = await fetch(`/api/customers/${row.customerId}/followups/${row.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextFollowupDate: next }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تغییر موعد');
      setNotification({ message: 'موعد پیگیری تغییر کرد.', type: 'success' });
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const quickReschedule = async (row: Row, addDays: number) => {
    if (!token) return;
    try {
      const base = row.nextFollowupDate ? moment(row.nextFollowupDate) : moment();
      const next = base.add(addDays, 'day').endOf('day').toDate().toISOString();

      const res = await fetch(`/api/customers/${row.customerId}/followups/${row.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextFollowupDate: next }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تغییر موعد');
      setNotification({ message: 'موعد پیگیری تغییر کرد.', type: 'success' });
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const openEdit = (row: Row) => {
    setEditingRow(row);
    setEditNote(row.note || '');
    setEditNextDate(row.nextFollowupDate ? new Date(row.nextFollowupDate) : new Date());
  };

  const saveEdit = async () => {
    if (!token || !editingRow) return;
    const note = String(editNote || '').trim();
    if (!note) {
      setNotification({ message: 'متن پیگیری الزامی است.', type: 'error' });
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/customers/${editingRow.customerId}/followups/${editingRow.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          nextFollowupDate: editNextDate ? isoEndOfDay(editNextDate) : null,
        }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ویرایش پیگیری');
      setNotification({ message: 'پیگیری ویرایش شد.', type: 'success' });
      setEditingRow(null);
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally {
      setIsSavingEdit(false);
    }
  };

const closeFollowup = async (customerId: number, followupId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/followups/${followupId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در بستن پیگیری');
      setRows((prev) => (prev || []).map((r) => (r.id === followupId ? ({ ...r, status: 'closed' } as any) : r)));
      setNotification({ message: 'پیگیری بسته شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

  const createFollowup = async (customerId: number, note: string, nextFollowupIso?: string | null) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/followups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, nextFollowupDate: nextFollowupIso || null }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت پیگیری');
      setNotification({ message: 'پیگیری ثبت شد.', type: 'success' });
      // refresh list to include new item
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);

    try {
      const fromIso = fromDate ? isoStartOfDay(fromDate) : '';
      const toIso = toDate ? isoEndOfDay(toDate) : '';
      const qs = new URLSearchParams();
      qs.set('status', status);
      qs.set('dateField', dateField);
      if (noDueOnly) qs.set('noDue', '1');
      if (fromIso) qs.set('from', fromIso);
      if (toIso) qs.set('to', toIso);
      const effectiveOwner = onlyMine ? (currentUser?.username || '') : owner.trim();
      if (effectiveOwner) qs.set('owner', effectiveOwner);

      const res = await fetch(`/api/reports/followups?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گزارش');
      setRows((js?.data || []) as Row[]);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (!token) return;
  const t = window.setTimeout(() => { fetchData(); }, 250);
  return () => window.clearTimeout(t);
}, [token, fromDate, toDate]);

  const exportExcel = () => {
    const out = rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName || '',
      customerPhone: r.customerPhone || '',
      status: r.status === 'open' ? 'باز' : 'بسته',
      nextFollowupDate: r.nextFollowupDate || '',
      createdAt: r.createdAt,
      createdBy: r.createdByUsername || '',
      note: r.note,
    }));

    exportToExcel(
      `followups-${new Date().toISOString().slice(0, 10)}.xlsx`,
      out,
      [
        { header: 'ID', key: 'id' },
        { header: 'شناسه مشتری', key: 'customerId' },
        { header: 'نام مشتری', key: 'customerName' },
        { header: 'تلفن', key: 'customerPhone' },
        { header: 'وضعیت', key: 'status' },
        { header: 'موعد پیگیری', key: 'nextFollowupDate' },
        { header: 'تاریخ ثبت', key: 'createdAt' },
        { header: 'ثبت کننده', key: 'createdBy' },
        { header: 'یادداشت', key: 'note' },
      ]
    );
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">گزارش پیگیری‌ها</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              برای مدیریت پیگیری‌های امروز/هفته و خروجی Excel.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={noDueOnly}
              onChange={(e) => setNoDueOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">فقط بدون موعد</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60"
              disabled={rows.length === 0}
            >
              خروجی Excel
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          >
            <option value="open">باز</option>
            <option value="closed">بسته</option>
            <option value="all">همه</option>
          </select>

          <select
            value={dateField}
            onChange={(e) => setDateField(e.target.value as any)}
            className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          >
            <option value="next">بر اساس موعد پیگیری</option>
            <option value="created">بر اساس تاریخ ثبت</option>
          </select>

          <ShamsiDatePicker
            selectedDate={fromDate}
            onDateChange={setFromDate}
            placeholder="از تاریخ"
            inputClassName="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          />

          <ShamsiDatePicker
            selectedDate={toDate}
            onDateChange={setToDate}
            placeholder="تا تاریخ"
            inputClassName="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">فقط پیگیری‌های مربوط به من</span>
          </div>

          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            placeholder="نام ثبت‌کننده (اختیاری)"
          />

          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm"
          >
            اعمال فیلتر
          </button>
        </div>
      </div>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">داده‌ای برای نمایش وجود ندارد.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-3">موعد</th>
                  <th className="p-3">مشتری</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3">ثبت کننده</th>
                  <th className="p-3">یادداشت</th>
                  <th className="p-3">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`border-t border-gray-100 dark:border-slate-800 ${getRowTone(r)}`}>
                    <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-200">
                      {r.nextFollowupDate ? moment(r.nextFollowupDate).locale('fa').format('jYYYY/jMM/jDD HH:mm') : '—'}
                    </td>
                    <td className="p-3">
                      <a className="text-sky-600 hover:underline" href={`/customers/${r.customerId}`}>
                        {r.customerName || `مشتری #${r.customerId}`}
                      </a>
                      {r.customerPhone ? <div className="text-xs text-gray-500 dark:text-gray-400">{r.customerPhone}</div> : null}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={[
                          'text-xs px-2 py-1 rounded-full border',
                          r.status === 'open'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-slate-700'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-slate-700',
                        ].join(' ')}
                      >
                        {r.status === 'open' ? 'باز' : 'بسته'}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-200">
                      {r.createdByUsername || '—'}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {r.createdAt ? moment(r.createdAt).locale('fa').format('jYYYY/jMM/jDD HH:mm') : ''}
                      </div>
                    </td>
                    <td className="p-3 text-gray-900 dark:text-gray-100">{r.note}</td>
                    <td className="p-3 whitespace-nowrap">
                      <a className="text-xs px-3 py-1.5 rounded-lg border bg-white/60 dark:bg-slate-900/40 dark:border-slate-700 hover:bg-white" href={`/customers/${r.customerId}`}>
                        باز کردن مشتری
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
