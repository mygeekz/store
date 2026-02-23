import React from "react";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * یک SearchBox ساده و قابل استفاده در صفحات مختلف.
 * (نسخه‌ی قبلی این فایل صرفاً یک snippet بود و باعث خطای TypeScript می‌شد.)
 */
export default function SearchBox({ value, onChange, placeholder, className }: SearchBoxProps) {
  return (
    <input
      inputMode="search"
      enterKeyHint="search"
      dir="rtl"
      value={value}
      placeholder={placeholder || "جستجو..."}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
      }
    />
  );
}
