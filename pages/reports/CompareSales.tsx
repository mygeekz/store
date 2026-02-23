// pages/reports/CompareSalesPage.tsx
import React, {useEffect, useMemo, useRef, useState} from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import SavedViewsBar from '../../components/SavedViewsBar';
import Notification from '../../components/Notification';
import Modal from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useStyle } from '../../contexts/StyleContext';
import { apiFetch } from '../../utils/apiFetch';
import { formatIsoToShamsi } from '../../utils/dateUtils';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useReportsExports } from '../../contexts/ReportsExportsContext';

import {
  VAZIR_FAMILY,
  VAZIR_REGULAR_FILE,
  VAZIR_BOLD_FILE,
  vazirRegularB64,
  vazirBoldB64,
} from '../../utils/vazirFont';

type Baseline = 'prev' | 'last_year';

type CompareApiResponse = {
  success: boolean;
  data?: {
    currentAmount: number;
    previousAmount: number;
    percentageChange: number | null;
    currentRange: { from: string; to: string };
    previousRange: { from: string; to: string };
    baseline: Baseline;
  };
  message?: string;
};

type SaleRow = {
  id: number;
  transactionDate: string; // ISO
  customerFullName?: string | null;
  totalPrice?: number | null;
  profit?: number | null;
};

const price = (n: number | null | undefined) =>
  (Number(n || 0)).toLocaleString('fa-IR') + ' تومان';

export default function CompareSalesPage() {
  const { token } = useAuth();
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandTint = `hsla(${style.primaryHue} 95% 62% / .15)`;

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // فیلترها
  const [startDate, setStartDate] = useState<Date | null>(moment().startOf('jMonth').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const savedViewState = useMemo(() => ({
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
  }), [startDate, endDate]);
  const [baseline, setBaseline] = useState<Baseline>('prev');

  // نتیجه
  const [data, setData] = useState<CompareApiResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal جزئیات
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [detailsRows, setDetailsRows] = useState<SaleRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const currentRangeLabel = useMemo(() => {
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});

    if (!data) return '—';
    return `${data.currentRange.from} تا ${data.currentRange.to}`;
  }, [data]);

  const previousRangeLabel = useMemo(() => {
    if (!data) return '—';
    return `${data.previousRange.from} تا ${data.previousRange.to}`;
  }, [data]);

  const fetchCompare = async () => {
    if (!startDate || !endDate) {
      setNotification({ type: 'warning', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }
    const fromDate = moment(startDate).locale('en').format('jYYYY/jMM/jDD');
    const toDate = moment(endDate).locale('en').format('jYYYY/jMM/jDD');

    try {
      setLoading(true);
      setNotification(null);
      const res = await apiFetch(`/api/reports/compare-sales?fromDate=${fromDate}&toDate=${toDate}&baseline=${baseline}`);
      const json: CompareApiResponse = await res.json();
      if (!res.ok || !json.success || !json.data) throw new Error(json.message || 'خطا در دریافت گزارش مقایسه‌ای');
      setData(json.data);
    } catch (e: any) {
      setData(null);
      setNotification({ type: 'error', text: e.message || 'خطای نامشخص رخ داد' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    const t = window.setTimeout(() => { void fetchCompare(); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, baseline]);


  // پیش‌تنظیم بازه‌ها + سوییچ مبنا
  const preset = (key: 'this_week' | 'last_7' | 'this_month' | 'last_30' | 'this_year', base?: Baseline) => {
    const now = moment();
    let s = now.clone(),
      e = now.clone();
    switch (key) {
      case 'this_week':
        s = now.clone().startOf('week');
        e = now.clone().endOf('week');
        break;
      case 'last_7':
        s = now.clone().subtract(6, 'day');
        e = now;
        break;
      case 'this_month':
        s = now.clone().startOf('jMonth');
        e = now;
        break;
      case 'last_30':
        s = now.clone().subtract(29, 'day');
        e = now;
        break;
      case 'this_year':
        s = now.clone().startOf('jYear');
        e = now;
        break;
    }
    setStartDate(s.toDate());
    setEndDate(e.toDate());
    if (base) setBaseline(base);
  };

  // دریافت جزئیات فروش و فیلتر در فرانت
  const openDetails = async (kind: 'current' | 'previous') => {
    if (!data) return;
    const range = kind === 'current' ? data.currentRange : data.previousRange;

    setDetailsTitle(kind === 'current' ? `جزئیات دوره فعلی (${range.from} تا ${range.to})` : `جزئیات دوره مبنا (${range.from} تا ${range.to})`);
    setDetailsRows([]);
    setDetailsOpen(true);
    setDetailsLoading(true);

    try {
      const res = await apiFetch('/api/sales');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت لیست فروش');
      const all: SaleRow[] = json.data || [];

      const fromISO = moment(range.from, 'jYYYY/jMM/jDD').startOf('day');
      const toISO = moment(range.to, 'jYYYY/jMM/jDD').endOf('day');

      const rows = all.filter((row) => {
        const m = moment(row.transactionDate);
        return m.isValid() && m.isSameOrAfter(fromISO) && m.isSameOrBefore(toISO);
      });

      rows.sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1));
      setDetailsRows(rows);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در بارگذاری جزئیات' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // KPI های مودال جزئیات
  const kpi = useMemo(() => {
    const count = detailsRows.length;
    const total = detailsRows.reduce((s, r) => s + Number(r.totalPrice || 0), 0);
    const profit = detailsRows.reduce((s, r) => s + Number(r.profit || 0), 0);
    const avg = count ? total / count : 0;
    return { count, total, profit, avg };
  }, [detailsRows]);

  // -------------------- Export: Excel --------------------
  const exportExcel = () => {
    if (!detailsRows.length) return;

    const wsData = [
      ['شناسه', 'تاریخ', 'مشتری', 'مبلغ', 'سود'],
      ...detailsRows.map((r) => [
        r.id,
        formatIsoToShamsi(r.transactionDate),
        r.customerFullName || 'مهمان',
        Number(r.totalPrice || 0),
        Number(r.profit || 0),
      ]),
      [],
      ['تعداد فاکتور', kpi.count],
      ['مجموع فروش', kpi.total],
      ['مجموع سود', kpi.profit],
      ['میانگین فروش', kpi.avg],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'جزئیات فروش');

    const fileName = (detailsTitle || 'report') + '.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


  // رجیستر فونت وزیر
  const ensureVazirFont = (doc: jsPDF) => {
    if (vazirRegularB64 && vazirRegularB64.length > 0) {
      doc.addFileToVFS(VAZIR_REGULAR_FILE, vazirRegularB64);
      doc.addFont(VAZIR_REGULAR_FILE, VAZIR_FAMILY, 'normal');
    }
    if (vazirBoldB64 && vazirBoldB64.length > 0) {
      doc.addFileToVFS(VAZIR_BOLD_FILE, vazirBoldB64);
      doc.addFont(VAZIR_BOLD_FILE, VAZIR_FAMILY, 'bold');
    }
  };

  // -------------------- Export: PDF --------------------
  const exportPDF = () => {
    if (!detailsRows.length) return;

    const doc = new jsPDF({ orientation: 'p', unit: 'pt' });
    ensureVazirFont(doc);

    const hasRegular = !!(vazirRegularB64 && vazirRegularB64.length);
    doc.setFont(VAZIR_FAMILY, hasRegular ? 'normal' : 'bold');
    doc.setFontSize(12);

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;
    const title = detailsTitle || 'جزئیات فروش';
    doc.text(title, pageWidth - marginX, 40, { align: 'right' });

    const head = [['شناسه', 'تاریخ', 'مشتری', 'مبلغ', 'سود']];
    const body = detailsRows.map((r) => [
      String(r.id),
      formatIsoToShamsi(r.transactionDate),
      r.customerFullName || 'مهمان',
      Number(r.totalPrice || 0).toLocaleString('fa-IR'),
      Number(r.profit || 0).toLocaleString('fa-IR'),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 60,
      theme: 'grid',
      styles: {
        font: VAZIR_FAMILY,
        fontSize: 10,
        halign: 'right',
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        lineColor: [220, 220, 220],
        lineWidth: 0.5,
        textColor: [40, 40, 40],
      },
      headStyles: {
        font: VAZIR_FAMILY,
        fontStyle: 'bold',
        fillColor: [245, 245, 245],
        textColor: [30, 30, 30],
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 60 },
        1: { halign: 'center', cellWidth: 95 },
        2: { halign: 'right', cellWidth: 180 },
        3: { halign: 'right', cellWidth: 110 },
        4: { halign: 'right', cellWidth: 90 },
      },
      margin: { left: marginX, right: marginX },
      didDrawPage: ({ pageNumber }) => {
        const footer = `صفحه ${pageNumber}`;
        doc.setFont(VAZIR_FAMILY, hasRegular ? 'normal' : 'bold');
        doc.setFontSize(9);
        doc.text(footer, pageWidth - marginX, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      },
    });

    const lastY = (doc as any).lastAutoTable?.finalY || 60;
    const y = lastY + 18;

    doc.setFont(VAZIR_FAMILY, 'bold');
    doc.text('خلاصه:', pageWidth - marginX, y, { align: 'right' });
    doc.setFont(VAZIR_FAMILY, hasRegular ? 'normal' : 'bold');
    doc.text(`تعداد فاکتور: ${kpi.count.toLocaleString('fa-IR')}`, pageWidth - marginX, y + 18, { align: 'right' });
    doc.text(`مجموع فروش: ${kpi.total.toLocaleString('fa-IR')} تومان`, pageWidth - marginX, y + 36, { align: 'right' });
    doc.text(`مجموع سود: ${kpi.profit.toLocaleString('fa-IR')} تومان`, pageWidth - marginX, y + 54, { align: 'right' });
    doc.text(`میانگین فروش: ${kpi.avg.toLocaleString('fa-IR')} تومان`, pageWidth - marginX, y + 72, { align: 'right' });

    const fileName = (detailsTitle || 'report') + '.pdf';
    doc.save(fileName);
  };

  const posNegClass = (val: number | null) => {
    if (val === null) return 'text-gray-500 dark:text-gray-400';
    return val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* کارت اصلی با تم دارک */}
      <div className="rounded-2xl shadow-sm p-6 bg-white text-gray-900 border border-slate-200 dark:bg-white/5 dark:text-gray-100 dark:border-white/10">
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm mb-5">
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-extrabold">گزارش مقایسه‌ای فروش</div>
                <div className="text-xs text-white/75 mt-1">مقایسه دو بازه زمانی، سهم تغییرات و ریزفروش‌ها</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 h-9 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">
                  <span className="text-base">📈</span>
                  مقایسه حرفه‌ای
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* فیلترها */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">از تاریخ:</label>
            <ShamsiDatePicker inputClassName="w-48" 
              selectedDate={startDate}
              onDateChange={setStartDate}
              inputClassName="w-56 p-2.5 rounded-lg border border-gray-300 bg-white text-gray-900
                              dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">تا تاریخ:</label>
            <ShamsiDatePicker inputClassName="w-48" 
              selectedDate={endDate}
              onDateChange={setEndDate}
              inputClassName="w-56 p-2.5 rounded-lg border border-gray-300 bg-white text-gray-900
                              dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">مبنای مقایسه:</label>
            <select
              value={baseline}
              onChange={(e) => setBaseline(e.target.value as Baseline)}
              className="p-2.5 rounded-lg border border-gray-300 bg-white text-gray-900
                         dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
            >
              <option value="prev">دوره قبلیِ هم‌طول</option>
              <option value="last_year">همین بازه در سال قبل</option>
            </select>
          </div>

          <button
            onClick={fetchCompare}
            disabled={loading || !token}
            className="px-5 py-2.5 rounded-lg text-white disabled:opacity-60"
            style={{ backgroundColor: brand }}
          >
            {loading ? 'در حال محاسبه...' : 'محاسبه'}
          </button>
        </div>

        {/* میانبرها */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-500 dark:text-gray-400">میان‌بُرها:</span>
          <button onClick={() => preset('this_week')} className="px-2 py-1 text-xs border rounded-md border-gray-300 dark:border-slate-700 dark:text-gray-100">
            هفته جاری
          </button>
          <button onClick={() => preset('this_month')} className="px-2 py-1 text-xs border rounded-md border-gray-300 dark:border-slate-700 dark:text-gray-100">
            ماه جاری
          </button>
          <button onClick={() => preset('last_7')} className="px-2 py-1 text-xs border rounded-md border-gray-300 dark:border-slate-700 dark:text-gray-100">
            ۷ روز گذشته
          </button>
          <button onClick={() => preset('last_30')} className="px-2 py-1 text-xs border rounded-md border-gray-300 dark:border-slate-700 dark:text-gray-100">
            ۳۰ روز گذشته
          </button>
          <button onClick={() => preset('this_year')} className="px-2 py-1 text-xs border rounded-md border-gray-300 dark:border-slate-700 dark:text-gray-100">
            سال جاری
          </button>
          <span className="mx-2 h-4 w-px bg-gray-300 dark:bg-slate-700" />
          <button onClick={() => preset('this_month', 'prev')} className="px-2 py-1 text-xs border rounded-md border-gray-300 dark:border-slate-700 dark:text-gray-100">
            ماه جاری + دوره قبلی
          </button>
          <button onClick={() => preset('this_month', 'last_year')} className="px-2 py-1 text-xs border rounded-md border-gray-300 dark:border-slate-700 dark:text-gray-100">
            ماه جاری + سال قبل
          </button>
        </div>

        <div className="mb-6">
          <SavedViewsBar
            storageKey="app:savedViews:reports:compareSales:v1"
            currentState={{...savedViewState}}
            onApply={(st) => {{
              setStartDate(st.startDate ? new Date(st.startDate) : null);
              setEndDate(st.endDate ? new Date(st.endDate) : null);
            }}}
            label="بازه"
          />
        </div>

        {/* کارت نتیجه */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg p-4 border border-transparent bg-indigo-50 text-indigo-900 dark:text-indigo-200 dark:bg-slate-800/70 dark:border-slate-700" style={{ boxShadow: `0 0 0 1px ${brandTint} inset` }}>
              <div className="text-sm opacity-90 mb-1">فروش دوره فعلی</div>
              <div className="text-2xl font-extrabold">{price(data.currentAmount)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{currentRangeLabel}</div>
              <button onClick={() => openDetails('current')} className="mt-3 text-xs font-medium hover:underline" style={{ color: brand }}>
                مشاهده جزئیات
              </button>
            </div>

            <div className="rounded-lg p-4 border border-transparent bg-sky-50 text-sky-900 dark:text-sky-200 dark:bg-slate-800/70 dark:border-slate-700" style={{ boxShadow: `0 0 0 1px ${brandTint} inset` }}>
              <div className="text-sm opacity-90 mb-1">فروش دوره مبنا</div>
              <div className="text-2xl font-extrabold">{price(data.previousAmount)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{previousRangeLabel}</div>
              <button onClick={() => openDetails('previous')} className="mt-3 text-xs font-medium hover:underline" style={{ color: brand }}>
                مشاهده جزئیات
              </button>
            </div>

            <div className="rounded-lg p-4 border border-transparent bg-emerald-50 text-emerald-900 dark:text-emerald-200 dark:bg-slate-800/70 dark:border-slate-700" style={{ boxShadow: `0 0 0 1px ${brandTint} inset` }}>
              <div className="text-sm opacity-90 mb-1">درصد تغییر</div>
              <div className={`text-2xl font-extrabold ${posNegClass(data.percentageChange)}`}>
                {data.percentageChange === null ? '—' : `${data.percentageChange.toFixed(2)}%`}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">مبنا: {data.baseline === 'last_year' ? 'سال قبل' : 'دوره قبلی هم‌طول'}</div>
            </div>
          </div>
        )}

        {!data && !loading && <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">بازه و مبنا را انتخاب کنید و روی «محاسبه» بزنید.</div>}
      </div>

      {/* Modal جزئیات */}
      {detailsOpen && (
        <Modal title={detailsTitle} onClose={() => setDetailsOpen(false)} widthClass="max-w-3xl">
          {detailsLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <i className="fas fa-spinner fa-spin text-2xl" />
            </div>
          ) : detailsRows.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">موردی یافت نشد.</div>
          ) : (
            <>
              {/* خلاصه + خروجی‌ها */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {[
                    { k: 'تعداد فاکتور', v: kpi.count.toLocaleString('fa-IR') },
                    { k: 'مجموع فروش', v: `${kpi.total.toLocaleString('fa-IR')} تومان` },
                    { k: 'مجموع سود', v: `${kpi.profit.toLocaleString('fa-IR')} تومان` },
                    { k: 'میانگین فروش', v: `${kpi.avg.toLocaleString('fa-IR')} تومان` },
                  ].map((box, i) => (
                    <div key={i} className="border rounded p-2 bg-gray-50 text-gray-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-gray-100">
                      <div className="opacity-80">{box.k}</div>
                      <div className="font-bold">{box.v}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={exportExcel} className="px-3 py-1.5 text-xs rounded text-white" style={{ backgroundColor: 'hsl(152 80% 40%)' }}>
                    خروجی Excel
                  </button>
                  <button onClick={exportPDF} className="px-3 py-1.5 text-xs rounded text-white" style={{ backgroundColor: 'hsl(350 80% 45%)' }}>
                    خروجی PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-slate-800">
                  <thead className="bg-gray-100 dark:bg-slate-800/70">
                    <tr>
                      {['تاریخ', 'مشتری', 'مبلغ', 'سود', ''].map((h, i) => (
                        <th key={i} className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-slate-800">
                    {detailsRows.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2">{formatIsoToShamsi(r.transactionDate)}</td>
                        <td className="px-3 py-2">{r.customerFullName || 'مهمان'}</td>
                        <td className="px-3 py-2">{price(r.totalPrice)}</td>
                        <td className="px-3 py-2">
                          <span className={posNegClass(r.profit ?? 0)}>{price(r.profit ?? 0)}</span>
                        </td>
                        <td className="px-3 py-2 text-left">
                          <a className="font-medium hover:underline" href={`#/invoices/${r.id}`} title="مشاهده فاکتور" style={{ color: brand }}>
                            فاکتور
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
