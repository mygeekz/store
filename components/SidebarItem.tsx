// SidebarItem.tsx
import React from 'react';
import clsx from 'clsx';

type AccentKey = 'indigo' | 'purple' | 'emerald' | 'blue' | 'orange' | 'rose';

const ACCENTS: Record<AccentKey, { gradient: string; dot: string; shadow: string }> = {
  indigo:  { gradient: 'from-indigo-500 to-violet-500', dot: 'bg-indigo-400',  shadow: 'shadow-indigo-500/30' },
  purple:  { gradient: 'from-fuchsia-500 to-purple-500', dot: 'bg-fuchsia-400', shadow: 'shadow-fuchsia-500/30' },
  emerald: { gradient: 'from-emerald-500 to-teal-500',  dot: 'bg-emerald-400', shadow: 'shadow-emerald-500/30' },
  blue:    { gradient: 'from-sky-500 to-blue-600',       dot: 'bg-sky-400',     shadow: 'shadow-sky-500/30' },
  orange:  { gradient: 'from-orange-500 to-amber-500',   dot: 'bg-amber-400',   shadow: 'shadow-amber-500/30' },
  rose:    { gradient: 'from-rose-500 to-pink-500',      dot: 'bg-rose-400',    shadow: 'shadow-rose-500/30' },
};

export interface SidebarItemProps {
  label: string;
  icon: string;           // مثلا 'fa-solid fa-boxes-stacked'
  active?: boolean;
  accent?: AccentKey;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  label, icon, active = false, accent = 'indigo', onClick,
}) => {
  const a = ACCENTS[accent];

  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-right',
        'transition-all duration-200',
        active ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-gray-50 text-gray-700',
      )}
    >
      {/* آیکون گرادیانی + گلو */}
      <span className="relative inline-flex items-center justify-center">
        {/* گلو */}
        <span
          className={clsx(
            'absolute -inset-2 rounded-xl blur-lg opacity-0 transition-opacity duration-300',
            `bg-gradient-to-br ${a.gradient}`,
            'group-hover:opacity-40 motion-safe:group-hover:animate-glow',
          )}
          aria-hidden
        />
        {/* خود آیکون */}
        <i
          className={clsx(
            icon, 'fa-fw text-[18px] relative z-[1]',
            'bg-clip-text text-transparent',
            `bg-gradient-to-br ${a.gradient}`,
            'transition-transform duration-200',
            'motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-[2deg]',
          )}
          aria-hidden
        />
      </span>

      <span className="text-sm font-medium">{label}</span>

      {/* نشانگر وضعیت سمت چپ */}
      <span className="ms-auto flex items-center">
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full opacity-0 transition-opacity duration-200',
            active ? 'opacity-100' : 'group-hover:opacity-100',
            a.dot,
          )}
        />
      </span>

      {/* نوار فعال (کنار آیتم) */}
      <span
        aria-hidden
        className={clsx(
          'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r',
          active ? `opacity-100 bg-gradient-to-b ${a.gradient} ${a.shadow}` : 'opacity-0',
          'transition-opacity duration-200',
        )}
      />
    </button>
  );
};

export default SidebarItem;
