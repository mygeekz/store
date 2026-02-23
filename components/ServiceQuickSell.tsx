import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Service, SellableItem } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';

interface Props {
  variant?: 'default' | 'dark'; // حالت نمایش (برای دارک نئونی)
  /**
   * اگر این کامپوننت داخل صفحه فروش (Cart) استفاده شود،
   * برای جلوگیری از navigate و ری‌مانت شدن صفحه (که باعث پاک شدن سبد می‌شود)
   * می‌توان آیتم را مستقیم به سبد اضافه کرد.
   */
  onAddItem?: (item: SellableItem) => void;
}

export const ServiceQuickSell: React.FC<Props> = ({ variant = 'default', onAddItem }) => {
  const { token } = useAuth();
  const nav = useNavigate();
  const { style } = useStyle();
  const [services, setServices] = React.useState<Service[]>([]);

  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandSoft = `hsl(${style.primaryHue} 90% 85%)`;
  const brandGlow = `hsl(${style.primaryHue} 95% 65%)`;

  React.useEffect(() => {
    apiFetch('/api/services')
      .then(r => r.json())
      .then(res => res.success && setServices(res.data))
      .catch(() => setServices([]));
  }, [token]);

  const addToBasket = (svc: Service) => {
    const sellable = {
      id: svc.id,
      type: 'service' as const,
      name: svc.name,
      price: svc.price,
      stock: Infinity,
    };
    // اگر داخل صفحه فروش نقدی هستیم، مستقیم اضافه کن
    if (onAddItem) {
      onAddItem(sellable);
      return;
    }
    // در سایر صفحات، همان رفتار قبلی (prefill) حفظ شود
    nav('/sales', { state: { prefillItem: sellable } });
  };

  // تم رنگی کارت‌ها
  const palette = [
    { bg: 'from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
    { bg: 'from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
    { bg: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    { bg: 'from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
    { bg: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
    { bg: 'from-violet-50 to-violet-100 dark:from-violet-950/40 dark:to-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
  ];

  return (
    <div className="mt-4">
      <h3
        className="font-semibold mb-3 flex items-center gap-2"
        style={{ color: brand }}
      >
        <i className="fa-solid fa-bolt" style={{ color: brandGlow }} />
        فروش سریع خدمات
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {services.map((s, idx) => {
          const c = palette[idx % palette.length];

          return (
            <button
              key={s.id}
              onClick={() => addToBasket(s)}
              className={[
                // پس‌زمینه گرادینت و رنگ متن
                'bg-gradient-to-br', c.bg, c.text,
                // قاب و ساختار
                'border border-transparent dark:border-slate-800',
                'rounded-xl p-3 text-right text-sm backdrop-blur-sm',
                // افکت‌ها و ترنزیشن‌ها
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95',
                'hover:brightness-105 dark:hover:brightness-125',
                // افکت نئون برای دارک مود
                'dark:shadow-[0_0_8px_hsla(var(--brand-hue,220),90%,60%,0.25)]',
              ].join(' ')}
              style={
                variant === 'dark'
                  ? {
                      boxShadow: `0 0 10px ${brandGlow}33`,
                      backgroundImage: `linear-gradient(135deg, ${brandSoft}11 0%, transparent 100%)`,
                    }
                  : {}
              }
              title={s.name}
            >
              <div className="font-semibold truncate">{s.name}</div>
              <div className="text-xs opacity-80 mt-1">
                {s.price.toLocaleString('fa-IR')} تومان
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
