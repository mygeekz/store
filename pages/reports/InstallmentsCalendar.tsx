import React, {useEffect, useMemo, useRef, useState} from 'react';
import moment from 'jalali-moment';
import { Link, useLocation } from 'react-router-dom';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { exportToExcel } from '../../utils/exporters';
import { InstallmentCalendarItem, NotificationMessage } from '../../types';


const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const fmtMoney = (n: number | undefined | null) => (n ?? 0).toLocaleString('fa-IR') + ' تومان';

const statusPill = (status: string) => {
  const base = 'px-2 py-0.5 rounded-full text-xs';
  if (status === 'paid') return <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200`}>پرداخت شده</span>;
  if (status === 'pending') return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200`}>در انتظار</span>;
  if (status === 'passed') return <span className={`${base} bg-red-100 text-red-700 dark:bg-rose-900/40 dark:text-rose-200`}>سررسید گذشته</span>;
  if (status === 'cashed') return <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200`}>وصول شده</span>;
  if (status === 'bounced') return <span className={`${base} bg-red-100 text-red-700 dark:bg-rose-900/40 dark:text-rose-200`}>برگشت خورده</span>;
  return <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200`}>{status}</span>;
};

const InstallmentsCalendarPage: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});

  const monthStart = useMemo(() => {
    const m = moment();
    const j = moment(`${m.locale('fa').format('jYYYY/jMM')}/01`, 'jYYYY/jMM/jDD');
    return j.toDate();
  }, []);

  const monthEnd = useMemo(() => {
    const m = moment().locale('fa');
    const jEnd = m.clone().endOf('jMonth');
    return jEnd.toDate();
  }, []);

  const [fromDate, setFromDate] = useState<Date | null>(monthStart);
  const [toDate, setToDate] = useState<Date | null>(monthEnd);
  const [items, setItems] = useState<InstallmentCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const fetchData = async () => {
    if (!token) return;
    const from = fromDate ? toShamsiStr(fromDate) : undefined;
    const to = toDate ? toShamsiStr(toDate) : undefined;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const res = await fetch(`/api/reports/installments-calendar?${qs.toString()}`, {
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش');
      setItems((json.data?.items || []) as InstallmentCalendarItem[]);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در دریافت گزارش' });
    } finally {
      setIsLoading(false);
    }
  };

  // Allow deep links from dashboard / reports with query params: ?from=...&to=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qFrom = params.get('from');
    const qTo = params.get('to');

    const parseShamsi = (s: string | null): Date | null => {
      if (!s) return null;
      const m = moment(s, 'jYYYY/jMM/jDD', true);
      return m.isValid() ? m.toDate() : null;
    };

    const parsedFrom = parseShamsi(qFrom);
    const parsedTo = parseShamsi(qTo);
    if (parsedFrom) setFromDate(parsedFrom);
    if (parsedTo) setToDate(parsedTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fromDate, toDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, InstallmentCalendarItem[]>();
    items.forEach(it => {
      const k = it.dueDate;
      map.set(k, [...(map.get(k) || []), it]);
    });
    const keys = Array.from(map.keys()).sort((a, b) => {
      const ma = moment(a, 'jYYYY/jMM/jDD');
      const mb = moment(b, 'jYYYY/jMM/jDD');
      return ma.valueOf() - mb.valueOf();
    });
    return keys.map(k => ({ date: k, items: map.get(k) || [] }));
  }, [items]);

  const exportExcel = () => {
    const rows = items.map((it) => ({
      dueDate: it.dueDate,
      type: it.type === 'payment' ? 'قسط' : 'چک',
      amount: it.amount,
      status: it.status,
      customer: it.customerFullName,
      phone: it.customerPhoneNumber ?? '',
      saleId: it.saleId,
      bank: it.bankName ?? '',
      checkNumber: it.checkNumber ?? '',
    }));
    exportToExcel(
      `installments-calendar-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows,
      [
        { header: 'تاریخ', key: 'dueDate' },
        { header: 'نوع', key: 'type' },
        { header: 'مبلغ', key: 'amount' },
        { header: 'وضعیت', key: 'status' },
        { header: 'مشتری', key: 'customer' },
        { header: 'تلفن', key: 'phone' },
        { header: 'کد فروش', key: 'saleId' },
        { header: 'بانک', key: 'bank' },
        { header: 'شماره چک', key: 'checkNumber' },
      ],
      'Calendar'
    );
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


  const stats = useMemo(() => {
    const total = items.reduce((a, it) => a + (it.amount || 0), 0);
    const counts = {
      all: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      paid: items.filter(i => i.status === 'paid').length,
      passed: items.filter(i => i.status === 'passed').length,
      cashed: items.filter(i => i.status === 'cashed').length,
      bounced: items.filter(i => i.status === 'bounced').length,
    };
    return { total, counts };
  }, [items]);

  return (
    <div className="report-page space-y-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Hero */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 shadow-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-slate-900 via-slate-600 to-slate-900 dark:from-white/80 dark:via-white/40 dark:to-white/80" />
        <div className="p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black/30 grid place-items-center shadow-sm">
                  <i className="fa-solid fa-calendar-days" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white truncate">تقویم اقساط و چک‌ها</h1>
                  <div className="text-sm text-slate-500 dark:text-white/60 mt-1">
                    نمایش آیتم‌های سررسید شده/در انتظار در بازه انتخابی
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
                  کل آیتم‌ها: {stats.counts.all.toLocaleString('fa-IR')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
                  جمع مبلغ: {fmtMoney(stats.total)}
                </span>
                {stats.counts.pending > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    در انتظار: {stats.counts.pending.toLocaleString('fa-IR')}
                  </span>
                )}
                {stats.counts.passed > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                    سررسید گذشته: {stats.counts.passed.toLocaleString('fa-IR')}
                  </span>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-white/60">از</span>
                <ShamsiDatePicker
                  selectedDate={fromDate}
                  onDateChange={setFromDate}
                  inputClassName="h-10 w-52 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-white/60">تا</span>
                <ShamsiDatePicker
                  selectedDate={toDate}
                  onDateChange={setToDate}
                  inputClassName="h-10 w-52 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 text-slate-900 dark:text-white"
                />
              </div>

              <button
                onClick={() => void fetchData()}
                className="h-10 px-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 inline-flex items-center gap-2 shadow-sm"
                disabled={isLoading}
              >
                <i className="fa-solid fa-rotate" />
                {isLoading ? 'در حال دریافت...' : 'به‌روزرسانی'}
              </button>

              <button
                onClick={exportExcel}
                className="h-10 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 text-slate-800 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-white/10 inline-flex items-center gap-2"
                disabled={items.length === 0}
              >
                <i className="fa-solid fa-file-excel" />
                خروجی Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-10 text-center text-slate-500 dark:text-white/60">در حال دریافت...</div>
      ) : grouped.length === 0 ? (
        <div className="p-10 text-center text-slate-500 dark:text-white/60">آیتمی برای نمایش وجود ندارد.</div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => {
            const dateTotal = g.items.reduce((a, it) => a + (it.amount || 0), 0);
            return (
              <div key={g.date} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black/30 grid place-items-center">
                      <i className="fa-regular fa-clock" />
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-white">{g.date}</div>
                    <div className="text-xs text-slate-500 dark:text-white/60">
                      {g.items.length.toLocaleString('fa-IR')} آیتم
                    </div>
                  </div>

                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {fmtMoney(dateTotal)}
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {g.items.map((it) => (
                    <div
                      key={`${it.type}-${it.id}`}
                      className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-white/10 border border-black/5 dark:border-white/10 grid place-items-center">
                              <i className={it.type === 'payment' ? 'fa-solid fa-hand-holding-dollar' : 'fa-solid fa-money-check'} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                {it.type === 'payment' ? 'قسط' : 'چک'} • {fmtMoney(it.amount)}
                              </div>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                {statusPill(it.status)}
                                {it.type === 'check' && (it.bankName || it.checkNumber) ? (
                                  <span className="text-xs text-slate-500 dark:text-white/60">
                                    {it.bankName ? `بانک: ${it.bankName}` : ''}{it.bankName && it.checkNumber ? ' • ' : ''}{it.checkNumber ? `چک: ${it.checkNumber}` : ''}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3">
                            <Link className="text-primary-600 hover:underline font-semibold" to={`/customers/${it.customerId}`}>
                              {it.customerFullName}
                            </Link>
                            <div className="text-xs text-slate-500 dark:text-white/60 mt-1" dir="ltr">
                              {it.customerPhoneNumber || ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Link
                            className="h-9 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold inline-flex items-center gap-2"
                            to={`/installment-sales/${it.saleId}`}
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square" />
                            جزئیات
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


export default InstallmentsCalendarPage;
