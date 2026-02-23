// src/pages/CustomerDetailPage.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import {
  CustomerDetailsPageData,
  NotificationMessage,
  NewCustomerData,
  NewLedgerEntryData,
  CustomerLedgerInsights,
} from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import MessageComposerModal from '../components/MessageComposerModal';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import PriceInput from '../components/PriceInput';
import { formatIsoToShamsi, formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';

/* رنگ‌دهی بدهکار/بستانکار سازگار با دارک */


const ScoreBar = ({ score }: { score: number }) => {
  const s = Math.max(0, Math.min(100, score || 0));
  const color =
    s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-sky-500' : s >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>امتیاز خوش‌حسابی</span>
        <span className="font-bold text-gray-900 dark:text-gray-100">{s.toLocaleString('fa-IR')} / ۱۰۰</span>
      </div>
      <div className="mt-1 h-2.5 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${s}%` }} />
      </div>
    </div>
  );
};

const riskPill = (lvl?: 'low'|'medium'|'high') => {
  const base = 'px-2 py-0.5 rounded-full text-xs font-semibold';
  if (lvl === 'high') return <span className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200`}>ریسک بالا</span>;
  if (lvl === 'medium') return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200`}>ریسک متوسط</span>;
  return <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`}>ریسک پایین</span>;
};

const formatLedgerCurrency = (amount?: number, type?: 'debit' | 'credit' | 'balance') => {
  if (amount === undefined || amount === null) return '۰ تومان';

  let amountStr = Math.abs(amount).toLocaleString('fa-IR') + ' تومان';
  let color = 'text-gray-700 dark:text-gray-300';

  if (type === 'balance') {
    if (amount > 0) { // بدهکار
      color = 'text-red-600 dark:text-rose-400';
      amountStr += ' (بدهکار)';
    } else if (amount < 0) { // بستانکار
      color = 'text-green-700 dark:text-emerald-400';
      amountStr += ' (بستانکار)';
    } else {
      amountStr += ' (تسویه)';
    }
  } else if (type === 'debit' && amount > 0) {
    color = 'text-red-500 dark:text-rose-400';
  } else if (type === 'credit' && amount > 0) {
    color = 'text-green-600 dark:text-emerald-400';
  }

  return <span className={color}>{amountStr}</span>;
};

const normalizeTags = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map(t => t.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).map(t => t.trim()).filter(Boolean);
    } catch {}
    return s.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
};

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [customerData, setCustomerData] = useState<CustomerDetailsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [ledgerInsights, setLedgerInsights] = useState<CustomerLedgerInsights | null>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [followupNote, setFollowupNote] = useState('');
  const [followupNextDate, setFollowupNextDate] = useState<Date | null>(null);
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // CRM tags
  const [tagInput, setTagInput] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);

  // ویرایش پروفایل
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<NewCustomerData>>({});
  const [editFormErrors, setEditFormErrors] = useState<Partial<NewCustomerData>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // ثبت دفتر
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [prefillMessageText, setPrefillMessageText] = useState<string>('');
  const [prefillChannels, setPrefillChannels] = useState<{ sms?: boolean; telegram?: boolean } | undefined>(undefined);
  const initialLedgerEntry: NewLedgerEntryData = { description: '', debit: 0, credit: 0 };
  const [newLedgerEntry, setNewLedgerEntry] = useState<NewLedgerEntryData>(initialLedgerEntry);
  const [ledgerDateSelected, setLedgerDateSelected] = useState<Date | null>(new Date());
  const [ledgerFormErrors, setLedgerFormErrors] = useState<Partial<
    NewLedgerEntryData & { amountType?: string; transactionDate?: string }
  >>({});
  const [isSubmittingLedger, setIsSubmittingLedger] = useState(false);
  const [transactionType, setTransactionType] = useState<'debit' | 'credit'>('credit');

  // ویرایش/حذف رکورد دفتر
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);


  
  const sendLedgerAction = async (type: 'REMINDER' | 'NOTE' | 'FLAG_HIGH_RISK', note?: string) => {
    if (!token || !customerData) return;
    try {
      const res = await fetch(`/api/customers/${customerData.id}/ledger/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ type, note }),
      });
      if (res.ok) {
        setNotification({ message: 'اقدام با موفقیت ثبت شد', type: 'success' });
      }
    } catch {
      setNotification({ message: 'خطا در ثبت اقدام', type: 'error' });
    }
  };

  
  const createQuickFollowup = async (note: string, nextIso?: string | null) => {
    if (!token || !customerData?.profile?.id) return;
    const n = String(note || '').trim();
    if (!n) return;
    try {
      const res = await fetch(`/api/customers/${customerData.profile.id}/followups`, {
        method: 'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: n, nextFollowupDate: nextIso ?? new Date().toISOString() }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت پیگیری');
      setFollowups([js.data, ...(followups || [])]);
      setNotification({ message: 'یادآوری ثبت شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const saveFollowup = async () => {
    if (!token || !customerData?.profile?.id) return;
    const note = String(followupNote || '').trim();
    if (!note) {
      setNotification({ message: 'یادداشت پیگیری را وارد کنید.', type: 'error' });
      return;
    }
    setIsSavingFollowup(true);
    try {
      const body = {
        note,
        nextFollowupDate: followupNextDate ? new Date(followupNextDate).toISOString() : null,
      };
      const res = await fetch(`/api/customers/${customerData.profile.id}/followups`, {
        method: 'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت پیگیری');
      setFollowups([js.data, ...(followups || [])]);
      setFollowupNote('');
      setFollowupNextDate(null);
      setNotification({ message: 'پیگیری ثبت شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally {
      setIsSavingFollowup(false);
    }
  };

  
  const closeFollowup = async (followupId: number) => {
    if (!token || !customerData?.profile?.id) return;
    try {
      const res = await fetch(`/api/customers/${customerData.profile.id}/followups/${followupId}/close`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در بستن پیگیری');
      setFollowups((prev) => (prev || []).map((f: any) => (f.id === followupId ? js.data : f)));
      setNotification({ message: 'پیگیری بسته شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const setRiskOverride = async (risk: 'low'|'medium'|'high'|null) => {
    if (!token || !customerData?.profile?.id) return;
    try {
      const res = await fetch(`/api/customers/${customerData.profile.id}/risk-override`, {
        method: 'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تنظیم ریسک');
      // update local profile
      setCustomerData((prev: any) => prev ? ({ ...prev, profile: js.data }) : prev);
      setNotification({ message: 'ریسک دستی ذخیره شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const fetchLedgerInsights = async (customerId: number) => {
    if (!token) return;
    setInsightsLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/ledger/insights`, { headers: getAuthHeaders(token) });
      const js = await res.json();
      if (res.ok && js?.success !== false) setLedgerInsights(js.data as CustomerLedgerInsights);
    } catch {
      // ignore
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchCustomerDetails = async () => {
    if (!id || !token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/customers/${id}`, { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت اطلاعات مشتری');
      setCustomerData(result.data);
    
      fetchLedgerInsights(id);
} catch (error: any) {
      setNotification({ type: 'error', text: error.message });
      if (error.message.includes('یافت نشد')) setTimeout(() => navigate('/customers'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTags = async (nextTags: string[]) => {
    if (!id || !token) return;
    setIsSavingTags(true);
    try {
      const response = await fetch(`/api/customers/${id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ tags: nextTags }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ذخیره تگ‌ها');

      // Update local state without refetch
      setCustomerData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            tags: (result.data as any)?.tags,
          } as any,
        };
      });
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در ذخیره تگ‌ها' });
    } finally {
      setIsSavingTags(false);
    }
  };

  useEffect(() => { if (token) fetchCustomerDetails(); }, [id, navigate, token]);

  const openEditModal = () => {
    if (!customerData?.profile) return;
    setEditingCustomer({
      fullName: customerData.profile.fullName,
      phoneNumber: customerData.profile.phoneNumber || '',
      address: customerData.profile.address || '',
      notes: customerData.profile.notes || '',
    });
    setEditFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingCustomer(prev => ({ ...prev, [name]: value }));
    if (editFormErrors[name as keyof NewCustomerData]) setEditFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateEditForm = (): boolean => {
    const errors: Partial<NewCustomerData> = {};
    if (!editingCustomer.fullName?.trim()) errors.fullName = 'نام کامل الزامی است.';
    if (editingCustomer.phoneNumber && !/^\d{10,15}$/.test(editingCustomer.phoneNumber.trim())) {
      errors.phoneNumber = 'شماره تماس نامعتبر است (باید ۱۰ تا ۱۵ رقم باشد).';
    }
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateEditForm() || !id || !token) return;
    setIsSubmittingEdit(true);
    setNotification(null);
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(editingCustomer),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در به‌روزرسانی اطلاعات مشتری');
      setNotification({ type: 'success', text: 'اطلاعات مشتری با موفقیت به‌روزرسانی شد!' });
      setIsEditModalOpen(false);
      fetchCustomerDetails();
    } catch (error: any) {
      const msg = error.message;
      setNotification({ type: 'error', text: msg });
      if (msg.includes('تکراری')) setEditFormErrors(prev => ({ ...prev, phoneNumber: msg }));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openLedgerModal = () => {
    setNewLedgerEntry(initialLedgerEntry);
    setLedgerDateSelected(new Date());
    setTransactionType('credit');
    setLedgerFormErrors({});
    setIsLedgerModalOpen(true);
  };

  const handleLedgerInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const amountValue = parseFloat(value);
      if (transactionType === 'credit') {
        setNewLedgerEntry(prev => ({ ...prev, credit: isNaN(amountValue) ? ('' as any) : amountValue, debit: 0 } as any));
      } else {
        setNewLedgerEntry(prev => ({ ...prev, debit: isNaN(amountValue) ? ('' as any) : amountValue, credit: 0 } as any));
      }
    } else {
      setNewLedgerEntry(prev => ({ ...prev, [name]: value } as any));
    }
    if (ledgerFormErrors[name as keyof NewLedgerEntryData] || ledgerFormErrors.amountType) {
      setLedgerFormErrors(prev => ({ ...prev, [name]: undefined, amountType: undefined, transactionDate: undefined }));
    }
  };

  const handleTransactionTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const type = e.target.value as 'debit' | 'credit';
    setTransactionType(type);
    const currentAmount = type === 'credit' ? (newLedgerEntry.credit || 0) : (newLedgerEntry.debit || 0);
    if (type === 'credit') setNewLedgerEntry(prev => ({ ...prev, credit: currentAmount, debit: 0 }));
    else setNewLedgerEntry(prev => ({ ...prev, debit: currentAmount, credit: 0 }));
  };

  const validateLedgerForm = (): boolean => {
    const errors: Partial<NewLedgerEntryData & { amountType?: string; transactionDate?: string }> = {};
    if (!newLedgerEntry.description?.trim()) errors.description = 'شرح تراکنش الزامی است.';
    const amount = transactionType === 'credit' ? newLedgerEntry.credit : newLedgerEntry.debit;
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      errors.amountType = 'مبلغ تراکنش باید عددی مثبت باشد.';
    }
    if (!ledgerDateSelected) errors.transactionDate = 'تاریخ تراکنش الزامی است.';
    setLedgerFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLedgerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateLedgerForm() || !id || !ledgerDateSelected || !token) return;
    setIsSubmittingLedger(true);
    setNotification(null);

    const payload: NewLedgerEntryData = {
      description: newLedgerEntry.description || '',
      debit: transactionType === 'debit' ? Number(newLedgerEntry.debit) : 0,
      credit: transactionType === 'credit' ? Number(newLedgerEntry.credit) : 0,
      transactionDate: moment(ledgerDateSelected).toISOString(),
    };

    try {
      const response = await fetch(`/api/customers/${id}/ledger`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ثبت تراکنش در دفتر حساب');
      setNotification({ type: 'success', text: 'تراکنش با موفقیت ثبت شد!' });
      setIsLedgerModalOpen(false);
      fetchCustomerDetails();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmittingLedger(false);
    }
  };

  const handleLedgerDelete = async (entryId: number) => {
    if (!id || !token) return;
    if (!confirm('حذف این رکورد از دفتر انجام شود؟')) return;
    setIsDeletingEntry(true);
    try {
      const response = await fetch(`/api/customers/${id}/ledger/${entryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'حذف انجام نشد');
      await fetchCustomerDetails();
      setNotification({ type: 'success', text: 'حذف انجام شد.' });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsDeletingEntry(false);
    }
  };

  const handleLedgerEdit = async () => {
    if (!id || !token || !editingEntry) return;
    try {
      const payload: any = {
        description: editingEntry.description,
        debit: editingEntry.debit,
        credit: editingEntry.credit,
        transactionDate: editingEntry.transactionDate,
      };
      const response = await fetch(`/api/customers/${id}/ledger/${editingEntry.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'ویرایش انجام نشد');
      setEditingEntry(null);
      await fetchCustomerDetails();
      setNotification({ type: 'success', text: 'ویرایش انجام شد.' });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    }
  };

  const formatPrice = (price: number | undefined | null) =>
    price === undefined || price === null ? '-' : `${price.toLocaleString('fa-IR')} تومان`;

  const openTelegramReport = async () => {
    try {
      if (!token || !customerData?.profile?.id) return;
      setNotification(null);
      const res = await fetch(`/api/reports/customer/${customerData.profile.id}/message`, { headers: getAuthHeaders(token) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setPrefillChannels({ sms: false, telegram: true });
      setPrefillMessageText(String(json?.data?.text || ''));
      setIsMessageModalOpen(true);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آماده‌سازی گزارش' });
    }
  };

  const inputClass = (hasError: boolean, isTextarea = false) =>
    [
      'w-full rounded-lg text-sm text-right px-3 py-2',
      'border shadow-sm outline-none',
      'bg-white text-gray-800 placeholder-gray-400 border-gray-300',
      'dark:bg-slate-900/60 dark:text-gray-100 dark:placeholder-gray-400 dark:border-slate-700',
      'focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500 focus:border-indigo-500',
      isTextarea ? 'resize-y' : '',
      hasError ? 'border-red-500 ring-1 ring-red-400' : '',
    ].join(' ');
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1';

  if (isLoading) {
    return (
      <div className="p-10 text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-spinner fa-spin text-3xl mb-3" />
        <p>در حال بارگذاری اطلاعات مشتری...</p>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="p-10 text-center text-red-500">
        <i className="fas fa-exclamation-circle text-3xl mb-3" />
        <p>اطلاعات مشتری یافت نشد یا خطایی رخ داده است.</p>
      </div>
    );
  }

  const { profile, ledger, purchaseHistory } = customerData;

  return (
    <div className="space-y-8 text-right max-w-7xl mx-auto px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* پروفایل */}
      <div className="rounded-xl shadow-lg border p-6 bg-white text-gray-900 border-gray-200
                      dark:bg-slate-900/70 dark:text-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-4">
          <h2 className="text-2xl font-semibold">پروفایل مشتری: {profile.fullName}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPrefillMessageText('');
                setPrefillChannels(undefined);
                setIsMessageModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              title="ارسال پیامک/تلگرام"
            >
              <i className="fa-solid fa-paper-plane ml-2" />
              ارسال پیام
            </button>
            <button
              onClick={openTelegramReport}
              className="px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition-colors text-sm"
              title="ارسال گزارش کامل مشتری در تلگرام"
            >
              <i className="fa-brands fa-telegram ml-2" />
              گزارش تلگرام
            </button>
            <button
              onClick={openEditModal}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <i className="fas fa-edit ml-2" />
              ویرایش پروفایل
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p><strong>شناسه مشتری:</strong> {profile.id.toLocaleString('fa-IR')}</p>
          <p><strong>تاریخ ثبت نام:</strong> {formatIsoToShamsi(profile.dateAdded)}</p>
          <p><strong>شماره تماس:</strong> <span dir="ltr">{profile.phoneNumber || '-'}</span></p>
          <p><strong>آدرس:</strong> {profile.address || '-'}</p>
          <p className="md:col-span-2"><strong>یادداشت‌ها:</strong> {profile.notes || '-'}</p>
        </div>

        {/* CRM Tags */}
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold mb-2">تگ‌های CRM</div>
              {normalizeTags((profile as any).tags).length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">—</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {normalizeTags((profile as any).tags).map(t => (
                    <span key={t} className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200">
                      {t}
                      <button
                        type="button"
                        disabled={isSavingTags}
                        onClick={() => {
                          const current = normalizeTags((profile as any).tags);
                          updateTags(current.filter(x => x !== t));
                        }}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-rose-400"
                        title="حذف تگ"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full md:w-80">
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="افزودن تگ (مثلاً VIP)"
                  className="flex-1 rounded-lg text-sm px-3 py-2 border bg-white text-gray-800 border-gray-300
                             dark:bg-slate-900/60 dark:text-gray-100 dark:border-slate-700"
                />
                <button
                  type="button"
                  disabled={isSavingTags}
                  onClick={() => {
                    const t = tagInput.trim();
                    if (!t) return;
                    const current = normalizeTags((profile as any).tags);
                    if (current.includes(t)) { setTagInput(''); return; }
                    updateTags([...current, t]);
                    setTagInput('');
                  }}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-50"
                >
                  افزودن
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                با تگ‌ها می‌توانید مشتریان را دسته‌بندی و در گزارش‌ها فیلتر کنید.
              </div>
            </div>
          </div>
        </div>
      </div>

      <MessageComposerModal
        open={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        initialRecipient={{
          type: 'customer',
          id: profile.id,
          name: profile.fullName,
          phoneNumber: profile.phoneNumber,
          telegramChatId: (profile as any).telegramChatId,
        }}
        initialText={prefillMessageText}
        initialChannels={prefillChannels}
        onQueued={() => setNotification({ type: 'success', text: 'پیام در صف ارسال قرار گرفت. وضعیت را در «صف ارسال» ببینید.' })}
      />

      {/* دفتر حساب */}
      <div className="rounded-xl shadow-lg border p-6 bg-white text-gray-900 border-gray-200
                      dark:bg-slate-900/70 dark:text-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-semibold">دفتر حساب مشتری (حساب دفتری)</h2>
          <button
            onClick={openLedgerModal}
            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <i className="fas fa-plus ml-2" />
            ثبت تراکنش جدید
          </button>
        </div>

        <div className="mb-4 p-4 rounded-lg bg-indigo-50 dark:bg-slate-800/60">
          <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
            موجودی نهایی حساب: {formatLedgerCurrency(profile.currentBalance, 'balance')}
          </p>
        </div>

        {ledger.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">هیچ تراکنشی در دفتر حساب این مشتری ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-sm">
              <thead className="bg-gray-100 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">تاریخ</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">شرح</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">بدهکار (تومان)</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">بستانکار (تومان)</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">مانده (تومان)</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-slate-800">
                {ledger.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">{formatIsoToShamsiDateTime(entry.transactionDate)}</td>
                    <td className="px-4 py-2">{entry.description}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatLedgerCurrency(entry.debit, 'debit')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatLedgerCurrency(entry.credit, 'credit')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatLedgerCurrency(entry.balance, 'balance')}</td>
                    <td className="px-4 py-2 whitespace-nowrap" dir="ltr">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="px-2 py-1 rounded border text-xs"
                        title="ویرایش رکورد"
                      >
                        ویرایش
                      </button>
                      <button
                        onClick={() => handleLedgerDelete(entry.id)}
                        disabled={isDeletingEntry}
                        className="px-2 py-1 ms-2 rounded bg-red-600 text-white text-xs disabled:opacity-60"
                        title="حذف رکورد"
                      >
                        {isDeletingEntry ? 'حذف...' : 'حذف'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* تاریخچه خرید */}
      <div className="rounded-xl shadow-lg border p-6 bg-white text-gray-900 border-gray-200
                      dark:bg-slate-900/70 dark:text-gray-100 dark:border-slate-800">
        <h2 className="text-xl font-semibold mb-4 border-b border-gray-200 dark:border-slate-800 pb-4">
          تاریخچه خرید مشتری
        </h2>
        {purchaseHistory.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">این مشتری هنوز خریدی ثبت نکرده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-sm">
              <thead className="bg-gray-100 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">تاریخ فروش</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">نام کالا</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">تعداد</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">قیمت واحد</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">تخفیف</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">قیمت کل نهایی</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-slate-800">
                {purchaseHistory.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">{formatIsoToShamsi(sale.transactionDate)}</td>
                    <td className="px-4 py-2">{sale.itemName}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{sale.quantity.toLocaleString('fa-IR')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatPrice(sale.pricePerItem)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-red-600 dark:text-rose-400">{formatPrice(sale.discount)}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-semibold text-indigo-700 dark:text-indigo-300">{formatPrice(sale.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال ویرایش پروفایل */}
      {isEditModalOpen && (
        <Modal title="ویرایش اطلاعات مشتری" onClose={() => setIsEditModalOpen(false)} widthClass="max-w-lg">
          <form onSubmit={handleEditSubmit} className="space-y-4 p-1">
            <div>
              <label htmlFor="editFullName" className={labelClass}>
                نام کامل <span className="text-red-500">*</span>
              </label>
              <input
                id="editFullName" name="fullName" type="text"
                value={editingCustomer.fullName || ''} onChange={handleEditInputChange}
                className={inputClass(!!editFormErrors.fullName)} required
              />
              {editFormErrors.fullName && <p className="mt-1 text-xs text-red-600">{editFormErrors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="editPhoneNumber" className={labelClass}>شماره تماس</label>
              <input
                id="editPhoneNumber" name="phoneNumber" type="tel"
                value={editingCustomer.phoneNumber || ''} onChange={handleEditInputChange}
                className={inputClass(!!editFormErrors.phoneNumber)} placeholder="مثال: 09123456789"
              />
              {editFormErrors.phoneNumber && <p className="mt-1 text-xs text-red-600">{editFormErrors.phoneNumber}</p>}
            </div>

            <div>
              <label htmlFor="editAddress" className={labelClass}>آدرس</label>
              <textarea
                id="editAddress" name="address" rows={2}
                value={editingCustomer.address || ''} onChange={handleEditInputChange}
                className={inputClass(!!editFormErrors.address, true)}
              />
            </div>

            <div>
              <label htmlFor="editNotes" className={labelClass}>یادداشت</label>
              <textarea
                id="editNotes" name="notes" rows={2}
                value={editingCustomer.notes || ''} onChange={handleEditInputChange}
                className={inputClass(!!editFormErrors.notes, true)}
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button" onClick={() => setIsEditModalOpen(false)}
                className="ml-3 px-4 py-2 text-sm font-medium rounded-lg
                           text-gray-800 bg-gray-100 hover:bg-gray-200
                           dark:text-gray-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/70"
              >
                انصراف
              </button>
              <button
                type="submit" disabled={isSubmittingEdit || !token}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
              >
                {isSubmittingEdit ? (<><i className="fas fa-spinner fa-spin mr-2" />در حال ذخیره...</>) : 'ذخیره تغییرات'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* مودال ثبت تراکنش */}
      {isLedgerModalOpen && (
        <Modal title={`ثبت تراکنش برای ${profile.fullName}`} onClose={() => setIsLedgerModalOpen(false)} widthClass="max-w-lg">
          <form onSubmit={handleLedgerSubmit} className="space-y-4 p-1">
            <div className="flex space-x-4 space-x-reverse mb-3">
              <label className="flex items-center cursor-pointer">
                <input type="radio" name="transactionType" value="credit" checked={transactionType === 'credit'} onChange={handleTransactionTypeChange} className="form-radio h-4 w-4 text-indigo-600 ml-2" />
                <span className="text-sm text-gray-700 dark:text-gray-200">دریافت از مشتری (بستانکار)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="radio" name="transactionType" value="debit" checked={transactionType === 'debit'} onChange={handleTransactionTypeChange} className="form-radio h-4 w-4 text-indigo-600 ml-2" />
                <span className="text-sm text-gray-700 dark:text-gray-200">پرداخت/شارژ حساب (بدهکار)</span>
              </label>
            </div>

            <div>
              <label htmlFor="ledgerAmount" className={labelClass}>مبلغ تراکنش (تومان) <span className="text-red-500">*</span></label>
              <PriceInput
                id="ledgerAmount" name="amount"
                value={transactionType === 'credit' ? String(newLedgerEntry.credit || '') : String(newLedgerEntry.debit || '')}
                onChange={handleLedgerInputChange}
                className={inputClass(!!ledgerFormErrors.amountType)}
                placeholder="مثال: ۵۰۰۰۰"
              />
              {ledgerFormErrors.amountType && <p className="mt-1 text-xs text-red-600">{ledgerFormErrors.amountType}</p>}
            </div>

            <div>
              <label htmlFor="ledgerDescription" className={labelClass}>شرح تراکنش <span className="text-red-500">*</span></label>
              <textarea
                id="ledgerDescription" name="description" rows={2}
                value={newLedgerEntry.description || ''} onChange={handleLedgerInputChange}
                className={inputClass(!!ledgerFormErrors.description, true)} required
                placeholder="مثال: پرداخت بدهی / شارژ حساب"
              />
              {ledgerFormErrors.description && <p className="mt-1 text-xs text-red-600">{ledgerFormErrors.description}</p>}
            </div>

            <div>
              <label htmlFor="ledgerDatePicker" className={labelClass}>تاریخ تراکنش <span className="text-red-500">*</span></label>
              <ShamsiDatePicker
                id="ledgerDatePicker"
                selectedDate={ledgerDateSelected}
                onDateChange={setLedgerDateSelected}
                inputClassName={inputClass(!!ledgerFormErrors.transactionDate)}
              />
              {ledgerFormErrors.transactionDate && <p className="mt-1 text-xs text-red-600">{ledgerFormErrors.transactionDate}</p>}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button" onClick={() => setIsLedgerModalOpen(false)}
                className="ml-3 px-4 py-2 text-sm font-medium rounded-lg
                           text-gray-800 bg-gray-100 hover:bg-gray-200
                           dark:text-gray-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/70"
              >
                انصراف
              </button>
              <button
                type="submit" disabled={isSubmittingLedger || !token}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-emerald-400"
              >
                ذخیره تراکنش
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* مودال ویرایش رکورد دفتر */}
      {editingEntry && (
        <Modal title="ویرایش رکورد دفتر" onClose={() => setEditingEntry(null)} widthClass="max-w-md">
          <div className="space-y-3">
            <label className="block text-sm">توضیحات</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={editingEntry.description || ''}
              onChange={e => setEditingEntry({ ...editingEntry, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">دریافت (بستانکار)</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={editingEntry.credit || 0}
                  onChange={e => setEditingEntry({ ...editingEntry, credit: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm">پرداخت (بدهکار)</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={editingEntry.debit || 0}
                  onChange={e => setEditingEntry({ ...editingEntry, debit: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditingEntry(null)} className="px-4 py-2 rounded border">انصراف</button>
              <button onClick={handleLedgerEdit} className="px-4 py-2 rounded bg-indigo-600 text-white">ذخیره تغییرات</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerDetailPage;
