// src/pages/InstallmentSaleDetailPage.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import moment from 'jalali-moment';

import {
  InstallmentSaleDetailData,
  InstallmentCheckInfo,
  NotificationMessage,
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentPaymentRecord,
} from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { formatIsoToShamsi } from '../utils/dateUtils';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import PriceInput from '../components/PriceInput';
import toast from 'react-hot-toast';
import SmsAutoSendSheet from '../components/SmsAutoSendSheet';

const CHECK_STATUSES_OPTIONS: CheckStatus[] = [
  'در جریان وصول',
  'وصول شده',
  'برگشت خورده',
  'نزد مشتری',
  'باطل شده',
];

const InstallmentSaleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, authReady } = useAuth();

  const [saleData, setSaleData] = useState<InstallmentSaleDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Auto-SMS UX (final payment)
  const [smsSheetOpen, setSmsSheetOpen] = useState(false);
  const [smsSheetStatus, setSmsSheetStatus] = useState<'sent' | 'failed' | 'not_sent'>('not_sent');
  const [smsSheetMessage, setSmsSheetMessage] = useState<string>('');
  const [smsResending, setSmsResending] = useState(false);

  // ویرایش وضعیت چک
  const [isEditCheckModalOpen, setIsEditCheckModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<InstallmentCheckInfo | null>(null);

  // ثبت پرداخت جزئی
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<InstallmentPaymentRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string | number>('');
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // ویرایش/حذف تراکنش جزئی
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editTxAmount, setEditTxAmount] = useState<string | number>('');
  const [editTxDate, setEditTxDate] = useState<Date | null>(new Date());
  const [editTxNotes, setEditTxNotes] = useState<string>('');

  // ---------- helpers ----------
  // هر نوع ورودی عددی (رشته/کامادار/…) را به number تمیز تبدیل می‌کند
  const toNumber = (val: unknown): number =>
    typeof val === 'number' ? val : Number(String(val ?? '0').replace(/[^\d.-]/g, '')) || 0;

  // قیمت را همیشه به شکل عدد صحیح نمایش می‌دهد (صفر به‌جای -)
  const formatPrice = (price: number | string | undefined | null) => {
    const n = toNumber(price);
    return n.toLocaleString('fa-IR') + ' تومان';
  };

  // تاریخ هر فرمتی را به شمسی کوتاه تبدیل می‌کند
  const toShamsiSafe = (d: string | Date | undefined | null) => {
    if (!d) return '—';
    const m = moment(d as any, ['YYYY-MM-DD', 'YYYY/MM/DD', 'jYYYY/jMM/jDD', moment.ISO_8601], true);
    return (m.isValid() ? m : moment(d)).locale('fa').format('jYYYY/MM/DD');
  };

  // مجموع پرداختی واقعی هر قسط
  const getTotalPaid = (p?: InstallmentPaymentRecord | null): number => {
    if (!p) return 0;
    if (typeof (p as any).computedPaid === 'number') return (p as any).computedPaid;
    if (typeof (p as any).totalPaid === 'number') return (p as any).totalPaid;
    const txs: any[] = (p as any).transactions || [];
    return txs.reduce((sum, t) => sum + toNumber(t?.amount_paid ?? t?.amountPaid), 0);
  };

  const overallBadge = (status: string) => {
    if (status === 'تکمیل شده') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-600 text-white">
        <i className="fa-solid fa-circle-check" /> تکمیل شده
      </span>
    );
    if (status === 'معوق') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white">
        <i className="fa-solid fa-triangle-exclamation" /> معوق
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
        <i className="fa-solid fa-rotate" /> در حال پرداخت
      </span>
    );
  };

  const getPaymentStatusColor = (status: InstallmentPaymentStatus, dueDate?: string): string => {
    if (status === 'پرداخت شده') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'پرداخت جزئی') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    if (status === 'پرداخت نشده' && dueDate && moment(dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day'))
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
  };

  const getCheckStatusColor = (status: CheckStatus): string => {
    if (status === 'وصول شده') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'برگشت خورده' || status === 'باطل شده')
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (status === 'نزد مشتری') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
  };

  const isOverdue = (due: string, status: InstallmentPaymentStatus) =>
    moment(due, 'jYYYY/jMM/jDD').isBefore(moment(), 'day') && status !== 'پرداخت شده';

  // ---------- data ----------
  const fetchInstallmentSaleDetail = async () => {
    if (!id) {
      navigate('/installment-sales');
      return;
    }
    if (!token) {
      setIsLoading(false);
      setNotification({ type: 'error', text: 'برای دسترسی به این بخش، ابتدا باید وارد سیستم شوید.' });
      return;
    }
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await apiFetch(`/api/installment-sales/${id}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت جزئیات فروش اقساطی');
      setSaleData(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
      if (error.message.includes('یافت نشد')) setTimeout(() => navigate('/installment-sales'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authReady && token) fetchInstallmentSaleDetail();
    else if (authReady && !token) setIsLoading(false);
  }, [id, token, authReady]);

  // Deep-link actions (Global Search / Quick Actions)
  // /installment-sales/:id?pay=next  -> open next unpaid installment payment modal
  useEffect(() => {
    if (!saleData) return;
    const pay = (searchParams.get('pay') || '').toLowerCase();
    if (pay !== 'next') return;

    const next = [...(saleData.payments || [])]
      .filter((p) => p && p.status !== 'پرداخت شده')
      .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))[0];

    if (next) {
      // defer to next tick so modal state doesn't fight initial render
      setTimeout(() => openPaymentModal(next), 0);
    }
    // پاکسازی پارامتر تا در رفرش/ری‌رندر دوباره باز نشود
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete('pay');
      return p;
    }, { replace: true });
  }, [saleData]);
  // ---------- actions ----------
  const openPaymentModal = (payment: InstallmentPaymentRecord) => {
    setCurrentPayment(payment);
    const remaining = Math.max(0, toNumber(payment.amountDue) - getTotalPaid(payment));
    setPaymentAmount(remaining > 0 ? remaining : '');
    setPaymentDate(new Date());
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const resendFinalPaymentSms = async () => {
    if (!saleData?.id) return;
    setSmsResending(true);
    try {
      const res = await apiFetch('/api/sms/trigger-event', {
        method: 'POST',
        body: JSON.stringify({ targetId: saleData.id, eventType: 'INSTALLMENT_COMPLETED' }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || !js?.success) {
        throw new Error(js?.message || 'خطا در ارسال پیامک');
      }
      setSmsSheetStatus('sent');
      setSmsSheetMessage('');
      toast.success('پیامک تسویه کامل ارسال شد.');
    } catch (err: any) {
      setSmsSheetStatus('failed');
      toast.error(err?.message || 'ارسال پیامک ناموفق بود');
    } finally {
      setSmsResending(false);
    }
  };

  const handleSubmitPartialPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPayment) return;
    const amount = toNumber(paymentAmount);
    if (amount <= 0) {
      setNotification({ type: 'error', text: 'مبلغ پرداخت باید یک عدد مثبت باشد.' });
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const payload = {
        amount,
        date: moment(paymentDate).locale('fa').format('jYYYY/jMM/jDD'),
        notes: paymentNotes,
      };
      const res = await apiFetch(`/api/installment-sales/payment/${currentPayment.id}/transaction`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || !js?.success) {
        throw new Error(js?.message || 'خطا در ثبت پرداخت');
      }

      // Final-payment UX: toast + mobile bottom sheet + resend action
      if (js?.finalizedNow) {
        const status: 'sent' | 'failed' | 'not_sent' = js?.smsAttempted
          ? (js?.smsSuccess ? 'sent' : 'failed')
          : 'not_sent';

        setSmsSheetStatus(status);
        setSmsSheetMessage(js?.smsError ? String(js.smsError) : '');

        toast.custom(
          (t) => (
            <div className="w-full max-w-md rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">تسویه کامل اقساط</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {status === 'sent'
                      ? 'پیامک تایید تسویه ارسال شد.'
                      : status === 'failed'
                      ? 'ارسال پیامک ناموفق بود.'
                      : 'پیامک ارسال نشد (تنظیمات یا پترن ناقص است).'}
                  </div>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="dismiss"
                >
                  ✕
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={async () => {
                    toast.dismiss(t.id);
                    await resendFinalPaymentSms();
                  }}
                  className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  ارسال مجدد
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    setSmsSheetOpen(true);
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  جزئیات
                </button>
              </div>
            </div>
          ),
          { duration: 8000 }
        );

        // On mobile, also pop the bottom sheet for a "premium" feel
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
          setSmsSheetOpen(true);
        }
      }

      setNotification({ type: 'success', text: js?.message || 'پرداخت با موفقیت ثبت شد.' });
      setIsPaymentModalOpen(false);
      fetchInstallmentSaleDetail();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openEditCheckModal = (check: InstallmentCheckInfo) => {
    setEditingCheck({ ...check });
    setIsEditCheckModalOpen(true);
  };

  const handleEditCheckChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (!editingCheck) return;
    setEditingCheck(prev => (prev ? { ...prev, status: e.target.value as CheckStatus } : null));
  };

  const handleSaveCheckChanges = async () => {
    if (!editingCheck || !editingCheck.id) return;
    setNotification({ type: 'info', text: 'در حال ذخیره تغییرات چک...' });
    try {
      await apiFetch(`/api/installment-sales/check/${editingCheck.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: editingCheck.status }),
      });
      setNotification({ type: 'success', text: `وضعیت چک شماره ${editingCheck.checkNumber} به‌روز شد.` });
      setIsEditCheckModalOpen(false);
      setEditingCheck(null);
      fetchInstallmentSaleDetail();
    } catch (error: any) {
      setNotification({ type: 'error', text: `خطا در به‌روزرسانی چک: ${error.message}` });
    }
  };

  // ویرایش/حذف تراکنش
  const openEditTx = (tx: any) => {
    setEditingTx(tx);
    setEditTxAmount(tx?.amount_paid || '');
    setEditTxDate(tx?.payment_date ? moment(tx.payment_date, ['YYYY-MM-DD', 'YYYY/MM/DD']).toDate() : new Date());
    setEditTxNotes(tx?.notes || '');
    setIsEditTxModalOpen(true);
  };

  const handleSaveTx = async () => {
    if (!editingTx) return;
    try {
      const payload = {
        amount: toNumber(editTxAmount),
        date: moment(editTxDate).locale('fa').format('jYYYY/jMM/jDD'),
        notes: editTxNotes,
      };
      await apiFetch(`/api/installment-sales/payment/transaction/${editingTx.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setNotification({ type: 'success', text: 'پرداخت ویرایش شد.' });
      setIsEditTxModalOpen(false);
      setEditingTx(null);
      fetchInstallmentSaleDetail();
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  const handleDeleteTx = async (tx: any) => {
    if (!confirm('حذف این پرداخت؟ این عمل قابل بازگشت نیست.')) return;
    try {
      await apiFetch(`/api/installment-sales/payment/transaction/${tx.id}`, { method: 'DELETE' });
      setNotification({ type: 'success', text: 'پرداخت حذف شد.' });
      fetchInstallmentSaleDetail();
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  // ---------- render ----------
  if (isLoading)
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-300">
        <i className="fas fa-spinner fa-spin text-2xl mr-2" /> در حال بارگذاری...
      </div>
    );
  if (!token && authReady) return <div className="p-6 text-center text-orange-500">برای مشاهده این صفحه، ابتدا وارد شوید.</div>;
  if (!saleData) return <div className="p-6 text-center text-red-500">اطلاعات فروش اقساطی یافت نشد.</div>;

  return (
    <div className="space-y-6 text-right max-w-7xl mx-auto px-4 pb-10" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <SmsAutoSendSheet
        open={smsSheetOpen}
        title="تسویه کامل اقساط"
        description={smsSheetMessage ? `جزئیات: ${smsSheetMessage}` : undefined}
        status={smsSheetStatus}
        primaryActionLabel="ارسال مجدد پیامک"
        primaryActionLoading={smsResending}
        onPrimaryAction={resendFinalPaymentSms}
        onClose={() => setSmsSheetOpen(false)}
      />

      {/* Premium header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-xl">
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background:
              'radial-gradient(900px 280px at 10% 0%, rgba(124,58,237,.22), transparent 60%), radial-gradient(900px 280px at 90% 10%, rgba(16,185,129,.18), transparent 55%), radial-gradient(800px 220px at 50% 120%, rgba(59,130,246,.12), transparent 55%)',
          }}
        />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary-700 dark:text-primary-200 flex items-center justify-center">
                <i className="fa-solid fa-file-invoice-dollar text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-text">فروش اقساطی</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-muted">
                    Installment sale
                  </span>
                  <span className="text-sm text-muted">(شناسه: {saleData.id.toLocaleString('fa-IR')})</span>
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {overallBadge(saleData.overallStatus)}
                  <div className="text-xs text-muted">
                    مشتری / Customer:{' '}
                    <Link to={`/customers/${saleData.customerId}`} className="text-primary-700 dark:text-primary-300 hover:underline font-semibold">
                      {saleData.customerFullName}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Link
                to={`/installment-sales/${saleData.id}?pay=next`}
                className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm inline-flex items-center gap-2 shadow-sm"
                title="ثبت قسط بعدی"
              >
                <i className="fa-solid fa-hand-holding-dollar" />
                <span>پرداخت سریع</span>
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="h-10 px-3 rounded-xl bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 hover:bg-white dark:hover:bg-black/40 text-text text-sm inline-flex items-center gap-2"
                title="بازگشت"
              >
                <i className="fa-solid fa-arrow-right" />
                بازگشت
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {(['overview','installments','ledger','checks'] as const).map((k) => {
              const isActive = (searchParams.get('tab') || 'overview') === k;
              const labelFa =
                k === 'overview' ? 'خلاصه' : k === 'installments' ? 'اقساط' : k === 'ledger' ? 'پرداخت‌ها' : 'چک‌ها';
              const labelEn =
                k === 'overview' ? 'Overview' : k === 'installments' ? 'Installments' : k === 'ledger' ? 'Payments' : 'Checks';
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('tab', k);
                    return p;
                  })}
                  className={[
                    'px-3 py-2 rounded-xl text-sm border transition inline-flex items-center gap-2',
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                      : 'bg-white/70 dark:bg-black/30 border-black/10 dark:border-white/10 text-text hover:bg-white dark:hover:bg-black/40',
                  ].join(' ')}
                >
                  <span className="font-semibold">{labelFa}</span>
                  <span className="text-[11px] opacity-70">{labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      {(() => {
        const tab = (searchParams.get('tab') || 'overview') as 'overview' | 'installments' | 'ledger' | 'checks';

        // Derived metrics
        const total = toNumber(saleData.totalInstallmentPrice);
        const remaining = toNumber(saleData.remainingAmount);
        const collected = Math.max(0, total - remaining);

        const payments = saleData.payments || [];
        const overdueCount = payments.filter((p) => isOverdue(p.dueDate, p.status)).length;
        const dueIn7 = payments.filter((p) => p.status !== 'پرداخت شده' && moment(p.dueDate).diff(moment(), 'days') >= 0 && moment(p.dueDate).diff(moment(), 'days') <= 7).length;

        const kpi = [
          { fa: 'مبلغ کل اقساط', en: 'Total installments', icon: 'fa-solid fa-sack-dollar', val: formatPrice(total) },
          { fa: 'وصول‌شده', en: 'Collected', icon: 'fa-solid fa-circle-check', val: formatPrice(collected) },
          { fa: 'باقی‌مانده', en: 'Outstanding', icon: 'fa-solid fa-hourglass-half', val: formatPrice(remaining) },
          { fa: 'معوق', en: 'Overdue', icon: 'fa-solid fa-triangle-exclamation', val: overdueCount.toLocaleString('fa-IR') },
          { fa: '۷ روز آینده', en: 'Due in 7 days', icon: 'fa-regular fa-calendar-days', val: dueIn7.toLocaleString('fa-IR') },
          { fa: 'پیش‌پرداخت', en: 'Down payment', icon: 'fa-solid fa-coins', val: formatPrice(saleData.downPayment) },
        ];

        const Tile = ({ fa, en, icon, val }: any) => (
          <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-sm p-4">
            <div className="absolute inset-0 pointer-events-none opacity-60"
              style={{ background: 'radial-gradient(600px 200px at 15% 0%, rgba(124,58,237,.18), transparent 60%)' }} />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text">{fa}</div>
                <div className="text-[11px] text-muted mt-0.5">{en}</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary-700 dark:text-primary-200 flex items-center justify-center">
                <i className={icon} />
              </div>
            </div>
            <div className="relative mt-2 text-lg font-black text-text">{val}</div>
          </div>
        );

        if (tab === 'overview') {
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {kpi.map((x: any) => <Tile key={x.en} {...x} />)}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 app-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-text">جزئیات فروش</div>
                      <div className="text-xs text-muted mt-0.5">Sale details</div>
                    </div>
                    {saleData.nextDueDate && saleData.overallStatus !== 'تکمیل شده' ? (
                      <div className="text-xs text-muted">
                        قسط بعدی / Next due:{' '}
                        <span className="font-semibold text-text">{formatIsoToShamsi(saleData.nextDueDate)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">قیمت فروش نهایی / Final price</span>
                      <span className="font-semibold">{formatPrice(saleData.actualSalePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">تعداد اقساط / Installments</span>
                      <span className="font-semibold">{saleData.numberOfInstallments.toLocaleString('fa-IR')} ماه</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">مبلغ هر قسط / Per installment</span>
                      <span className="font-semibold">{formatPrice(saleData.installmentAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">شروع اقساط / Start date</span>
                      <span className="font-semibold">{formatIsoToShamsi(saleData.installmentsStartDate)}</span>
                    </div>
                    {saleData.notes ? (
                      <div className="md:col-span-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-3">
                        <div className="text-sm font-semibold text-text">یادداشت‌ها</div>
                        <div className="text-[11px] text-muted">Notes</div>
                        <div className="mt-1 text-sm text-text">{saleData.notes}</div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="app-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-text">اقلام</div>
                      <div className="text-xs text-muted mt-0.5">Items</div>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary-700 dark:text-primary-200 flex items-center justify-center">
                      <i className="fa-solid fa-boxes-stacked" />
                    </div>
                  </div>

                  {!saleData.items || saleData.items.length === 0 ? (
                    <div className="mt-3 text-sm text-muted">اقلامی برای نمایش وجود ندارد.</div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {saleData.items.slice(0, 6).map((it: any, idx: number) => {
                        const typeLabel = it.itemType === 'inventory' ? 'لوازم' : it.itemType === 'service' ? 'خدمت' : 'موبایل';
                        const typeEn = it.itemType === 'inventory' ? 'Accessory' : it.itemType === 'service' ? 'Service' : 'Phone';
                        return (
                          <div key={idx} className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-text">
                                {typeLabel} <span className="text-[11px] opacity-70">{typeEn}</span>
                              </div>
                              <div className="text-sm font-black">{formatPrice(Number(it.totalPrice || 0))}</div>
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              {it.description || '—'} • qty {(Number(it.quantity || 0)).toLocaleString('fa-IR')}
                            </div>
                          </div>
                        );
                      })}
                      {saleData.items.length > 6 ? (
                        <div className="text-xs text-muted">+ {String(saleData.items.length - 6).toLocaleString('fa-IR')} مورد دیگر…</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        if (tab === 'checks') {
          return (
            <div className="app-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-text">چک‌های دریافتی</div>
                  <div className="text-xs text-muted mt-0.5">Received checks</div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary-700 dark:text-primary-200 flex items-center justify-center">
                  <i className="fa-solid fa-money-check-dollar" />
                </div>
              </div>

              {saleData.checks.length === 0 ? (
                <div className="mt-3 text-sm text-muted">چکی برای این فروش ثبت نشده است.</div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {saleData.checks.map((check) => (
                    <div key={check.id} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text">
                            چک شماره {check.checkNumber}
                            <span className="block text-[11px] text-muted">Check #{check.checkNumber}</span>
                          </div>
                          <div className="mt-2 text-xs text-muted">
                            بانک / Bank: <span className="font-semibold text-text">{check.bankName}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getCheckStatusColor(check.status)}`}>
                          {check.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-2">
                          <div className="text-xs text-muted">مبلغ</div>
                          <div className="text-[11px] text-muted">Amount</div>
                          <div className="mt-0.5 font-black">{formatPrice(check.amount)}</div>
                        </div>
                        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-2">
                          <div className="text-xs text-muted">سررسید</div>
                          <div className="text-[11px] text-muted">Due</div>
                          <div className="mt-0.5 font-black">{formatIsoToShamsi(check.dueDate)}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => openEditCheckModal(check)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm"
                        >
                          <i className="fa-solid fa-pen" />
                          ویرایش <span className="text-[11px] opacity-80">Edit</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (tab === 'ledger') {
          // Flatten transactions
          const txs: any[] = [];
          for (const p of payments) {
            for (const tx of (p as any).transactions || []) {
              txs.push({
                ...tx,
                installmentNumber: p.installmentNumber,
                paymentId: p.id,
                dueDate: p.dueDate,
              });
            }
          }
          txs.sort((a, b) => String(b.payment_date || b.paymentDate || '').localeCompare(String(a.payment_date || a.paymentDate || '')));

          // group by date
          const groups: Record<string, any[]> = {};
          for (const t of txs) {
            const d = toShamsiSafe(t.payment_date || t.paymentDate);
            groups[d] = groups[d] || [];
            groups[d].push(t);
          }
          const dates = Object.keys(groups).sort((a, b) => a.localeCompare(b));

          return (
            <div className="space-y-4">
              <div className="app-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-text">پرداخت‌ها</div>
                    <div className="text-xs text-muted mt-0.5">Payments ledger</div>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary-700 dark:text-primary-200 flex items-center justify-center">
                    <i className="fa-solid fa-receipt" />
                  </div>
                </div>

                {txs.length === 0 ? (
                  <div className="mt-3 text-sm text-muted">هنوز پرداختی ثبت نشده است.</div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {dates.map((d) => {
                      const items = groups[d];
                      const dayTotal = items.reduce((sum, t) => sum + toNumber(t.amount_paid ?? t.amountPaid), 0);
                      return (
                        <div key={d} className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                          <div className="px-4 py-3 bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-between">
                            <div className="text-sm font-semibold text-text">{d}</div>
                            <div className="text-sm font-black text-text">{formatPrice(dayTotal)}</div>
                          </div>
                          <div className="divide-y divide-black/10 dark:divide-white/10">
                            {items.map((t) => (
                              <div key={t.id} className="px-4 py-3 flex items-start justify-between gap-3 bg-white/70 dark:bg-black/20">
                                <div>
                                  <div className="text-sm font-semibold text-text">
                                    قسط {String(t.installmentNumber).toLocaleString('fa-IR')}
                                    <span className="text-[11px] text-muted mr-2">Installment #{t.installmentNumber}</span>
                                  </div>
                                  <div className="text-xs text-muted mt-0.5">
                                    سررسید / Due: <span className="text-text font-semibold">{formatIsoToShamsi(t.dueDate)}</span>
                                    {t.notes ? <span className="mr-2"> • {t.notes}</span> : null}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-black">{formatPrice(t.amount_paid ?? t.amountPaid)}</div>
                                  <button
                                    className="h-9 w-9 rounded-xl bg-amber-500/90 text-white hover:bg-amber-600"
                                    onClick={() => openEditTx(t)}
                                    title="ویرایش"
                                  >
                                    <i className="fa-solid fa-pen" />
                                  </button>
                                  <button
                                    className="h-9 w-9 rounded-xl bg-rose-600/90 text-white hover:bg-rose-700"
                                    onClick={() => handleDeleteTx(t)}
                                    title="حذف"
                                  >
                                    <i className="fa-solid fa-trash" />
                                  </button>
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
            </div>
          );
        }

        // installments tab (default)
        return (
          <div className="app-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-base font-bold text-text">جدول اقساط</div>
                <div className="text-xs text-muted mt-0.5">Installments schedule</div>
              </div>
              <div className="text-xs text-muted">
                مجموع اقساط / Total: <span className="font-semibold text-text">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
              <table className="min-w-full divide-y divide-black/10 dark:divide-white/10 text-sm">
                <thead className="bg-black/[0.03] dark:bg-white/[0.04]">
                  <tr>
                    <th className="px-3 py-3 text-right font-semibold">#</th>
                    <th className="px-3 py-3 text-right font-semibold">تاریخ سررسید</th>
                    <th className="px-3 py-3 text-right font-semibold">مبلغ قسط</th>
                    <th className="px-3 py-3 text-right font-semibold">پرداختی / وضعیت</th>
                    <th className="px-3 py-3 text-center font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/10">
                  {payments.map((p) => {
                    const isExp = expanded.has(p.id);
                    const paid = getTotalPaid(p);
                    const remain = Math.max(0, toNumber(p.amountDue) - paid);
                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          className={[
                            'transition-colors',
                            isOverdue(p.dueDate, p.status) ? 'bg-rose-50 dark:bg-rose-900/10' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
                          ].join(' ')}
                        >
                          <td className="px-3 py-3 font-semibold">{p.installmentNumber.toLocaleString('fa-IR')}</td>
                          <td className="px-3 py-3">{formatIsoToShamsi(p.dueDate)}</td>
                          <td className="px-3 py-3 font-semibold">{formatPrice(p.amountDue)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col">
                                <span className={`self-start ${getPaymentStatusColor(p.status, p.dueDate)} px-2 py-0.5 rounded-full text-xs font-semibold`}>
                                  {p.status === 'پرداخت نشده' && isOverdue(p.dueDate, p.status) ? 'معوق' : p.status}
                                </span>
                                <div className="mt-1 text-xs text-muted">
                                  پرداختی / Paid: <span className="font-semibold text-text">{formatPrice(paid)}</span>
                                  {' '}• مانده / Remaining: <span className="font-semibold text-text">{formatPrice(remain)}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const s = new Set(expanded);
                                  s.has(p.id) ? s.delete(p.id) : s.add(p.id);
                                  setExpanded(s);
                                }}
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 hover:bg-white dark:hover:bg-black/40"
                                title={isExp ? 'بستن جزئیات' : 'مشاهده جزئیات'}
                              >
                                <i className={`fa-solid ${isExp ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                                جزئیات <span className="opacity-70">Details</span>
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {p.status !== 'پرداخت شده' ? (
                              <button
                                onClick={() => openPaymentModal(p)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                <i className="fa-solid fa-plus" /> ثبت پرداخت <span className="opacity-80">Pay</span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted">تسویه / Paid</span>
                            )}
                          </td>
                        </tr>

                        {isExp && (
                          <tr className="bg-black/[0.02] dark:bg-white/[0.03]">
                            <td colSpan={5} className="p-3">
                              {(p as any).transactions && (p as any).transactions.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-text">تاریخچه پرداخت / Payment history</div>
                                  <div className="space-y-2">
                                    {(p as any).transactions.map((tx: any) => (
                                      <div key={tx.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 p-3 flex items-start justify-between gap-3">
                                        <div className="text-xs text-muted">
                                          <div>
                                            {toShamsiSafe(tx.payment_date)} • <span className="font-semibold text-text">{formatPrice(tx.amount_paid)}</span>
                                          </div>
                                          {tx.notes ? <div className="mt-1">{tx.notes}</div> : null}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            className="h-9 w-9 rounded-xl bg-amber-500/90 text-white hover:bg-amber-600"
                                            onClick={() => openEditTx(tx)}
                                            title="ویرایش پرداخت"
                                          >
                                            <i className="fa-solid fa-pen" />
                                          </button>
                                          <button
                                            className="h-9 w-9 rounded-xl bg-rose-600/90 text-white hover:bg-rose-700"
                                            onClick={() => handleDeleteTx(tx)}
                                            title="حذف پرداخت"
                                          >
                                            <i className="fa-solid fa-trash" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted">پرداختی ثبت نشده است.</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Payment Modal */}
      {isPaymentModalOpen && currentPayment && (
        <Modal
          title={`ثبت پرداخت برای قسط شماره ${currentPayment.installmentNumber.toLocaleString('fa-IR')}`}
          onClose={() => setIsPaymentModalOpen(false)}
          widthClass="max-w-lg"
        >
          <form onSubmit={handleSubmitPartialPayment} className="space-y-4 p-2 text-sm">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-sack-dollar text-gray-500" />
                  مبلغ کل قسط:
                  <strong className="mr-1">{formatPrice(currentPayment.amountDue)}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-coins text-gray-500" />
                  پرداختی تا کنون:
                  <strong className="mr-1">{formatPrice(getTotalPaid(currentPayment))}</strong>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <i className="fa-regular fa-clipboard text-indigo-600" />
                  مانده فعلی:
                  <strong className="mr-1 text-indigo-600">
                    {formatPrice(Math.max(0, toNumber(currentPayment.amountDue) - getTotalPaid(currentPayment)))}
                  </strong>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  <i className="fa-regular fa-clock" /> تاریخچه پرداخت‌های این قسط
                </div>
                <div className="max-h-28 overflow-auto rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                  {(currentPayment.transactions && currentPayment.transactions.length > 0) ? (
                    currentPayment.transactions.map((tx: any) => (
                      <div key={tx.id} className="flex justify-between items-center text-xs">
                        <div>
                          <span>{toShamsiSafe(tx.payment_date)}</span>
                          <span className="font-semibold mr-2">{formatPrice(tx.amount_paid)}</span>
                          {tx.notes && <span className="text-gray-500 italic">({tx.notes})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-0.5 rounded bg-amber-500/90 text-white hover:bg-amber-600" onClick={() => openEditTx(tx)} title="ویرایش">
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button className="px-2 py-0.5 rounded bg-red-600/90 text-white hover:bg-red-700" onClick={() => handleDeleteTx(tx)} title="حذف">
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">پرداختی ثبت نشده است.</div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="paymentAmount" className="block font-medium mb-1">مبلغ پرداختی جدید (تومان)</label>
              <PriceInput
                id="paymentAmount"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-left dark:bg-gray-700 dark:text-gray-100"
                placeholder="مثلاً ۵,۰۰۰,۰۰۰"
                required
              />
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <i className="fa-solid fa-calculator" />
                مانده پس از این پرداخت:
                <b className="mr-1">
                  {formatPrice(
                    Math.max(
                      0,
                      toNumber(currentPayment.amountDue) - getTotalPaid(currentPayment) - toNumber(paymentAmount)
                    )
                  )}
                </b>
              </div>
            </div>

            <div>
              <label htmlFor="paymentDate" className="block font-medium mb-1">تاریخ پرداخت</label>
              <ShamsiDatePicker id="paymentDate" selectedDate={paymentDate} onDateChange={setPaymentDate} />
            </div>

            <div>
              <label htmlFor="paymentNotes" className="block font-medium mb-1">یادداشت (اختیاری)</label>
              <input
                id="paymentNotes"
                type="text"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                placeholder="مثال: پرداخت کارت‌خوان"
              />
            </div>

            <div className="flex justify-end pt-3 gap-3">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700">
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400"
              >
                <i className="fa-solid fa-check ml-1" />
                {isSubmittingPayment ? 'در حال ثبت...' : 'ثبت پرداخت'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Transaction Modal */}
      {isEditTxModalOpen && editingTx && (
        <Modal title="ویرایش پرداخت جزئی" onClose={() => setIsEditTxModalOpen(false)} widthClass="max-w-md">
          <div className="p-3 space-y-3 text-sm">
            <div>
              <label className="block mb-1">مبلغ (تومان)</label>
              <PriceInput value={editTxAmount} onChange={e => setEditTxAmount(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-100" />
            </div>
            <div>
              <label className="block mb-1">تاریخ</label>
              <ShamsiDatePicker selectedDate={editTxDate} onDateChange={setEditTxDate} />
            </div>
            <div>
              <label className="block mb-1">یادداشت</label>
              <input value={editTxNotes} onChange={e => setEditTxNotes(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-100" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700" onClick={() => setIsEditTxModalOpen(false)}>بستن</button>
              <button className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleSaveTx}>
                <i className="fa-solid fa-save ml-1" /> ذخیره
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Check edit modal */}
      {isEditCheckModalOpen && editingCheck && (
        <Modal title={`ویرایش وضعیت چک شماره: ${editingCheck.checkNumber}`} onClose={() => setIsEditCheckModalOpen(false)}>
          <div className="p-2 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
              <p>بانک: <strong>{editingCheck.bankName}</strong></p>
              <p>سررسید: <strong>{formatIsoToShamsi(editingCheck.dueDate)}</strong></p>
              <p className="col-span-2">مبلغ: <strong>{formatPrice(editingCheck.amount)}</strong></p>
            </div>

            <div>
              <label htmlFor="checkStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                وضعیت جدید چک:
              </label>
              <select
                id="checkStatus"
                name="status"
                value={editingCheck.status}
                onChange={handleEditCheckChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
              >
                {CHECK_STATUSES_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-3 space-x-3 space-x-reverse">
              <button type="button" onClick={() => setIsEditCheckModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                انصراف
              </button>
              <button type="button" onClick={handleSaveCheckChanges} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InstallmentSaleDetailPage;