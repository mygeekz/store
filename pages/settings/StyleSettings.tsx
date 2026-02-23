// pages/settings/StyleSettings.tsx
import React, { useMemo } from 'react';
import { useStyle } from '../../hooks/useStyle';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const Card: React.FC<{
  title: string;
  desc?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, desc, right, children }) => (
  <section className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/50 backdrop-blur-md p-4 md:p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {desc ? (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
        ) : null}
      </div>
      {right}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

const TogglePill: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'px-3 py-2 rounded-full text-xs font-semibold transition border',
      active
        ? 'bg-[hsl(var(--primary)/0.12)] text-gray-900 dark:text-gray-100 border-[hsl(var(--primary)/0.25)]'
        : 'bg-transparent text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-100/70 dark:hover:bg-white/5',
    ].join(' ')}
  >
    {label}
  </button>
);

const StyleSettings: React.FC = () => {
  const { style, setStyle, resetStyle } = useStyle();

  const primarySwatch = useMemo(
    () => ({ background: `hsl(${style.primaryHue} 90% 55%)` }),
    [style.primaryHue]
  );

  return (
    <div className="space-y-6">
      {/* Premium header */}
      <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-900/60 dark:to-gray-900/30 backdrop-blur-md p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">ظاهر و استایل</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              این بخش ظاهر برنامه را کنترل می‌کند (تم، سایدبار و رنگ برند). تغییرات فوری اعمال می‌شوند.
            </div>
          </div>
          <button
            type="button"
            onClick={resetStyle}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            بازنشانی
          </button>
        </div>

        {/* Mini preview */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-950/40 p-3">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">نمونه دکمه</div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
              >
                اکشن اصلی
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5"
              >
                ثانویه
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-950/40 p-3">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Badge / وضعیت</div>
            <div className="mt-2 flex gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold bg-[hsl(var(--primary)/0.12)] border border-[hsl(var(--primary)/0.25)]">
                فعال
              </span>
</div>
          </div>
          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-950/40 p-3">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">رنگ برند</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-9 w-9 rounded-full ring-2 ring-black/5 dark:ring-white/10" style={primarySwatch} />
              <div className="text-xs text-gray-700 dark:text-gray-200">Hue: {style.primaryHue}</div>
            </div>
          </div>
        </div>
      </div>

      <Card
        title="حالت نمایش"
        desc="تم کلی برنامه را تعیین می‌کند. حالت سیستمی با تنظیمات دستگاه هماهنگ می‌شود."
        right={<span className="text-[11px] text-gray-500 dark:text-gray-400">Theme</span>}
      >
        <div className="flex flex-wrap gap-2">
          <TogglePill active={style.theme === 'light'} label="روشن" onClick={() => setStyle('theme', 'light')} />
          <TogglePill active={style.theme === 'dark'} label="تاریک" onClick={() => setStyle('theme', 'dark')} />
          <TogglePill active={style.theme === 'system'} label="سیستمی" onClick={() => setStyle('theme', 'system')} />
        </div>
      </Card>

      <Card
        title="سایدبار"
        desc="چیدمان و خوانایی منو را تنظیم می‌کند. پیشنهاد ما برای حالت پولی/مدرن: Pill + Ink bar روشن."
        right={<span className="text-[11px] text-gray-500 dark:text-gray-400">Navigation</span>}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">حالت</div>
            <div className="flex flex-wrap gap-2">
              <TogglePill active={style.sidebarVariant === 'pill'} label="Pill" onClick={() => setStyle('sidebarVariant', 'pill')} />
              <TogglePill active={style.sidebarVariant === 'classic'} label="Classic" onClick={() => setStyle('sidebarVariant', 'classic')} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">اندازه آیکون</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{style.sidebarIconPx}px</div>
            </div>
            <input
              type="range"
              min={28}
              max={56}
              step={1}
              value={style.sidebarIconPx}
              onChange={(e) =>
                setStyle('sidebarIconPx', clamp(parseInt(e.target.value, 10), 28, 56))
              }
              className="mt-3 w-full"
            />
          </div>

          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">عرض منو</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{style.sidebarPillWidthPx}px</div>
            </div>
            <input
              type="range"
              min={180}
              max={340}
              step={2}
              value={style.sidebarPillWidthPx}
              onChange={(e) =>
                setStyle('sidebarPillWidthPx', clamp(parseInt(e.target.value, 10), 180, 340))
              }
              className="mt-3 w-full"
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
            <input
              id="inkbar"
              type="checkbox"
              checked={style.showInkBar}
              onChange={(e) => setStyle('showInkBar', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="inkbar" className="text-xs text-gray-700 dark:text-gray-200">
              نمایش نوار گرادیانی کنار آیتم‌ها
            </label>
          </div>
        </div>
      </Card>

      <Card
        title="رنگ برند"
        desc="Hue رنگ اصلی برنامه را تغییر می‌دهد. برای دقت بهتر، تغییرات به صورت HSL اعمال می‌شوند."
        right={<span className="text-[11px] text-gray-500 dark:text-gray-400">Brand</span>}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            type="range"
            min={0}
            max={360}
            value={style.primaryHue}
            onChange={(e) => setStyle('primaryHue', clamp(parseInt(e.target.value, 10), 0, 360))}
            className="w-full md:w-[420px]"
          />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full ring-2 ring-black/5 dark:ring-white/10" style={primarySwatch} />
            <div className="text-xs text-gray-700 dark:text-gray-200">{style.primaryHue}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200/70 dark:border-white/10 bg-gray-50/60 dark:bg-white/5 p-3">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            نکته: اگر برخی بخش‌ها هنوز رنگ ثابت دارند، باید رنگ‌های hardcode (مثل indigo) را به رنگ‌های مبتنی بر primary تبدیل کنیم.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StyleSettings;
