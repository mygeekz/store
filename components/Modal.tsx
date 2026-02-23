import React, { ReactNode, useEffect, useState } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /**
   * Whether the modal is open.
   * If omitted, the modal is considered open (keeps backward compatibility with conditional rendering).
   */
  isOpen?: boolean;
  widthClass?: string; // e.g., 'max-w-md', 'max-w-lg', 'max-w-xl'
  wrapperClassName?: string; // For adding classes to the main overlay, e.g., for printing
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, isOpen = true, widthClass = 'max-w-md', wrapperClassName }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowContent(false);
      return;
    }

    // Trigger animation shortly after mount
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 10); // Small delay for CSS transition to pick up initial state

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black/70 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out ${showContent ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${wrapperClassName || ''}`}
      onClick={onClose} // Close on overlay click
      dir="rtl" // Ensure modal context is RTL
    >
      <div
        className={`bg-white dark:bg-gray-800 md:rounded-xl shadow-2xl ${widthClass} w-full md:m-auto flex flex-col h-full md:h-auto md:max-h-[90vh] transition-all duration-300 ease-out ${showContent ? 'transform translate-y-0 md:scale-100 opacity-100' : 'transform translate-y-full md:translate-y-0 md:scale-95 opacity-0 pointer-events-none'} print:shadow-none print:rounded-none print:border-none print:m-0 print:max-h-full print:h-full`}
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal content
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 print:hidden shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-2xl leading-none"
            aria-label="بستن"
          >
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>
        <div className="flex-1 p-4 md:p-5 overflow-y-auto print:overflow-visible pb-20 md:pb-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;