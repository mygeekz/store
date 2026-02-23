// components/CartSummary.tsx
import React, { useMemo } from 'react';
import PriceInput from './PriceInput';
import ShamsiDatePicker from './ShamsiDatePicker';
import { useStyle } from '../contexts/StyleContext';
import { parseToman } from '../utils/money';
import type { Customer, CartItem } from '../types';

type PaymentMethod = 'cash';
type Summary = {
  subtotal: number;
  itemsDiscount: number;     // مجموع تخفیف‌های ردیفی (عدد ثابت هر ردیف، بدون ضربدر تعداد)
  grandTotal: number;        // مانده نهایی پس از کسر itemsDiscount و تخفیف کل (از والد می‌آید)
  // اگر در والد محاسبه می‌کنی، می‌توانی همینجا هم فیلد زیر را داشته باشی:
  // globalDiscount?: number;
};

type Props = {
  customers?: Customer[];
  selectedCustomerId?: number | null;
  onCustomerChange?: (id: number | null) => void;

  paymentMethod?: PaymentMethod;
  onPaymentChange?: (m: PaymentMethod) => void;

  items?: CartItem[];
  summary: Summary;

  globalDiscount: number;                 // مقدار فعلی تخفیف کل (ترجیحاً در والد سقف‌گذاری شده)
  onGlobalDiscountChange?: (d: number) => void;

  notes?: string;
  onNotesChange?: (t: string) => void;

  /** تاریخ فروش */
  salesDate?: Date | null;
  onDateChange?: (d: Date | null) => void;

  onSubmit?: () => void;
  isSubmitting?: boolean;
};

const fmt = (n: number) => `${(Number(n) || 0).toLocaleString('fa-IR')} تومان`;

const CartSummary: React.FC<Props> = ({
  customers = [],
  selectedCustomerId = null,
  onCustomerChange = () => {},
  paymentMethod = 'cash',
  onPaymentChange = () => {},
  items = [],
  summary,
  globalDiscount,
  onGlobalDiscountChange = () => {},
  notes = '',
  salesDate = null,
  onDateChange = () => {},
  onNotesChange = () => {},
  onSubmit,
  isSubmitting = false,
}) => {
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandSoft = `hsl(${style.primaryHue} 95% 94%)`;

  const customerName = useMemo(() => {
    const c = customers.find((cu) => cu.id === selectedCustomerId);
    return c?.fullName || (c as any)?.name || 'مشتری مهمان';
  }, [customers, selectedCustomerId]);

  // ورودی تخفیف کل: پاک‌سازی به عدد سالم
  const handleDiscountChange = (e: any) => {
    const n = parseToman(String(e?.target?.value ?? ''));
    onGlobalDiscountChange(n);
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* جمع‌ها */}
      <div className="rounded-2xl border bg-white/80 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 p-3 text-sm">
        <div className="flex items-center justify-between py-1">
          <span className="text-gray-600 dark:text-gray-300">جمع کل موارد</span>
          <span className="font-semibold">{fmt(summary.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-gray-600 dark:text-gray-300">تخفیف اقلام</span>
          <span className="font-semibold">{fmt(summary.itemsDiscount)}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-gray-600 dark:text-gray-300">تخفیف کل</span>
          <span className="font-semibold">{fmt(globalDiscount)}</span>
        </div>
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
        <div className="flex items-center justify-between py-1 text-base font-extrabold">
          <span>مبلغ نهایی قابل پرداخت</span>
          {/* نکته مهم: grandTotal همین حالا شامل تخفیف کل است؛ دوباره از آن کم نکن */}
          <span>{fmt(Math.max(Number(summary.grandTotal) || 0, 0))}</span>
        </div>
      </div>

      {/* تخفیف کل */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">تخفیف کل (تومان)</label>
        <PriceInput
          name="globalDiscount"
          value={String(globalDiscount ?? '')}
          onChange={handleDiscountChange}
          className="w-full p-2.5 rounded-lg text-sm text-left border bg-white dark:bg-gray-900/60 dark:border-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          placeholder="مثال: ۵۰,۰۰۰"
        />
      </div>

      {/* مشتری */}
      {customers.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">مشتری</label>
          <select
            value={selectedCustomerId ?? ''}
            onChange={(e) => onCustomerChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-2.5 rounded-lg text-sm text-right border bg-white dark:bg-gray-900/60 dark:border-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— مشتری مهمان —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {(c as any).fullName || (c as any).name}{(c as any).phone ? ` — ${(c as any).phone}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            انتخاب‌شده: <span className="font-bold">{customerName}</span>
          </p>
        </div>
      )}

      {/* روش پرداخت */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">روش پرداخت</label>
        <div className="grid grid-cols-3 gap-2">
          {(['cash'] as PaymentMethod[]).map((m) => {
            const active = paymentMethod === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onPaymentChange(m)}
                className="px-3 py-2 rounded-lg text-sm border transition"
                style={
                  active
                    ? { backgroundColor: brand, borderColor: brand, color: '#fff' }
                    : { backgroundColor: brandSoft, borderColor: '#e5e7eb', color: '#1f2937' }
                }
              >
                {m === 'cash' && 'نقدی'}
                {m === 'card' && 'کارت'}
                {m === 'mixed' && 'ترکیبی'}
              </button>
            );
          })}
        </div>
      </div>

      {/* تاریخ فروش */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">تاریخ فروش</label>
        <ShamsiDatePicker selectedDate={salesDate} onDateChange={onDateChange} placeholder="انتخاب تاریخ" />
      </div>

      {/* یادداشت‌ها */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">یادداشت‌ها</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="توضیحات اختیاری..."
          className="w-full p-2.5 rounded-lg text-sm text-right border bg-white dark:bg-gray-900/60 dark:border-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* دکمه ثبت */}
      {onSubmit && (
        <button
          onClick={onSubmit}
          disabled={isSubmitting || !items.length}
          className="w-full px-5 py-2.5 rounded-xl font-bold text-white transition"
          style={{
            backgroundColor: isSubmitting || !items.length ? '#cbd5e1' : brand,
            cursor: isSubmitting || !items.length ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'در حال ثبت…' : 'ثبت نهایی و صدور فاکتور'}
        </button>
      )}
    </div>
  );
};

export default CartSummary;
