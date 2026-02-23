// pages/InvoiceDetail.tsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import moment from "jalali-moment";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import Notification from "../components/Notification";
import Modal from "../components/Modal";
import { NotificationMessage } from "../types";
import { QRCodeSVG } from "qrcode.react";
import { makeInvoiceQrValue } from "../utils/qr";

// Utility to print small thermal receipts; uses printArea helper
import { printArea } from '../utils/printArea';

/** CSS واحد برای چاپ و PDF — سایز A4، عرض امن 180mm، جدول fixed و ستون‌بندی درصدی */
const BASE_CSS = `
  @page{ size:A4 portrait; margin:12mm }
  *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html,body{
    margin:0; padding:0; background:#fff; color:var(--brand-text, #0f172a); direction:rtl;
    font-family:"Vazir",Tahoma,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;
    font-size:11px; line-height:1.7;
  }
  .no-print{ display:none !important; }

  .inv{
    box-sizing:border-box;
    width:100%;
    max-width:180mm;
    margin:0 auto;
  }

  /* Top brand bar */
  .inv__brandbar{
    height:10mm;
    border-radius:10px;
    background:
      linear-gradient(135deg,
        hsl(var(--primary, 170 70% 35%) / 0.95),
        hsl(var(--primary, 200 80% 45%) / 0.55)
      );
    position:relative;
    overflow:hidden;
  }
  .inv__brandbar:after{
    content:"";
    position:absolute; inset:-20mm;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.22), transparent 55%);
    transform: rotate(12deg);
  }

  .inv__header{
    margin-top:6mm;
    break-inside:avoid; page-break-inside:avoid;
  }
  .inv__header-inner{
    display:flex; align-items:flex-start; justify-content:space-between; gap:14px;
    padding:10px 0 0;
  }
  .inv__biz{
    display:flex; gap:10px; align-items:flex-start; min-width:0;
  }
  .inv__logo{
    width:54px; height:54px; border-radius:14px;
    border:1px solid rgba(15,23,42,.12);
    background:#fff;
    object-fit:contain;
  }
  .inv__biz-text{ min-width:0; }
  .inv__title{ font-size:18px; font-weight:900; margin:0; letter-spacing:-.2px; direction:rtl; unicode-bidi:plaintext; }
  /* Spacing that survives html2canvas/PDF capture */
  .inv__word{ display:inline-block; margin-left:4px; }
  .inv__addr{ color:#475569; font-size:10px; line-height:1.55; margin-top:3px; }
  .inv__meta{
    display:flex; flex-direction:column; gap:4px;
    background:#f8fafc;
    border:1px solid rgba(15,23,42,.10);
    border-radius:12px;
    padding:10px 12px;
    min-width:62mm;
  }
  .inv__meta-row{ display:flex; justify-content:space-between; gap:10px; }
  .inv__meta-k{ color:#64748b; }
  .inv__meta-v{ font-weight:800; color:#0f172a; }

  .inv__qr{
    width:92px; flex:0 0 auto;
    border:1px solid rgba(15,23,42,.10); border-radius:12px;
    padding:8px; background:#fff;
    display:flex; flex-direction:column; align-items:center; gap:4px;
  }
  .inv__qr-label{ font-size:9px; color:#64748b; }
  .inv__qr-text{ font-size:9px; color:#0f172a; font-weight:800; direction:ltr; unicode-bidi:bidi-override; }

  /* Table */
  .inv__table{
    width:100%; border-collapse:separate; border-spacing:0;
    table-layout:fixed;
    margin-top:10px;
    border:1px solid rgba(15,23,42,.10);
    border-radius:14px;
    overflow:hidden;
    font-variant-numeric: tabular-nums;
  }
  .inv__table thead th{
    background:linear-gradient(180deg, #f8fafc, #eef2ff);
    color:#0f172a;
    border-bottom:1px solid rgba(15,23,42,.10);
    padding:9px 8px;
    font-weight:800; text-align:right;
  }
  .inv__table tbody td{
    border-bottom:1px solid rgba(15,23,42,.08);
    padding:8px 8px; color:#0f172a; vertical-align:middle;
    overflow:hidden; text-overflow:ellipsis;
  }
  .inv__table tbody tr:nth-child(even){ background:#fbfdff; }
  .inv__table tbody tr:last-child td{ border-bottom:none; }

  .inv__table thead th:nth-child(1), .inv__table tbody td:nth-child(1){ width:38%; }
  .inv__table thead th:nth-child(2), .inv__table tbody td:nth-child(2){ width:10%; text-align:center; }
  .inv__table thead th:nth-child(3), .inv__table tbody td:nth-child(3){ width:18%; }
  .inv__table thead th:nth-child(4), .inv__table tbody td:nth-child(4){ width:14%; }
  .inv__table thead th:nth-child(5), .inv__table tbody td:nth-child(5){ width:20%; }

  /* Summary */
  .inv__summary{
    margin-top:10px;
    background:linear-gradient(180deg,#ffffff,#f8fafc);
    border:1px solid rgba(15,23,42,.10);
    border-radius:14px;
    padding:10px 12px;
    break-inside:avoid; page-break-inside:avoid;
  }
  .inv__srow{ display:flex; justify-content:space-between; padding:4px 0; color:#0f172a; }
  .inv__srow span:first-child{ color:#64748b; }
  .inv__srow--total{
    font-weight:900;
    border-top:1px dashed rgba(15,23,42,.20);
    margin-top:6px; padding-top:8px;
    font-size:13px;
  }

  .inv__notes{
    margin-top:8mm;
    background:#ffffff;
    border:1px solid rgba(15,23,42,.10);
    border-radius:14px;
    padding:10px 12px;
    break-inside:avoid; page-break-inside:avoid;
  }
  .inv__notes-title{ font-weight:800; color:#0f172a; margin-bottom:6px; }
  .inv__notes-body{ color:#334155; white-space:pre-wrap; line-height:1.75; }

  .inv__sigs{
    display:flex; justify-content:space-between; gap:16px;
    margin:18mm 0 0;
    font-size:11px;
    break-inside:avoid; page-break-inside:avoid;
  }
  .inv__sig{ width:45%; text-align:center; color:#0f172a; }
  .inv__sig-line{ margin-top:12mm; border-top:1px solid rgba(15,23,42,.65); }

  .inv__footer{
    margin-top:10mm;
    color:#64748b;
    font-size:9px;
    text-align:center;
  }

`;

const THERMAL_CSS = BASE_CSS
  .replace(/@page\{[^}]*\}/, '@page{ size:58mm auto; margin:0 }')
  + `
    /* overrides for 58mm receipt */
    #__print_root{ text-align: initial !important; padding-top:0 !important; }
    .inv{ max-width:none !important; width:58mm !important; margin:0 !important; padding:4mm 3mm !important; }
    .inv__header{ grid-template-columns: 1fr !important; gap:3mm !important; }
    .inv__qr{ display:none !important; }
    .inv__meta{ padding:3mm !important; }
    .inv__title{ font-size:12px !important; }
    .inv__table thead{ display:none !important; }
    .inv__table tbody tr{ display:block !important; padding:2mm 0 !important; border-bottom:1px dashed rgba(0,0,0,.18) !important; }
    .inv__table tbody td{ display:block !important; padding:0 !important; border:0 !important; }
    .inv__table tbody td:last-child{ padding-top:1mm !important; }
    .inv__totals{ padding:3mm !important; }
    .inv__totals-row{ font-size:10px !important; }
    .inv__totals-final{ font-size:11px !important; }
  `;

/** تاریخ: ISO یا جلالی ⇢ Date ⇢ jYYYY/jMM/jDD */
const parseToDate = (val?: string | null): Date | null => {
  if (!val) return null;
  if (val.includes("T") || val.includes("-")) {
    const t = Date.parse(val);
    return Number.isNaN(t) ? null : new Date(t);
  }
  const m = moment.from(val, "fa", "jYYYY/jMM/jDD");
  return m.isValid() ? m.toDate() : null;
};
const toJalali = (val?: string | null) => {
  const d = parseToDate(val);
  return d ? moment(d).locale("fa").format("jYYYY/jMM/jDD") : "—";
};
const fmt = (n?: number | null) => (n != null ? n.toLocaleString("fa-IR") : "۰");

const InvoiceDetail: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<NotificationMessage | null>(null);

  const [returns, setReturns] = useState<any[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [returnQtyMap, setReturnQtyMap] = useState<Record<string, number>>({});
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const invRef = useRef<HTMLDivElement>(null);
  const didAutoPrint = useRef(false);

  useEffect(() => {
    if (!orderId) { navigate("/invoices"); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/sales-orders/${orderId}`);
        const js = await res.json();
        if (!res.ok || !js?.success) throw new Error(js?.message || "خطا در دریافت فاکتور");
        setInvoice(js.data);
        // load returns for this invoice
        try {
          setLoadingReturns(true);
          const rRes = await apiFetch(`/api/sales-orders/${orderId}/returns`);
          const rJs = await rRes.json();
          if (rRes.ok && rJs?.success) setReturns(rJs.data || []);
        } catch {}
        finally { setLoadingReturns(false); }
      } catch (e:any) {
        setNote({ type:"error", text: e?.message || "مشکل در دریافت فاکتور" });
      } finally { setLoading(false); }
    })();
  }, [orderId, navigate]);


const refreshReturns = async () => {
  if (!orderId) return;
  try {
    setLoadingReturns(true);
    const rRes = await apiFetch(`/api/sales-orders/${orderId}/returns`);
    const rJs = await rRes.json();
    if (rRes.ok && rJs?.success) setReturns(rJs.data || []);
  } catch {}
  finally { setLoadingReturns(false); }
};

const handleCancelInvoice = async () => {
  if (!orderId || !token) return;
  const reason = window.prompt('دلیل ابطال فاکتور (اختیاری):') || '';
  const ok = window.confirm('آیا از ابطال این فاکتور مطمئن هستید؟');
  if (!ok) return;
  setIsCanceling(true);
  try {
    const res = await fetch(`/api/sales-orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    const js = await res.json().catch(() => ({}));
    if (!res.ok || !(js?.success ?? true)) throw new Error(js?.message || 'ابطال انجام نشد.');
    // refetch invoice
    const r = await apiFetch(`/api/sales-orders/${orderId}`);
    const j2 = await r.json();
    if (r.ok && j2?.success) setInvoice(j2.data);
    setNote({ type: 'success', text: 'فاکتور با موفقیت باطل شد.' });
  } catch (e: any) {
    setNote({ type: 'error', text: e?.message || 'ابطال انجام نشد.' });
  } finally {
    setIsCanceling(false);
  }
};

const openReturnModal = () => {
  // initialize quantities to 0
  const qty: Record<string, number> = {};
  const items: any[] = (invoice?.lineItems || []);
  for (const it of items) {
    qty[`${it.itemType || (it as any).type || 'inventory'}:${it.itemId || (it as any).id || it.id}`] = 0;
  }
  setReturnQtyMap(qty);
  setRefundAmount(Number(invoice?.financialSummary?.grandTotal || 0));
  setReturnReason('');
  setReturnNotes('');
  setShowReturnModal(true);
};

const submitReturn = async () => {
  if (!orderId || !token) return;
  const items: any[] = (invoice?.lineItems || []);
  const payloadItems: any[] = [];
  for (const it of items) {
    const itemType = (it as any).itemType || (it as any).type || 'inventory';
    const itemId = (it as any).itemId || (it as any).id;
    const key = `${itemType}:${itemId}`;
    const q = Number(returnQtyMap[key] || 0);
    if (q > 0) {
      payloadItems.push({
        itemType,
        itemId,
        quantity: q,
        description: it.description,
        unitPrice: Number(it.unitPrice || 0),
      });
    }
  }
  if (!payloadItems.length) {
    setNote({ type:'warning', text:'حداقل یک آیتم را برای مرجوعی انتخاب کنید.' });
    return;
  }

  setIsSubmittingReturn(true);
  try {
    const res = await fetch(`/api/sales-orders/${orderId}/returns`, {
      method:'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({
        type: 'refund',
        reason: returnReason,
        notes: returnNotes,
        refundAmount,
        items: payloadItems,
      }),
    });
    const js = await res.json().catch(() => ({}));
    if (!res.ok || !(js?.success ?? true)) throw new Error(js?.message || 'ثبت مرجوعی انجام نشد.');
    setShowReturnModal(false);
    setNote({ type:'success', text:'مرجوعی ثبت شد.' });
    await refreshReturns();
  } catch (e:any) {
    setNote({ type:'error', text: e?.message || 'ثبت مرجوعی انجام نشد.' });
  } finally {
    setIsSubmittingReturn(false);
  }
};


  /** چاپ با همان استایل */
  const handlePrint = () => {
    if (!invRef.current || !invoice) return;
    const html = `
      <html lang="fa" dir="rtl">
        <head><meta charSet="utf-8"/><title>چاپ فاکتور</title><style>${BASE_CSS}</style></head>
        <body><div class="inv">${invRef.current.innerHTML}</div>
        <script>window.onload=()=>setTimeout(()=>window.print(),60)</script></body>
      </html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (w){ w.document.open(); w.document.write(html); w.document.close(); }
  };

  // Print thermal (58mm) using printArea helper
  const handleThermalPrint = () => {
    // We'll clone the invoice HTML into a temporary div, hide elements that don't fit small width, then print.
    if (!invRef.current || !invoice) return;
    // Create a temporary wrapper containing the invoice content; we reuse printArea which opens a hidden iframe
    const clone = invRef.current.cloneNode(true) as HTMLElement;
    // Remove notes and large headers for thermal print to save space
    const notes = clone.querySelector('.inv__notes');
    if (notes) notes.remove();
    const brandbar = clone.querySelector('.inv__brandbar');
    if (brandbar) brandbar.remove();
    const header = clone.querySelector('.inv__header');
    // header can stay; but we can shrink fonts via extra CSS
    const tmp = document.createElement('div');
    tmp.style.display = 'none';
    tmp.id = 'thermal-print-temp';
    tmp.appendChild(clone);
    document.body.appendChild(tmp);
    // Use printArea with 58mm paper; pass extra CSS to scale down fonts if needed
    printArea('#thermal-print-temp', {
      paper: '58mm',
      title: `رسید ${invoice?.invoiceMetadata?.invoiceNumber || ''}`,
      extraCss: THERMAL_CSS,
    });
    // Clean up temp after slight delay (printArea cleans up iframe, but not the temp wrapper)
    setTimeout(() => {
      try { document.body.removeChild(tmp); } catch {}
    }, 1000);
  };

  // auto print from query params
  useEffect(() => {
    if (!invoice || didAutoPrint.current) return;
    const autoThermal = searchParams.get('autoThermal') === '1';
    const autoPrint = searchParams.get('autoPrint') === '1';
    if (!autoThermal && !autoPrint) return;
    didAutoPrint.current = true;
    setTimeout(() => {
      try {
        if (autoThermal) handleThermalPrint();
        else handlePrint();
      } catch {}
    }, 250);
  }, [invoice, searchParams]);

  /** PDF: کلون با همان CSS + فیتِ A4 بدون بریدگی */
  const handlePDF = async () => {
    if (!invRef.current || !invoice) return;
    try{
      // Ensure webfonts are loaded before we render to canvas (fixes Persian spacing/shaping issues in some browsers)
      // @ts-ignore
      if (document.fonts?.ready) { try { /* @ts-ignore */ await document.fonts.ready; } catch {} }

      const clone = invRef.current.cloneNode(true) as HTMLElement;
      const host = document.createElement("div");
      host.style.position="fixed"; host.style.left="-10000px"; host.style.top="0"; host.style.background="#fff";
      const style = document.createElement("style"); style.innerHTML = BASE_CSS;
      host.appendChild(style); host.appendChild(clone); document.body.appendChild(host);

      const canvas = await html2canvas(clone, {
        scale: 2, useCORS: true, backgroundColor:"#ffffff", logging:false,
        windowWidth: clone.scrollWidth, windowHeight: clone.scrollHeight,
        scrollX: 0, scrollY: 0
      });
      const pdf = new jsPDF({ orientation:"p", unit:"mm", format:"a4", compress:true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const availW = pageW - margin*2;
      const availH = pageH - margin*2;

      const ratio = Math.min(availW / canvas.width, availH / canvas.height);
      const wmm = canvas.width * ratio;
      const hmm = canvas.height * ratio;

      const x = pageW - margin - wmm;  // چسبیده به راست (RTL)
      const y = margin;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, wmm, hmm, undefined, "FAST");
      pdf.save(`faktor-${invoice?.invoiceMetadata?.invoiceNumber}.pdf`);
      document.body.removeChild(host);
    }catch{
      setNote({ type:"error", text:"خطا در تولید PDF" });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">در حال بارگذاری…</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">فاکتور یافت نشد.</div>;

  const b = invoice.businessDetails || {};
  const c = invoice.customerDetails || {};
  const m = invoice.invoiceMetadata || {};
  const f = invoice.financialSummary || {};
  const items: any[] = invoice.lineItems || [];
  const dateFa = toJalali(m.transactionDate);

  // توضیحات/یادداشت‌ها با اولویتِ چند فیلد رایج
  const notesText: string = String(
    invoice?.notes ??
    m?.notes ??
    invoice?.extraNotes ??
    invoice?.description ??
    ""
  ).trim();

  // Use an http(s) URL for best compatibility with phone camera scanners (e.g. iOS).
  // Also keep payload short to improve scan reliability on printed receipts.
  const qrValue = makeInvoiceQrValue(String(orderId ?? ""), m.invoiceNumber);

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <Notification message={note} onClose={() => setNote(null)} />

      <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="ثبت مرجوعی">
        <div className="space-y-3 text-sm">
          <div className="text-xs text-gray-500">تعداد مرجوعی را برای هر آیتم وارد کنید. (برای گوشی‌ها معمولاً ۱)</div>
          <div className="max-h-64 overflow-auto border rounded p-2 space-y-2">
            {(invoice?.lineItems || []).map((it: any, idx: number) => {
              const itemType = it.itemType || it.type || "inventory";
              const itemId = it.itemId || it.id;
              const key = `${itemType}:${itemId}`;
              const maxQty = Number(it.quantity || 1);
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="font-medium">{it.description}</div>
                    <div className="text-xs text-gray-500">حداکثر: {maxQty.toLocaleString("fa-IR")}</div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={maxQty}
                    value={returnQtyMap[key] ?? 0}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(maxQty, Number(e.target.value || 0)));
                      setReturnQtyMap((m) => ({ ...m, [key]: v }));
                    }}
                    className="w-20 border rounded px-2 py-1"
                  />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <label className="block text-xs mb-1">دلیل مرجوعی</label>
              <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="مثلاً: مشکل کالا / اشتباه در ثبت" />
            </div>
            <div>
              <label className="block text-xs mb-1">مبلغ برگشتی</label>
              <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(Number(e.target.value || 0))} className="w-full border rounded px-2 py-1" />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1">توضیحات</label>
            <textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} className="w-full border rounded px-2 py-1" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowReturnModal(false)} className="px-3 py-1.5 rounded bg-gray-200">انصراف</button>
            <button onClick={submitReturn} disabled={isSubmittingReturn} className="px-3 py-1.5 rounded bg-amber-600 text-white disabled:opacity-60">
              {isSubmittingReturn ? "در حال ثبت…" : "ثبت مرجوعی"}
            </button>
          </div>
        </div>
      </Modal>
      <div className="sticky top-[72px] z-10 rounded-2xl border border-primary/10 bg-white/80 dark:bg-black/30 backdrop-blur px-3 py-3 flex flex-wrap gap-2 items-center shadow-sm">
        <button
          onClick={() => navigate("/invoices")}
          className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200/70 text-gray-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-100 text-sm font-semibold ring-1 ring-black/5 dark:ring-white/10"
        >
          برگشت
        </button>

        <button
          onClick={openReturnModal}
          disabled={invoice?.invoiceMetadata?.status === "canceled"}
          className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-sm font-semibold disabled:opacity-60 shadow-sm"
        >
          ثبت مرجوعی
        </button>

        <button
          onClick={handleCancelInvoice}
          disabled={isCanceling || invoice?.invoiceMetadata?.status === "canceled"}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-sm font-semibold disabled:opacity-60 shadow-sm"
        >
          {invoice?.invoiceMetadata?.status === "canceled" ? "باطل شده" : (isCanceling ? "در حال ابطال…" : "ابطال فاکتور")}
        </button>

        <div className="flex-1" />

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 text-sm font-semibold shadow-sm"
        >
          چاپ
        </button>
        <button
          onClick={handlePDF}
          className="px-4 py-2 rounded-xl bg-primary/90 text-white hover:opacity-90 text-sm font-semibold shadow-sm"
        >
          PDF
        </button>
        <button
          onClick={handleThermalPrint}
          className="px-4 py-2 rounded-xl bg-primary/80 text-white hover:opacity-90 text-sm font-semibold shadow-sm"
        >
          چاپ ۵۸ میلیمتری
        </button>
      </div>

      <style>{BASE_CSS}</style>

      <div className="inv" ref={invRef}>
        
<div className="inv__brandbar" />
        <div className="inv__header">
          <div className="inv__header-inner">
            <div className="inv__biz">
              {b.logoUrl ? (
                <img src={b.logoUrl} alt="logo" className="inv__logo" />
              ) : null}
              <div className="inv__biz-text">
                <div className="inv__title" aria-label="business-name">
                  {String(b.name || "")
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((w: string, i: number) => (
                      <span key={`${w}-${i}`} className="inv__word">{w}</span>
                    ))}
                </div>
                <div className="inv__addr">
                  {b.addressLine1}{b.addressLine2 ? (<><br/>{b.addressLine2}</>) : null}
                  <br/>{b.cityStateZip}
                  {b.phone ? (<><br/>تلفن: {b.phone}</>) : null}
                  {b.email ? (<><br/>ایمیل: {b.email}</>) : null}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
              <div className="inv__meta">
                <div className="inv__meta-row"><span className="inv__meta-k">شماره فاکتور</span><span className="inv__meta-v">{m.invoiceNumber}</span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">تاریخ</span><span className="inv__meta-v">{dateFa}</span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">مشتری</span><span className="inv__meta-v">{c?.fullName ?? "مهمان"}</span></div>
              </div>

              <div className="inv__qr" aria-label="invoice-qr">
                <div className="inv__qr-label">کد پیگیری</div>
                <QRCodeSVG value={qrValue} size={80} level="M" includeMargin />
                <div className="inv__qr-text">{String(m.invoiceNumber ?? "")}</div>
              </div>
            </div>
          </div>
        </div>

        <table className="inv__table">
          <thead>
            <tr>
              <th>شرح کالا/خدمات</th>
              <th>تعداد</th>
              <th>قیمت واحد</th>
              <th>تخفیف</th>
              <th>مبلغ کل</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it:any, idx:number) => (
              <tr key={it.id ?? `row-${idx}`}>
                <td title={it.description}>{it.description}</td>
                <td style={{textAlign:"center"}}>{fmt(it.quantity)}</td>
                <td>{fmt(it.unitPrice)}</td>
                <td>{fmt(it.discountPerItem)}</td>
                <td>{fmt(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv__summary">
          <div className="inv__srow"><span>جمع کل موارد:</span><span>{fmt(f.subtotal)} تومان</span></div>
          {(f.itemsDiscount>0 || f.globalDiscount>0) && (
            <div className="inv__srow"><span>مجموع تخفیف‌ها:</span><span>({fmt(f.itemsDiscount + f.globalDiscount)}) تومان</span></div>
          )}
          <div className="inv__srow"><span>مبلغ پس از تخفیف:</span><span>{fmt(f.taxableAmount)} تومان</span></div>
          {f.taxAmount>0 && (
            <div className="inv__srow"><span>مالیات ({fmt(f.taxPercentage)}٪):</span><span>{fmt(f.taxAmount)} تومان</span></div>
          )}
          <div className="inv__srow inv__srow--total"><span>مبلغ نهایی:</span><span>{fmt(f.grandTotal)} تومان</span></div>
        
        </div>

        <div className="mt-6 no-print rounded-2xl border border-primary/10 bg-white dark:bg-black/20 p-4 text-sm shadow-sm">
  <div className="font-bold mb-2 flex items-center justify-between">
    <span>مرجوعی‌ها</span>
    {loadingReturns ? <span className="text-xs text-gray-500">در حال بارگذاری…</span> : null}
  </div>
  {(!returns || returns.length === 0) ? (
    <div className="text-gray-500 text-xs">مرجوعی ثبت نشده است.</div>
  ) : (
    <div className="space-y-2">
      {returns.map((r: any) => (
        <div key={r.id} className="border rounded p-2">
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="font-medium">کد مرجوعی: {String(r.id)}</div>
            <div className="text-xs text-gray-500">{String(r.createdAt || '')}</div>
          </div>
          <div className="text-xs text-gray-600">مبلغ برگشتی: {Number(r.refundAmount || 0).toLocaleString('fa-IR')} تومان</div>
          {r.reason ? <div className="text-xs text-gray-600">دلیل: {r.reason}</div> : null}
          {Array.isArray(r.items) && r.items.length ? (
            <ul className="mt-2 text-xs list-disc pr-5 space-y-1">
              {r.items.map((it: any) => (
                <li key={it.id}>{it.description} × {Number(it.quantity || 0).toLocaleString('fa-IR')}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  )}
</div>

        {notesText && (
          <div className="inv__notes">
            <div className="inv__notes-title">توضیحات</div>
            <div className="inv__notes-body">{notesText}</div>
          </div>
        )}

        <div className="inv__sigs">
          <div className="inv__sig"><div className="inv__sig-line" />فروشنده</div>
          <div className="inv__sig"><div className="inv__sig-line" />خریدار</div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
