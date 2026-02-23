// src/pages/Customers.tsx  (یا CustomersPage.tsx؛ مطابق روتینگ پروژه‌ات)
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Customer, NewCustomerData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { apiFetch } from '../utils/apiFetch';
import HubCard from '../components/HubCard';
import ExportMenu from '../components/ExportMenu';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import PageKit from '../components/ui/PageKit';
import { printArea } from '../utils/printArea';
import MessageComposerModal from '../components/MessageComposerModal';

// رنگ موجودی با سازگاری دارک/لایت
const formatCurrency = (amount?: number) => {
  const zero = 'text-gray-700 dark:text-gray-300';
  const neg  = 'text-red-600 dark:text-rose-400';
  const pos  = 'text-green-700 dark:text-emerald-400';
  const cls  = amount === undefined || amount === null ? zero : amount < 0 ? neg : amount > 0 ? pos : zero;
  const tag  = amount === undefined || amount === null ? ''    : amount < 0 ? ' (بدهکار)' : amount > 0 ? ' (بستانکار)' : '';
  const n = Math.abs(amount ?? 0).toLocaleString('fa-IR');
  return <span className={cls}>{n} تومان{tag}</span>;
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
    // Fallback: comma-separated
    return s.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
};

const CustomersPage: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debt' | 'credit' | 'settled'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Telegram report messaging
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgInitialRecipient, setMsgInitialRecipient] = useState<any>(null);
  const [msgInitialText, setMsgInitialText] = useState<string>('');

  // حذف
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // افزودن
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerData>({
    fullName: '',
    phoneNumber: '',
    address: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<NewCustomerData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTags = React.useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => normalizeTags((c as any).tags).forEach(t => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const stats = React.useMemo(() => {
    const balances = customers.map((c) => (c as any).currentBalance).filter((x) => typeof x === 'number') as number[];
    const total = customers.length;
    const debtors = balances.filter((b) => b < 0).length;
    const creditors = balances.filter((b) => b > 0).length;
    const settled = total - debtors - creditors;
    const totalDebt = balances.filter((b) => b < 0).reduce((s, b) => s + Math.abs(b), 0);
    const totalCredit = balances.filter((b) => b > 0).reduce((s, b) => s + b, 0);
    return { total, debtors, creditors, settled, totalDebt, totalCredit };
  }, [customers]);


  const fetchCustomers = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/customers', { headers: getAuthHeaders(token) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت لیست مشتریان');
      setCustomers(json.data);
      setFilteredCustomers(json.data);
    } catch (e:any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const openTelegramReport = async (customer: Customer) => {
    try {
      setNotification(null);
      const res = await apiFetch(`/api/reports/customer/${customer.id}/message`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش مشتری');
      setMsgInitialRecipient({
        type: 'customer',
        id: customer.id,
        name: customer.fullName,
        phoneNumber: customer.phoneNumber,
        telegramChatId: (customer as any).telegramChatId,
      });
      setMsgInitialText(String(json?.data?.text || ''));
      setMsgOpen(true);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آماده‌سازی گزارش' });
    }
  };

  useEffect(() => { if (token) fetchCustomers(); }, [token]);

  useEffect(() => {
    const q = searchTerm.toLowerCase().trim();
    const tf = tagFilter.trim();

    setFilteredCustomers(
      customers.filter((c) => {
        const matchesSearch = !q
          ? true
          : (c.fullName.toLowerCase().includes(q) || (c.phoneNumber && c.phoneNumber.includes(q)));
        if (!matchesSearch) return false;

        if (tf) {
          const tags = normalizeTags((c as any).tags);
          if (!tags.includes(tf)) return false;
        }

        const bal = (c as any).currentBalance as any;
        const nbal = typeof bal === 'number' ? bal : 0;
        if (balanceFilter === 'debt' && !(nbal < 0)) return false;
        if (balanceFilter === 'credit' && !(nbal > 0)) return false;
        if (balanceFilter === 'settled' && !(nbal == 0)) return false;

        return true;
      })
    );
  }, [searchTerm, tagFilter, balanceFilter, customers]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof NewCustomerData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<NewCustomerData> = {};
    if (!newCustomer.fullName.trim()) errors.fullName = 'نام کامل الزامی است.';
    if (newCustomer.phoneNumber && !/^\d{10,15}$/.test(newCustomer.phoneNumber.trim())) {
      errors.phoneNumber = 'شماره تماس نامعتبر است (۱۰ تا ۱۵ رقم).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddCustomerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return;
    setIsSubmitting(true);
    setNotification(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(newCustomer),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در افزودن مشتری');

      setNotification({ type: 'success', text: 'مشتری با موفقیت اضافه شد!' });
      setIsAddModalOpen(false);
      setNewCustomer({ fullName: '', phoneNumber: '', address: '', notes: '' });
      fetchCustomers();
    } catch (e:any) {
      setNotification({ type: 'error', text: e.message });
      if (e.message.includes('تکراری')) {
        setFormErrors(prev => ({ ...prev, phoneNumber: e.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setNotification(null);
    try {
      const response = await apiFetch(`/api/customers/${confirmDelete.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'حذف مشتری انجام نشد');
      setCustomers(prev => prev.filter(c => c.id !== confirmDelete.id));
      setFilteredCustomers(prev => prev.filter(c => c.id !== confirmDelete.id));
      setNotification({ type: 'success', text: `«${confirmDelete.fullName}» حذف شد.` });
      setConfirmDelete(null);
    } catch (err:any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = (fieldName: keyof NewCustomerData, isTextarea = false) =>
    [
      'w-full rounded-lg text-sm text-right',
      'px-3 py-2 border shadow-sm outline-none',
      'bg-white text-gray-800 placeholder-gray-400',
      'dark:bg-slate-900/60 dark:text-gray-100 dark:placeholder-gray-400',
      formErrors[fieldName] ? 'border-red-500 ring-1 ring-red-400' : 'border-gray-300 dark:border-slate-700',
      'focus:ring-2 focus:ring-offset-0 focus:ring-primary-500 focus:border-primary-500',
      isTextarea ? 'resize-y' : ''
    ].join(' ');

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1';

  const exportFilenameBase = `customers-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filteredCustomers.map((c) => ({
    fullName: c.fullName,
    phone: c.phoneNumber ?? '',
    tags: normalizeTags((c as any).tags).join('، '),
    address: c.address ?? '',
    notes: c.notes ?? '',
    balance: (c as any).balance ?? (c as any).totalBalance ?? '',
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportFilenameBase}.xlsx`,
      exportRows,
      [
        { header: 'نام و نام خانوادگی', key: 'fullName' },
        { header: 'شماره تماس', key: 'phone' },
        { header: 'تگ‌ها', key: 'tags' },
        { header: 'آدرس', key: 'address' },
        { header: 'توضیحات', key: 'notes' },
        { header: 'مانده', key: 'balance' },
      ],
      'Customers',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportFilenameBase}.pdf`,
      title: 'لیست مشتریان',
      head: ['نام', 'تلفن', 'مانده'],
      body: exportRows.map((r) => [
        r.fullName,
        r.phone,
        r.balance === '' || r.balance == null ? '—' : Number(r.balance).toLocaleString('fa-IR'),
      ]),
    });
  };

  return (
    <PageKit
      title="مشتریان"
      subtitle="مدیریت مشتریان و پرونده هر فرد، با جستجو و خروجی."
      icon={<i className="fa-solid fa-user-group" />}
      query={searchTerm}
      onQueryChange={setSearchTerm}
      searchPlaceholder="جستجو بر اساس نام یا شماره تماس..."
      toolbarRight={
        <>
          <ExportMenu
            className="shrink-0"
            items={[
              { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filteredCustomers.length === 0 },
              { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filteredCustomers.length === 0 },
              { key: 'print', label: 'چاپ لیست', icon: 'fa-print', onClick: () => printArea('#customers-print-area', { title: 'لیست مشتریان' }), disabled: filteredCustomers.length === 0 },
            ]}
          />
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors whitespace-nowrap"
          >
            <i className="fas fa-user-plus ml-2"></i>
            افزودن مشتری
          </button>
        </>
      }
      secondaryRow={
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HubCard
            title="مشتریان"
            subtitle="مدیریت مشتریان و پرونده هر فرد"
            icon="fa-solid fa-user-group"
            gradientFrom="from-violet-500"
            gradientTo="to-purple-600"
            to="/customers"
            active={location.pathname === '/customers' || location.pathname.startsWith('/customers/')}
          />
          <HubCard
            title="همکاران"
            subtitle="تامین‌کنندگان، تکنسین‌ها و..."
            icon="fa-solid fa-building"
            gradientFrom="from-slate-500"
            gradientTo="to-gray-700"
            to="/partners"
            active={location.pathname.startsWith('/partners')}
          />
        </div>
      }
    >
      <div className="space-y-6 text-right max-w-7xl mx-auto px-4" dir="rtl">
        <Notification message={notification} onClose={() => setNotification(null)} />
      {/* کارت اصلی لیست مشتریان */}
      <div className="app-card p-4 md:p-6">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="app-card p-3">
          <div className="text-xs opacity-70">کل مشتریان</div>
          <div className="mt-1 text-lg font-extrabold">{stats.total.toLocaleString('fa-IR')}</div>
        </div>
        <div className="app-card p-3">
          <div className="text-xs opacity-70">بدهکار</div>
          <div className="mt-1 text-lg font-extrabold text-rose-600 dark:text-rose-400">{stats.debtors.toLocaleString('fa-IR')}</div>
          <div className="mt-1 text-xs opacity-70">جمع بدهی: {stats.totalDebt.toLocaleString('fa-IR')} تومان</div>
        </div>
        <div className="app-card p-3">
          <div className="text-xs opacity-70">بستانکار</div>
          <div className="mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{stats.creditors.toLocaleString('fa-IR')}</div>
          <div className="mt-1 text-xs opacity-70">جمع بستانکاری: {stats.totalCredit.toLocaleString('fa-IR')} تومان</div>
        </div>
        <div className="app-card p-3">
          <div className="text-xs opacity-70">تسویه</div>
          <div className="mt-1 text-lg font-extrabold">{stats.settled.toLocaleString('fa-IR')}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { key: 'all', label: 'همه' },
          { key: 'debt', label: 'بدهکار' },
          { key: 'credit', label: 'بستانکار' },
          { key: 'settled', label: 'تسویه' },
        ].map((it) => {
          const active = balanceFilter === (it.key as any);
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => setBalanceFilter(it.key as any)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-bold transition',
                active
                  ? 'border-transparent bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow'
                  : 'border-border bg-surface hover:bg-surface/80',
              ].join(' ')}
            >
              {it.label}
            </button>
          );
        })}
      </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          <div className="w-full sm:w-64">
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm outline-none border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10 text-text focus:outline-none focus:ring-2 focus:ring-primary/25"
            >
              <option value="">همه تگ‌ها</option>
              {availableTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-muted">
            {filteredCustomers.length.toLocaleString('fa-IR')} نتیجه
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="hidden md:block overflow-x-auto">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <Skeleton key={i} className="h-9" rounded="lg" />
                  ))}
                </div>
              </div>
            </div>
            <div className="md:hidden space-y-4 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3" rounded="lg" />
                      <Skeleton className="h-4 w-1/2" rounded="lg" />
                    </div>
                    <Skeleton className="h-5 w-20" rounded="lg" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-9" rounded="xl" />
                      <Skeleton className="h-9 w-9" rounded="xl" />
                    </div>
                    <Skeleton className="h-9 w-28" rounded="xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-users"
            title="هنوز هیچ مشتری ثبت نشده"
            description="برای شروع، اولین مشتری را اضافه کنید تا گزارش‌ها و فروش هم کامل شوند."
            actionLabel="افزودن مشتری"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : filteredCustomers.length === 0 && searchTerm ? (
          <EmptyState
            icon="fa-solid fa-magnifying-glass"
            title="موردی پیدا نشد"
            description="جستجوی شما با هیچ مشتری‌ای مطابقت نداشت."
          />
        ) : (
          <>
            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto" id="customers-print-area">
              <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-6 py-3 text-right font-semibold">نام کامل</th>
                    <th className="px-6 py-3 text-right font-semibold">شماره تماس</th>
                    <th className="px-6 py-3 text-right font-semibold">تگ‌ها</th>
                    <th className="px-6 py-3 text-right font-semibold">موجودی حساب</th>
                    <th className="px-6 py-3 text-right font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-slate-800">
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{customer.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{customer.phoneNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {normalizeTags((customer as any).tags).length === 0 ? (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {normalizeTags((customer as any).tags).slice(0, 3).map(t => (
                              <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200">
                                {t}
                              </span>
                            ))}
                            {normalizeTags((customer as any).tags).length > 3 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">+{normalizeTags((customer as any).tags).length - 3}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(customer.currentBalance)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm"
                          title="مشاهده جزئیات مشتری"
                        >
                          <i className="fa-solid fa-user me-2 ml-2" />
                          مشاهده جزئیات
                        </Link>
                        <Link
                          to={`/customers/${customer.id}`}
                          className="inline-flex items-center px-3 py-1.5 ms-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          title="ثبت دریافت/پرداخت"
                        >
                          <i className="fa-solid fa-plus ms-1 ml-1" /> دریافت/پرداخت
                        </Link>
                        <button
                          onClick={() => openTelegramReport(customer)}
                          className="inline-flex items-center px-3 py-1.5 ms-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                          title="ارسال گزارش کامل در تلگرام"
                        >
                          <i className="fa-brands fa-telegram ms-1 ml-1" /> گزارش تلگرام
                        </button>
                        <button
                          onClick={() => setConfirmDelete(customer)}
                          className="inline-flex items-center px-3 py-1.5 ms-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm"
                          title="حذف مشتری"
                        >
                          <i className="fa-solid fa-trash ms-1 ml-1" /> حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-4">
              {filteredCustomers.map(customer => (
                <div key={customer.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{customer.fullName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1" dir="ltr">
                        {customer.phoneNumber || 'بدون شماره'}
                      </div>
                    </div>
                    <div className="text-sm font-bold">
                      {formatCurrency(customer.currentBalance)}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {normalizeTags((customer as any).tags).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <Link
                      to={`/customers/${customer.id}`}
                      className="px-3 py-2 bg-primary-600/10 text-primary-700 dark:text-primary-400 text-xs font-bold rounded-xl flex-1 text-center"
                    >
                      جزئیات
                    </Link>
                    <button
                      onClick={() => openTelegramReport(customer)}
                      className="px-3 py-2 bg-sky-600/10 text-sky-700 dark:text-sky-300 text-xs font-bold rounded-xl"
                      title="ارسال گزارش تلگرام"
                    >
                      <i className="fa-brands fa-telegram" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(customer)}
                      className="px-3 py-2 bg-red-600/10 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <MessageComposerModal
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        onQueued={() => setNotification({ type: 'success', text: 'گزارش در صف ارسال قرار گرفت.' })}
        initialRecipient={msgInitialRecipient || undefined}
        initialText={msgInitialText}
        initialChannels={{ sms: false, telegram: true }}
      />

      {/* مودال افزودن مشتری */}
      {isAddModalOpen && (
        <Modal title="افزودن مشتری جدید" onClose={() => setIsAddModalOpen(false)} widthClass="max-w-lg">
          <form onSubmit={handleAddCustomerSubmit} className="space-y-4 p-1">
            <div>
              <label htmlFor="fullName" className={labelClass}>نام کامل <span className="text-red-500">*</span></label>
              <input type="text" id="fullName" name="fullName" value={newCustomer.fullName}
                     onChange={handleInputChange} className={inputClass('fullName')} required />
              {formErrors.fullName && <p className="mt-1 text-xs text-red-600">{formErrors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="phoneNumber" className={labelClass}>شماره تماس</label>
              <input type="tel" id="phoneNumber" name="phoneNumber" value={newCustomer.phoneNumber}
                     onChange={handleInputChange} className={inputClass('phoneNumber')} placeholder="مثال: 09123456789" />
              {formErrors.phoneNumber && <p className="mt-1 text-xs text-red-600">{formErrors.phoneNumber}</p>}
            </div>

            <div>
              <label htmlFor="address" className={labelClass}>آدرس</label>
              <textarea id="address" name="address" rows={2} value={newCustomer.address}
                        onChange={handleInputChange} className={inputClass('address', true)} />
            </div>

            <div>
              <label htmlFor="notes" className={labelClass}>یادداشت</label>
              <textarea id="notes" name="notes" rows={2} value={newCustomer.notes}
                        onChange={handleInputChange} className={inputClass('notes', true)} />
            </div>

            <div className="flex justify-end pt-3">
              <button type="button" onClick={() => setIsAddModalOpen(false)}
                      className="ml-3 px-4 py-2 text-sm font-medium rounded-lg
                                 text-gray-800 bg-white border border-gray-300 hover:bg-gray-50
                                 dark:text-gray-100 dark:bg-slate-900/60 dark:border-slate-700 dark:hover:bg-slate-800/70">
                انصراف
              </button>
              <button type="submit" disabled={isSubmitting || !token}
                      className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg
                                 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                                 disabled:bg-primary-400 transition-colors">
                {isSubmitting ? (<><i className="fas fa-spinner fa-spin mr-2" />در حال ذخیره...</>) : 'ذخیره مشتری'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* مودال تأیید حذف */}
      {confirmDelete && (
        <Modal title={`حذف مشتری «${confirmDelete.fullName}»`} onClose={() => setConfirmDelete(null)} widthClass="max-w-md">
          <div className="space-y-4">
            <p className="text-sm">آیا از حذف این مشتری مطمئن هستید؟ این عملیات غیرقابل بازگشت است.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border">انصراف</button>
              <button disabled={isDeleting} onClick={handleDeleteCustomer} className="px-4 py-2 rounded-lg bg-red-600 text-white">
                {isDeleting ? 'در حال حذف...' : 'حذف نهایی'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </PageKit>
  );
};

export default CustomersPage;