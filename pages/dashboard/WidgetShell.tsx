import React from 'react';
import { useContainerSize } from './useContainerSize';

type Props = {
  title: string;
  icon?: string;
  editable: boolean;
  onRemove?: () => void;
  onResizeToggle?: () => void;
  sizePreset?: 'tile' | 'wide' | 'tall' | 'hero';
  children: (container: { width: number; height: number }) => React.ReactNode;
};

const presetLabel = (p?: Props['sizePreset']) => {
  switch (p) {
    case 'hero':
      return 'بزرگ';
    case 'tall':
      return 'بلند';
    case 'wide':
      return 'متوسط';
    case 'tile':
    default:
      return 'کوچک';
  }
};

export default function WidgetShell({
  title,
  icon,
  editable,
  onRemove,
  onResizeToggle,
  sizePreset,
  children,
}: Props) {
  const [ref, size] = useContainerSize<HTMLDivElement>();

  // header only in edit mode
  const headerH = editable ? 44 : 0;

  // IMPORTANT: give widgets (charts) accurate inner size
  const content = {
    width: Math.max(0, size.width),
    height: Math.max(0, size.height - headerH),
  };

  return (
    <div
      ref={ref}
      dir="rtl"
      className={[
        'h-full w-full rounded-2xl overflow-hidden',
        'bg-white dark:bg-gray-900/40 shadow-sm ring-1 ring-black/5 dark:ring-white/10',
        editable
          ? 'outline outline-2 outline-indigo-500/20 hover:outline-indigo-500/30'
          : 'hover:shadow-md transition-shadow',
      ].join(' ')}
    >
      {editable && (
        <div
          className={[
            'dash-drag-handle flex items-center justify-between px-3 py-2',
            'bg-white/70 dark:bg-gray-800/60 backdrop-blur',
            'border-b border-gray-200/70 dark:border-gray-800',
            'cursor-move select-none',
          ].join(' ')}
        >
          <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-sm flex items-center justify-center ring-1 ring-white/30">
              <i className={(icon || 'fa-solid fa-grip-vertical') + ' text-white text-sm'} />
            </div>

            <div className="min-w-0 text-right">
              <div className="text-[11px] font-extrabold text-gray-800 dark:text-gray-100 truncate">
                {title}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-300 flex items-center justify-end gap-2">
                <i className="fa-solid fa-hand-pointer" />
                Drag
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onResizeToggle && (
              <button
                type="button"
                data-rgl-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onResizeToggle?.();
                }}
                className="h-9 px-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 transition ring-1 ring-black/5 dark:ring-white/10 flex items-center gap-2"
                title="تغییر اندازه"
              >
                <i className="fa-solid fa-up-right-and-down-left-from-center text-[12px]" />
                <span className="text-[11px] font-extrabold">{presetLabel(sizePreset)}</span>
              </button>
            )}

            {onRemove ? (
              <button
                type="button"
                data-rgl-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove?.();
                }}
                className="w-9 h-9 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-200 transition ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center"
                title="حذف کارت"
              >
                <i className="fa-solid fa-trash" />
              </button>
            ) : (
              <span
                data-rgl-no-drag
                className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-gray-500/10 text-gray-600 dark:text-gray-300"
                title="این کارت قابل حذف نیست"
              >
                ثابت
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={editable ? 'h-[calc(100%-44px)]' : 'h-full'}>
        {children(content)}
      </div>
    </div>
  );
}
