// pages/InvoiceForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import { getAuthHeaders } from '../utils/apiUtils';
import { useAuth } from '../contexts/AuthContext';
import Notification from '../components/Notification';
import FormSection from '../components/FormSection';
import FormErrorSummary, { FormErrors } from '../components/FormErrorSummary';
import { focusFirstError } from '../utils/focusFirstError';
import type { NotificationMessage } from '../types';

interface SellableItem {
  id: number;
  type: 'phone' | 'inventory' | 'service';
  name: string;
  price: number;
}

interface LineItem {
  itemId: number | '';
  itemType: 'phone' | 'inventory' | 'service' | '';
  quantity: number;
  unitPrice: number;
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [itemsList, setItemsList] = useState<SellableItem[]>([]);
  const [customersList, setCustomersList] = useState<{ id: number; fullName: string }[]>([]);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ itemId: '', itemType: '', quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const totalAmount = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const finalAmount = Math.max(0, totalAmount - (discount || 0));

  const fieldIdMap: Record<string, string> = {
    customerId: 'customerId',
    items: 'items-section',
  };

  const errorLabels: Record<string, string> = {
    customerId: 'مشتری',
    items: 'اقلام فاکتور',
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    Promise.all([
      fetch('/api/sellable-items', { headers: getAuthHeaders(token) }).then((r) => r.json()),
      fetch('/api/customers', { headers: getAuthHeaders(token) }).then((r) => r.json()),
    ])
      .then(([itemsJson, custJson]) => {
        if (itemsJson.success) {
          const inv = (itemsJson.data.inventory || []).map((i: any) => ({ ...i, type: 'inventory', name: i.name }));
          const phones = (itemsJson.data.phones || []).map((p: any) => ({ ...p, type: 'phone', name: p.name }));
          const services = (itemsJson.data.services || []).map((s: any) => ({ ...s, type: 'service', name: s.name }));
          setItemsList([...inv, ...phones, ...services]);
        } else {
          setNotification({ type: 'error', text: itemsJson.message });
        }

        if (custJson.success) {
          setCustomersList(custJson.data || []);
        } else {
          setNotification({ type: 'error', text: custJson.message });
        }
      })
      .catch((err) => setNotification({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, [token]);

  const clearError = (key: string) => {
    if (!formErrors[key]) return;
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    setLineItems((prev) => {
      const list = [...prev];
      if (field === 'itemId') {
        const id = Number(value);
        const sel = itemsList.find((it) => it.id === id);
        list[idx] = {
          itemId: id,
          itemType: sel?.type || '',
          quantity: list[idx].quantity,
          unitPrice: sel?.price || 0,
        };
        clearError(`item-${idx}-itemId`);
      } else {
        (list[idx] as any)[field] = value;
        if (field === 'quantity') clearError(`item-${idx}-quantity`);
      }
      return list;
    });
    clearError('items');
  };

  const addItem = () => {
    setLineItems((li) => [...li, { itemId: '', itemType: '', quantity: 1, unitPrice: 0 }]);
    clearError('items');
  };

  const removeItem = (idx: number) => {
    setLineItems((li) => li.filter((_, i) => i !== idx));
    clearError('items');
  };

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};

    if (!customerId) {
      errors.customerId = 'لطفاً مشتری را انتخاب کنید.';
    }

    if (lineItems.length === 0) {
      errors.items = 'حداقل یک قلم کالا/خدمت اضافه کنید.';
    }

    lineItems.forEach((li, idx) => {
      const idKey = `item-${idx}-itemId`;
      const qKey = `item-${idx}-quantity`;
      if (!li.itemId) {
        errors[idKey] = 'شرح کالا/خدمت را انتخاب کنید.';
        errorLabels[idKey] = `قلم ${idx + 1} — شرح`;
      }
      if (!li.quantity || li.quantity < 1) {
        errors[qKey] = 'تعداد باید حداقل ۱ باشد.';
        errorLabels[qKey] = `قلم ${idx + 1} — تعداد`;
      }
    });

    if (Object.keys(errors).some((k) => k.startsWith('item-'))) {
      errors.items = errors.items || 'برخی اقلام نیاز به تکمیل دارند.';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors, fieldIdMap);
      return;
    }

    setLoading(true);
    setNotification(null);

    const date = moment().format('jYYYY/jMM/jDD');
    const saleIds: number[] = [];

    try {
      for (const li of lineItems) {
        const item = itemsList.find((i) => i.id === li.itemId);
        const payload = {
          itemType: li.itemType,
          itemId: li.itemId,
          itemName: item?.name || 'کالا',
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          totalPrice: li.unitPrice * li.quantity,
          transactionDate: date,
          customerId: customerId || null,
          notes: null,
          discount,
          paymentMethod: 'cash',
        };

        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در ثبت یک قلم فاکتور');
        saleIds.push(json.data.id);
      }

      localStorage.setItem(
        'lastInvoiceItems',
        JSON.stringify(
          lineItems.map((li) => {
            const item = itemsList.find((i) => i.id === li.itemId);
            const price = item?.price || li.unitPrice || 0;
            return {
              ...li,
              description: item?.name || 'کالا/خدمت',
              unitPrice: price,
              totalPrice: price * li.quantity,
            };
          })
        )
      );

      navigate(`/invoices/${saleIds.join(',')}`);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-center p-4">در حال بارگذاری...</p>;

  return (
    <div className="max-w-4xl mx-auto px-4 text-right" dir="rtl">
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormErrorSummary
          errors={formErrors}
          labels={errorLabels}
          fieldIdMap={{
            ...fieldIdMap,
            // dynamic per-row fields
            ...Object.keys(formErrors)
              .filter((k) => k.startsWith('item-'))
              .reduce((acc: any, k) => {
                acc[k] = k;
                return acc;
              }, {}),
          }}
        />

        {/* Header + customer */}
        <div className="app-card p-4 md:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-4">
            <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-gray-100">ثبت فاکتور (فروش نقدی)</h1>
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="h-10 px-4 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-sm"
            >
              بازگشت
            </button>
          </div>

          <FormSection title="اطلاعات اصلی" description="مشتری و تخفیف را انتخاب کنید." className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="app-label" htmlFor="customerId">انتخاب مشتری</label>
                <select
                  id="customerId"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(+e.target.value);
                    clearError('customerId');
                  }}
                  className={`app-select ${formErrors.customerId ? 'border-red-500' : ''}`}
                >
                  <option value="">انتخاب کنید</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
                {formErrors.customerId && <p className="app-error">{formErrors.customerId}</p>}
              </div>

              <div>
                <label className="app-label" htmlFor="discount">تخفیف (تومان)</label>
                <input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(+e.target.value)}
                  className="app-input"
                  min={0}
                />
                <div className="app-help">تخفیف روی جمع کل اعمال می‌شود.</div>
              </div>
            </div>
          </FormSection>
        </div>

        {/* Items */}
        <div id="items-section" className="app-card p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="app-section-title">اقلام فاکتور</div>
              <div className="app-subtle">کالا/خدمت را انتخاب کنید، تعداد را وارد کنید.</div>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="h-10 px-4 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-sm inline-flex items-center gap-2"
            >
              <i className="fa-solid fa-plus" />
              افزودن قلم
            </button>
          </div>

          {formErrors.items && <p className="app-error">{formErrors.items}</p>}

          <div className="space-y-3">
            {lineItems.map((item, idx) => {
              const idKey = `item-${idx}-itemId`;
              const qKey = `item-${idx}-quantity`;
              return (
                <div key={idx} className="app-card-muted p-3">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-12 md:col-span-6">
                      <label className="app-label" htmlFor={idKey}>شرح کالا/خدمت</label>
                      <select
                        id={idKey}
                        value={item.itemId}
                        onChange={(e) => updateItem(idx, 'itemId', +e.target.value)}
                        className={`app-select ${formErrors[idKey] ? 'border-red-500' : ''}`}
                      >
                        <option value="">انتخاب…</option>
                        {itemsList.map((it) => (
                          <option key={`${it.type}-${it.id}`} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </select>
                      {formErrors[idKey] && <p className="app-error">{formErrors[idKey]}</p>}
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <label className="app-label" htmlFor={qKey}>تعداد</label>
                      <input
                        id={qKey}
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', +e.target.value)}
                        className={`app-input ${formErrors[qKey] ? 'border-red-500' : ''}`}
                      />
                      {formErrors[qKey] && <p className="app-error">{formErrors[qKey]}</p>}
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <label className="app-label">قیمت واحد</label>
                      <input
                        type="number"
                        readOnly
                        value={item.unitPrice}
                        className="app-input bg-black/[0.02] dark:bg-white/[0.03]"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={lineItems.length === 1}
                        className="h-11 w-11 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-300 disabled:opacity-50"
                        title="حذف"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    جمع ردیف:{' '}
                    <span className="font-black text-gray-900 dark:text-gray-100">
                      {(item.unitPrice * item.quantity).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spacer so sticky bar doesn't cover content */}
        <div className="h-20" />

        {/* Sticky submit bar */}
        <div className="sticky bottom-0 z-20 -mx-4 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-white/70 dark:bg-gray-950/50 backdrop-blur border-t border-black/5 dark:border-white/10">
          <div className="app-card p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-gray-500 dark:text-gray-400">مبلغ قابل پرداخت</div>
              <div className="text-base font-black text-gray-900 dark:text-gray-100 truncate">
                {finalAmount.toLocaleString('fa-IR')} تومان
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                جمع: {totalAmount.toLocaleString('fa-IR')} — تخفیف: {(discount || 0).toLocaleString('fa-IR')}
              </div>
            </div>

            <button
              type="submit"
              className="h-11 px-4 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-700 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition inline-flex items-center gap-2"
            >
              <i className="fa-solid fa-check" />
              ثبت فاکتور
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
