// utils/exporters.ts
// خروجی Excel / PDF برای لیست‌ها (بدون نیاز به بک‌اند)
//
// ✅ بهینه‌سازی لود اولیه:
// کتابخانه‌های سنگین مثل xlsx / jspdf / html2canvas فقط هنگام کلیک روی «خروجی»
// به‌صورت dynamic import لود می‌شوند تا باندل اولیه سبک‌تر شود.

type ExcelColumn<T> = { header: string; key: keyof T | string };

const safeText = (v: unknown) => {
  if (v == null) return '';
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 'بله' : 'خیر';
  return String(v);
};

export function exportToExcel<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: ExcelColumn<T>[],
  sheetName = 'Sheet1',
) {
  // ✅ خروجی اکسل حرفه‌ای (تمپلت ثابت + RTL + رنگ‌بندی)
  // - برای گزارشات: دقیقاً مشابه نمونه‌ی «نمای کلی مالی»
  // - برای لیست‌ها: همچنان جدول شیک و مرتب تولید می‌شود
  void (async () => {
    const outName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    const mappedRows = rows.map((r) => {
      const out: Record<string, any> = {};
      for (const c of columns) out[c.header] = safeText((r as any)[c.key as any]);
      return out;
    });

    try {
      const exceljsMod = await import('exceljs');
      const ExcelJS = (exceljsMod as any).default ?? exceljsMod;
      const wb = new ExcelJS.Workbook();
      wb.views = [{ rightToLeft: true }];

      const ws = wb.addWorksheet(sheetName || 'Overview', {
        views: [{ rightToLeft: true, state: 'frozen', ySplit: 9 }],
      });

      // --- رنگ‌ها (هماهنگ با تمپلت نمونه)
      const C = {
        teal: 'FF0F766E',
        slate100: 'FFE2E8F0',
        slate700: 'FF334155',
        gray900: 'FF111827',
        white: 'FFFFFFFF',
        slate50: 'FFF8FAFC',
        border: 'FFCBD5E1',
        textDark: 'FF0F172A',
      } as const;

      const fontName = 'Vazir';
      const colCount = Math.max(3, columns.length);
      const lastColLetter = String.fromCharCode('A'.charCodeAt(0) + colCount - 1);

      // --- Title
      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell('A1');
      titleCell.value = sheetName === 'Overview' ? 'نمای کلی مالی' : (sheetName || 'گزارش');
      titleCell.font = { name: fontName, size: 16, bold: true, color: { argb: C.white } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.teal } };
      titleCell.alignment = { horizontal: 'center', vertical: 'center' };
      ws.getRow(1).height = 28;

      // --- Subtitle
      ws.mergeCells(`A2:${lastColLetter}2`);
      const subCell = ws.getCell('A2');
      subCell.value = 'خروجی اکسل گزارش';
      subCell.font = { name: fontName, size: 11, bold: true, color: { argb: C.textDark } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.slate100 } };
      subCell.alignment = { horizontal: 'center', vertical: 'center' };
      ws.getRow(2).height = 20;

      // spacer row 3
      ws.getRow(3).height = 8;

      // --- Meta Header (A4:B4 مثل فایل نمونه)
      ws.mergeCells('A4:B4');
      const metaHead = ws.getCell('A4');
      metaHead.value = 'مشخصات';
      metaHead.font = { name: fontName, bold: true, color: { argb: C.white } };
      metaHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.slate700 } };
      metaHead.alignment = { horizontal: 'center', vertical: 'center' };
      ws.getRow(4).height = 20;

      // --- Meta rows: از / تا / تاریخ خروجی
      const nowFa = new Date().toLocaleString('fa-IR');
      // تلاش برای پیدا کردن from/to از خود rows (برای گزارش‌ها)؛ اگر نبود، —
      const findRange = (key: string) => {
        const r = (rows as any[]).find((x) => (x?.بخش === 'بازه' && x?.عنوان === key) || x?.عنوان === key);
        const v = r?.مقدار ?? r?.[key] ?? '';
        return String(v || '—');
      };
      const fromStr = findRange('از');
      const toStr = findRange('تا');

      const borderThin = {
        top: { style: 'thin', color: { argb: C.border } },
        left: { style: 'thin', color: { argb: C.border } },
        bottom: { style: 'thin', color: { argb: C.border } },
        right: { style: 'thin', color: { argb: C.border } },
      } as const;

      const setMeta = (row: number, label: string, value: string) => {
        const cL = ws.getCell(`A${row}`);
        const cV = ws.getCell(`B${row}`);
        cL.value = label;
        cV.value = value || '—';
        cL.font = { name: fontName, size: 11, bold: true };
        cV.font = { name: fontName, size: 11 };
        cL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.slate50 } };
        cV.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.white } };
        cL.alignment = { horizontal: 'right', vertical: 'center', wrapText: true };
        // 👇 مهم: تاریخ/عدد در RTL
        cV.alignment = { horizontal: 'left', vertical: 'center', wrapText: true, readingOrder: 1 };
        cL.border = borderThin;
        cV.border = borderThin;
        ws.getRow(row).height = 18;
      };

      setMeta(5, 'از', fromStr);
      setMeta(6, 'تا', toStr);
      setMeta(7, 'تاریخ خروجی', nowFa);
      ws.getRow(8).height = 8;

      // --- Table Header row 9
      const headerRow = ws.getRow(9);
      columns.forEach((c, idx) => {
        const colLetter = String.fromCharCode('A'.charCodeAt(0) + idx);
        const cell = ws.getCell(`${colLetter}9`);
        cell.value = c.header;
        cell.font = { name: fontName, size: 11, bold: true, color: { argb: C.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gray900 } };
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        cell.border = borderThin;
      });
      headerRow.height = 20;

      ws.autoFilter = {
        from: { row: 9, column: 1 },
        to: { row: 9, column: columns.length },
      };

      const startRow = 10;
      for (let i = 0; i < mappedRows.length; i++) {
        const r = mappedRows[i];
        const rowIdx = startRow + i;
        const row = ws.getRow(rowIdx);
        columns.forEach((c, colIdx) => {
          const colLetter = String.fromCharCode('A'.charCodeAt(0) + colIdx);
          const cell = ws.getCell(`${colLetter}${rowIdx}`);
          const v = (r as any)[c.header];
          cell.value = typeof v === 'string' && v.trim() === '' ? null : v;
          cell.font = { name: fontName, size: 11 };
          cell.border = borderThin;
          cell.alignment = {
            horizontal: colIdx === columns.length - 1 ? 'left' : 'right',
            vertical: 'center',
            wrapText: true,
            readingOrder: colIdx === columns.length - 1 ? 1 : 0,
          };
          const zebra = i % 2 === 0;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: zebra ? 'FFFFFFFF' : 'FFF1F5F9' },
          };
          if (typeof v === 'number') cell.numFmt = '#,##0';
        });
        row.height = 18;
      }

      // --- Column widths (auto)
      const widths: number[] = columns.map(() => 10);
      columns.forEach((c, idx) => (widths[idx] = Math.max(widths[idx], String(c.header).length + 4)));
      mappedRows.slice(0, 500).forEach((r) => {
        columns.forEach((c, idx) => {
          const v = (r as any)[c.header];
          const len = v == null ? 0 : String(v).length;
          widths[idx] = Math.min(60, Math.max(widths[idx], len + 4));
        });
      });
      widths.forEach((w, idx) => (ws.getColumn(idx + 1).width = w));

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    } catch {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(mappedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, outName);
    }
  })();
}

export function exportToPdfTable(opts: {
  filename: string;
  title?: string;
  head: string[];
  body: (string | number)[][];
}) {
  // jsPDF به‌صورت پیش‌فرض برای فارسی/عربی shaping و bidi کامل ندارد.
  // برای خروجی‌های لیستی، بهترین تجربه تولید PDF تصویری از HTML است.
  // نتیجه شیک، RTL و بدون مشکل “Encoding” است.

  void (async () => {
    const filename = opts.filename.endsWith('.pdf') ? opts.filename : `${opts.filename}.pdf`;

    // در محیط SSR یا تست، بی‌صدا خارج شو
    if (typeof document === 'undefined') return;

    const host = document.createElement('div');
    host.dir = 'rtl';
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '0';
    host.style.background = '#fff';
    host.style.padding = '16px';
    host.style.width = '794px'; // نزدیک A4 در 96dpi

    const style = document.createElement('style');
    style.innerHTML = `
      .xpdf-wrap{direction:rtl;font-family:inherit;color:#111;}
      .xpdf-title{font-size:18px;font-weight:800;margin:0 0 12px 0;text-align:right;}
      .xpdf-table{width:100%;border-collapse:collapse;table-layout:fixed;}
      .xpdf-table th,.xpdf-table td{border:1px solid #e5e7eb;padding:8px 10px;font-size:12px;vertical-align:top;word-break:break-word;}
      .xpdf-table th{background:#f3f4f6;font-weight:800;}
      .xpdf-meta{font-size:11px;color:#6b7280;text-align:right;margin-bottom:10px;}
    `;

    const wrap = document.createElement('div');
    wrap.className = 'xpdf-wrap';
    wrap.appendChild(style);
    if (opts.title) {
      const h = document.createElement('h1');
      h.className = 'xpdf-title';
      h.textContent = opts.title;
      wrap.appendChild(h);
    }

    const meta = document.createElement('div');
    meta.className = 'xpdf-meta';
    meta.textContent = `تاریخ خروجی: ${new Date().toLocaleString('fa-IR')}`;
    wrap.appendChild(meta);

    const table = document.createElement('table');
    table.className = 'xpdf-table';

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const col of opts.head) {
      const th = document.createElement('th');
      th.textContent = String(col ?? '');
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of opts.body) {
      const tr = document.createElement('tr');
      for (const cell of row) {
        const td = document.createElement('td');
        td.textContent = String(cell ?? '');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);

    host.appendChild(wrap);
    document.body.appendChild(host);

    try {
      // dynamic imports (سنگین)
      const [{ default: html2canvas }, jspdfMod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const jsPDF = (jspdfMod as any).default ?? (jspdfMod as any).jsPDF;

      const canvas = await html2canvas(wrap, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: wrap.scrollWidth,
        windowHeight: wrap.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;

      const imgData = canvas.toDataURL('image/png');
      const imgW = availW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const x = pageW - margin - imgW; // راست‌چین

      // چند صفحه‌ای: با offset منفی در y
      const pages = Math.max(1, Math.ceil(imgH / availH));
      for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();
        const y = margin - i * availH;
        pdf.addImage(imgData, 'PNG', x, y, imgW, imgH, undefined, 'FAST');
      }

      pdf.save(filename);
    } catch {
      // فallback: اگر به هر دلیلی HTML->Canvas شکست خورد، جدول متنی تولید کن.
      // (ممکن است فارسی شکل‌دهی کامل نداشته باشد، اما خروجی را می‌دهد.)
      try {
        const [jspdfMod, autoTableMod] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
        ]);
        const jsPDF = (jspdfMod as any).default ?? (jspdfMod as any).jsPDF;
        const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);

        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margin = 12;
        let y = margin;
        if (opts.title) {
          pdf.setFontSize(14);
          pdf.text(opts.title, 210 - margin, y, { align: 'right' });
          y += 6;
        }
        autoTable(pdf, {
          head: [opts.head],
          body: opts.body,
          startY: y,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', halign: 'right' },
          headStyles: { fillColor: [240, 242, 245], textColor: 20, fontStyle: 'bold' },
          theme: 'grid',
        });
        pdf.save(filename);
      } catch {
        // silent
      }
    } finally {
      try {
        document.body.removeChild(host);
      } catch {
        // ignore
      }
    }
  })();
}
