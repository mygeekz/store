import React, { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { ReportsExportsProvider } from '../contexts/ReportsExportsContext';

// یک لایه سبک مخصوص چاپ/PDF (بدون MainLayout)
const PrintLayout: React.FC = () => {
  const [sp] = useSearchParams();

  // در گزارش‌ها دیتای صفحه معمولاً async لود می‌شود.
  // اگر خیلی زود window.print() بزنیم، Chrome یک snapshot سفید می‌گیرد و همان را preview می‌کند.
  // این helper صبر می‌کند تا محتوای واقعی داخل #report-print-root ظاهر شود.
  const waitForReportReady = async (timeoutMs = 12000) => {
    const start = Date.now();
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    while (Date.now() - start < timeoutMs) {
      const root = document.getElementById('report-print-root') as HTMLElement | null;
      if (root) {
        const text = (root.innerText || '').replace(/\s+/g, ' ').trim();
        const hasLoadingText = /بارگذاری|در حال|loading|please wait/i.test(text);
        const hasEmptyStateText = /گزارش برای نمایش آماده نیست|موردی برای نمایش وجود ندارد|گزارش پیدا نشد/i.test(text);
        const rowCount = root.querySelectorAll('table tbody tr').length;
        const hasMeaningfulDom = root.querySelectorAll('*').length > 10;
        const hasCards = root.querySelectorAll('.kpi-card,.card,.panel,[data-report-card="true"]').length > 0;

        // اگر جدول دارد یا متن کافی دارد و پیام loading دیده نمی‌شود، آماده است.
        if (!hasLoadingText && !hasEmptyStateText && (rowCount > 0 || hasCards || text.length > 140) && hasMeaningfulDom) {
          // دو فریم صبر کن تا layout نهایی شود
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return;
        }
      }
      await sleep(250);
    }
  };

  useEffect(() => {
    // auto-print در تب جدید
    const modeFromQuery = sp.get('mode');
    const modeFromStorage = (() => {
      try {
        return sessionStorage.getItem('KOUROSH_PRINT_MODE');
      } catch {
        return null;
      }
    })();

    const mode = (modeFromQuery || modeFromStorage || 'pdf') as 'pdf' | 'print';
    try {
      sessionStorage.removeItem('KOUROSH_PRINT_MODE');
    } catch {
      // ignore
    }

    let cancelled = false;

    (async () => {
      // صبر برای فونت‌ها
      try {
        // @ts-ignore
        await document.fonts?.ready;
      } catch {}

      // صبر برای لود شدن دیتای گزارش
      await waitForReportReady(12000);
      if (cancelled) return;

      window.focus();
      window.print();
    })();

    return () => {
      cancelled = true;
    };
  }, [sp]);

  return (
    <div dir="rtl" className="min-h-screen bg-white text-slate-900">
      <style>{`
        @media print {
          html, body { background: #fff !important; }

          /*
            مشکل «برگه سفید»:
            در بعضی گزارش‌ها، پورتال‌ها/overlayها (مثل DatePicker/Modal) روی کل صفحه می‌افتند
            و در چاپ روی محتوا می‌نشینند. اینجا فقط #report-print-root را قابل مشاهده می‌کنیم.
          */
          body * {
            visibility: hidden !important;
          }

          #report-print-root,
          #report-print-root * {
            visibility: visible !important;
          }

          #report-print-root {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          /* مخفی کردن کنترل‌های تعاملی داخل خود گزارش */
          #report-print-root button,
          #report-print-root input,
          #report-print-root select,
          #report-print-root textarea,
          #report-print-root .no-print,
          #report-print-root [data-print-hide="true"] {
            display: none !important;
          }

          /* خوانایی */
          #report-print-root,
          #report-print-root * {
            color: #111827 !important;
            text-shadow: none !important;
            filter: none !important;
          }
        }
      `}</style>

      {/* برای سازگاری با صفحات گزارش که registerReportExports می‌خواهند */}
      <ReportsExportsProvider value={{ registerReportExports: () => {} }}>
        <div className="mx-auto w-full max-w-[980px] px-6 py-6">
          <Outlet />
        </div>
      </ReportsExportsProvider>
    </div>
  );
};

export default PrintLayout;
