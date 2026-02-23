// MobilePhones.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent, useMemo } from 'react';
import moment from 'jalali-moment';
import { useNavigate } from 'react-router-dom';

import {
  PhoneEntry,
  NewPhoneEntryData,
  NotificationMessage,
  PhoneStatus,
  Partner,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
} from '../types';
import Notification from '../components/Notification';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import Modal from '../components/Modal';
import PriceInput from '../components/PriceInput';
import TableToolbar from '../components/TableToolbar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { PHONE_RAM_OPTIONS, PHONE_STORAGE_OPTIONS, PHONE_CONDITIONS, PHONE_STATUSES } from '../constants';
import { formatIsoToShamsi, formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { canManageProducts } from '../utils/rbac';
import { getAuthHeaders } from '../utils/apiUtils';
import { useStyle } from '../contexts/StyleContext';

// ───────────── helpers
const fromDatePickerToISO_YYYY_MM_DD = (date: Date | null): string | undefined =>
  date ? moment(date).format('YYYY-MM-DD') : undefined;

const norm = (s: string) => s.toLowerCase().trim();

/* اتوکامپلیت قابل افزودن (مدل/رنگ) با ذخیرهٔ پایدار در سرور */
type AddableAutocompleteProps = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onAdd: (name: string) => Promise<void>;
  placeholder?: string;
  inputClassName?: string;
  errorText?: string | null;
  dir?: 'rtl' | 'ltr';
};
const AddableAutocomplete: React.FC<AddableAutocompleteProps> = ({
  value,
  onChange,
  options,
  onAdd,
  placeholder,
  inputClassName,
  errorText,
  dir = 'ltr',
}) => {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => setQuery(value || ''), [value]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return (options || []).slice(0, 30);
    return (options || []).filter((m) => norm(String(m)).includes(q)).slice(0, 30);
  }, [options, query]);

  const alreadyExists = (options || []).some((m) => norm(String(m)) === norm(query));
  const canAdd = query.trim().length > 0 && !alreadyExists;

  const selectValue = (v: string) => {
    setQuery(v);
    onChange(v);
    setOpen(false);
  };

  const addAndSelect = async () => {
    const v = query.trim();
    if (!v || !canAdd) return;
    try {
      setAdding(true);
      await onAdd(v);
      selectValue(v);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        dir={dir}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={inputClassName}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
          {filtered.length === 0 && !canAdd && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">موردی یافت نشد</div>
          )}
          {filtered.map((m) => (
            <button
              key={String(m)}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectValue(String(m))}
              className="block w-full text-right px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
            >
              {String(m)}
            </button>
          ))}
          {canAdd && (
            <button
              type="button"
              disabled={adding}
              onMouseDown={(e) => e.preventDefault()}
              onClick={addAndSelect}
              className="block w-full text-right px-3 py-2 text-sm border-t border-gray-200 dark:border-gray-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-700 disabled:opacity-60"
            >
              {adding ? 'در حال افزودن...' : `افزودن «${query.trim()}»`}
            </button>
          )}
        </div>
      )}
      {errorText && <p className="mt-1 text-xs text-red-600">{errorText}</p>}
    </div>
  );
};

// Helper: ساخت payload برای انتخاب خودکار آیتم فروش مطابق انتظار SalesCartPage
const buildPhonePrefillItem = (phone: PhoneEntry) => ({
  id: phone.id,
  type: 'phone' as const,
  name: [
    phone.model,
    phone.storage ? `| ${phone.storage}` : '',
    phone.ram ? `| ${phone.ram}` : '',
    phone.color ? `| ${phone.color}` : '',
    phone.imei ? `| IMEI:${phone.imei}` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim(),
  price: Number(phone.salePrice || 0),
  stock: 1,
});

// ───────────── component
const MobilePhonesPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, currentUser } = useAuth();
  const canManage = canManageProducts(currentUser?.roleName);
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [filteredPhones, setFilteredPhones] = useState<PhoneEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [phoneModels, setPhoneModels] = useState<string[]>([]);
  const [phoneColors, setPhoneColors] = useState<string[]>([]);

  const initialNewPhoneState: NewPhoneEntryData = {
    model: '',
    color: '',
    storage: PHONE_STORAGE_OPTIONS[0],
    ram: PHONE_RAM_OPTIONS[0],
    imei: '',
    batteryHealth: '',
    condition: PHONE_CONDITIONS[0],
    purchasePrice: '',
    salePrice: '',
    status: PHONE_STATUSES[0],
    notes: '',
    supplierId: '',
  };
  const [newPhone, setNewPhone] = useState<NewPhoneEntryData>(initialNewPhoneState);
  const [purchaseDateSelected, setPurchaseDateSelected] = useState<Date | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewPhoneEntryData | 'purchaseDate', string>>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingPartners, setIsFetchingPartners] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<Partial<PhoneEntry>>({});
  const [editPurchaseDateSelected, setEditPurchaseDateSelected] = useState<Date | null>(null);
  const [editFormErrors, setEditFormErrors] = useState<Partial<Record<keyof PhoneEntryUpdatePayload | 'purchaseDate', string>>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPhoneId, setDeletingPhoneId] = useState<number | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Barcode
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedPhoneForBarcode, setSelectedPhoneForBarcode] = useState<PhoneEntry | null>(null);

  // fetchers
  const fetchPhones = async () => {
    if (!token) return;
    setIsFetching(true);
    setNotification(null);
    try {
      const response = await fetch('/api/phones', { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست گوشی‌ها');
      setPhones(result.data);
      setFilteredPhones(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'یک خطای ناشناخته هنگام دریافت گوشی‌ها رخ داد.' });
    } finally {
      setIsFetching(false);
    }
  };
  const fetchPartners = async () => {
    if (!token) return;
    setIsFetchingPartners(true);
    try {
      const response = await fetch('/api/partners?partnerType=Supplier', { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت تامین‌کنندگان');
      setPartners(result.data.filter((p: Partner) => p.partnerType === 'Supplier'));
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'یک خطای ناشناخته هنگام دریافت تامین‌کنندگان رخ داد.' });
    } finally {
      setIsFetchingPartners(false);
    }
  };

  const fetchPhoneMetaLists = async () => {
    if (!token) return;
    try {
      const [mRes, cRes] = await Promise.all([
        fetch('/api/phone-models', { headers: getAuthHeaders(token) }),
        fetch('/api/phone-colors', { headers: getAuthHeaders(token) }),
      ]);
      const mJson = await mRes.json();
      const cJson = await cRes.json();
      if (mRes.ok && mJson?.success) setPhoneModels(Array.isArray(mJson.data) ? mJson.data : []);
      if (cRes.ok && cJson?.success) setPhoneColors(Array.isArray(cJson.data) ? cJson.data : []);
    } catch {
      // بی‌صدا
    }
  };

  const addPhoneModel = async (name: string) => {
    if (!token) return;
    const res = await fetch('/api/phone-models', {
      method: 'POST',
      headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const js = await res.json();
    if (!res.ok || !js?.success) throw new Error(js?.message || 'خطا در افزودن مدل');
    setPhoneModels(Array.isArray(js.data) ? js.data : []);
  };

  const addPhoneColor = async (name: string) => {
    if (!token) return;
    const res = await fetch('/api/phone-colors', {
      method: 'POST',
      headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const js = await res.json();
    if (!res.ok || !js?.success) throw new Error(js?.message || 'خطا در افزودن رنگ');
    setPhoneColors(Array.isArray(js.data) ? js.data : []);
  };

  useEffect(() => {
    if (token) {
      fetchPhones();
      fetchPartners();
      fetchPhoneMetaLists();
    }
  }, [token]);

  useEffect(() => {
    const lower = searchTerm.toLowerCase().trim();
    if (!lower) { setFilteredPhones(phones); return; }
    const filtered = phones.filter(p =>
      p.model.toLowerCase().includes(lower) ||
      p.imei.toLowerCase().includes(lower) ||
      (p.color && p.color.toLowerCase().includes(lower)) ||
      (p.status && p.status.toLowerCase().includes(lower)) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(lower))
    );
    setFilteredPhones(filtered);
  }, [searchTerm, phones]);

  // utils
  const displayError = (error: any, fallback: string) => {
    let text = fallback;
    if (error?.message) text = error.message;
    setNotification({ type: 'error', text });
  };
  const formatPrice = (price: number | undefined | null) =>
    (price === undefined || price === null) ? '-' : price.toLocaleString('fa-IR') + ' تومان';

  // form helpers (unified style)
  const baseInput =
    'w-full p-2.5 rounded-lg text-sm text-right border outline-none transition ' +
    'bg-white border-gray-300 text-gray-900 ' +
    'dark:bg-gray-900/50 dark:border-gray-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 ' +
    'focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500';
  const inputClass = (fieldName?: keyof NewPhoneEntryData | 'purchaseDate' | keyof PhoneEntryUpdatePayload, isSelect = false, errorsObj?: any) => {
    const err = (errorsObj || formErrors)[fieldName as any];
    return `${baseInput} ${isSelect ? 'appearance-none' : ''} ${err ? 'border-red-500 focus:ring-red-500' : ''}`;
  };
  const labelClass = 'block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-2';

  // validate + handlers
  const validateForm = (data: NewPhoneEntryData | PhoneEntryUpdatePayload, isEdit = false): boolean => {
    const errors: Record<string, string> = {};
    if (!data.model?.trim() && !isEdit) errors.model = 'مدل الزامی است.';
    if (data.model && data.model.trim() === '') errors.model = 'مدل نمی‌تواند خالی باشد.';

    if (!data.imei?.trim() && !isEdit) errors.imei = 'IMEI الزامی است.';
    else if (data.imei && !/^\d{15,16}$/.test(data.imei.trim())) errors.imei = 'IMEI باید ۱۵ یا ۱۶ رقم باشد.';

    const purchasePriceStr = String(data.purchasePrice ?? '');
    if ((!purchasePriceStr.trim() && !isEdit) ||
        (purchasePriceStr.trim() && (isNaN(parseFloat(purchasePriceStr)) || parseFloat(purchasePriceStr) < 0))) {
      errors.purchasePrice = 'قیمت خرید باید عددی غیرمنفی باشد.';
    } else if (parseFloat(purchasePriceStr) > 0 && !(data as any).supplierId) {
      errors.supplierId = 'برای ثبت قیمت خرید، انتخاب تامین‌کننده الزامی است.';
    }

    const salePriceStr = String(data.salePrice ?? '');
    if (salePriceStr.trim() && (isNaN(parseFloat(salePriceStr)) || parseFloat(salePriceStr) < 0)) {
      errors.salePrice = 'قیمت فروش (در صورت وجود) باید عددی غیرمنفی باشد.';
    }

    const batteryHealthStr = String((data as any).batteryHealth ?? '');
    if (batteryHealthStr.trim() && (isNaN(parseInt(batteryHealthStr, 10)) ||
      parseInt(batteryHealthStr, 10) < 0 || parseInt(batteryHealthStr, 10) > 100)) {
      errors.batteryHealth = 'سلامت باتری باید عددی بین ۰ تا ۱۰۰ باشد.';
    }
    if (!(data as any).status && !isEdit) errors.status = 'وضعیت الزامی است.';

    if (isEdit) setEditFormErrors(errors);
    else setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> |
    { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    setNewPhone(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof NewPhoneEntryData]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm(newPhone) || !token) return;
    setIsLoading(true); setNotification(null);

    const payload: PhoneEntryPayload = {
      model: newPhone.model,
      color: newPhone.color || undefined,
      storage: newPhone.storage || undefined,
      ram: newPhone.ram || undefined,
      imei: newPhone.imei,
      batteryHealth: newPhone.batteryHealth ? parseInt(String(newPhone.batteryHealth), 10) : undefined,
      condition: newPhone.condition || undefined,
      purchasePrice: parseFloat(String(newPhone.purchasePrice)),
      salePrice: newPhone.salePrice ? parseFloat(String(newPhone.salePrice)) : undefined,
      sellerName: (newPhone as any).sellerName || undefined,
      purchaseDate: fromDatePickerToISO_YYYY_MM_DD(purchaseDateSelected),
      saleDate: undefined,
      status: newPhone.status || PHONE_STATUSES[0],
      notes: newPhone.notes || undefined,
      supplierId: newPhone.supplierId ? parseInt(String(newPhone.supplierId), 10) : null,
      registerDate: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/phones', { method: 'POST', headers: getAuthHeaders(token), body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در افزودن گوشی');
      setNewPhone(initialNewPhoneState);
      setPurchaseDateSelected(null);
      setFormErrors({});
      setNotification({ type: 'success', text: 'گوشی با موفقیت اضافه شد!' });
      await fetchPhones();
    } catch (error: any) {
      const msg = error.message || 'یک خطای ناشناخته هنگام افزودن گوشی رخ داد.';
      setNotification({ type: 'error', text: msg });
      if (msg.includes('IMEI')) setFormErrors(prev => ({ ...prev, imei: 'این شماره IMEI قبلا ثبت شده است.' }));
    } finally {
      setIsLoading(false);
    }
  };

  // edit
  const openEditModal = (phone: PhoneEntry) => {
    setEditingPhone({ ...phone });
    setEditPurchaseDateSelected(phone.purchaseDate ? moment(phone.purchaseDate, 'YYYY-MM-DD').toDate() : null);
    setEditFormErrors({});
    setIsEditModalOpen(true);
  };
  const handleEditInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> |
    { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    setEditingPhone(prev => ({ ...prev, [name]: value }));
    if (editFormErrors[name as keyof PhoneEntryUpdatePayload]) setEditFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPhone.id || !validateForm(editingPhone as PhoneEntryUpdatePayload, true) || !token) return;
    setIsSubmittingEdit(true); setNotification(null);

    const payload: PhoneEntryUpdatePayload = {
      model: editingPhone.model,
      color: editingPhone.color,
      storage: editingPhone.storage,
      ram: editingPhone.ram,
      imei: editingPhone.imei,
      batteryHealth: editingPhone.batteryHealth ? String(editingPhone.batteryHealth) : undefined,
      condition: editingPhone.condition,
      purchasePrice: editingPhone.purchasePrice ? String(editingPhone.purchasePrice) : undefined,
      salePrice: editingPhone.salePrice ? String(editingPhone.salePrice) : undefined,
      sellerName: editingPhone.sellerName,
      purchaseDate: fromDatePickerToISO_YYYY_MM_DD(editPurchaseDateSelected),
      status: editingPhone.status,
      notes: editingPhone.notes,
      supplierId: editingPhone.supplierId ? String(editingPhone.supplierId) : undefined,
    };

    try {
      const response = await fetch(`/api/phones/${editingPhone.id}`, { method: 'PUT', headers: getAuthHeaders(token), body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در به‌روزرسانی گوشی');
      setNotification({ type: 'success', text: result.message || 'گوشی به‌روزرسانی شد.' });
      setIsEditModalOpen(false);
      setEditingPhone({});
      await fetchPhones();
    } catch (error: any) {
      const msg = error.message || 'یک خطای ناشناخته رخ داد.';
      setNotification({ type: 'error', text: msg });
      if (msg.includes('IMEI')) setEditFormErrors(prev => ({ ...prev, imei: 'این IMEI برای گوشی دیگری ثبت شده است.' }));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // delete
  const openDeleteModal = (id: number) => { setDeletingPhoneId(id); setIsDeleteModalOpen(true); };
  const handleConfirmDelete = async () => {
    if (!canManage) { setNotification({ type: 'error', text: 'شما دسترسی حذف گوشی را ندارید.' }); return; }

    if (!deletingPhoneId || !token) return;
    setIsSubmittingDelete(true);
    try {
      const response = await fetch(`/api/phones/${deletingPhoneId}`, { method: 'DELETE', headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در حذف گوشی');
      setNotification({ type: 'success', text: result.message || 'حذف شد.' });
      setIsDeleteModalOpen(false);
      setDeletingPhoneId(null);
      await fetchPhones();
    } catch (error) {
      displayError(error, 'خطا در حذف گوشی.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // sell + barcode
  const handleSellPhone = (phone: PhoneEntry) => {
    // امکان فروش برای گوشی‌هایی که یا در انبار موجود هستند یا از فروش اقساطی مرجوع شده‌اند.
    // در غیر این صورت هشداری به کاربر نمایش داده می‌شود.
    if (phone.status !== 'موجود در انبار' && phone.status !== 'مرجوعی اقساطی' && phone.status !== 'مرجوعی') {
      setNotification({ type: 'warning', text: `گوشی در وضعیت "${phone.status}" است و قابل فروش نیست.` });
      return;
    }
    if (!phone.salePrice || phone.salePrice <= 0) {
      setNotification({ type: 'warning', text: 'قیمت فروش برای این گوشی مشخص نشده.' });
      return;
    }

    const prefillItem = buildPhonePrefillItem(phone);
    navigate('/sales', { state: { prefillItem }, replace: false });
  };

  const openBarcodeModal = (p: PhoneEntry) => { setSelectedPhoneForBarcode(p); setIsBarcodeModalOpen(true); };

  /**
   * اطلاعات مربوط به نشان (badge) وضعیت گوشی.
   * شامل کلاس‌های رنگ و آیکون مناسب برای هر وضعیت.
   */
  const statusBadgeInfo = (status: PhoneStatus): { bgClass: string; icon: string } => {
    switch (status) {
      case 'موجود در انبار':
        return {
          bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          icon: 'fa-box-open',
        };
      case 'فروخته شده':
        return {
          bgClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
          icon: 'fa-check-circle',
        };
      case 'فروخته شده (قسطی)':
        return {
          bgClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
          icon: 'fa-file-invoice-dollar',
        };
      case 'مرجوعی':
        return {
          bgClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          icon: 'fa-rotate-left',
        };
      case 'مرجوعی اقساطی':
        return {
          bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
          icon: 'fa-rotate-left',
        };
      default:
        return {
          bgClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
          icon: 'fa-circle-question',
        };
    }
  };

  // ───────────── render
  return (
    <div className="space-y-6 text-right max-w-7xl mx-auto px-4" dir="rtl" style={{ ['--brand' as any]: brand }}>
      {/* dark popover overrides for common date pickers */}
      <style>{`
        .rmdp-wrapper, .react-datepicker, .date-picker-pop, .rdp { background-color: #111827 !important; color:#e5e7eb !important; }
        .rmdp-day, .react-datepicker__day { color:#e5e7eb !important; }
        .rmdp-day.rmdp-selected span, .react-datepicker__day--selected { background:${brand} !important; color:#fff !important; }
      `}</style>

      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Add New Phone */}
      <div className="rounded-xl shadow-lg p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 pb-3 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <i className="fa-solid fa-mobile-screen-button" style={{ color: brand }} />
          افزودن گوشی موبایل جدید
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="model" className={labelClass}>
                <i className="fa-solid fa-tag" style={{ color: brand }} /> مدل <span className="text-rose-500">*</span>
              </label>
              <AddableAutocomplete
                value={newPhone.model}
                onChange={(v) => handleInputChange({ target: { name: 'model', value: v } })}
                options={phoneModels}
                onAdd={addPhoneModel}
                placeholder="مثال: Poco C85"
                inputClassName={inputClass('model')}
                errorText={formErrors.model || null}
                dir="ltr"
              />
            </div>

            <div>
              <label htmlFor="imei" className={labelClass}>
                <i className="fa-solid fa-hashtag" style={{ color: brand }} /> IMEI <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="imei"
                name="imei"
                value={newPhone.imei}
                onChange={handleInputChange}
                className={inputClass('imei')}
                placeholder="۱۵ یا ۱۶ رقم سریال"
              />
              {formErrors.imei && <p className="mt-1 text-xs text-rose-500">{formErrors.imei}</p>}
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-wand-sparkles" style={{ color: brand }} /> وضعیت ظاهری</label>
              <select name="condition" value={newPhone.condition} onChange={handleInputChange} className={inputClass('condition', true)}>
                {PHONE_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-droplet" style={{ color: brand }} /> رنگ</label>
              <AddableAutocomplete
                value={newPhone.color || ''}
                onChange={(v) => handleInputChange({ target: { name: 'color', value: v } })}
                options={phoneColors}
                onAdd={addPhoneColor}
                placeholder="مثال: آبی تیتانیوم"
                inputClassName={inputClass('color')}
                errorText={formErrors.color || null}
                dir="rtl"
              />
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-sd-card" style={{ color: brand }} /> حافظه داخلی</label>
              <select name="storage" value={newPhone.storage} onChange={handleInputChange} className={inputClass('storage', true)}>
                {PHONE_STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-microchip" style={{ color: brand }} /> رَم</label>
              <select name="ram" value={newPhone.ram} onChange={handleInputChange} className={inputClass('ram', true)}>
                {PHONE_RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-sack-dollar" style={{ color: brand }} /> قیمت خرید (تومان) <span className="text-rose-500">*</span></label>
              <PriceInput
                name="purchasePrice"
                value={String(newPhone.purchasePrice)}
                onChange={handleInputChange}
                className={`${inputClass('purchasePrice')} text-left`}
                placeholder="مثال: ۳۵۰۰۰۰۰۰"
              />
              {formErrors.purchasePrice && <p className="mt-1 text-xs text-rose-500">{formErrors.purchasePrice}</p>}
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-people-carry-box" style={{ color: brand }} /> تامین‌کننده</label>
              <select
                name="supplierId"
                value={newPhone.supplierId || ''}
                onChange={handleInputChange}
                className={inputClass('supplierId', true)}
                disabled={isFetchingPartners}
              >
                <option value="">-- انتخاب تامین‌کننده --</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.partnerName}</option>)}
              </select>
              {isFetchingPartners && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">درحال بارگذاری…</p>}
              {formErrors.supplierId && <p className="mt-1 text-xs text-rose-500">{formErrors.supplierId}</p>}
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-battery-three-quarters" style={{ color: brand }} /> سلامت باتری (٪)</label>
              <input
                type="number"
                name="batteryHealth"
                value={newPhone.batteryHealth}
                onChange={handleInputChange}
                className={inputClass('batteryHealth')}
                placeholder="مثال: ۹۵"
                min={0}
                max={100}
              />
              {formErrors.batteryHealth && <p className="mt-1 text-xs text-rose-500">{formErrors.batteryHealth}</p>}
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-calendar-days" style={{ color: brand }} /> تاریخ خرید</label>
              <ShamsiDatePicker
                selectedDate={purchaseDateSelected}
                onDateChange={setPurchaseDateSelected}
                inputClassName={inputClass('purchaseDate')}
              />
              {formErrors.purchaseDate && <p className="mt-1 text-xs text-rose-500">{formErrors.purchaseDate}</p>}
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-tags" style={{ color: brand }} /> قیمت فروش (تومان)</label>
              <PriceInput
                name="salePrice"
                value={String(newPhone.salePrice || '')}
                onChange={handleInputChange}
                className={`${inputClass('salePrice')} text-left`}
                placeholder="مثال: ۳۸۵۰۰۰۰۰"
              />
              {formErrors.salePrice && <p className="mt-1 text-xs text-rose-500">{formErrors.salePrice}</p>}
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-check-circle" style={{ color: brand }} /> وضعیت <span className="text-rose-500">*</span></label>
              <select name="status" value={newPhone.status} onChange={handleInputChange} className={inputClass('status', true)}>
                {PHONE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {formErrors.status && <p className="mt-1 text-xs text-rose-500">{formErrors.status}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}><i className="fa-solid fa-note-sticky" style={{ color: brand }} /> یادداشت‌ها</label>
            <textarea name="notes" value={newPhone.notes || ''} onChange={handleInputChange} rows={3} className={inputClass('notes')} />
          </div>

          <button
            type="submit"
            disabled={isLoading || isFetching || isFetchingPartners || !token}
            className="w-full sm:w-auto px-6 py-2.5 text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-70"
            style={{ backgroundColor: brand }}
          >
            {isLoading ? (<><i className="fas fa-spinner fa-spin ml-2"></i>در حال افزودن...</>) : 'افزودن گوشی'}
          </button>
        </form>
      </div>

      {/* Phone List */}
      <div className="app-card p-0 overflow-hidden">
        <div className="p-4 md:p-6">
          <TableToolbar
            title="لیست گوشی‌های ثبت شده"
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="جستجو بر اساس مدل، IMEI، تامین‌کننده…"
            actions={
              <div className="text-xs text-muted whitespace-nowrap">
                {isFetching ? 'در حال بارگذاری…' : `${filteredPhones.length.toLocaleString('fa-IR')} مورد`}
              </div>
            }
          />
        </div>

        {isFetching ? (
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3" rounded="lg" />
                      <Skeleton className="h-4 w-1/2" rounded="lg" />
                    </div>
                    <Skeleton className="h-6 w-20" rounded="full" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <Skeleton key={j} className="h-4" rounded="lg" />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-9" rounded="xl" />
                      <Skeleton className="h-9 w-20" rounded="xl" />
                    </div>
                    <Skeleton className="h-9 w-24" rounded="xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : phones.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="fa-solid fa-mobile-screen"
              title="هنوز هیچ گوشی ثبت نشده است"
              description="برای شروع، از فرم بالای صفحه یک گوشی جدید ثبت کنید."
            />
          </div>
        ) : filteredPhones.length === 0 && searchTerm ? (
          <div className="p-6">
            <EmptyState
              icon="fa-solid fa-magnifying-glass"
              title="چیزی پیدا نشد"
              description="عبارت جستجو را تغییر دهید یا پاک کنید."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-4 sm:p-6">
            {filteredPhones.map((phone) => (
              <div
                key={phone.id}
                className="rounded-xl border bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-base font-extrabold" style={{ color: brand }}>{phone.model}</h4>
                    {(() => {
                      const info = statusBadgeInfo(phone.status);
                      return (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${info.bgClass}`}>
                          <i className={`fa-solid ${info.icon}`}></i>
                          {phone.status}
                        </span>
                      );
                    })()}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2" dir="ltr">IMEI: {phone.imei}</p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3 text-gray-700 dark:text-gray-300">
                    <p><strong className="text-gray-600 dark:text-gray-400">رنگ:</strong> {phone.color || '-'}</p>
                    <p><strong className="text-gray-600 dark:text-gray-400">حافظه:</strong> {phone.storage || '-'}</p>
                    <p><strong className="text-gray-600 dark:text-gray-400">رم:</strong> {phone.ram || '-'}</p>
                    <p><strong className="text-gray-600 dark:text-gray-400">وضعیت:</strong> {phone.condition || '-'}</p>
                    {(phone.batteryHealth !== null && phone.batteryHealth !== undefined) && (
                      <p><strong className="text-gray-600 dark:text-gray-400">باتری:</strong> {phone.batteryHealth}%</p>
                    )}
                    {phone.supplierName && <p><strong className="text-gray-600 dark:text-gray-400">تامین‌کننده:</strong> {phone.supplierName}</p>}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 text-xs space-y-1 text-gray-700 dark:text-gray-300">
                    <p><strong className="text-gray-600 dark:text-gray-400">قیمت خرید:</strong> {formatPrice(phone.purchasePrice)}</p>
                    {(phone.salePrice !== null && phone.salePrice !== undefined) && (
                      <p><strong className="text-gray-600 dark:text-gray-400">قیمت فروش فعلی:</strong> {formatPrice(phone.salePrice)}</p>
                    )}
                    <p><strong className="text-gray-600 dark:text-gray-400">تاریخ ثبت سیستمی:</strong> {formatIsoToShamsiDateTime(phone.registerDate)}</p>
                    {phone.purchaseDate && <p><strong className="text-gray-600 dark:text-gray-400">تاریخ خرید:</strong> {formatIsoToShamsi(phone.purchaseDate)}</p>}
                    {phone.saleDate && (phone.status === 'فروخته شده' || phone.status === 'فروخته شده (قسطی)') &&
                      <p><strong className="text-gray-600 dark:text-gray-400">تاریخ فروش:</strong> {formatIsoToShamsi(phone.saleDate)}</p>}

                    {/* نمایش نام خریدار در صورت وجود */}
                    {phone.buyerName && (
                      <p><strong className="text-gray-600 dark:text-gray-400">خریدار:</strong> {phone.buyerName}</p>
                    )}

                    {/* نمایش تاریخ مرجوعی در هر صورت اگر این مقدار موجود باشد */}
                    {phone.returnDate && (
                      <p><strong className="text-gray-600 dark:text-gray-400">تاریخ مرجوعی:</strong> {formatIsoToShamsi(phone.returnDate)}</p>
                    )}
                  </div>

                  {phone.notes && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        <strong className="text-gray-600 dark:text-gray-400">یادداشت:</strong> {phone.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => openBarcodeModal(phone)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="چاپ بارکد"
                  >
                    <i className="fas fa-barcode" />
                  </button>

                    <button
                    onClick={() => handleSellPhone(phone)}
                    /* امکان فروش گوشی‌های در انبار یا مرجوعی اقساطی */
                    disabled={phone.status !== 'موجود در انبار' && phone.status !== 'مرجوعی اقساطی'}
                    className="px-3 py-1.5 text-xs rounded-lg text-white disabled:opacity-50"
                    style={{ backgroundColor: brand }}
                    title="فروش این گوشی"
                  >
                    <i className="fas fa-cash-register ml-1" /> فروش
                  </button>

                  {canManage && (
                  <button
                    onClick={() => openEditModal(phone)}
                    className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    title="ویرایش"
                  >
                    <i className="fas fa-edit" />
                  </button>
                )}

                  {canManage && (
                  <button
                    onClick={() => openDeleteModal(phone.id)}
                    className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    title="حذف"
                  >
                    <i className="fas fa-trash" />
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingPhone.id && (
        <Modal
          title={`ویرایش گوشی: ${editingPhone.model} (IMEI: ${editingPhone.imei})`}
          onClose={() => setIsEditModalOpen(false)}
          widthClass="max-w-2xl"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 p-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}><i className="fa-solid fa-tag" style={{ color: brand }} /> مدل</label>
                <AddableAutocomplete
				  value={editingPhone.model || ''}
				  onChange={(v) => handleEditInputChange({ target: { name: 'model', value: v } })}
				  options={phoneModels}
				  onAdd={addPhoneModel}
				  placeholder="مثال: Galaxy S24 Ultra"
				  inputClassName={inputClass('model', false, editFormErrors)}
				  errorText={editFormErrors.model || null}
				  dir="ltr"
				/>

              </div>

              <div>
                <label className={labelClass}><i className="fa-solid fa-hashtag" style={{ color: brand }} /> IMEI</label>
                <input
                  name="imei"
                  value={editingPhone.imei || ''}
                  onChange={handleEditInputChange}
                  className={inputClass('imei', false, editFormErrors)}
                />
                {editFormErrors.imei && <p className="text-xs text-rose-500">{editFormErrors.imei}</p>}
              </div>

              <div>
                <label className={labelClass}><i className="fa-solid fa-wand-sparkles" style={{ color: brand }} /> وضعیت ظاهری</label>
                <select
                  name="condition"
                  value={editingPhone.condition || ''}
                  onChange={handleEditInputChange}
                  className={inputClass('condition', true, editFormErrors)}
                >
                  {PHONE_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div><label className={labelClass}><i className="fa-solid fa-droplet" style={{ color: brand }} /> رنگ</label><input name="color" value={editingPhone.color || ''} onChange={handleEditInputChange} className={inputClass('color', false, editFormErrors)} /></div>
              <div><label className={labelClass}><i className="fa-solid fa-sd-card" style={{ color: brand }} /> حافظه</label><select name="storage" value={editingPhone.storage || ''} onChange={handleEditInputChange} className={inputClass('storage', true, editFormErrors)}>{PHONE_STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className={labelClass}><i className="fa-solid fa-microchip" style={{ color: brand }} /> رم</label><select name="ram" value={editingPhone.ram || ''} onChange={handleEditInputChange} className={inputClass('ram', true, editFormErrors)}>{PHONE_RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>

              <div className="space-y-1">
                <label className={labelClass}><i className="fa-solid fa-sack-dollar" style={{ color: brand }} /> قیمت خرید</label>
                <PriceInput
                  name="purchasePrice"
                  value={String(editingPhone.purchasePrice || '')}
                  onChange={handleEditInputChange}
                  className={`${inputClass('purchasePrice', false, editFormErrors)} text-left`}
                />
                {editFormErrors.purchasePrice && <p className="text-xs text-rose-500">{editFormErrors.purchasePrice}</p>}
              </div>

              <div>
                <label className={labelClass}><i className="fa-solid fa-people-carry-box" style={{ color: brand }} /> تامین‌کننده</label>
                <select
                  name="supplierId"
                  value={editingPhone.supplierId || ''}
                  onChange={handleEditInputChange}
                  className={inputClass('supplierId', true, editFormErrors)}
                  disabled={isFetchingPartners}
                >
                  <option value="">-- انتخاب --</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.partnerName}</option>)}
                </select>
                {editFormErrors.supplierId && <p className="text-xs text-rose-500">{editFormErrors.supplierId}</p>}
              </div>

              <div>
                <label className={labelClass}><i className="fa-solid fa-battery-three-quarters" style={{ color: brand }} /> سلامت باتری (٪)</label>
                <input
                  name="batteryHealth"
                  value={editingPhone.batteryHealth || ''}
                  onChange={handleEditInputChange}
                  className={inputClass('batteryHealth', false, editFormErrors)}
                />
                {editFormErrors.batteryHealth && <p className="text-xs text-rose-500">{editFormErrors.batteryHealth}</p>}
              </div>

              <div>
                <label className={labelClass}><i className="fa-solid fa-calendar-days" style={{ color: brand }} /> تاریخ خرید</label>
                <ShamsiDatePicker
                  selectedDate={editPurchaseDateSelected}
                  onDateChange={setEditPurchaseDateSelected}
                  inputClassName={inputClass('purchaseDate', false, editFormErrors)}
                />
                {editFormErrors.purchaseDate && <p className="text-xs text-rose-500">{editFormErrors.purchaseDate}</p>}
              </div>

              <div className="space-y-1">
                <label className={labelClass}><i className="fa-solid fa-tags" style={{ color: brand }} /> قیمت فروش</label>
                <PriceInput
                  name="salePrice"
                  value={String(editingPhone.salePrice || '')}
                  onChange={handleEditInputChange}
                  className={`${inputClass('salePrice', false, editFormErrors)} text-left`}
                />
                {editFormErrors.salePrice && <p className="text-xs text-rose-500">{editFormErrors.salePrice}</p>}
              </div>

              <div>
                <label className={labelClass}><i className="fa-solid fa-check-circle" style={{ color: brand }} /> وضعیت</label>
                <select name="status" value={editingPhone.status || ''} onChange={handleEditInputChange} className={inputClass('status', true, editFormErrors)}>
                  {PHONE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}><i className="fa-solid fa-note-sticky" style={{ color: brand }} /> یادداشت</label>
              <textarea name="notes" value={editingPhone.notes || ''} onChange={handleEditInputChange} rows={2} className={inputClass('notes', false, editFormErrors)} />
            </div>

            <div className="flex justify-end pt-4 gap-3 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmittingEdit || !token}
                className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
                style={{ backgroundColor: brand }}
              >
                {isSubmittingEdit ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Phone Modal */}
      {isDeleteModalOpen && deletingPhoneId !== null && (
        <Modal title="تایید حذف گوشی" onClose={() => setIsDeleteModalOpen(false)}>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            آیا از حذف این گوشی مطمئن هستید؟ این عمل قابل بازگشت نیست.
          </p>
          <div className="flex justify-end pt-3 gap-3">
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
              انصراف
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isSubmittingDelete || !token}
              className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
              style={{ backgroundColor: brand }}
            >
              {isSubmittingDelete ? 'در حال حذف...' : 'تایید و حذف'}
            </button>
          </div>
        </Modal>
      )}

      {/* Barcode Modal */}
      {isBarcodeModalOpen && selectedPhoneForBarcode && (
        <Modal
          title={`بارکد برای: ${selectedPhoneForBarcode.model}`}
          onClose={() => setIsBarcodeModalOpen(false)}
          widthClass="max-w-sm"
          wrapperClassName="printable-area"
        >
          <div id="barcode-label-content" className="text-center p-4">
            <img src={`/api/barcode/phone/${selectedPhoneForBarcode.id}`} alt={`Barcode for ${selectedPhoneForBarcode.model}`} className="mx-auto" />
            <p className="mt-2 font-semibold text-lg text-gray-900 dark:text-gray-100">{selectedPhoneForBarcode.model}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">IMEI: {selectedPhoneForBarcode.imei}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{formatPrice(selectedPhoneForBarcode.salePrice)}</p>
          </div>
          <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: brand }}
            >
              <i className="fas fa-print ml-2" /> چاپ برچسب
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MobilePhonesPage;
