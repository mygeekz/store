// Repairs.tsx — نسخه لیستی با آیکون و تم برند

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Repair, NotificationMessage, RepairStatus } from '../types';
import Notification from '../components/Notification';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { REPAIR_STATUSES } from '../constants';
import { useStyle } from '../contexts/StyleContext';
import HubCard from '../components/HubCard';
import SavedViewsBar from '../components/SavedViewsBar';
import TableToolbar from '../components/TableToolbar';
import FilterChipsBar from '../components/FilterChipsBar';
import ExportMenu from '../components/ExportMenu';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { printArea } from '../utils/printArea';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const Repairs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, token } = useAuth();
  const { style } = useStyle();

  // رنگ برند از ستینگ/استایل
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  // state
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  const savedViewState = useMemo(() => ({ statusFilter, searchTerm }), [statusFilter, searchTerm]);

  // نقش‌ها
  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/');
      return;
    }
    fetchRepairs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, token]);

  const fetchRepairs = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/repairs');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست تعمیرات');
      setRepairs(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'خطا در ارتباط با سرور' });
    } finally {
      setIsLoading(false);
    }
  };

  // فیلتر/جستجو
  const filteredRepairs = useMemo(() => {
    let data = [...repairs];
    if (statusFilter) data = data.filter(r => r.status === statusFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      data = data.filter(r =>
        String(r.id).includes(q) ||
        r.customerFullName?.toLowerCase().includes(q) ||
        r.deviceModel?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [repairs, statusFilter, searchTerm]);

  const exportFilenameBase = `repairs-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filteredRepairs.map((r) => ({
    id: r.id,
    customer: r.customerFullName ?? '—',
    device: `${r.deviceModel}${r.deviceColor ? ` (${r.deviceColor})` : ''}`,
    status: r.status,
    received: formatIsoToShamsiDateTime(r.dateReceived),
    est: r.estimatedCost ?? '',
    final: r.finalCost ?? '',
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportFilenameBase}.xlsx`,
      exportRows,
      [
        { header: 'شناسه', key: 'id' },
        { header: 'مشتری', key: 'customer' },
        { header: 'دستگاه', key: 'device' },
        { header: 'وضعیت', key: 'status' },
        { header: 'تاریخ پذیرش', key: 'received' },
        { header: 'هزینه تخمینی', key: 'est' },
        { header: 'هزینه نهایی', key: 'final' },
      ],
      'Repairs',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportFilenameBase}.pdf`,
      title: 'لیست تعمیرات',
      head: ['شناسه', 'مشتری', 'دستگاه', 'وضعیت', 'پذیرش'],
      body: exportRows.map((x) => [
        Number(x.id).toLocaleString('fa-IR'),
        x.customer,
        x.device,
        x.status,
        x.received,
      ]),
    });
  };


  const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const r of repairs) {
    const key = r.status || 'نامشخص';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
  }, [repairs]);

  const filterChips = useMemo(() => {
    return [
      { key: '', label: 'همه', icon: 'fa-solid fa-layer-group', count: repairs.length || 0 },
      ...REPAIR_STATUSES.map((s) => ({
        key: s,
        label: s,
        icon: 'fa-solid fa-tag',
        count: statusCounts[s] || 0,
      })),
    ];
  }, [repairs.length, statusCounts]);


  const updateRepairStatus = async (repairId: number, status: RepairStatus) => {
  try {
    const resp = await apiFetch(`/api/repairs/${repairId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    const json = await resp.json();
    if (!resp.ok || !json.success) throw new Error(json.message || 'خطا در تغییر وضعیت تعمیر');
    const updated = json.data?.repair || json.data;
    setRepairs(prev => prev.map(r => (r.id === repairId ? { ...r, ...updated } : r)));
    setNotification({ type: 'success', text: `وضعیت تعمیر #${repairId.toLocaleString('fa-IR')} به "${status}" تغییر کرد.` });
  } catch (e: any) {
    setNotification({ type: 'error', text: e?.message || 'خطا در تغییر وضعیت تعمیر' });
  }
  };

  const renderStatusChips = () => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      onClick={() => setStatusFilter('')}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
        ${statusFilter === '' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
    >
      همه ({(repairs.length || 0).toLocaleString('fa-IR')})
    </button>
    {REPAIR_STATUSES.map((s) => (
      <button
        key={s}
        onClick={() => setStatusFilter(s)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
          ${statusFilter === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        title={`فیلتر: ${s}`}
      >
        {s} ({(statusCounts[s] || 0).toLocaleString('fa-IR')})
      </button>
    ))}
  </div>
  );

  const statusOrderForBoard: RepairStatus[] = [
  'پذیرش شده',
  'در حال بررسی',
  'منتظر قطعه',
  'در حال تعمیر',
  'آماده تحویل',
  'تحویل داده شده',
  'تعمیر نشد',
  'مرجوع شد',
  ];

  const groupedForBoard = useMemo(() => {
  const g: Record<string, Repair[]> = {};
  for (const s of statusOrderForBoard) g[s] = [];
  for (const r of filteredRepairs) {
    const key = (r.status as string) || 'نامشخص';
    if (!g[key]) g[key] = [];
    g[key].push(r);
  }
  return g;
  }, [filteredRepairs]);
  // استایل یکدست ورودی‌ها
  const inputCls =
    'w-full p-2.5 rounded-lg text-sm text-right border outline-none transition ' +
    'bg-white border-gray-300 text-gray-900 ' +
    'dark:bg-gray-900/50 dark:border-gray-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 ' +
    'focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500';

  // آیکون و رنگ وضعیت
  const statusMeta = (status: RepairStatus) => {
    switch (status) {
      case 'پذیرش شده':
        return { icon: 'fa-circle-check', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
      case 'در حال بررسی':
        return { icon: 'fa-magnifying-glass', cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300' };
      case 'منتظر قطعه':
        return { icon: 'fa-box-open', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' };
      case 'در حال تعمیر':
        return { icon: 'fa-screwdriver-wrench', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
      case 'آماده تحویل':
        return { icon: 'fa-truck-ramp-box', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' };
      case 'تحویل داده شده':
        return { icon: 'fa-handshake', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
      case 'مرجوع شد':
        return { icon: 'fa-rotate-left', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' };
      default:
        return { icon: 'fa-circle', cls: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
    }
  };

  return (
    // در اندازه‌های کوچک صفحات، از حداکثر عرض مناسب و حاشیه‌های افقی استفاده می‌کنیم تا محتوا منسجم‌تر نمایش داده شود
    <div className="space-y-6 text-right max-w-7xl mx-auto px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* هاب تعمیرات و خدمات (میان‌بُرهای سریع) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HubCard
          title="مرکز تعمیرات"
          subtitle="لیست پذیرش‌ها و وضعیت تعمیرات"
          icon="fa-solid fa-screwdriver-wrench"
          gradientFrom="from-amber-500"
          gradientTo="to-orange-600"
          to="/repairs"
          active={location.pathname === '/repairs' || location.pathname.startsWith('/repairs/')}
        />
        <HubCard
          title="خدمات"
          subtitle="مدیریت خدمات جانبی و سرویس‌ها"
          icon="fa-solid fa-bell-concierge"
          gradientFrom="from-pink-500"
          gradientTo="to-rose-600"
          to="/services"
          active={location.pathname.startsWith('/services')}
        />
        <HubCard
          title="پذیرش دستگاه جدید"
          subtitle="ثبت سریع پذیرش و چاپ رسید"
          icon="fa-solid fa-plus"
          gradientFrom="from-primary-500"
          gradientTo="to-primary-600"
          to="/repairs/new"
          active={location.pathname === '/repairs/new'}
        />
      </div>

      
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
  <TableToolbar
    title="مرکز تعمیرات"
    search={searchTerm}
    onSearchChange={setSearchTerm}
    searchPlaceholder="جستجو (شناسه، مشتری، مدل)…"
    actions={
      <>
        <div className="inline-flex rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={[
              'px-3 h-10 text-sm font-semibold transition',
              viewMode === 'list'
                ? 'bg-primary-600 text-white'
                : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10',
            ].join(' ')}
            title="نمایش لیستی"
          >
            <i className="fa-solid fa-table-list" />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={[
              'px-3 h-10 text-sm font-semibold transition',
              viewMode === 'board'
                ? 'bg-primary-600 text-white'
                : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10',
            ].join(' ')}
            title="نمایش کانبان"
          >
            <i className="fa-solid fa-columns-3" />
          </button>
        </div>

        <ExportMenu
          className="shrink-0"
          items={[
            { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filteredRepairs.length === 0 },
            { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filteredRepairs.length === 0 },
            { key: 'print', label: 'چاپ لیست', icon: 'fa-print', onClick: () => printArea('#repairs-print-area', { title: 'لیست تعمیرات' }), disabled: filteredRepairs.length === 0 },
          ]}
        />

        <button
          onClick={() => navigate('/repairs/new')}
          className="h-10 px-4 rounded-xl text-white font-semibold shadow hover:opacity-90 transition inline-flex items-center gap-2"
          style={{ backgroundColor: brand }}
        >
          <i className="fa-solid fa-plus" />
          پذیرش جدید
        </button>
      </>
    }
    secondaryRow={
      <FilterChipsBar
        chips={filterChips}
        value={statusFilter}
        onChange={(k) => setStatusFilter(k)}
        className="mt-1"
      />
    }
  />

        <div className="pb-4">
          <SavedViewsBar
            storageKey="app:savedViews:repairs:v1"
            currentState={savedViewState}
            onApply={(st) => {
              setStatusFilter(st.statusFilter ?? '');
              setSearchTerm(st.searchTerm ?? '');
            }}
            label="فیلتر"
          />
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          isLoading ? (
            <div className="p-4">
              {/* Desktop skeleton table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                    <tr className="text-text">
                      {['شناسه','مشتری','دستگاه','تاریخ پذیرش','وضعیت','عملیات'].map((h) => (
                        <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 dark:divide-white/10">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-16" rounded="lg" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-40" rounded="lg" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-36" rounded="lg" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-28" rounded="lg" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-24" rounded="xl" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-9 w-32" rounded="xl" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile skeleton cards */}
              <div className="md:hidden space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="app-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-28" rounded="lg" />
                      <Skeleton className="h-6 w-24" rounded="xl" />
                    </div>
                    <Skeleton className="h-5 w-56" rounded="lg" />
                    <Skeleton className="h-5 w-40" rounded="lg" />
                    <div className="pt-2">
                      <Skeleton className="h-9 w-36" rounded="xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="هیچ تعمیراتی پیدا نشد"
                description={searchTerm || statusFilter ? 'جستجو/فیلتر را تغییر بده یا پاک کن.' : 'اولین پذیرش دستگاه را ثبت کن تا اینجا پر شود.'}
                actionLabel={(searchTerm || statusFilter) ? 'پاک کردن فیلترها' : undefined}
                onAction={(searchTerm || statusFilter) ? () => { setSearchTerm(''); setStatusFilter(''); } : undefined}
                iconClass="fa-solid fa-screwdriver-wrench"
              />
            </div>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto" id="repairs-print-area">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/60">
                    <tr className="text-gray-600 dark:text-gray-200">
                      <th className="px-4 py-3 text-right font-semibold">شناسه</th>
                      <th className="px-4 py-3 text-right font-semibold">مشتری</th>
                      <th className="px-4 py-3 text-right font-semibold">دستگاه</th>
                      <th className="px-4 py-3 text-right font-semibold">تاریخ پذیرش</th>
                      <th className="px-4 py-3 text-right font-semibold">وضعیت</th>
                      <th className="px-4 py-3 text-center font-semibold">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {filteredRepairs.map((r, idx) => {
                      const meta = statusMeta(r.status);
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition ${
                            idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-900/30'
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{r.id}</td>
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{r.customerFullName || '—'}</td>
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{r.deviceModel}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {formatIsoToShamsiDateTime(r.dateReceived)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.cls}`}>
                              <i className={`fa-solid ${meta.icon}`} />
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
  <div className="flex items-center justify-center gap-2">
    <Link
      to={`/repairs/${r.id}`}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary/30 text-primary-700 hover:bg-primary/10 text-xs font-semibold"
      title="مشاهده جزئیات"
    >
      <i className="fa-regular fa-eye" />
      مشاهده
    </Link>

    <Link
      to={`/repairs/${r.id}/receipt?autoPrint=1`}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
      title="چاپ رسید"
    >
      <i className="fa-solid fa-receipt" />
      رسید
    </Link>

    {r.status !== 'آماده تحویل' && r.status !== 'تحویل داده شده' ? (
      <button
        type="button"
        onClick={() => updateRepairStatus(r.id, 'آماده تحویل')}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
        title="تغییر وضعیت به آماده تحویل"
      >
        <i className="fa-solid fa-bolt" />
        آماده
      </button>
    ) : null}
  </div>
</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden space-y-4 p-4">
                {filteredRepairs.map((r) => {
                  const meta = statusMeta(r.status);
                  return (
                    <div key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            #{r.id.toLocaleString('fa-IR')} • {r.deviceModel}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {r.customerFullName || 'مشتری نامشخص'}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${meta.cls}`}>
                          <i className={`fa-solid ${meta.icon}`} />
                          {r.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-y border-gray-100 dark:border-gray-700 text-xs">
                        <div className="text-gray-500 dark:text-gray-400">تاریخ پذیرش:</div>
                        <div className="text-gray-700 dark:text-gray-300">{formatIsoToShamsiDateTime(r.dateReceived)}</div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
  <Link
    to={`/repairs/${r.id}`}
    className="px-3 py-2 rounded-xl border border-primary/30 text-primary-700 dark:text-primary-400 text-xs font-bold flex items-center gap-2 hover:bg-primary/10"
  >
    <i className="fa-regular fa-eye" />
    مشاهده
  </Link>

  <Link
    to={`/repairs/${r.id}/receipt?autoPrint=1`}
    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2"
    title="چاپ رسید"
  >
    <i className="fa-solid fa-receipt" />
    رسید
  </Link>

  {r.status !== 'آماده تحویل' && r.status !== 'تحویل داده شده' ? (
    <button
      type="button"
      onClick={() => updateRepairStatus(r.id, 'آماده تحویل')}
      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2"
      title="تغییر وضعیت به آماده تحویل"
    >
      <i className="fa-solid fa-bolt" />
      آماده
    </button>
  ) : null}
</div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        ) : (
          <div className="px-5 pb-5">
            {isLoading ? (
              <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                <i className="fas fa-spinner fa-spin text-3xl mb-3" />
                در حال بارگذاری تعمیرات...
              </div>
            ) : filteredRepairs.length === 0 ? (
              <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                <i className="fas fa-tools text-3xl mb-3" />
                هیچ تعمیراتی یافت نشد.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {statusOrderForBoard.map((status) => {
                  const meta = statusMeta(status);
                  const list = groupedForBoard[status] || [];
                  return (
                    <div
                      key={status}
                      className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/20 overflow-hidden"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const raw = e.dataTransfer.getData('text/plain');
                        const rid = Number(raw);
                        if (rid) updateRepairStatus(rid, status);
                      }}
                    >
                      <div className="px-4 py-3 flex items-center justify-between bg-white/70 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">
                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${meta.cls}`}>
                          <i className={`fa-solid ${meta.icon}`} />
                          {status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {list.length.toLocaleString('fa-IR')}
                        </span>
                      </div>

                      <div className="p-3 space-y-3 max-h-[540px] overflow-y-auto">
                        {list.length === 0 ? (
                          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                            موردی ندارد
                          </div>
                        ) : (
                          list.map((r) => (
                            <div
                              key={r.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(r.id));
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              className="group rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-all"
                              title="برای تغییر وضعیت، کارت را بکشید و در ستون مقصد رها کنید"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                                    #{r.id.toLocaleString('fa-IR')} • {r.deviceModel}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                                    <i className="fa-solid fa-user ml-1 text-gray-400" />
                                    {r.customerFullName || '—'}
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                    <i className="fa-solid fa-calendar ml-1 text-gray-400" />
                                    {formatIsoToShamsiDateTime(r.dateReceived)}
                                  </div>
                                </div>

                                <Link
                                  to={`/repairs/${r.id}`}
                                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl text-white shadow-sm hover:opacity-90"
                                  style={{ backgroundColor: brand }}
                                  title="مشاهده جزئیات"
                                >
                                  <i className="fa-regular fa-eye" />
                                </Link>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2">
                                <select
                                  value={r.status}
                                  onChange={(e) => updateRepairStatus(r.id, e.target.value as RepairStatus)}
                                  className="text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-2 py-1.5 focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                  {REPAIR_STATUSES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>

                                <span className="text-[11px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition">
                                  drag &amp; drop
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Repairs;
