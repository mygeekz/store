// src/pages/AddInstallmentSalePage.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';

import {
  NewInstallmentSaleData,
  InstallmentCheckInfo,
  Customer,
  PhoneEntry,
  NotificationMessage,
  InstallmentSalePayload,
} from '../types';
import Notification from '../components/Notification';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import Modal from '../components/Modal';
import PriceInput from '../components/PriceInput';
import FormSection from '../components/FormSection';
import FormErrorSummary, { FormErrors } from '../components/FormErrorSummary';
import { focusFirstError } from '../utils/focusFirstError';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import WorkflowWizard, { WizardStep } from '../components/WorkflowWizard';

/* ---------------- Helpers (یک‌بار تعریف) ---------------- */
// رِند به بالا تا 100هزار
const roundUp100k = (v: number) => Math.ceil((v || 0) / 100000) * 100000;

const parseNumLoose = (val: any, def = NaN) => {
  if (val === null || val === undefined) return def;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d\-\.]/g, '');
    const n = Number(cleaned);
    return Number.isNaN(n) ? def : n;
  }
  return def;
};
const toNumber = (v: any) => {
  const n = parseNumLoose(v, 0);
  return Number.isNaN(n) ? 0 : n;
};
const pickFirstNumber = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const n = parseNumLoose(obj?.[k]);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
};

/* ---------------- Types ---------------- */
type ProductItem = {
  id: number;
  title: string;
  buyPrice?: number;
  salePrice?: number;
  stock?: number | null; // null => نامشخص
};

type ServiceItem = {
  id: number;
  name: string;
  price?: number;
};
type AccessoryLine = {
  productId: number;
  name: string;
  buyPrice: number;
  sellPrice: number;
  qty: number;
};
type PhoneLine = {
  id: number;
  title: string;
  imei?: string | null;
  buyPrice: number;
  sellPrice: number;
};

type ServiceLine = {
  serviceId: number;
  name: string;
  sellPrice: number;
  qty: number;
};

type SaleType = 'installment' | 'check';

const AddInstallmentSalePage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const initialFormState: NewInstallmentSaleData = {
    customerId: null,
    phoneId: null, // اگر فقط ۱ گوشی بود همچنان پر می‌شود
    actualSalePrice: '',
    downPayment: '',
    numberOfInstallments: '',
    installmentAmount: '',
    installmentsStartDate: moment().locale('fa').format('YYYY/MM/DD'),
    checks: [],
    notes: '',
  };

  const [formData, setFormData] = useState<NewInstallmentSaleData>(initialFormState);
  const [wizardStep, setWizardStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availablePhones, setAvailablePhones] = useState<PhoneEntry[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);

  // انتخاب چند گوشی
  const [phoneLines, setPhoneLines] = useState<PhoneLine[]>([]);
  const [phoneToAddId, setPhoneToAddId] = useState<number | ''>('');

  // لوازم
  const [accessories, setAccessories] = useState<AccessoryLine[]>([]);
  const [isAccessoryModalOpen, setIsAccessoryModalOpen] = useState(false);
  const [accessoryProductId, setAccessoryProductId] = useState<number | ''>('');
  const [accessoryQty, setAccessoryQty] = useState<number>(1);
  const [modalSellPrice, setModalSellPrice] = useState<number>(0);
  const [modalBuyPrice, setModalBuyPrice] = useState<number>(0);
  const [modalStock, setModalStock] = useState<number | null>(0);
  const [modalProductName, setModalProductName] = useState<string>('');

  // خدمات
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToAddId, setServiceToAddId] = useState<number | ''>('');
  const [serviceQty, setServiceQty] = useState<number>(1);
  const [serviceModalPrice, setServiceModalPrice] = useState<number>(0);
  const [serviceModalName, setServiceModalName] = useState<string>('');

  // نوع فروش
  const [saleType, setSaleType] = useState<SaleType>('installment');
  const [checkMonths, setCheckMonths] = useState<number>(1); // وقتی فروش چکی است

  // درصد سود ماهانه + تخفیف تومانی
  const [profitPercent, setProfitPercent] = useState<number>(0);
  const [discountToman, setDiscountToman] = useState<number>(0);

  // چک‌ها
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const initialCheckState: Omit<InstallmentCheckInfo, 'id' | 'status'> = {
    checkNumber: '',
    bankName: '',
    dueDate: moment().locale('fa').format('YYYY/MM/DD'),
    amount: 0,
  };
  const [currentCheck, setCurrentCheck] = useState(initialCheckState);
  const [currentCheckDueDate, setCurrentCheckDueDate] = useState<Date | null>(new Date());

  // تاریخ شروع اقساط
  const [installmentsStartDatePicker, setInstallmentsStartDatePicker] = useState<Date | null>(new Date());

  // UI/Loading
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingPhones, setIsLoadingPhones] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof NewInstallmentSaleData | 'checks' | 'discount' | 'saleType' | 'checkMonths' | 'items', string>>
  >({});

  const fieldIdMap: Record<string, string> = {
    customerId: 'customerId',
    items: 'items-section',
    actualSalePrice: 'actualSalePrice',
    downPayment: 'downPayment',
    discount: 'discountToman',
    numberOfInstallments: 'numberOfInstallments',
    installmentAmount: 'installmentAmount',
    checkMonths: 'checkMonths',
  };

  const errorLabels: Record<string, string> = {
    customerId: 'مشتری',
    items: 'اقلام فروش',
    actualSalePrice: 'قیمت نهایی',
    downPayment: 'پیش‌پرداخت',
    discount: 'تخفیف',
    numberOfInstallments: 'تعداد اقساط',
    installmentAmount: 'مبلغ هر قسط',
    checkMonths: 'ماه‌های چک',
  };

  /* ---------------- Derived sums ---------------- */
  const phonesSellTotal = phoneLines.reduce((s, p) => s + (p.sellPrice || 0), 0);
  const phonesBuyTotal  = phoneLines.reduce((s, p) => s + (p.buyPrice  || 0), 0);

  const accessoriesSellTotal = accessories.reduce((s, a) => s + a.sellPrice * (a.qty || 0), 0);
  const accessoriesBuyTotal  = accessories.reduce((s, a) => s + a.buyPrice  * (a.qty || 0), 0);

  const servicesSellTotal = serviceLines.reduce((s, sv) => s + (sv.sellPrice || 0) * (sv.qty || 0), 0);

  /* ---------------- Fetchers ---------------- */
  const fetchCustomers = async () => {
    if (!token) return;
    setIsLoadingCustomers(true);
    try {
      const r = await fetch('/api/customers', { headers: getAuthHeaders(token) });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'خطا در دریافت مشتریان');
      setCustomers(j.data || []);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingCustomers(false);
    }
  };
  const fetchAvailablePhones = async () => {
    if (!token) return;
    setIsLoadingPhones(true);
    try {
      const r = await fetch('/api/phones?status=موجود%20در%20انبار,مرجوعی,مرجوعی%20اقساطی', { headers: getAuthHeaders(token) });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'خطا در دریافت لیست گوشی‌ها');
      setAvailablePhones(j.data || []);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingPhones(false);
    }
  };
  const fetchAvailableProducts = async () => {
    if (!token) return;
    setIsLoadingProducts(true);
    try {
      const r = await fetch('/api/products?status=available', { headers: getAuthHeaders(token) });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'خطا در دریافت محصولات');

      const items: ProductItem[] = (j.data || []).map((p: any) => {
        const buy  = pickFirstNumber(p, ['buyPrice','purchasePrice','baseBuyPrice']);
        const sell = pickFirstNumber(p, ['salePrice','price','baseSalePrice','sellingPrice','unit_price']);
        const stockKeys = [
          'stock','inventory','quantity','qty','available','remain','remainingStock',
          'count','onHand','inStock','stock_count','current_stock','balance','storeCount'
        ];
        const rawStock = pickFirstNumber(p, stockKeys);
        const stock: number | null = (rawStock === undefined || Number.isNaN(rawStock)) ? null : Number(rawStock);
        return {
          id: Number(p.id),
          title: p.title || p.name || `#${p.id}`,
          buyPrice: buy ?? 0,
          salePrice: sell ?? 0,
          stock,
        };
      });
      setAvailableProducts(items);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchAvailableServices = async () => {
    // این endpoint عمومی است ولی برای یکپارچگی هدر احراز هویت را (در صورت وجود) می‌فرستیم.
    setIsLoadingServices(true);
    try {
      const r = await fetch('/api/services', { headers: token ? getAuthHeaders(token) : undefined });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'خطا در دریافت خدمات');
      const items: ServiceItem[] = (j.data || []).map((s: any) => ({
        id: Number(s.id),
        name: String(s.name || `#${s.id}`),
        price: toNumber(s.price ?? 0),
      }));
      setAvailableServices(items);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCustomers();
      fetchAvailablePhones();
      fetchAvailableProducts();
      fetchAvailableServices();
    }
  }, [token]);

  useEffect(() => {
    if (installmentsStartDatePicker) {
      setFormData(prev => ({
        ...prev,
        installmentsStartDate: moment(installmentsStartDatePicker).locale('fa').format('YYYY/MM/DD'),
      }));
    }
  }, [installmentsStartDatePicker]);

  useEffect(() => {
    if (currentCheckDueDate) {
      setCurrentCheck(prev => ({ ...prev, dueDate: moment(currentCheckDueDate).locale('fa').format('YYYY/MM/DD') }));
    }
  }, [currentCheckDueDate]);

  /* ---------------- Form handlers ---------------- */
  const handleFormInputChange = (
    e:
      | ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
      | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;

    if (name === 'downPayment' || name === 'numberOfInstallments' || name === 'installmentAmount' || name === 'notes') {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === 'customerId') {
      setFormData(prev => ({ ...prev, customerId: value ? (Number(value) as any) : null }));
    }

    if ((formErrors as any)[name]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /* ---------------- Phones (multi) ---------------- */
  const addPhoneLine = () => {
    if (!phoneToAddId) return;
    const p = availablePhones.find(x => x.id === Number(phoneToAddId));
    if (!p) return;

    if (phoneLines.some(l => l.id === p.id)) {
      setNotification({ type: 'error', text: 'این موبایل قبلاً افزوده شده است.' });
      return;
    }

    setPhoneLines(prev => [
      ...prev,
      {
        id: p.id,
        title: (p as any).title || p.model || `#${p.id}`,
        imei: (p as any).imei || null,
        buyPrice: toNumber((p as any).buyPrice ?? (p as any).purchasePrice),
        sellPrice: toNumber((p as any).salePrice),
      },
    ]);

    // اگر تنها یک گوشی داریم، phoneId فرم را هم ست کنیم (برای سازگاری بک‌اند)
    setTimeout(() => {
      const lines = [...phoneLines, {
        id: p.id,
        title: (p as any).title || p.model || `#${p.id}`,
        imei: (p as any).imei || null,
        buyPrice: toNumber((p as any).buyPrice ?? (p as any).purchasePrice),
        sellPrice: toNumber((p as any).salePrice),
      }];
      setFormData(prev => ({ ...prev, phoneId: lines.length === 1 ? (lines[0].id as any) : null }));
    }, 0);

    setPhoneToAddId('');
  };
  const removePhoneLine = (id: number) => {
    const next = phoneLines.filter(p => p.id !== id);
    setPhoneLines(next);
    setFormData(prev => ({ ...prev, phoneId: next.length === 1 ? (next[0].id as any) : null }));
  };

  /* ---------------- Checks handlers ---------------- */
  const handleCheckInputChange = (
    e: ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      setCurrentCheck(prev => ({ ...prev, amount: toNumber(value) }));
    } else {
      setCurrentCheck(prev => ({ ...prev, [name]: value }));
    }
  };
  const addCheckToList = () => {
    if (!currentCheck.checkNumber.trim() || !currentCheck.bankName.trim() || Number(currentCheck.amount) <= 0) {
      setNotification({ type: 'error', text: 'اطلاعات چک ناقص یا نامعتبر است.' });
      return;
    }
    setFormData(prev => ({
      ...prev,
      checks: [...prev.checks, { ...currentCheck, status: 'نزد مشتری' as const }],
    }));
    setCurrentCheck(initialCheckState);
    setCurrentCheckDueDate(new Date());
    setIsCheckModalOpen(false);
  };

  /* ---------------- Accessories ---------------- */
  const openAccessoryModal = () => {
    setAccessoryProductId('');
    setAccessoryQty(1);
    setModalSellPrice(0);
    setModalBuyPrice(0);
    setModalStock(0);
    setModalProductName('');
    setIsAccessoryModalOpen(true);
  };
  const onChangeAccessoryProduct = (e: ChangeEvent<HTMLSelectElement>) => {
    const pid = Number(e.target.value);
    setAccessoryProductId(pid || '');
    const p = availableProducts.find(x => x.id === pid);
    if (p) {
      setModalSellPrice(toNumber(p.salePrice));
      setModalBuyPrice(toNumber(p.buyPrice));
      setModalStock(p.stock === null ? null : Number(p.stock)); // null => نامشخص
      setModalProductName(p.title);
    } else {
      setModalSellPrice(0);
      setModalBuyPrice(0);
      setModalStock(null);
      setModalProductName('');
    }
  };
  const addAccessoryLine = () => {
    if (!accessoryProductId) { setNotification({ type: 'error', text: 'محصول را انتخاب کنید.' }); return; }
    if (accessoryQty <= 0) { setNotification({ type: 'error', text: 'تعداد معتبر نیست.' }); return; }
    if (modalStock !== null && accessoryQty > (modalStock || 0)) {
      setNotification({ type: 'error', text: 'تعداد درخواستی بیشتر از موجودی انبار است.' }); return;
    }
    const existsIdx = accessories.findIndex(a => a.productId === accessoryProductId);
    if (existsIdx >= 0) {
      const updated = [...accessories];
      updated[existsIdx].qty = updated[existsIdx].qty + accessoryQty;
      setAccessories(updated);
    } else {
      setAccessories(prev => [...prev, {
        productId: accessoryProductId as number,
        name: modalProductName || `#${accessoryProductId}`,
        buyPrice: modalBuyPrice || 0,
        sellPrice: modalSellPrice || 0,
        qty: accessoryQty,
      }]);
    }
    setIsAccessoryModalOpen(false);
  };
  const removeAccessory = (idx: number) => setAccessories(prev => prev.filter((_, i) => i !== idx));

  /* ---------------- Services helpers ---------------- */
  const openServiceModal = () => {
    setIsServiceModalOpen(true);
    setServiceToAddId('');
    setServiceQty(1);
    setServiceModalPrice(0);
    setServiceModalName('');
  };

  const onChangeServiceToAdd = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value) || '';
    setServiceToAddId(id);
    if (id) {
      const sv = availableServices.find(s => s.id === id);
      setServiceModalName(sv?.name || `#${id}`);
      setServiceModalPrice(toNumber(sv?.price || 0));
    } else {
      setServiceModalName('');
      setServiceModalPrice(0);
    }
  };

  const addServiceLine = () => {
    if (!serviceToAddId) { setNotification({ type: 'error', text: 'خدمت را انتخاب کنید.' }); return; }
    if (serviceQty <= 0) { setNotification({ type: 'error', text: 'تعداد معتبر نیست.' }); return; }
    const existsIdx = serviceLines.findIndex(s => s.serviceId === serviceToAddId);
    if (existsIdx >= 0) {
      const updated = [...serviceLines];
      updated[existsIdx].qty = updated[existsIdx].qty + serviceQty;
      // اگر کاربر قیمت را تغییر داده باشد، قیمت را هم بروزرسانی می‌کنیم
      updated[existsIdx].sellPrice = toNumber(serviceModalPrice);
      setServiceLines(updated);
    } else {
      setServiceLines(prev => [...prev, {
        serviceId: serviceToAddId as number,
        name: serviceModalName || `#${serviceToAddId}`,
        sellPrice: toNumber(serviceModalPrice),
        qty: serviceQty,
      }]);
    }
    setIsServiceModalOpen(false);
  };

  const removeService = (idx: number) => setServiceLines(prev => prev.filter((_, i) => i !== idx));

  /* ---------------- Pricing (ماهانه ساده) ---------------- */
  const baseSum = phonesSellTotal + accessoriesSellTotal + servicesSellTotal; // جمع قیمت گوشی‌ها + لوازم + خدمات
  const downPaymentNum = toNumber(formData.downPayment);

  // اعمال تخفیف روی مبلغ پایه
  const baseAfterDiscount = Math.max(0, baseSum - (discountToman || 0));

  // اصل مانده پس از پیش‌پرداخت
  const principal = Math.max(0, baseAfterDiscount - downPaymentNum);

  // نرخ ماهانه
  const monthlyRate = Math.max(0, toNumber(profitPercent)) / 100;

  // تعداد ماه‌هایی که سود روی مانده اعمال می‌شود
  const monthsForInterest = saleType === 'installment'
    ? Math.max(1, toNumber(formData.numberOfInstallments))
    : Math.max(1, toNumber(checkMonths));

  // سود کل ساده
  const totalInterest = principal * monthlyRate * monthsForInterest;

  // جمع کل قبل از رِند
  // (پیش‌پرداخت + اصل مانده + سود) = (baseAfterDiscount + سود)
  const totalBeforeRound = baseAfterDiscount + totalInterest;

  // رِند به ۱۰۰k بالا
  const finalPrice = roundUp100k(totalBeforeRound);

  // باقیمانده برای پرداخت‌های بعدی (اقساط یا تسویه با چک)
  const remainingAfterDownPayment = Math.max(0, finalPrice - downPaymentNum);

  // تلرانس پویا برای اختلاف اقساط
  const dynamicTolRaw = remainingAfterDownPayment * 0.01; // ۱٪
  const TOL = Math.max(200000, roundUp100k(dynamicTolRaw));

  // سینک فیلد نمایشی قیمت نهایی
  useEffect(() => {
    if (toNumber(formData.actualSalePrice) !== finalPrice) {
      setFormData(prev => ({ ...prev, actualSalePrice: String(finalPrice) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalPrice]);

  /* ---------------- Validation ---------------- */
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewInstallmentSaleData | 'checks' | 'discount' | 'saleType' | 'checkMonths' | 'items', string>> = {};

    if (!formData.customerId) errors.customerId = 'انتخاب مشتری الزامی است.';
    if (phoneLines.length === 0 && accessories.length === 0 && serviceLines.length === 0) {
      errors.items = 'حداقل یک قلم (موبایل/لوازم/خدمات) را انتخاب کنید.';
    }
    if (finalPrice <= 0) errors.actualSalePrice = 'قیمت نهایی نامعتبر است.';
    if (discountToman < 0) errors.discount = 'تخفیف نمی‌تواند منفی باشد.';
    if (downPaymentNum < 0 || downPaymentNum > finalPrice) errors.downPayment = 'پیش‌پرداخت نامعتبر است.';

    if (saleType === 'installment') {
      const months = Math.max(1, toNumber(formData.numberOfInstallments));
      if (months <= 0 || !Number.isInteger(months)) errors.numberOfInstallments = 'تعداد اقساط باید عدد صحیح مثبت باشد.';
      if (toNumber(formData.installmentAmount) <= 0) errors.installmentAmount = 'مبلغ هر قسط باید مثبت باشد.';
      const totalInstallmentValue = months * (toNumber(formData.installmentAmount) || 0);
      const diff = Math.abs(totalInstallmentValue - remainingAfterDownPayment);
      if (diff > TOL) {
        errors.installmentAmount = `مجموع اقساط (${totalInstallmentValue.toLocaleString('fa-IR')}) با بدهی (${remainingAfterDownPayment.toLocaleString('fa-IR')}) بیش از ${TOL.toLocaleString('fa-IR')} تومان اختلاف دارد.`;
      }
    } else {
      // فروش چکی
      if (toNumber(checkMonths) <= 0 || !Number.isInteger(toNumber(checkMonths))) {
        errors.checkMonths = 'تعداد ماه تا نقد شدن چک صحیح نیست.';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors as any, fieldIdMap);
    }
    return Object.keys(errors).length === 0;
  };

  /* ---------------- Submit ---------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return;

    setIsLoading(true);
    setNotification(null);

    const accessoryPayload = accessories.map(a => ({
      productId: a.productId,
      name: a.name,
      buyPrice: a.buyPrice,
      sellPrice: a.sellPrice,
      qty: a.qty,
      lineTotal: a.sellPrice * a.qty,
    }));

    const phonesPayload = phoneLines.map(p => ({
      phoneId: p.id,
      title: p.title,
      imei: p.imei || undefined,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
    }));

    const servicesPayload = serviceLines.map(s => ({
      serviceId: s.serviceId,
      name: s.name,
      sellPrice: s.sellPrice,
      qty: s.qty,
      lineTotal: s.sellPrice * s.qty,
    }));

    const monthsInstallments = Math.max(1, toNumber(formData.numberOfInstallments));
    const payload: InstallmentSalePayload & any = {
      ...formData,
      // سازگاری با بک‌اندِ قبلی:
      phoneId: phoneLines.length === 1 ? (phoneLines[0].id as any) : null,
      // داده‌ی جدید:
      phones: phonesPayload,
      phoneIds: phonesPayload.map(p => p.phoneId),
      saleType,
      checkMonths: saleType === 'check' ? monthsForInterest : undefined,

      actualSalePrice: finalPrice,
      downPayment: downPaymentNum,
      numberOfInstallments: saleType === 'installment' ? monthsInstallments : 0,
      installmentAmount: saleType === 'installment' ? toNumber(formData.installmentAmount) : 0,

      discountToman,
      profitPercent, // ماهانه

      checks: formData.checks.map(chk => ({ ...chk, status: 'نزد مشتری' as const })),
      accessories: accessoryPayload,
      services: servicesPayload,

      meta: {
        phonesBuyTotal,
        phonesSellTotal,
        accessoriesBuyTotal,
        accessoriesSellTotal,
        servicesSellTotal,
        baseSum,
        baseAfterDiscount,
        principal,
        monthlyRate,
        monthsForInterest,
        totalInterest,
        totalBeforeRound,
        finalPrice,
        remainingAfterDownPayment,
      },

      // کاهش موجودی لوازم (بک‌آپ اگر سمت سرور انجام نشد)
      inventoryAdjustments: accessoryPayload.map((l: any) => ({ productId: l.productId, delta: -Number(l.qty || 0) })),
    };

    try {
      const response = await fetch('/api/installment-sales', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ثبت فروش اقساطی');

      // بک‌آپ کم کردن موجودی لوازم
      for (const line of accessoryPayload) {
        try {
          let r = await fetch(`/api/products/${line.productId}/adjust-stock`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ delta: -Number(line.qty || 0) }),
          });
          if (!r.ok) {
            r = await fetch(`/api/products/${line.productId}/decrement`, {
              method: 'POST',
              headers: getAuthHeaders(token),
              body: JSON.stringify({ qty: Number(line.qty || 0) }),
            });
          }
        } catch {}
      }

      setNotification({ type: 'success', text: 'فروش اقساطی با موفقیت ثبت شد!' });
      setTimeout(() => navigate('/installment-sales'), 1500);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'یک خطای ناشناخته رخ داد.' });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- UI helpers ---------------- */
  const inputClass = (
    fieldName?: keyof NewInstallmentSaleData | keyof InstallmentCheckInfo | 'amount' | 'discount' | 'checkMonths' | 'saleType',
    isSelect = false
  ) => {
    const hasErr = fieldName && (formErrors as any)[fieldName];
    const base = isSelect ? 'app-select' : 'app-input';
    return `${base} ${hasErr ? 'border-red-500 focus:ring-red-300' : ''}`;
  };

  const labelClass = 'app-label';

  // اقساط
  const monthsInstallments = Math.max(1, toNumber(formData.numberOfInstallments));
  const totalInstallments = monthsInstallments * toNumber(formData.installmentAmount);
  const overallTotal = totalInstallments + downPaymentNum;

  // محاسبه خودکار قسط ماهانه
  const autofillInstallmentAmount = () => {
    const m = Math.max(1, toNumber(formData.numberOfInstallments));
    // اگر بدهی دقیقاً بر تعداد اقساط بخش‌پذیر نباشد، با «رو به بالا» محاسبه می‌کنیم
    // تا مجموع اقساط از بدهی کمتر نشود. (اختلاف معمولاً ۱ تا چند تومان است)
    const per = m > 0 ? Math.ceil(remainingAfterDownPayment / m) : 0;
    setFormData(prev => ({ ...prev, installmentAmount: String(per) }));
    setFormErrors(prev => ({ ...prev, installmentAmount: undefined }));
  };
  // محاسبه خودکار تعداد اقساط از روی مبلغ هر قسط
  const autofillInstallmentsCount = () => {
    const amt = toNumber(formData.installmentAmount);
    if (amt > 0) {
      const cnt = Math.max(1, Math.ceil(remainingAfterDownPayment / amt));
      setFormData(prev => ({ ...prev, numberOfInstallments: String(cnt) }));
      setFormErrors(prev => ({ ...prev, numberOfInstallments: undefined }));
    }
  };
  const onInstallmentBlur = () => {
    // PriceInput خودش عدد را پاکسازی/گرد می‌کند؛ اینجا عمداً رِند بزرگ انجام نمی‌دهیم
    // تا جمع اقساط به بدهی نزدیک بماند.
  };

  const sellerProfit = finalPrice - (phonesBuyTotal + accessoriesBuyTotal);

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-6 text-right max-w-7xl mx-auto px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <form onSubmit={handleSubmit}>
        <FormErrorSummary
          errors={Object.fromEntries(Object.entries(formErrors as any).filter(([,v]) => Boolean(v))) as FormErrors}
          labels={errorLabels}
          fieldIdMap={fieldIdMap}
          className="mb-4"
        />

        <div className="mb-5">
          <WorkflowWizard
            steps={([
              { id: 'base', title: 'اطلاعات پایه', description: 'مشتری و نوع فروش', icon: 'fa-solid fa-user', anchorId: 'installment-step-base' },
              { id: 'items', title: 'اقلام', description: 'گوشی/لوازم/خدمات', icon: 'fa-solid fa-boxes-stacked', anchorId: 'installment-step-items' },
              { id: 'finance', title: 'اقساط و قیمت', description: 'پیش‌پرداخت و برنامه پرداخت', icon: 'fa-solid fa-calculator', anchorId: 'installment-step-finance' },
              { id: 'final', title: 'ثبت نهایی', description: 'یادداشت و ثبت', icon: 'fa-solid fa-check', anchorId: 'installment-step-final' },
            ] as WizardStep[])}
            stepIndex={wizardStep}
            onStepChange={setWizardStep}
          />
        </div>

        {/* اطلاعات پایه */}
        <div id="installment-step-base" className={["app-card p-4 md:p-6 mb-6", wizardStep === 0 ? '' : 'hidden lg:block'].join(' ')}>
          <div className="flex items-center gap-2 mb-4 border-b dark:border-gray-700 pb-3">
            <i className="fa-solid fa-user-plus text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">اطلاعات پایه فروش اقساطی</h2>
          </div>

          <FormSection title="اطلاعات پایه" description="مشتری، نوع فروش و تاریخ شروع را مشخص کنید." className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* مشتری */}
            <div>
              <label htmlFor="customerId" className={labelClass}>
                انتخاب مشتری <span className="text-red-500">*</span>
              </label>
              <select
                id="customerId"
                name="customerId"
                value={formData.customerId || ''}
                onChange={handleFormInputChange}
                className={`${inputClass('customerId', true)} border-indigo-200`}
                disabled={isLoadingCustomers}
              >
                <option value="">-- انتخاب کنید --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phoneNumber || 'بی‌نام'})
                  </option>
                ))}
              </select>
              {isLoadingCustomers && <p className="text-xs text-gray-500 mt-1">درحال بارگذاری مشتریان...</p>}
              {formErrors.customerId && <p className="app-error">{formErrors.customerId}</p>}
            </div>

            {/* نوع فروش */}
            <div>
              <label className={labelClass}>نوع فروش</label>
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value as SaleType)}
                className={inputClass('saleType', true)}
              >
                <option value="installment">اقساط ماهانه</option>
                <option value="check">فروش با چک (بدون اقساط ماهانه)</option>
              </select>
            </div>

            {/* تاریخ شروع اقساط */}
            <div>
              <label className={labelClass}>تاریخ شروع اقساط *</label>
              <ShamsiDatePicker
                id="installmentsStartDate"
                selectedDate={installmentsStartDatePicker}
                onDateChange={setInstallmentsStartDatePicker}
                inputClassName={inputClass()}
              />
            </div>
            </div>
          </FormSection>
        </div>

        {/* انتخاب موبایل‌ها */}
        <div id="installment-step-items" className={["space-y-6", wizardStep === 1 ? '' : 'hidden lg:block'].join(' ')}>
          <div className="app-card p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-mobile-screen-button text-indigo-600" />
              <h3 className="font-bold">موبایل‌های فروخته‌شده</h3>
            </div>
            <div className="flex gap-2">
              <select
                value={phoneToAddId}
                onChange={(e) => setPhoneToAddId(Number(e.target.value) || '')}
                className={inputClass(undefined, true)}
              >
                <option value="">-- انتخاب کنید --</option>
                {availablePhones.map(p => (
                  <option key={p.id} value={p.id}>
                    {(p as any).title || p.model} {(p as any).imei ? `• IMEI: ${(p as any).imei}` : ''} • فروش: {toNumber((p as any).salePrice).toLocaleString('fa-IR')}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addPhoneLine}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700"
              >
                افزودن موبایل
              </button>
            </div>
          </div>

          {phoneLines.length === 0 ? (
            <p className="text-sm text-gray-500">هنوز موبایلی انتخاب نشده است.</p>
          ) : (
            <>
              <div className="rounded border border-gray-200 dark:border-gray-700 max-h-48 overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-1 text-right">نام/مدل</th>
                      <th className="px-2 py-1 text-right">IMEI</th>
                      <th className="px-2 py-1 text-right">قیمت خرید</th>
                      <th className="px-2 py-1 text-right">قیمت فروش</th>
                      <th className="px-2 py-1 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phoneLines.map(p => (
                      <tr key={p.id} className="border-t dark:border-gray-700">
                        <td className="px-2 py-1">{p.title}</td>
                        <td className="px-2 py-1">{p.imei || '—'}</td>
                        <td className="px-2 py-1">{toNumber(p.buyPrice).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{toNumber(p.sellPrice).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1 text-center">
                          <button className="text-red-600 hover:underline" type="button" onClick={() => removePhoneLine(p.id)}>
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3 text-sm mt-2">
                <i className="fa-solid fa-sum text-indigo-600" />
                <span>جمع قیمت گوشی‌ها:</span>
                <strong className="mr-1">{phonesSellTotal.toLocaleString('fa-IR')} تومان</strong>
              </div>
            </>
          )}
          {/* خطای اقلام (اگر هیچ آیتمی انتخاب نشود) پایین‌تر نمایش داده می‌شود */}
        </div>

        {/* لوازم جانبی از محصولات */}
        <div className="app-card p-4 md:p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-cart-plus text-indigo-600" />
              <h3 className="font-bold">لوازم جانبی فروخته‌شده</h3>
            </div>
            <button
              type="button"
              onClick={openAccessoryModal}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700"
            >
              افزودن از محصولات
            </button>
          </div>

          {isLoadingProducts ? (
            <p className="text-xs text-gray-500 mt-2">درحال بارگذاری محصولات...</p>
          ) : accessories.length === 0 ? (
            <p className="text-gray-500 text-sm mt-2">آیتمی افزوده نشده است.</p>
          ) : (
            <>
              <div className="rounded border border-gray-200 dark:border-gray-700 max-h-40 overflow-auto mt-2">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-1 text-right">نام</th>
                      <th className="px-2 py-1 text-right">قیمت خرید</th>
                      <th className="px-2 py-1 text-right">قیمت فروش</th>
                      <th className="px-2 py-1 text-right">تعداد</th>
                      <th className="px-2 py-1 text-right">جمع فروش</th>
                      <th className="px-2 py-1 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessories.map((a, i) => (
                      <tr key={i} className="border-t dark:border-gray-700">
                        <td className="px-2 py-1">{a.name}</td>
                        <td className="px-2 py-1">{a.buyPrice.toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{a.sellPrice.toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{a.qty}</td>
                        <td className="px-2 py-1">{(a.sellPrice * a.qty).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1 text-center">
                          <button type="button" onClick={() => removeAccessory(i)} className="text-red-600 hover:underline">
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 text-sm mt-2">
                <i className="fa-solid fa-basket-shopping text-indigo-600" />
                <span>قیمت لوازم:</span>
                <strong className="mr-1">{accessoriesSellTotal.toLocaleString('fa-IR')} تومان</strong>
              </div>
            </>
          )}
        </div>

        {/* خدمات */}
        <div className="app-card p-4 md:p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-wrench text-indigo-600" />
              <h3 className="font-bold">خدمات فروخته‌شده</h3>
            </div>
            <button
              type="button"
              onClick={openServiceModal}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700"
            >
              افزودن خدمت
            </button>
          </div>

          {isLoadingServices ? (
            <p className="text-xs text-gray-500 mt-2">درحال بارگذاری خدمات...</p>
          ) : serviceLines.length === 0 ? (
            <p className="text-gray-500 text-sm mt-2">آیتمی افزوده نشده است.</p>
          ) : (
            <>
              <div className="rounded border border-gray-200 dark:border-gray-700 max-h-40 overflow-auto mt-2">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-1 text-right">نام</th>
                      <th className="px-2 py-1 text-right">قیمت</th>
                      <th className="px-2 py-1 text-right">تعداد</th>
                      <th className="px-2 py-1 text-right">جمع</th>
                      <th className="px-2 py-1 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceLines.map((s, i) => (
                      <tr key={i} className="border-t dark:border-gray-700">
                        <td className="px-2 py-1">{s.name}</td>
                        <td className="px-2 py-1">{toNumber(s.sellPrice).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{toNumber(s.qty).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{(toNumber(s.sellPrice) * toNumber(s.qty)).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1 text-center">
                          <button type="button" onClick={() => removeService(i)} className="text-red-600 hover:underline">
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 text-sm mt-2">
                <i className="fa-solid fa-screwdriver-wrench text-indigo-600" />
                <span>قیمت خدمات:</span>
                <strong className="mr-1">{servicesSellTotal.toLocaleString('fa-IR')} تومان</strong>
              </div>
            </>
          )}

          {(formErrors as any).items && (
            <p className="app-error">{(formErrors as any).items}</p>
          )}
        </div>
        </div>

        {/* مودال لوازم */}
        {isAccessoryModalOpen && (
          <Modal title="افزودن لوازم از محصولات" onClose={() => setIsAccessoryModalOpen(false)} widthClass="max-w-md">
            <div className="space-y-3 p-1 text-sm">
              <div>
                <label className={labelClass}>انتخاب محصول</label>
                <select value={accessoryProductId} onChange={onChangeAccessoryProduct} className={inputClass(undefined, true)}>
                  <option value="">-- انتخاب کنید --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} • فروش: {toNumber(p.salePrice).toLocaleString('fa-IR')} • موجودی: {p.stock === null ? '—' : toNumber(p.stock)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>قیمت خرید</label>
                  <input type="text" readOnly value={modalBuyPrice.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50`} />
                </div>
                <div>
                  <label className={labelClass}>قیمت فروش</label>
                  <input type="text" readOnly value={modalSellPrice.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50`} />
                </div>
                <div>
                  <label className={labelClass}>تعداد</label>
                  <input type="number" min={1} value={accessoryQty} onChange={(e) => setAccessoryQty(Number(e.target.value || 1))} className={inputClass()} />
                  <p className="text-[11px] text-gray-500 mt-1">موجودی: {modalStock === null ? 'نامشخص' : modalStock}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-2">
                <button type="button" onClick={() => setIsAccessoryModalOpen(false)} className="px-3 py-1.5 text-xs bg-gray-200 rounded hover:bg-gray-300">
                  انصراف
                </button>
                <button type="button" onClick={addAccessoryLine} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">
                  افزودن
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* مودال خدمات */}
        {isServiceModalOpen && (
          <Modal title="افزودن خدمت" onClose={() => setIsServiceModalOpen(false)} widthClass="max-w-md">
            <div className="space-y-3 p-1 text-sm">
              <div>
                <label className={labelClass}>انتخاب خدمت</label>
                <select value={serviceToAddId} onChange={onChangeServiceToAdd} className={inputClass(undefined, true)}>
                  <option value="">-- انتخاب کنید --</option>
                  {availableServices.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} • قیمت: {toNumber(s.price || 0).toLocaleString('fa-IR')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>قیمت خدمت (تومان)</label>
                  <PriceInput
                    name="serviceModalPrice"
                    value={String(serviceModalPrice || '')}
                    onChange={(e: any) => setServiceModalPrice(toNumber(e.target.value))}
                    className={inputClass()}
                    placeholder="مثال: ۳۵۰٬۰۰۰"
                  />
                </div>
                <div>
                  <label className={labelClass}>تعداد</label>
                  <input type="number" min={1} value={serviceQty} onChange={(e) => setServiceQty(Number(e.target.value || 1))} className={inputClass()} />
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-2">
                <button type="button" onClick={() => setIsServiceModalOpen(false)} className="px-3 py-1.5 text-xs bg-gray-200 rounded hover:bg-gray-300">
                  انصراف
                </button>
                <button type="button" onClick={addServiceLine} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">
                  افزودن
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* جزئیات قیمت و اقساط */}
        <div id="installment-step-finance" className={["bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700", wizardStep === 2 ? '' : 'hidden lg:block'].join(' ')}>
          <div className="flex items-center gap-2 mb-5 border-b dark:border-gray-700 pb-3">
            <i className="fa-solid fa-calculator text-indigo-600 text-lg" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">جزئیات قیمت و اقساط</h2>
          </div>

          {/* قیمت‌ها */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-mobile-screen ml-2 text-indigo-600" />
                جمع قیمت گوشی‌ها (تومان)
              </label>
              <input type="text" readOnly value={phonesSellTotal.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-headphones ml-2 text-indigo-600" />
                قیمت لوازم
              </label>
              <input type="text" readOnly value={accessoriesSellTotal.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-wrench ml-2 text-indigo-600" />
                قیمت خدمات
              </label>
              <input type="text" readOnly value={servicesSellTotal.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-sack-dollar ml-2 text-indigo-600" />
                قیمت نهایی (پس از تخفیف و سود)
              </label>
              <input id="actualSalePrice" type="text" readOnly value={finalPrice.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
            </div>
          </div>

          {/* پیش‌پرداخت، سود ماهانه، تخفیف */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <div className="space-y-1">
              <label htmlFor="downPayment" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-hand-holding-dollar ml-2 text-teal-600" />
                پیش‌پرداخت (تومان) *
              </label>
              <PriceInput
                id="downPayment"
                name="downPayment"
                value={String(formData.downPayment)}
                onChange={handleFormInputChange}
                className={inputClass('downPayment')}
                placeholder="مثال: ۱۰٬۰۰۰٬۰۰۰"
              />
              {formErrors.downPayment && <p className="app-error">{formErrors.downPayment}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-percent ml-2 text-fuchsia-600" />
                درصد سود «ماهانه»
              </label>
              <input
                type="number"
                value={profitPercent}
                onChange={(e) => setProfitPercent(Number(e.target.value || 0))}
                className={inputClass()}
                placeholder="مثال: ۷"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-ticket ml-2 text-amber-600" />
                تخفیف (تومان)
              </label>
              <PriceInput
                id="discountToman"
                name="discountToman"
                value={String(discountToman)}
                onChange={(e: any) => setDiscountToman(toNumber(e.target.value))}
                className={inputClass('discount')}
                placeholder="مثال: ۵۰۰٬۰۰۰"
              />
              {(formErrors as any).discount && <p className="app-error">{(formErrors as any).discount}</p>}
            </div>
          </div>

          {/* حالت‌های اقساط/چک */}
          {saleType === 'installment' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="numberOfInstallments" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    <i className="fa-solid fa-calendar-days ml-2 text-indigo-600" />
                    تعداد اقساط (ماه) *
                  </label>
                  <button type="button" onClick={autofillInstallmentsCount} className="text-[11px] text-indigo-600 hover:text-indigo-800">
                    <i className="fa-solid fa-wand-magic-sparkles ml-1" /> محاسبه خودکار
                  </button>
                </div>
                <input
                  type="number"
                  id="numberOfInstallments"
                  name="numberOfInstallments"
                  value={formData.numberOfInstallments}
                  onChange={handleFormInputChange}
                  className={inputClass('numberOfInstallments')}
                  placeholder="مثال: ۱۲"
                />
                {formErrors.numberOfInstallments && (
                  <p className="app-error">{formErrors.numberOfInstallments}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="installmentAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    <i className="fa-solid fa-money-check-pen ml-2 text-indigo-600" />
                    مبلغ هر قسط (تومان) *
                  </label>
                  <button type="button" onClick={autofillInstallmentAmount} className="text-[11px] text-indigo-600 hover:text-indigo-800">
                    <i className="fa-solid fa-wand-magic-sparkles ml-1" /> محاسبه خودکار
                  </button>
                </div>
                <PriceInput
                  id="installmentAmount"
                  name="installmentAmount"
                  value={String(formData.installmentAmount)}
                  onChange={handleFormInputChange}
                  onBlur={onInstallmentBlur}
                  className={inputClass('installmentAmount')}
                  placeholder="مثال: ۳٬۸۰۰٬۰۰۰"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  * با دکمه «محاسبه خودکار»، مبلغ هر قسط از تقسیم بدهی بر تعداد اقساط <b>رو به بالا</b> محاسبه می‌شود.
                  (اگر بدهی دقیقاً بر تعداد اقساط بخش‌پذیر نباشد، اختلاف مجموع اقساط معمولاً ۱ تا چند تومان است.)
                </p>
                {formErrors.installmentAmount && (
                  <p className="app-error">{formErrors.installmentAmount}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  <i className="fa-solid fa-lock ml-2 text-indigo-600" />
                  بدهی پس از پیش‌پرداخت
                </label>
                <input type="text" readOnly value={remainingAfterDownPayment.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  <i className="fa-regular fa-clock ml-2 text-indigo-600" />
                  چک چند ماه دیگر نقد می‌شود؟
                </label>
                <input
                  type="number"
                  id="checkMonths"
                  value={checkMonths}
                  onChange={(e) => setCheckMonths(Math.max(1, Number(e.target.value || 1)))}
                  className={inputClass('checkMonths')}
                  placeholder="مثال: ۹"
                />
                {formErrors.checkMonths && <p className="app-error">{formErrors.checkMonths}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  <i className="fa-solid fa-percent ml-2 text-indigo-600" />
                  سود کل ({profitPercent || 0}% × {monthsForInterest} ماه)
                </label>
                <input type="text" readOnly value={totalInterest.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  <i className="fa-solid fa-lock ml-2 text-indigo-600" />
                  بدهی پس از پیش‌پرداخت
                </label>
                <input type="text" readOnly value={remainingAfterDownPayment.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
              </div>
            </div>
          )}

          {/* خلاصه پایین کارت */}
          <div className="mt-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-sm grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-wallet text-indigo-600" />
              <span>اصل مانده پس از پیش‌پرداخت:</span>
              <strong className="mr-1">{principal.toLocaleString('fa-IR')} تومان</strong>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-percent text-indigo-600" />
              <span>سود کل ({profitPercent || 0}% × {monthsForInterest} ماه):</span>
              <strong className="mr-1">{totalInterest.toLocaleString('fa-IR')} تومان</strong>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-receipt text-indigo-600" />
              <span>مبلغ نهایی کل پرداخت:</span>
              <strong className="mr-1">{finalPrice.toLocaleString('fa-IR')} تومان</strong>
            </div>

            {saleType === 'installment' &&
              Math.abs((monthsInstallments * toNumber(formData.installmentAmount)) - remainingAfterDownPayment) > TOL && (
                <p className="md:col-span-3 mt-1 text-red-600 font-semibold">
                  <i className="fa-solid fa-triangle-exclamation ml-1" />
                  هشدار: اختلاف بیش از {TOL.toLocaleString('fa-IR')} تومان بین مجموع اقساط و بدهی!
                </p>
              )}
          </div>
        </div>

        {/* چک‌ها */}
        <div className="app-card p-4 md:p-6 mb-6">
          <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-money-check-dollar text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">اطلاعات چک‌ها (اختیاری)</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrentCheck(initialCheckState);
                setCurrentCheckDueDate(new Date());
                setIsCheckModalOpen(true);
              }}
              className="px-3 py-1.5 bg-sky-600 text-white text-xs rounded-md hover:bg-sky-700"
            >
              <i className="fa-solid fa-plus ml-1" />
              افزودن چک
            </button>
          </div>

          {formData.checks.length === 0 ? (
            <p className="text-gray-500 text-sm">چکی برای این فروش ثبت نشده است.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">شماره چک</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">بانک</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">مبلغ</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">سررسید</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">عملیات</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {formData.checks.map((check, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-3 py-2 whitespace-nowrap">{check.checkNumber}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{check.bankName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {Number(check.amount).toLocaleString('fa-IR')} تومان
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{check.dueDate}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({ ...prev, checks: prev.checks.filter((_, i) => i !== index) }))
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <i className="fa-solid fa-trash-can" />
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* مودال افزودن چک */}
        {isCheckModalOpen && (
          <Modal title="افزودن اطلاعات چک" onClose={() => setIsCheckModalOpen(false)} widthClass="max-w-md">
            <div className="space-y-3 p-1 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>شماره چک</label>
                  <input
                    type="text"
                    name="checkNumber"
                    value={currentCheck.checkNumber}
                    onChange={handleCheckInputChange}
                    className={inputClass('checkNumber')}
                  />
                </div>
                <div>
                  <label className={labelClass}>نام بانک</label>
                  <input
                    type="text"
                    name="bankName"
                    value={currentCheck.bankName}
                    onChange={handleCheckInputChange}
                    className={inputClass('bankName')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>مبلغ چک (تومان)</label>
                  <PriceInput
                    id="checkAmount"
                    name="amount"
                    value={String(currentCheck.amount || '')}
                    onChange={handleCheckInputChange}
                    className={inputClass('amount')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>تاریخ سررسید</label>
                  <ShamsiDatePicker
                    id="checkDueDate"
                    selectedDate={currentCheckDueDate}
                    onDateChange={setCurrentCheckDueDate}
                    inputClassName={inputClass()}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-2">
                <button type="button" onClick={() => setIsCheckModalOpen(false)} className="px-3 py-1.5 text-xs bg-gray-200 rounded hover:bg-gray-300">
                  انصراف
                </button>
                <button type="button" onClick={addCheckToList} className="px-3 py-1.5 bg-sky-600 text-white text-xs rounded hover:bg-sky-700">
                  افزودن چک به لیست
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* یادداشت و ثبت نهایی + سود */}
        <div id="installment-step-final" className={["app-card p-4 md:p-6 relative", wizardStep === 3 ? '' : 'hidden lg:block'].join(' ')}>
          <div className="flex items-center gap-2 mb-4 border-b dark:border-gray-700 pb-3">
            <i className="fa-regular fa-note-sticky text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">یادداشت‌ها و ثبت نهایی</h2>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded mb-4 text-sm">
            <i className="fa-solid fa-money-bill-trend-up text-emerald-600" />
            <span>سود کل فروشنده (گوشی + لوازم + خدمات):</span>
            <strong className="mr-1">{sellerProfit.toLocaleString('fa-IR')} تومان</strong>
          </div>

          <label htmlFor="notes" className={labelClass}>یادداشت (اختیاری)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleFormInputChange}
            rows={3}
            className={inputClass('notes')}
          />
        </div>

        {/* Spacer so sticky bar doesn't cover content */}
        <div className="h-20" />

        {/* Sticky submit bar */}
        <div className="sticky bottom-0 z-20 -mx-4 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-white/70 dark:bg-gray-950/50 backdrop-blur border-t border-black/5 dark:border-white/10">
          <div className="app-card p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-gray-500 dark:text-gray-400">مبلغ نهایی</div>
              <div className="text-base font-black text-gray-900 dark:text-gray-100 truncate">
                {finalPrice.toLocaleString('fa-IR')} تومان
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                پیش‌پرداخت: {downPaymentNum.toLocaleString('fa-IR')} — باقیمانده: {remainingAfterDownPayment.toLocaleString('fa-IR')}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/installment-sales')}
                className="h-11 px-4 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-sm"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={isLoading || isLoadingCustomers || isLoadingPhones || !token}
                className="h-11 px-4 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-700 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition inline-flex items-center gap-2 disabled:opacity-60"
              >
                <i className={isLoading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'} />
                ثبت نهایی
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddInstallmentSalePage;
