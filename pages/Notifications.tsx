// pages/Notifications.tsx
import React, { useEffect, useState, useMemo } from 'react';
import PageKit from '../components/ui/PageKit';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import { NotificationMessage, UnifiedNotificationItem } from '../types';
import Notification from '../components/Notification';
import ExportMenu from '../components/ExportMenu';
import MessageComposerModal from '../components/MessageComposerModal';
import FilterChipsBar from '../components/FilterChipsBar';
import { useStyle } from '../contexts/StyleContext';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';

const toRouterPath = (urlOrPath?: string | null): string => {
  if (!urlOrPath) return '/';
  try {
    const u = new URL(urlOrPath, window.location.origin);
    if (u.hash && u.hash.startsWith('#/')) return u.hash.slice(1);
    return (u.pathname || '/') + (u.search || '');
  } catch {
    if (urlOrPath.startsWith('#/')) return urlOrPath.slice(1);
    return urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  }
};

const NotificationsPage: React.FC = () => {
  const { style } = useStyle();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.roleName === 'Admin';
  // Compute brand color for notifications (use hue from style context). Use high saturation and medium lightness for vibrancy.
  const brandColor = `hsl(${style.primaryHue} 90% 55%)`;
  // A lighter variant of the brand color used for loading/disabled states
  const brandColorLight = `hsl(${style.primaryHue} 90% 70%)`;
  const [items, setItems] = useState<UnifiedNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingGroup, setSendingGroup] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [smsModal, setSmsModal] = useState<{ open: boolean; text: string; phone: string; template: 'gentle'|'firm'|'formal'; source?: UnifiedNotificationItem | null }>({ open: false, text: '', phone: '', template: 'gentle', source: null });

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'installments' | 'checks' | 'expenses' | 'followups'>('all');

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || []).filter((it) => {
      // Type filter
      if (typeFilter === 'installments' && it.type !== 'SmartInstallmentAlert') return false;
      if (typeFilter === 'checks' && it.type !== 'SmartCheckAlert') return false;
      if (typeFilter === 'expenses' && it.type !== 'RecurringExpenseAlert') return false;
      if (typeFilter === 'followups' && it.type !== 'FollowupAlert') return false;
      if (!q) return true;
      const hay = `${it.title ?? ''} ${it.description ?? ''} ${(it as any)?.meta?.customer ?? ''} ${(it as any)?.meta?.customerPhone ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, typeFilter]);

  const typeCounts = useMemo(() => {
    const all = items.length;
    const installments = items.filter((i) => i.type === 'SmartInstallmentAlert').length;
    const checks = items.filter((i) => i.type === 'SmartCheckAlert').length;
    const expenses = items.filter((i) => i.type === 'RecurringExpenseAlert').length;
    const followups = items.filter((i) => i.type === 'FollowupAlert').length;
    return { all, installments, checks, expenses, followups };
  }, [items]);

  const exportBase = `notifications-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filteredItems.map((i) => ({
    title: i.title,
    description: i.description ?? '',
    type: i.type,
    due: (i as any)?.meta?.dueDate ?? '',
    customer: (i as any)?.meta?.customer ?? '',
    phone: (i as any)?.meta?.customerPhone ?? '',
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportBase}.xlsx`,
      exportRows,
      [
        { header: 'عنوان', key: 'title' },
        { header: 'توضیحات', key: 'description' },
        { header: 'نوع', key: 'type' },
        { header: 'سررسید', key: 'due' },
        { header: 'مشتری', key: 'customer' },
        { header: 'موبایل', key: 'phone' },
      ],
      'Notifications',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportBase}.pdf`,
      title: 'نوتیفیکیشن‌ها',
      head: ['عنوان', 'نوع', 'مشتری', 'سررسید'],
      body: exportRows.map((r) => [String(r.title ?? ''), String(r.type ?? ''), String(r.customer ?? ''), String(r.due ?? '')]),
    });
  };

  const getCustomerIdFromItem = (item: UnifiedNotificationItem): number | null => {
    // Prefer meta.customerId, fallback to parsing actionLink like /customers/123
    const metaId = (item as any)?.meta?.customerId;
    if (typeof metaId === 'number' && metaId > 0) return metaId;
    const link = (item as any)?.actionLink as string | undefined;
    if (link) {
      const m = link.match(/\/customers\/(\d+)/);
      if (m) return Number(m[1]);
    }
    return null;
  };

  
  const dismissNotification = async (nid: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${encodeURIComponent(nid)}/dismiss`, { method: 'POST' });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در حذف هشدار');
      setNotifications((prev) => (prev || []).filter((n) => String(n.id) !== String(nid)));
      setNotification({ message: 'هشدار از لیست حذف شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

  const buildSmsText = (item: UnifiedNotificationItem, template: 'gentle'|'firm'|'formal') => {
    const customer = (item as any)?.meta?.customer || '';
    const base =
      item.type === 'SmartInstallmentAlert' ? 'یادآوری اقساط' :
      item.type === 'SmartCheckAlert' ? 'یادآوری چک' :
      'یادآوری';

    const header = `${base}${customer ? ` برای ${customer}` : ''}`;
    const body = `${item.title}${item.description ? '\n' + item.description : ''}`;

    const closing =
      template === 'gentle'
        ? 'اگر امکانش هست، لطفاً در اولین فرصت برای تسویه/پرداخت اقدام کنید. سپاس 🙏'
        : template === 'firm'
          ? 'لطفاً در اسرع وقت نسبت به پرداخت/تسویه اقدام فرمایید. در صورت نیاز برای هماهنگی تماس بگیرید.'
          : 'خواهشمند است در اولین فرصت نسبت به پرداخت/تسویه اقدام فرمایید. با تشکر.';

    return `${header}
${body}

${closing}`;
  };

  const openSmsModal = (item: UnifiedNotificationItem) => {
    const phone = String((item as any)?.meta?.customerPhone || '');
    const template: 'gentle'|'firm'|'formal' = 'gentle';
    setSmsModal({ open: true, phone, template, text: buildSmsText(item, template), source: item });
  };

  const copySms = async () => {
    try {
      await navigator.clipboard.writeText(smsModal.text);
      setNotification({ message: 'متن پیامک کپی شد.', type: 'success' });
    } catch {
      setNotification({ message: 'کپی نشد. دستی کپی کنید.', type: 'error' });
    }
  };


  const copyPhone = async () => {
    try {
      const phone = String(smsModal.phone || '').trim();
      if (!phone) {
        setNotification({ message: 'شماره‌ای برای کپی وجود ندارد.', type: 'error' });
        return;
      }
      await navigator.clipboard.writeText(phone);
      setNotification({ message: 'شماره کپی شد.', type: 'success' });
    } catch {
      setNotification({ message: 'کپی نشد. دستی کپی کنید.', type: 'error' });
    }
  };

  const buildSmsUri = (platform: 'android' | 'ios') => {
    const phone = String(smsModal.phone || '').trim();
    const body = encodeURIComponent(String(smsModal.text || ''));
    // Android: sms:+98912...?body=...
    // iOS: sms:+98912...&body=...
    if (platform === 'android') {
      return `sms:${phone || ''}?body=${body}`;
    }
    return `sms:${phone || ''}&body=${body}`;
  };

  const openSmsLink = (platform: 'android' | 'ios') => {
    const uri = buildSmsUri(platform);
    window.location.href = uri;
  };



  const runRecurringFromNotif = async (recId: number, nid: string) => {
    if (!recId) return;
    try {
      const res = await apiFetch(`/api/recurring-expenses/${recId}/run`, { method: 'POST' });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت هزینه تکرارشونده');
      // Remove this notification (it will also disappear on next refresh because nextRunDate moved)
      setNotifications((prev) => (prev || []).filter((n) => String(n.id) !== String(nid)));
      setNotification({ message: 'هزینه تکرارشونده ثبت شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const createSmartFollowup = async (item: UnifiedNotificationItem, daysFromNow: number) => {
    const customerId = getCustomerIdFromItem(item);
    if (!customerId) {
      setNotification({ message: 'شناسه مشتری پیدا نشد.', type: 'error' });
      return;
    }
    try {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      d.setHours(23, 59, 59, 999);

      const note = `${item.type === 'SmartInstallmentAlert' ? 'پیگیری اقساط' : 'پیگیری چک'}: ${item.title}${item.description ? ' — ' + item.description : ''}`;

      const res = await apiFetch(`/api/customers/${customerId}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, nextFollowupDate: d.toISOString() }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت پیگیری');
      setNotification({ message: 'پیگیری ثبت شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };



  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/notifications');
      const result = await response.json();
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || 'خطا در دریافت داده‌ها');
      }
      setItems(result?.data || []);
    } catch (err: any) {
      setError(err?.message || 'خطای ناشناخته');
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchItems();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const triggerSms = async (targetId: number, eventType: string) => {
    const response = await apiFetch('/api/sms/trigger-event', {
      method: 'POST',
      body: JSON.stringify({ targetId, eventType }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'خطا در ارسال پیامک');
    }
    return result;
  };

  const triggerTelegram = async (targetId: number, eventType: string) => {
    const response = await apiFetch('/api/telegram/trigger-event', {
      method: 'POST',
      body: JSON.stringify({ targetId, eventType }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'خطا در ارسال تلگرام');
    }
    return result;
  };


  
  const sendSms = async (item: UnifiedNotificationItem) => {
    if (!item.targetId || !item.eventType) return;
    setSendingId(item.id);
    setNotification(null);
    try {
      await triggerSms(item.targetId, item.eventType);
      setNotification({ type: 'success', text: 'پیامک با موفقیت ارسال شد.' });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'خطا در ارسال پیامک' });
    } finally {
      setSendingId(null);
    }
  };

  const sendTelegram = async (item: UnifiedNotificationItem) => {
    if (!item.targetId || !item.eventType) return;
    setSendingId(item.id);
    setNotification(null);
    try {
      await triggerTelegram(item.targetId, item.eventType);
      setNotification({ type: 'success', text: 'تلگرام با موفقیت ارسال شد.' });
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'خطا در ارسال تلگرام' });
    } finally {
      setSendingId(null);
    }
  };

  const sendGroupSms = async (groupKey: string, list: UnifiedNotificationItem[]) => {
    if (!list?.length) return;
    const targets = list.filter(x => x.targetId && x.eventType);
    if (!targets.length) return;
    setSendingGroup(groupKey);
    setNotification(null);
    let ok = 0;
    let fail = 0;
    for (const it of targets) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await triggerSms(it.targetId!, it.eventType!);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setSendingGroup(null);
    if (fail === 0) {
      setNotification({ type: 'success', text: `ارسال گروهی انجام شد (${ok} پیامک).` });
    } else {
      setNotification({ type: 'error', text: `ارسال گروهی کامل نشد. موفق: ${ok}، ناموفق: ${fail}` });
    }
  };


  const sendGroupTelegram = async (groupKey: string, list: UnifiedNotificationItem[]) => {
    if (!list?.length) return;
    const targets = list.filter(x => x.targetId && x.eventType);
    if (!targets.length) return;
    setSendingGroup(`tg-${groupKey}`);
    setNotification(null);
    let ok = 0;
    let fail = 0;
    for (const it of targets) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await triggerTelegram(it.targetId!, it.eventType!);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setSendingGroup(null);
    if (fail === 0) {
      setNotification({ type: 'success', text: `ارسال گروهی انجام شد (${ok} تلگرام).` });
    } else {
      setNotification({ type: 'error', text: `ارسال گروهی کامل نشد. موفق: ${ok}، ناموفق: ${fail}` });
    }
  };

  const CATEGORY_INFO: Record<
    string,
    { name: string; icon: string; badge: string; ring: string; chip: string }
  > = useMemo(() => ({
    OverdueInstallment: { name: 'اقساط معوق', icon: 'fa-hourglass-end', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', ring: 'ring-rose-200 dark:ring-rose-800/60', chip: 'text-rose-700 bg-rose-50 border border-rose-200' },
    InstallmentDue:    { name: 'یادآوری قسط',  icon: 'fa-calendar-day',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', ring: 'ring-amber-200 dark:ring-amber-800/60', chip: 'text-amber-700 bg-amber-50 border border-amber-200' },
    CheckDue:          { name: 'یادآوری چک',   icon: 'fa-money-check',   badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',     ring: 'ring-sky-200 dark:ring-sky-800/60',     chip: 'text-sky-700 bg-sky-50 border border-sky-200' },
    RepairReady:       { name: 'تعمیر آماده تحویل', icon: 'fa-screwdriver-wrench', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-800/60', chip: 'text-emerald-700 bg-emerald-50 border border-emerald-200' },
    StockAlert:        { name: 'هشدار موجودی', icon: 'fa-box-open',      badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', ring: 'ring-indigo-200 dark:ring-indigo-800/60', chip: 'text-indigo-700 bg-indigo-50 border border-indigo-200' },
    CustomerFollowup:  { name: 'پیگیری مشتری', icon: 'fa-clipboard-check', badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300', ring: 'ring-fuchsia-200 dark:ring-fuchsia-800/60', chip: 'text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200' },
    StagnantStock:     { name: 'انبار راکد',   icon: 'fa-boxes-stacked', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300', ring: 'ring-slate-200 dark:ring-slate-700', chip: 'text-slate-700 bg-slate-50 border border-slate-200' },
  }), []);

  const categoryOrder: string[] = ['OverdueInstallment', 'InstallmentDue', 'CheckDue', 'RepairReady', 'StockAlert', 'StagnantStock'];

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (isLoading) return <div className="p-4">{renderSkeleton()}</div>;

    if (error) {
      return (
        <div className="p-6 text-center text-rose-600 dark:text-rose-400">
          <i className="fa-solid fa-triangle-exclamation text-2xl mb-2" />
          <div>{error}</div>
        </div>
      );
    }
if (!items.length) {
      return (
        <div className="p-10 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
            <i className="fa-solid fa-circle-check animate-pulse" />
            اعلان جدیدی وجود ندارد.
          </div>
        </div>
      );
    }

    if (!filteredItems.length) {
      return (
        <div className="p-10 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700">
            <i className="fa-solid fa-magnifying-glass" />
            چیزی مطابق فیلتر/جستجوی شما پیدا نشد.
          </div>
        </div>
      );
    }

    const groups: { [key: string]: UnifiedNotificationItem[] } = {};
    filteredItems.forEach(item => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    });

    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
        {categoryOrder.map(cat => {
          const list = groups[cat];
          if (!list || !list.length) return null;
          const info = CATEGORY_INFO[cat];

          return (
            <section key={cat} className="py-5 first:pt-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${info.badge}`}>
                    <i className={`fa-solid ${info.icon}`} />
                    {info.name}
                  </span>
                </div>

                {isAdmin && list.some(x => x.targetId && x.eventType) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendGroupSms(cat, list)}
                      disabled={sendingGroup === cat || sendingGroup === `tg-${cat}`}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all
                        ${sendingGroup === cat ? 'cursor-wait' : 'hover:opacity-90 active:scale-95'}`}
                      style={{ backgroundColor: sendingGroup === cat ? brandColorLight : brandColor }}
                      title="ارسال پیامک گروهی"
                    >
                      {sendingGroup === cat ? (
                        <>
                          <i className="fa-solid fa-spinner-third animate-spin" />
                          در حال ارسال...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-paper-plane" />
                          ارسال پیامک
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => sendGroupTelegram(cat, list)}
                      disabled={sendingGroup === `tg-${cat}` || sendingGroup === cat}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all
                        ${sendingGroup === `tg-${cat}` ? 'cursor-wait' : 'hover:opacity-90 active:scale-95'}`}
                      style={{ backgroundColor: sendingGroup === `tg-${cat}` ? '#0ea5e9' : '#0284c7' }}
                      title="ارسال تلگرام گروهی"
                    >
                      {sendingGroup === `tg-${cat}` ? (
                        <>
                          <i className="fa-solid fa-spinner-third animate-spin" />
                          در حال ارسال...
                        </>
                      ) : (
                        <>
                          <i className="fa-brands fa-telegram" />
                          تلگرام
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <ul className="space-y-3">
                {list.map(item => (
                  <li
                    key={item.id}
                    className={`rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ring-1 ${info.ring}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="text-right md:flex-1">
                        <div className="flex items-center gap-2">
                          <i className={`fa-solid ${info.icon} text-slate-500`} />
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.meta?.customer && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${info.chip}`}>
                              <i className="fa-solid fa-user ml-1" /> {item.meta.customer}
                            </span>
                          )}
                          {item.meta?.dueDate && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${info.chip}`}>
                              <i className="fa-solid fa-calendar ml-1" /> {item.meta.dueDate}
                            </span>
                          )}
                          {item.meta?.amount && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${info.chip}`}>
                              <i className="fa-solid fa-sack-dollar ml-1" /> {Number(item.meta.amount).toLocaleString('fa-IR')} تومان
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end md:justify-start">
                        {isAdmin && item.targetId && item.eventType && (
                          <button
                            onClick={() => sendSms(item)}
                            disabled={sendingId === item.id || sendingGroup === cat}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all ${sendingId === item.id ? 'cursor-wait' : 'hover:opacity-90 active:scale-95'}`}
                            style={{ backgroundColor: sendingId === item.id ? brandColorLight : brandColor }}
                          >
                            {sendingId === item.id ? (
                              <>
                                <i className="fa-solid fa-spinner-third animate-spin" />
                                در حال ارسال...
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-paper-plane" />
                                {item.eventType === 'INSTALLMENT_REMINDER' ? 'یادآوری قسط (کلی)' : 'یادآوری پیامک'}
                              </>
                            )}
                          </button>
                        )}

                        {isAdmin && item.targetId && item.eventType && (
                          <button
                            onClick={() => sendTelegram(item)}
                            disabled={sendingId === item.id || sendingGroup === `tg-${cat}`}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all ${sendingId === item.id ? 'cursor-wait' : 'hover:opacity-90 active:scale-95'}`}
                            style={{ backgroundColor: sendingId === item.id ? '#0ea5e9' : '#0284c7' }}
                            title="ارسال به تلگرام (گروه/کانال مدیر)"
                          >
                            {sendingId === item.id ? (
                              <>
                                <i className="fa-solid fa-spinner-third animate-spin" />
                                در حال ارسال...
                              </>
                            ) : (
                              <>
                                <i className="fa-brands fa-telegram" />
                                تلگرام
                              </>
                            )}
                          </button>
                        )}

                        {item.actionLink && (
                          <Link
                            to={toRouterPath(item.actionLink)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square" />
                            {item.actionText || 'مشاهده'}
                          </Link>
                        )}

                        {(item.type === 'SmartInstallmentAlert' || item.type === 'SmartCheckAlert') && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => createSmartFollowup(item, 0)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white active:scale-95 transition-all"
                              title="ثبت پیگیری برای امروز"
                            >
                              <i className="fa-solid fa-clipboard-check" />
                              ثبت پیگیری امروز
                            </button>

                            <button
                              onClick={() => createSmartFollowup(item, 1)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                              title="ثبت پیگیری برای فردا"
                            >
                              <i className="fa-solid fa-calendar-day" />
                              فردا
                            </button>

                            <button
                              onClick={() => createSmartFollowup(item, 3)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                              title="ثبت پیگیری برای ۳ روز بعد"
                            >
                              <i className="fa-solid fa-calendar-plus" />
                              +۳ روز
                            </button>
                          </div>
                        )}


                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <PageKit
      title="نوتیفیکیشن‌ها"
      subtitle="یادآوری‌ها و هشدارهای اقساط، چک‌ها، هزینه‌ها و پیگیری‌ها."
      icon={<i className="fa-solid fa-bell" />}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder="جستجو در عنوان/توضیحات/مشتری/شماره…"
      filtersSlot={<FilterChipsBar
              value={typeFilter}
              onChange={(k) => setTypeFilter(k as any)}
              chips={[
                { key: 'all', label: 'همه', icon: 'fa-solid fa-layer-group', count: typeCounts.all },
                { key: 'installments', label: 'اقساط', icon: 'fa-solid fa-calendar-days', count: typeCounts.installments },
                { key: 'checks', label: 'چک‌ها', icon: 'fa-solid fa-money-check', count: typeCounts.checks },
                { key: 'expenses', label: 'هزینه‌ها', icon: 'fa-solid fa-receipt', count: typeCounts.expenses },
                { key: 'followups', label: 'پیگیری‌ها', icon: 'fa-solid fa-user-clock', count: typeCounts.followups },
              ]}
            />}
      toolbarRight={<>
              <button
                type="button"
                onClick={() => setIsComposerOpen(true)}
                className="h-10 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition inline-flex items-center gap-2 whitespace-nowrap"
                title="ارسال پیام آزاد به مشتری/همکار"
              >
                <i className="fa-solid fa-paper-plane" />
                ارسال پیام
              </button>
              <ExportMenu
                className="whitespace-nowrap"
                items={[
                  { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filteredItems.length === 0 },
                  { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filteredItems.length === 0 },
                ]}
              />
              <button
                type="button"
                onClick={refresh}
                className="h-10 px-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-sm active:scale-[0.99] transition inline-flex items-center gap-2 whitespace-nowrap"
                title="بارگذاری مجدد"
              >
                <i className={`fa-solid fa-rotate-right ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'در حال تازه‌سازی…' : 'تازه‌سازی'}
              </button>
            </>}
      isLoading={isLoading}
      isEmpty={!isLoading && filteredItems.length === 0}
      emptyTitle="نوتیفیکیشنی یافت نشد"
      emptyDescription="فیلترها را تغییر دهید یا داده جدید ثبت کنید."
    >
      {renderContent()}


        <Notification message={notification} onClose={() => setNotification(null)} />

      <MessageComposerModal
        open={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onQueued={() => setNotification({ type: 'success', text: 'پیام در صف ارسال قرار گرفت. برای وضعیت، «صف ارسال» را بررسی کنید.' })}
      />
      

      {smsModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="w-full max-w-xl rounded-2xl border bg-white p-4 shadow-xl dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">متن پیامک آماده</div>
              <button
                onClick={() => setSmsModal({ open: false, text: '', phone: '', template: 'gentle', source: null })}
                className="text-sm px-2 py-1 rounded-lg border bg-white/60 dark:bg-slate-900/40 dark:border-slate-700 hover:bg-white"
              >
                بستن
              </button>
            </div>

            <textarea
              value={smsModal.text}
              onChange={(e) => setSmsModal({ open: true, text: e.target.value })}
              className="mt-3 w-full h-44 px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={copyPhone}
                className="px-4 py-2 rounded-xl border bg-white/60 dark:bg-slate-900/40 dark:border-slate-700 hover:bg-white text-sm"
                disabled={!smsModal.phone}
                title="کپی شماره مشتری"
              >
                کپی شماره
              </button>

              <button
                onClick={() => openSmsLink('android')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                title="باز کردن اپ پیامک در Android"
              >
                باز کردن پیامک (Android)
              </button>

              <button
                onClick={() => openSmsLink('ios')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                title="باز کردن اپ پیامک در iPhone"
              >
                باز کردن پیامک (iPhone)
              </button>


              <button
                onClick={copySms}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm"
              >
                کپی متن
              </button>
              <button
                onClick={() => setSmsModal({ open: false, text: '', phone: '', template: 'gentle', source: null })}
                className="px-4 py-2 rounded-xl border bg-white/60 dark:bg-slate-900/40 dark:border-slate-700 hover:bg-white text-sm"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageKit>
  );
};

export default NotificationsPage;