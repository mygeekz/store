// src/components/ShamsiDatePicker.tsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import moment from 'jalali-moment';
import { useStyle } from '../contexts/StyleContext';

type Props = {
  id?: string;
  // New API
  selectedDate?: Date | null;
  onDateChange?: (d: Date | null) => void;
  // Backward-compatible API
  value?: Date | null;
  onChange?: (d: Date | null) => void;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * تقویم شمسی سبک‌وزن با استایل دارک/لایت متناسب با پروژه
 * - بدون وابستگی خارجی
 * - راست‌چین
 * - فرمت ورودی: jYYYY/jMM/jDD
 */
const ShamsiDatePicker: React.FC<Props> = ({
  id,
  selectedDate,
  onDateChange,
  value,
  onChange,
  inputClassName = '',
  placeholder = 'انتخاب تاریخ',
  disabled = false,
}) => {
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  const [open, setOpen] = useState(false);
  const effectiveDate = (selectedDate ?? value) ?? null;
  const emitChange = (d: Date | null) => {
    (onDateChange ?? onChange)?.(d);
  };

  const [view, setView] = useState(() =>
    moment(effectiveDate || new Date()).locale('fa')
  ); // ماهی که نمایش می‌دهیم

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // بستن با کلیک بیرون (با Portal سازگار)
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  // مقدار ورودی به فرمت شمسی
  const inputValue = useMemo(() => {
    if (!effectiveDate) return '';
    return moment(effectiveDate).locale('fa').format('jYYYY/jMM/jDD');
  }, [effectiveDate]);

  // روزهای تقویم (با فاصله‌های اول ماه)
  const grid = useMemo(() => {
    const startOfMonth = view.clone().startOf('jMonth');
    const daysInMonth = view.clone().jDaysInMonth();
    // ۱=شنبه … 7=جمعه (برای چیدمان RTL، شنبه را ستون اول می‌گیریم)
    const weekDayIndex = Number(startOfMonth.format('d')); // 0..6 (یکشنبه=0)
    // تبدیل به الگوی ما (شنبه=0)
    const startPad = (weekDayIndex + 1) % 7; // یکشنبه(0) -> 1 => شنبه(0)

    const cells: Array<{ d: moment.Moment; inMonth: boolean }> = [];

    // روزهای قبل از ماه
    for (let i = 0; i < startPad; i++) {
      const d = startOfMonth.clone().subtract(startPad - i, 'day');
      cells.push({ d, inMonth: false });
    }
    // خود ماه
    for (let i = 0; i < daysInMonth; i++) {
      cells.push({ d: startOfMonth.clone().add(i, 'day'), inMonth: true });
    }
    // کامل کردن تا مضرب 7
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].d;
      cells.push({ d: last.clone().add(1, 'day'), inMonth: false });
    }
    return cells;
  }, [view]);

  const isSameDay = (a: Date | null, b: moment.Moment) => {
    if (!a) return false;
    const ma = moment(a).locale('fa');
    return ma.isSame(b, 'day') && ma.isSame(b, 'month') && ma.isSame(b, 'year');
  };

  // انتخاب روز
  const pick = (m: moment.Moment) => {
    emitChange(m.toDate());
    setOpen(false);
    // فوکوس روی ورودی برای کیبورد
    inputRef.current?.focus();
  };

  // پارس ورودی دستی کاربر
  const onInputManual = (val: string) => {
    const m = moment(val, ['jYYYY/jMM/jDD', 'jYYYY/jM/jD'], true).locale('fa');
    if (m.isValid()) {
      emitChange(m.toDate());
      setView(m.clone());
    }
  };

  // کلاس‌های تم (دارک/لایت)
  // Panel as a portal so it won't be clipped inside scrollable modals
  const panelCls =
    'fixed z-[9999] w-80 rounded-xl border shadow-2xl p-3 ' +
    'bg-white text-slate-800 border-gray-200 ' +
    'dark:bg-slate-900 dark:text-gray-100 dark:border-slate-700';
  const cellBase =
    'h-9 w-9 inline-flex items-center justify-center rounded-lg text-sm select-none';
  const headerBtn =
    'inline-flex items-center justify-center h-8 w-8 rounded-lg ' +
    'hover:bg-gray-100 dark:hover:bg-slate-800';

  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const el = wrapperRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 320; // w-80
    const gap = 8;
    // RTL: align to the right edge of the input
    let left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
    let top = r.bottom + gap;
    // اگر پایین جا نشد، بالا باز شود
    const panelHeightGuess = 360;
    if (top + panelHeightGuess > window.innerHeight - 8) {
      top = Math.max(8, r.top - gap - panelHeightGuess);
    }
    setPanelPos({ top, left });
  }, [open, inputValue]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => {
      // Reposition on scroll/resize
      const el = wrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = 320;
      const gap = 8;
      let left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
      let top = r.bottom + gap;
      const panelHeightGuess = 360;
      if (top + panelHeightGuess > window.innerHeight - 8) {
        top = Math.max(8, r.top - gap - panelHeightGuess);
      }
      setPanelPos({ top, left });
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef} dir="rtl">
      <div
        className={[
          'flex items-center gap-2 rounded-lg px-3 py-2 border overflow-hidden',
          'bg-white text-slate-900 border-gray-300',
          'dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700',
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text',
          inputClassName,
        ].join(' ')}
        onClick={() => !disabled && setOpen(true)}
      >
        <i className="fa-regular fa-calendar" style={{ color: brand }} />
        <input
          id={id}
          ref={inputRef}
          type="text"
          dir="ltr"
          value={inputValue}
          onChange={(e) => onInputManual(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-right placeholder-gray-400 dark:placeholder-gray-500"
        />
        {effectiveDate && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              emitChange(null);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="حذف تاریخ"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      {open && panelPos && createPortal(
        <div ref={panelRef} className={panelCls} style={{ top: panelPos.top, left: panelPos.left }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          {/* هدر ماه/سال */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className={headerBtn}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setView((v) => v.clone().subtract(1, 'jMonth'))}
              aria-label="ماه قبل"
              title="ماه قبل"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>

            <div className="text-sm font-bold">
              {view.format('jYYYY')} &nbsp; {view.format('jMMMM')}
            </div>

            <button
              type="button"
              className={headerBtn}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setView((v) => v.clone().add(1, 'jMonth'))}
              aria-label="ماه بعد"
              title="ماه بعد"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
          </div>

          {/* نام روزها */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-xs text-gray-500 dark:text-gray-400">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w) => (
              <div key={w} className="h-7 flex items-center justify-center">
                {w}
              </div>
            ))}
          </div>

          {/* شبکه روزها */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map(({ d, inMonth }, idx) => {
              const today = moment().locale('fa');
              const isToday = d.isSame(today, 'day');
              const selected = isSameDay(effectiveDate, d);

              const muted =
                !inMonth ? 'text-gray-400 dark:text-gray-500' : 'text-inherit';

              const base =
                cellBase +
                ' ' +
                (selected
                  ? 'text-white'
                  : isToday
                  ? 'ring-1 ring-offset-0 ring-[var(--brand)]'
                  : '');

              const style = selected
                ? { backgroundColor: brand }
                : undefined;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => pick(d)}
                  className={[
                    base,
                    muted,
                    !selected &&
                      'hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors',
                  ].join(' ')}
                  style={style}
                  title={d.format('jYYYY/jMM/jDD')}
                >
                  {d.format('jD')}
                </button>
              );
            })}
          </div>

          {/* اکشن‌ها */}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
              onClick={() => {
                const now = moment().locale('fa');
                setView(now);
                emitChange(now.toDate());
                setOpen(false);
              }}
            >
              امروز
            </button>

            <button
              type="button"
              className="text-xs px-3 py-1 rounded text-white"
              style={{ backgroundColor: brand }}
              onClick={() => setOpen(false)}
            >
              تایید
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* CSS متغیر برند برای رینگ امروز */}
      <style>{`:root { --brand: ${brand}; }`}</style>
    </div>
  );
};

export default ShamsiDatePicker;
