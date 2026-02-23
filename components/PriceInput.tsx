import React from 'react';
import {
  formatNumberWithCommas,
  convertNumberToPersianWords,
} from '../utils/numberUtils';

interface PriceInputProps {
  id?: string;
  name?: string;
  value: string | number; // مقدار خام از استیت والد
  onChange: (e: { target: { name: string; value: string } }) => void; // ارسال رشتهٔ عددیِ خام
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** تبدیل ارقام فارسی/عربی به لاتین */
const normalizeDigits = (s: string) =>
  (s || '').replace(/[۰-۹٠-٩]/g, (d) =>
    '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(d) <= 9
      ? String('0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
      : String('0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d) - 10])
  );

/** حذف کاما، فاصله، نیم‌فاصله، NBSP و… */
const stripGroupChars = (s: string) => s.replace(/[,\s\u200c\u200f\u202f]/g, '');

const toCleanNumericString = (s: string): string => {
  const raw = stripGroupChars(normalizeDigits(s));
  if (raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return '0';
  return String(Math.round(n));
};

const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  id,
  name = '',
  placeholder,
  className,
  disabled,
}) => {
  // مقدار ورودیِ قابل نمایش (با کاما)
  const raw = typeof value === 'number' ? String(value) : String(value ?? '');
  const clean = toCleanNumericString(raw);
  const numeric = clean === '' ? 0 : Number(clean);
  const displayValue = clean === '' ? '' : formatNumberWithCommas(numeric);
  const words = numeric > 0 ? convertNumberToPersianWords(String(numeric)) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanOut = toCleanNumericString(e.target.value);
    onChange({ target: { name, value: cleanOut } }); // فقط عدد خام بدون جداکننده
  };

  return (
    <div className="w-full">
      <input
        type="text"
        inputMode="numeric"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
        dir="ltr"
      />
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right h-4">
        {words}
      </div>
    </div>
  );
};

export default PriceInput;
