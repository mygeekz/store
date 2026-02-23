import React, { useEffect } from 'react';
import { NotificationMessage } from '../types';

type NotificationPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-center';

interface NotificationProps {
  message: NotificationMessage | null;
  onClose: () => void;
  /**
   * جایگاه نمایش نوتیفیکیشن.
   * پیش‌فرض: bottom-right (مثل قبل)
   */
  position?: NotificationPosition;
  /**
   * برای سفارشی‌سازی بیشتر کلاس‌ها (اختیاری)
   */
  className?: string;
}

const getPositionClasses = (position: NotificationPosition) => {
  switch (position) {
    case 'bottom-left':
      return 'bottom-5 left-5';
    case 'top-right':
      return 'top-5 right-5';
    case 'top-left':
      return 'top-5 left-5';
    case 'top-center':
      return 'top-5 left-1/2 -translate-x-1/2';
    case 'bottom-center':
      return 'bottom-5 left-1/2 -translate-x-1/2';
    case 'bottom-right':
    default:
      return 'bottom-5 right-5';
  }
};

const Notification: React.FC<NotificationProps> = ({ message, onClose, position = 'bottom-right', className }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto-close after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  // ✅ Backward-compatible text resolver
  // Some parts of the app used { message: '...' } instead of { text: '...' }
  const text: string =
    (message as any)?.text ??
    (message as any)?.message ??
    (typeof (message as any) === 'string' ? (message as any) : '');

  let bgColor = 'bg-gray-700 hover:bg-gray-800';
  let iconClass = 'fa-solid fa-bell';

  switch (message.type) {
    case 'success':
      bgColor = 'bg-green-500 hover:bg-green-600';
      iconClass = 'fa-solid fa-check-circle';
      break;
    case 'error':
      bgColor = 'bg-red-600 hover:bg-red-700';
      iconClass = 'fa-solid fa-exclamation-triangle';
      break;
    case 'warning':
      bgColor = 'bg-yellow-500 hover:bg-yellow-600 text-black';
      iconClass = 'fa-solid fa-exclamation-circle';
      break;
    case 'info':
      bgColor = 'bg-blue-500 hover:bg-blue-600';
      iconClass = 'fa-solid fa-info-circle';
      break;
  }

  const baseStyles = [
    'fixed',
    'p-4 rounded-xl shadow-xl text-white text-right z-50 transition-all duration-300 ease-in-out',
    'w-[min(92vw,420px)]',
    'transform',
    getPositionClasses(position),
    bgColor,
    className ?? '',
  ].join(' ');

  return (
    <div className={baseStyles} role="alert" aria-live="polite" dir="rtl">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <i className={`${iconClass} text-xl ${message.type === 'warning' ? 'text-black/70' : 'text-white/80'}`}></i>
        </div>
        <div className="mr-3 flex-1">
          <p className={`font-medium ${message.type === 'warning' ? 'text-black' : 'text-white'}`}>{text}</p>
        </div>
        <div className="mr-2">
          <button
            onClick={onClose}
            className={`text-xl font-bold leading-none hover:opacity-75 focus:outline-none ${message.type === 'warning' ? 'text-black/70' : 'text-white/70'}`}
            aria-label="بستن"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;
