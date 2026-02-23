import React, { useEffect, useState } from 'react';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';

type BackupRow = { fileName: string; size: number; mtime: string };

const fmtSize = (n: number) => {
  const b = Number(n || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
  if (b < 1024*1024*1024) return `${(b/1024/1024).toFixed(1)} MB`;
  return `${(b/1024/1024/1024).toFixed(1)} GB`;
};

export default function Backups() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const fetchList = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/backups', { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت لیست بکاپ‌ها');
      setRows(js.data || []);
    } catch (e:any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally { setIsLoading(false); }
  };

  const createNow = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ایجاد بکاپ');
      setNotification({ message: 'بکاپ ایجاد شد.', type: 'success' });
      await fetchList();
    } catch (e:any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally { setIsLoading(false); }
  };

  const download = async (fileName: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('خطا در دانلود بکاپ');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e:any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [token]);

  if (user?.role !== 'Admin' && user?.role !== 'Manager') {
    return <div className="p-6 text-gray-600 dark:text-gray-300" dir="rtl">دسترسی غیرمجاز</div>;
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-sky-100 blur-2xl opacity-70 dark:bg-sky-900/30" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-emerald-100 blur-2xl opacity-70 dark:bg-emerald-900/30" />
        <div className="relative flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">بکاپ خودکار دیتابیس</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">بکاپ روزانه در سرور • فقط مدیر/مدیرکل</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={createNow} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
              <i className="fa-solid fa-database ml-2" /> ایجاد بکاپ الان
            </button>
            <button onClick={fetchList} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold">
              <i className="fa-solid fa-rotate ml-2" /> بروزرسانی
            </button>
          </div>
        </div>
      </div>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">در حال پردازش...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">فعلاً بکاپی وجود ندارد.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-3">فایل</th>
                  <th className="p-3">حجم</th>
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">دانلود</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.fileName} className="border-t border-gray-100 dark:border-slate-800">
                    <td className="p-3 font-semibold whitespace-nowrap">{r.fileName}</td>
                    <td className="p-3 whitespace-nowrap">{fmtSize(r.size)}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(r.mtime).toLocaleString('fa-IR')}</td>
                    <td className="p-3">
                      <button onClick={() => download(r.fileName)} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                        <i className="fa-solid fa-download ml-2" /> دانلود
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        تنظیمات زمان‌بندی: <code>BACKUP_CRON</code> و <code>BACKUP_TZ</code> (پیش‌فرض: 02:00 Asia/Tehran)
      </div>
    </div>
  );
}
