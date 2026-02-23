// pages/SalesCartPage.tsx
import React, { useState, useEffect, useReducer, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';
import { apiFetch } from '../utils/apiFetch';
import Notification from '../components/Notification';
import SellableItemSelect from '../components/SellableItemSelect';
import CartTable from '../components/CartTable';
import CartSummary from '../components/CartSummary';
import { ServiceQuickSell } from '../components/ServiceQuickSell';
import type { NotificationMessage, SellableItem, Customer, CartItem, SalesOrderPayload } from '../types';
import { v4 as uuidv4 } from 'uuid';
import moment from 'jalali-moment';
import { parseToman } from '../utils/money';
import WorkflowWizard, { WizardStep } from '../components/WorkflowWizard';

/* ---------- reducer ---------- */
interface CartState {
  items: CartItem[];
  customerId: number | null;
  paymentMethod: 'cash';
  globalDiscount: number;   // تخفیف کل فاکتور (عدد ثابت روی کل)
  notes: string;
}
type CartAction =
  | { type: 'ADD_ITEM'; payload: SellableItem }
  | { type: 'REMOVE_ITEM'; payload: { cartItemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { cartItemId: string; quantity: number } }
  | { type: 'UPDATE_ITEM_DISCOUNT'; payload: { cartItemId: string; discount: number } } // تخفیف ردیفی = عدد ثابت برای کل ردیف
  | { type: 'SET_CUSTOMER'; payload: { customerId: number | null } }
  | { type: 'SET_PAYMENT_METHOD'; payload: { method: 'cash' } }
  | { type: 'SET_GLOBAL_DISCOUNT'; payload: { discount: number } }
  | { type: 'SET_NOTES'; payload: { notes: string } }
  | { type: 'CLEAR_CART' };

const initialState: CartState = { items: [], customerId: null, paymentMethod: 'cash', globalDiscount: 0, notes: '' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const normalizedType =
        (action.payload.type as string)?.toLowerCase() === 'product' ? 'inventory' : (action.payload.type as string);
      const existing = state.items.find(i => i.itemId === action.payload.id && i.itemType === normalizedType);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.cartItemId === existing.cartItemId ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i
          ),
        };
      }
      const newItem: CartItem = {
        cartItemId: uuidv4(),
        itemId: action.payload.id,
        itemType: normalizedType as any,
        name: action.payload.name,
        description: action.payload.name,
        quantity: 1,
        unitPrice: Number(action.payload.price) || 0,
        // نکته: از همین فیلد موجود استفاده می‌کنیم ولی معنای آن «تخفیف کل ردیف» است (نه تخفیف هر-واحد)
        discountPerItem: 0,
        stock: normalizedType === 'service' ? Infinity : Number(action.payload.stock ?? 0),
      };
      return { ...state, items: [...state.items, newItem] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.cartItemId !== action.payload.cartItemId) };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          i.cartItemId === action.payload.cartItemId
            ? { ...i, quantity: Math.max(1, Math.min(Number(action.payload.quantity) || 1, i.stock)) }
            : i
        ),
      };
    case 'UPDATE_ITEM_DISCOUNT':
      // تخفیف ردیف = عدد ثابت که از مجموع (qty*unitPrice) کم می‌شود، نه ضربدر تعداد
      return {
        ...state,
        items: state.items.map(i =>
          i.cartItemId === action.payload.cartItemId ? { ...i, discountPerItem: Math.max(0, action.payload.discount) } : i
        ),
      };
    case 'SET_CUSTOMER': return { ...state, customerId: action.payload.customerId };
    case 'SET_PAYMENT_METHOD': return { ...state, paymentMethod: action.payload.method };
    case 'SET_GLOBAL_DISCOUNT': return { ...state, globalDiscount: Math.max(0, Number(action.payload.discount) || 0) };
    case 'SET_NOTES': return { ...state, notes: action.payload.notes };
    case 'CLEAR_CART': return initialState;
    default: return state;
  }
};

/* --------------------------- Component --------------------------- */
const SalesCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { style } = useStyle();

  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandAccent = `hsl(${style.primaryHue} 95% 62%)`;

  const location = useLocation();
  const prefillGuardRef = useRef<string | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const CART_STORAGE_KEY = 'sales_cart_v1';

  const [state, dispatch] = useReducer(
    cartReducer,
    initialState,
    (init) => {
      try {
        const raw = sessionStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return init;
        const parsed = JSON.parse(raw);
        // حداقل اعتبارسنجی
        if (!parsed || !Array.isArray(parsed.items)) return init;
        return { ...init, ...parsed } as CartState;
      } catch {
        return init;
      }
    }
  );

  // Persist cart across navigations (برای افزودن چند کالا از صفحات مختلف)
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);
  const [salesDate, setSalesDate] = useState<Date | null>(new Date());
  const f = (n: number) => (Number(n) || 0).toLocaleString('fa-IR');

  /* دریافت آیتم از صفحه قبل */
  useEffect(() => {
    const prefill = (location.state as any)?.prefillItem;
    if (!prefill) return;
    const normalizedType =
      (prefill.type as string)?.toLowerCase() === 'product' ? 'inventory' : (prefill.type as string);
    const guardKey = `${location.key}:${normalizedType}:${prefill.id ?? prefill.itemId}`;
    if (prefillGuardRef.current === guardKey) return;
    prefillGuardRef.current = guardKey;

    const item: SellableItem =
      'id' in prefill
        ? { id: prefill.id, type: normalizedType, name: prefill.name, price: prefill.price, stock: prefill.stock ?? 0 }
        : { id: prefill.itemId, type: normalizedType, name: prefill.description, price: prefill.unitPrice, stock: prefill.stock ?? 0 };

    const exists = state.items.some(i => i.itemId === item.id && i.itemType === normalizedType);
    if (!exists) dispatch({ type: 'ADD_ITEM', payload: item });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.key, location.pathname, navigate, state.items]);

  /* مشتریان */
  useEffect(() => {
    if (!token) return;
    apiFetch('/api/customers')
      .then(r => r.json())
      .then(j => j.success && setCustomers(j.data))
      .catch(() => setNotification({ type: 'error', text: 'خطا در دریافت لیست مشتریان.' }));
  }, [token]);

  /* افزودن آیتم از سرچ‌باکس */
  const handleAddItem = (item: SellableItem) => dispatch({ type: 'ADD_ITEM', payload: item });

  /* ثبت فروش */
  const handleCheckout = async () => {
    if (!state.items.length) { setNotification({ type: 'warning', text: 'سبد خرید خالی است.' }); return; }
    setIsSubmitting(true); setNotification(null);

    // subtotal و تخفیف‌ها را مانند نمایش، پاک‌سازی و سقف‌گذاری می‌کنیم
    const subtotal = state.items.reduce((s, i) => s + (Number(i.unitPrice)||0) * (Number(i.quantity)||0), 0);
    const itemsDiscount = state.items.reduce((s, i) => s + (Number(i.discountPerItem)||0), 0); // تخفیف کل ردیف‌ها (جمع مستقیم)
    const afterRowDiscounts = Math.max(0, subtotal - itemsDiscount);
    const cleanGlobal = Math.min(Math.max(Number(state.globalDiscount)||0, 0), afterRowDiscounts);

    const payload: SalesOrderPayload = {
      transactionDate: (salesDate ? moment(salesDate).locale('en').format('YYYY-MM-DD') : undefined),
      customerId: state.customerId,
      paymentMethod: state.paymentMethod,
      discount: cleanGlobal, // تخفیف کل فاکتور
      tax: 0,
      notes: state.notes,
      items: state.items.map(i => ({
        itemId: i.itemId,
        itemType: (i.itemType as string).toLowerCase() === 'product' ? 'inventory' : (i.itemType as any),
        description: i.description,
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        // مهم: این فیلد اکنون «تخفیف کلِ ردیف» است، نه تخفیف هر-واحد
        discountPerItem: Math.max(0, Number(i.discountPerItem) || 0),
      })),
    };

    try {
      const res = await apiFetch('/api/sales-orders', { method: 'POST', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      setNotification({ type: 'success', text: 'فروش ثبت شد!' });
      dispatch({ type: 'CLEAR_CART' });
      setTimeout(() => navigate(`/invoices/${json.data.orderId}`), 600);
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'خطای ناشناخته.' });
    } finally { setIsSubmitting(false); }
  };

  /* جمع‌ها (منطق واحد نمایش) */
  const summary = useMemo(() => {
    const subtotal = state.items.reduce((s, i) => s + (Number(i.unitPrice)||0) * (Number(i.quantity)||0), 0);
    const itemsDiscount = state.items.reduce((s, i) => s + (Number(i.discountPerItem)||0), 0); // تخفیف کل ردیف‌ها
    const afterRowDiscounts = Math.max(0, subtotal - itemsDiscount);
    const cleanGlobal = Math.min(Math.max(Number(state.globalDiscount)||0, 0), afterRowDiscounts);
    const grandTotal = Math.max(0, afterRowDiscounts - cleanGlobal);
    return { subtotal, itemsDiscount, globalDiscount: cleanGlobal, grandTotal };
  }, [state.items, state.globalDiscount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950" dir="rtl">
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* هدر */}
        <header
          className="relative overflow-hidden rounded-2xl text-white p-4 md:p-6 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${brand} 0%, ${brandAccent} 100%)` }}
        >
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-cash-register text-2xl md:text-3xl" />
              <div>
                <h1 className="text-lg md:text-2xl font-extrabold tracking-tight">صندوق فروش</h1>
                <p className="opacity-90 text-[10px] md:text-sm">ثبت فروش نقدی، مدیریت سبد و صدور فاکتور</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              <div className="shrink-0 px-3 py-2 rounded-xl bg-white/15 backdrop-blur text-[11px] md:text-sm whitespace-nowrap">
                <i className="fa-solid fa-cart-plus ml-1" />
                اقلام سبد: <b className="font-bold">{state.items.length}</b>
              </div>
              <div className="shrink-0 px-3 py-2 rounded-xl bg-white/15 backdrop-blur text-[11px] md:text-sm whitespace-nowrap">
                جمع کل: <b className="font-bold">{f(summary.grandTotal)}</b> <span className="opacity-80">تومان</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="shrink-0 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/20 backdrop-blur text-[11px] md:text-sm whitespace-nowrap transition"
                title="مشاهده فاکتورها"
              >
                <i className="fa-solid fa-file-invoice ml-1" />
                فاکتورها
              </button>
            </div>
          </div>
        </header>

        <div className="mt-4">
          <WorkflowWizard
            steps={([
              { id: 'items', title: 'انتخاب اقلام', description: 'کالا/خدمت را اضافه کن', icon: 'fa-solid fa-basket-shopping', anchorId: 'sale-step-items' },
              { id: 'cart', title: 'سبد خرید', description: 'تعداد و تخفیف‌ها را تنظیم کن', icon: 'fa-solid fa-bag-shopping', anchorId: 'sale-step-cart' },
              { id: 'checkout', title: 'تایید و ثبت', description: 'مشتری، تاریخ و ثبت نهایی', icon: 'fa-solid fa-receipt', anchorId: 'sale-step-checkout' },
            ] as WizardStep[])}
            stepIndex={wizardStep}
            onStepChange={setWizardStep}
            className=""
          />
        </div>

        {/* بدنه */}
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6" dir="ltr">
          <section className="xl:col-span-2 xl:col-start-1 space-y-6">
            {/* افزودن کالا */}
            <section id="sale-step-items" dir="rtl" className={['rounded-2xl border shadow-sm p-5 bg-white/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800', wizardStep === 0 ? '' : 'hidden xl:block'].join(' ')}>
              <div className="flex items-center gap-2 mb-3">
                <i className="fa-solid fa-basket-shopping" style={{ color: brand }} />
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-100">افزودن کالا به سبد خرید</h2>
              </div>
              <div className="mb-4 rounded-xl border p-3 bg-white/80 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800">
                <SellableItemSelect onAddItem={handleAddItem} />
              </div>
              <div className="rounded-xl border p-3 bg-white/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800">
                <div className="mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-bolt" style={{ color: brand }} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">فروش سریع خدمات</span>
                </div>
                <ServiceQuickSell variant="dark" onAddItem={handleAddItem} />
              </div>
            </section>

            {/* سبد خرید */}
            <section id="sale-step-cart" dir="rtl" className={['rounded-2xl border shadow-sm p-5 bg-white/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800', wizardStep === 1 ? '' : 'hidden xl:block'].join(' ')}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <i className="fa-solid fa-bag-shopping" style={{ color: brand }} />
                  سبد خرید
                </h3>
                {state.items.length > 0 && (
                  <button
                    onClick={() => dispatch({ type: 'CLEAR_CART' })}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    title="پاک کردن سبد"
                  >
                    <i className="fa-solid fa-trash-can" />
                    پاک کردن
                  </button>
                )}
              </div>

              {state.items.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <i className="fa-solid fa-cart-shopping text-4xl mb-3 opacity-60" />
                  <p className="font-medium">سبد خرید خالی است</p>
                  <p className="text-xs mt-1">از بالا کالا/خدمت را انتخاب کنید.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40">
                  <CartTable items={state.items} dispatch={dispatch} />
                </div>
              )}
            </section>
          </section>

          <aside className={['xl:col-span-1 xl:col-start-3', wizardStep === 2 ? '' : 'hidden xl:block'].join(' ')}>
            <div
              id="sale-step-checkout"
              dir="rtl"
              className="bg-white/90 dark:bg-gray-800/70 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-md p-5 xl:sticky xl:top-6"
            >
              <h4 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-receipt" style={{ color: brand }} />
                خلاصه فاکتور
              </h4>

              <CartSummary
                summary={summary}
                globalDiscount={summary.globalDiscount} // همیشه مقدار سقف‌گذاری‌شده
                customers={customers}
                selectedCustomerId={state.customerId}
                onCustomerChange={(id) => dispatch({ type: 'SET_CUSTOMER', payload: { customerId: id } })}
                paymentMethod={state.paymentMethod as any}
                onPaymentChange={(m) => dispatch({ type: 'SET_PAYMENT_METHOD', payload: { method: m as any } })}
                items={state.items}
                onGlobalDiscountChange={(val: unknown) =>
                  dispatch({
                    type: 'SET_GLOBAL_DISCOUNT',
                    payload: { discount: typeof val === 'number' ? val : parseToman(String(val)) },
                  })
                }
                notes={state.notes}
                onNotesChange={(t) => dispatch({ type: 'SET_NOTES', payload: { notes: t } })}
                salesDate={salesDate}
                onDateChange={setSalesDate}
                onSubmit={handleCheckout}
                isSubmitting={isSubmitting}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SalesCartPage;
