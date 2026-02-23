import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  icon: string;
  /** Tailwind gradient classes, e.g. "from-primary-500" */
  gradientFrom?: string;
  /** Tailwind gradient classes, e.g. "to-primary-600" */
  gradientTo?: string;
  /** If provided, card will render as a Link */
  to?: string;
  /** If provided, card will render as a button */
  onClick?: () => void;
  /** Visual active state */
  active?: boolean;
};

const HubCard: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  gradientFrom = 'from-primary-500',
  gradientTo = 'to-primary-600',
  to,
  onClick,
  active,
}) => {
  const baseClass = [
    'group rounded-2xl p-4 md:p-5 text-right',
    'border bg-white dark:bg-gray-800',
    'border-gray-200 dark:border-gray-700',
    'hover:border-primary/40 hover:shadow-lg transition-all',
    'focus:outline-none focus:ring-2 focus:ring-primary/30',
    active ? 'ring-2 ring-primary/25' : '',
  ].join(' ');

  const inner = (
    <div className="flex items-center gap-3">
      <span
        className={[
          'h-12 w-12 rounded-2xl grid place-items-center text-white',
          'bg-gradient-to-br shadow-sm',
          gradientFrom,
          gradientTo,
        ].join(' ')}
      >
        <i className={`${icon} text-lg`} />
      </span>
      <div className="flex-1">
        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        {subtitle ? (
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{subtitle}</div>
        ) : null}
      </div>
      <i className="fa-solid fa-arrow-left text-gray-400 group-hover:text-primary transition-colors" />
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={baseClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {inner}
    </button>
  );
};

export default HubCard;
