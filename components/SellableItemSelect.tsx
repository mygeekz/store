import React, { useState, useEffect, useMemo } from 'react';
import Select, { OnChangeValue, GroupBase, StylesConfig } from 'react-select';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { useStyle } from '../contexts/StyleContext';
import type {
  SellableItem,
  SellableItemsResponse,
  SellableInventoryItem,
  SellablePhoneItem,
  Service
} from '../types';

interface SellableItemSelectProps {
  onAddItem: (item: SellableItem) => void;
}
interface SelectOption {
  label: string;
  value: SellableItem;
}

const SellableItemSelect: React.FC<SellableItemSelectProps> = ({ onAddItem }) => {
  const { token } = useAuth();
  const { style } = useStyle();
  const [allItems, setAllItems] = useState<SellableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(
    document.documentElement.classList.contains('dark')
  );

  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandLight = `hsl(${style.primaryHue} 95% 85%)`;
  const brandDark = `hsl(${style.primaryHue} 90% 40%)`;

  /* ---- واکنش به تغییر تم (دارک/لایت) ---- */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  /* ---- دریافت اقلام ---- */
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch('/api/sellable-items')
      .then(res => res.json())
      .then((json) => {
        if (json.success) {
          const inventory = json.data.inventory.map((i: SellableInventoryItem) => ({ ...i, type: 'inventory' as const }));
          const phones = json.data.phones.map((p: SellablePhoneItem) => ({ ...p, type: 'phone' as const }));
          const services = (json.data.services ?? []).map(
            (s: Service) => ({ ...s, type: 'service' as const, stock: Infinity })
          );
          setAllItems([...inventory, ...phones, ...services]);
        } else throw new Error(json.message || 'خطا در دریافت اقلام');
      })
      .catch(() => setError('خطا در بارگذاری اقلام قابل فروش.'))
      .finally(() => setLoading(false));
  }, [token]);

  /* ---- گزینه‌ها ---- */
  const selectOptions = useMemo<SelectOption[]>(() => {
    return allItems.map(item => ({
      value: item,
      label: `${item.name} (${item.price.toLocaleString('fa-IR')} تومان) - موجودی: ${
        item.stock?.toLocaleString('fa-IR') ?? '∞'
      }`,
    }));
  }, [allItems]);

  /* ---- افزودن کالا ---- */
  const handleChange = (selectedOption: OnChangeValue<SelectOption, false>) => {
    if (selectedOption) onAddItem(selectedOption.value);
  };

  /* ---- استایل واکنش‌گرا ---- */
  const customStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
    control: (base, state) => ({
      ...base,
      backgroundColor: isDark ? '#1e293b' : '#fff',          // پس‌زمینه با تم
      color: isDark ? '#e2e8f0' : '#0f172a',
      borderColor: state.isFocused ? brand : (isDark ? '#334155' : '#cbd5e1'),
      boxShadow: state.isFocused ? `0 0 0 1px ${brand}` : 'none',
      '&:hover': { borderColor: brand },
      borderRadius: 10,
      padding: '2px 4px',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: isDark ? '#0f172a' : '#fff',
      color: isDark ? '#e2e8f0' : '#0f172a',
      borderRadius: 10,
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      zIndex: 50,
      marginTop: 6,
      boxShadow: `0 4px 16px rgba(0,0,0,0.25)`,
    }),
    singleValue: (base) => ({
      ...base,
      color: isDark ? '#e2e8f0' : '#0f172a',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? brand
        : state.isFocused
        ? (isDark ? '#334155' : '#f1f5f9')
        : 'transparent',
      color: state.isSelected ? '#fff' : isDark ? '#e2e8f0' : '#0f172a',
      cursor: 'pointer',
    }),
    placeholder: (base) => ({
      ...base,
      color: isDark ? '#94a3b8' : '#64748b',
    }),
    input: (base) => ({
      ...base,
      color: isDark ? '#e2e8f0' : '#0f172a',
    }),
  };

  if (error) {
    return <div className="text-center p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
  }

  return (
    <div
      className="p-4 rounded-xl border shadow-sm"
      dir="rtl"
      style={{
        backgroundColor: isDark ? '#0f172a' : '#fff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        transition: 'background 0.3s, border 0.3s',
      }}
    >
      <label
        htmlFor="item-search-select"
        className="block text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200"
      >
        انتخاب کالا یا خدمات
      </label>

      <Select
        id="item-search-select"
        options={selectOptions}
        onChange={handleChange}
        value={null}
        placeholder="جستجو و انتخاب کالا یا خدمات..."
        isLoading={loading}
        isSearchable
        noOptionsMessage={() => 'موردی یافت نشد'}
        loadingMessage={() => 'در حال بارگذاری...'}
        styles={customStyles}
        theme={(theme) => ({
          ...theme,
          borderRadius: 8,
          colors: {
            ...theme.colors,
            primary: brand,
            primary75: brandLight,
            primary50: brandLight,
            primary25: isDark ? brandDark : 'rgba(148,163,184,0.2)',
          },
        })}
      />
    </div>
  );
};

export default SellableItemSelect;
