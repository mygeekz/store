import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Partner, NewPartnerData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { PARTNER_TYPES } from '../constants';
import PageKit from '../components/ui/PageKit';
import MessageComposerModal from '../components/MessageComposerModal';

// Helper to format partner balance
const formatPartnerBalance = (amount?: number) => {
  if (amount === undefined || amount === null) return <span className="text-gray-700">۰ تومان (تسویه)</span>;
  const absAmountStr = Math.abs(amount).toLocaleString('fa-IR') + ' تومان';
  if (amount > 0) return <span className="text-red-600 font-semibold">{absAmountStr} (بدهی شما به همکار)</span>;
  if (amount < 0) return <span className="text-green-700 font-semibold">{absAmountStr} (طلب شما از همکار)</span>;
  return <span className="text-gray-700">{absAmountStr} (تسویه شده)</span>;
};

const PartnersPage: React.FC = () => {
  const { token } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debt' | 'credit' | 'settled'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Telegram report messaging
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgInitialRecipient, setMsgInitialRecipient] = useState<any>(null);
  const [msgInitialText, setMsgInitialText] = useState<string>('');

  const stats = React.useMemo(() => {
    const balances = partners.map((p) => (p as any).currentBalance).filter((x) => typeof x === 'number') as number[];
    const total = partners.length;
    const debt = balances.filter((b) => b > 0).length;
    const credit = balances.filter((b) => b < 0).length;
    const settled = total - debt - credit;
    const totalDebt = balances.filter((b) => b > 0).reduce((s, b) => s + b, 0);
    const totalCredit = balances.filter((b) => b < 0).reduce((s, b) => s + Math.abs(b), 0);
    return { total, debt, credit, settled, totalDebt, totalCredit };
  }, [partners]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const initialNewPartnerState: NewPartnerData = {
    partnerName: '',
    partnerType: 'Supplier',
    contactPerson: '',
    phoneNumber: '',
    email: '',
    address: '',
    notes: '',
  };
  const [newPartner, setNewPartner] = useState<NewPartnerData>(initialNewPartnerState);
  const [formErrors, setFormErrors] = useState<Partial<NewPartnerData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW: state for delete confirm modal
  const [confirmDelete, setConfirmDelete] = useState<Partner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPartners = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/partners');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست همکاران');
      setPartners(result.data);
      setFilteredPartners(result.data);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const openTelegramReport = async (partner: Partner) => {
    try {
      setNotification(null);
      const res = await apiFetch(`/api/reports/partner/${partner.id}/message`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش همکار');
      setMsgInitialRecipient({
        type: 'partner',
        id: partner.id,
        name: partner.partnerName,
        phoneNumber: (partner as any).phoneNumber,
        telegramChatId: (partner as any).telegramChatId,
      });
      setMsgInitialText(String(json?.data?.text || ''));
      setMsgOpen(true);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آماده‌سازی گزارش' });
    }
  };

  useEffect(() => {
    if (token) fetchPartners();
  }, [token]);

  useEffect(() => {
    const lower = searchTerm.toLowerCase().trim();

    const filtered = partners.filter((p) => {
      const matchesSearch = !lower
        ? true
        : p.partnerName.toLowerCase().includes(lower) ||
          (PARTNER_TYPES.find((pt) => pt.value === p.partnerType)?.label.toLowerCase().includes(lower)) ||
          (p.phoneNumber && p.phoneNumber.includes(lower)) ||
          (p.contactPerson && p.contactPerson.toLowerCase().includes(lower));
      if (!matchesSearch) return false;

      const bal = (p as any).currentBalance;
      const nbal = typeof bal === 'number' ? bal : 0;
      // در همکاران: مثبت = بدهی ما به همکار، منفی = طلب ما
      if (balanceFilter === 'debt' && !(nbal > 0)) return false;
      if (balanceFilter === 'credit' && !(nbal < 0)) return false;
      if (balanceFilter === 'settled' && !(nbal == 0)) return false;
      return true;
    });

    setFilteredPartners(filtered);
  }, [searchTerm, balanceFilter, partners]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPartner(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof NewPartnerData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<NewPartnerData> = {};
    if (!newPartner.partnerName.trim()) errors.partnerName = 'نام همکار الزامی است.';
    if (!newPartner.partnerType.trim()) errors.partnerType = 'نوع همکار الزامی است.';
    if (newPartner.phoneNumber && !/^\d{10,15}$/.test(newPartner.phoneNumber.trim())) {
      errors.phoneNumber = 'شماره تماس نامعتبر است (باید ۱۰ تا ۱۵ رقم باشد).';
    }
    if (newPartner.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newPartner.email.trim())) {
      errors.email = 'ایمیل نامعتبر است.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddPartnerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return;
    setIsSubmitting(true);
    setNotification(null);
    try {
      const response = await apiFetch('/api/partners', {
        method: 'POST',
        body: JSON.stringify(newPartner),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در افزودن همکار');
      setNotification({ type: 'success', text: 'همکار با موفقیت اضافه شد!' });
      setIsAddModalOpen(false);
      setNewPartner(initialNewPartnerState);
      fetchPartners();
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
      if ((error as Error).message.toLowerCase().includes('تکراری') || (error as Error).message.toLowerCase().includes('unique constraint')) {
        setFormErrors(prev => ({ ...prev, phoneNumber: 'این شماره تماس قبلا ثبت شده است.' }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW: delete handler
  const handleDeletePartner = async () => {
    if (!confirmDelete || !token) return;
    setIsDeleting(true);
    setNotification(null);
    try {
      const response = await apiFetch(`/api/partners/${confirmDelete.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'حذف همکار انجام نشد');
      // Optimistic update
      setPartners(prev => prev.filter(p => p.id !== confirmDelete.id));
      setFilteredPartners(prev => prev.filter(p => p.id !== confirmDelete.id));
      setNotification({ type: 'success', text: `«${confirmDelete.partnerName}» حذف شد.` });
      setConfirmDelete(null);
    } catch (err) {
      setNotification({ type: 'error', text: (err as Error).message });
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = (fieldName: keyof NewPartnerData, isTextarea = false, isSelect = false) =>
    `w-full p-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm text-right bg-white dark:bg-black/30 ${
      formErrors[fieldName] ? 'border-red-500' : 'border-primary/20'
    }`;
  const labelClass = 'block text-sm font-medium text-text mb-1';

  return (
    <PageKit
      title="همکاران"
      subtitle="مدیریت همکاران (تامین‌کنندگان، تکنسین‌ها و ...)"
      icon={<i className="fa-solid fa-building" />}
      query={searchTerm}
      onQueryChange={setSearchTerm}
      searchPlaceholder="جستجو بر اساس نام، نوع، شماره..."
      isLoading={isLoading}
      isEmpty={!isLoading && filteredPartners.length === 0}
      emptyTitle={partners.length === 0 && !searchTerm ? "هنوز هیچ همکاری ثبت نشده" : "موردی پیدا نشد"}
      emptyDescription={partners.length === 0 && !searchTerm ? "برای شروع، یک همکار جدید اضافه کنید." : (searchTerm ? "جستجو با هیچ همکاری مطابقت نداشت." : "فیلترها را تغییر بده یا پاک کن.")}
      emptyActionLabel={partners.length === 0 && !searchTerm ? "افزودن همکار" : (searchTerm ? "پاک کردن جستجو" : undefined)}
      onEmptyAction={() => {
        if (partners.length === 0 && !searchTerm) return setIsAddModalOpen(true);
        if (searchTerm) setSearchTerm('');
      }}
      toolbarRight={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="h-10 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors whitespace-nowrap"
        >
          <i className="fas fa-user-plus ml-2"></i>افزودن همکار
        </button>
      }
      secondaryRow={<Notification message={notification} onClose={() => setNotification(null)} />}
    >
      <div className="app-card p-4 md:p-6">

        
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-black/10 dark:divide-white/10">
              <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">نام همکار</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">نوع همکار</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">شماره تماس</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">موجودی حساب</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {filteredPartners.map(partner => (
                  <tr key={partner.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{partner.partnerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{PARTNER_TYPES.find(p => p.value === partner.partnerType)?.label || partner.partnerType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" dir="ltr">{partner.phoneNumber || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatPartnerBalance(partner.currentBalance)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/partners/${partner.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm"
                        >
                          مشاهده جزئیات
                        </Link>
                        <button
                          onClick={() => openTelegramReport(partner)}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-sm"
                          title="ارسال گزارش کامل در تلگرام"
                        >
                          <i className="fa-brands fa-telegram ml-2"></i>
                          گزارش تلگرام
                        </button>
                        {/* NEW: delete button */}
                        <button
                          onClick={() => setConfirmDelete(partner)}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
                          title="حذف همکار"
                        >
                          <i className="fa-solid fa-trash-can ml-2"></i>حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* Add Partner Modal */}
      {isAddModalOpen && (
        <Modal title="افزودن همکار جدید" onClose={() => setIsAddModalOpen(false)} widthClass="max-w-lg">
          <form onSubmit={handleAddPartnerSubmit} className="space-y-4 p-1">
            <div>
              <label htmlFor="partnerName" className={labelClass}>نام همکار <span className="text-red-500">*</span></label>
              <input type="text" id="partnerName" name="partnerName" value={newPartner.partnerName} onChange={handleInputChange} className={inputClass('partnerName')} required />
              {formErrors.partnerName && <p className="mt-1 text-xs text-red-600">{formErrors.partnerName}</p>}
            </div>
            <div>
              <label htmlFor="partnerType" className={labelClass}>نوع همکار <span className="text-red-500">*</span></label>
              <select id="partnerType" name="partnerType" value={newPartner.partnerType} onChange={handleInputChange} className={inputClass('partnerType', false, true)} required>
                {PARTNER_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              {formErrors.partnerType && <p className="mt-1 text-xs text-red-600">{formErrors.partnerType}</p>}
            </div>
            <div>
              <label htmlFor="contactPerson" className={labelClass}>فرد رابط</label>
              <input type="text" id="contactPerson" name="contactPerson" value={newPartner.contactPerson} onChange={handleInputChange} className={inputClass('contactPerson')} />
            </div>
            <div>
              <label htmlFor="phoneNumber" className={labelClass}>شماره تماس</label>
              <input type="tel" id="phoneNumber" name="phoneNumber" value={newPartner.phoneNumber} onChange={handleInputChange} className={inputClass('phoneNumber')} placeholder="مثال: 09123456789" />
              {formErrors.phoneNumber && <p className="mt-1 text-xs text-red-600">{formErrors.phoneNumber}</p>}
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>ایمیل</label>
              <input type="email" id="email" name="email" value={newPartner.email} onChange={handleInputChange} className={inputClass('email')} placeholder="example@domain.com" />
              {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="address" className={labelClass}>آدرس</label>
              <textarea id="address" name="address" value={newPartner.address} onChange={handleInputChange} rows={2} className={inputClass('address', true)}></textarea>
            </div>
            <div>
              <label htmlFor="notes" className={labelClass}>یادداشت</label>
              <textarea id="notes" name="notes" value={newPartner.notes} onChange={handleInputChange} rows={2} className={inputClass('notes', true)}></textarea>
            </div>
            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="ml-3 px-4 py-2 text-sm font-medium text-text bg-surface border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-400 transition-colors"
              >
                {isSubmitting ? (<><i className="fas fa-spinner fa-spin mr-2" />در حال ذخیره...</>) : ('ذخیره همکار')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW: Delete confirm modal */}
      {confirmDelete && (
        <Modal
          title="حذف همکار"
          onClose={() => (isDeleting ? null : setConfirmDelete(null))}
          widthClass="max-w-md"
        >
          <div className="p-2 space-y-4">
            <p className="text-sm">
              آیا از حذف <span className="font-semibold">«{confirmDelete.partnerName}»</span> مطمئن هستید؟
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-primary/20 bg-surface hover:bg-primary/5 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleDeletePartner}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {isDeleting ? (<><i className="fas fa-spinner fa-spin mr-2" />در حال حذف...</>) : (<>حذف</>)}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <MessageComposerModal
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        onQueued={() => setNotification({ type: 'success', text: 'گزارش در صف ارسال قرار گرفت.' })}
        initialRecipient={msgInitialRecipient || undefined}
        initialText={msgInitialText}
        initialChannels={{ sms: false, telegram: true }}
      />
    </PageKit>
  );
};

export default PartnersPage;
