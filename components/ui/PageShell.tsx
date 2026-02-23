import React from 'react';

export type PageShellProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * PageShell
 * هدر یکپارچه برای صفحات (حس محصول پولی):
 * - عنوان + توضیح
 * - اکشن‌ها (دکمه‌ها/فیلترها)
 * - محتوای صفحه در ادامه
 */
const PageShell: React.FC<PageShellProps> = ({
  title,
  description,
  icon,
  actions,
  children,
  className,
}) => {
  return (
    <div className={['space-y-4 text-right', className].filter(Boolean).join(' ')} dir="rtl">
      <div className="app-card p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-end gap-2">
              {icon ? (
                <div className="w-10 h-10 rounded-2xl bg-gray-900/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  {icon}
                </div>
              ) : null}
              <h1 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-gray-50 truncate">
                {title}
              </h1>
            </div>
            {description ? (
              <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
};

export default PageShell;
