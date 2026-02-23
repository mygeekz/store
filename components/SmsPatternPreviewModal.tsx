import React, { useMemo, useState } from 'react';
import Modal from './Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tokenLabels: string[];
  previewTemplate: string;
};

// Note: For MeliPayamak patterns, the real message text lives on the provider panel.
// This modal helps operators verify token ordering and see a local "sample" preview.
const SmsPatternPreviewModal: React.FC<Props> = ({ isOpen, onClose, title, tokenLabels, previewTemplate }) => {
  const [values, setValues] = useState<string[]>(() => tokenLabels.map(() => ''));

  const onChangeValue = (idx: number, v: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  };

  const previewText = useMemo(() => {
    // Replace {1}..{n} placeholders with provided values
    let out = String(previewTemplate || '');
    values.forEach((v, idx) => {
      const tokenIndex = idx + 1;
      const re = new RegExp(`\\{${tokenIndex}\\}`, 'g');
      out = out.replace(re, String(v ?? ''));
    });
    return out;
  }, [previewTemplate, values]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} widthClass="max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-purple-200/60 dark:border-purple-900/30 bg-purple-50/70 dark:bg-purple-900/20 p-3 text-sm text-purple-900 dark:text-purple-200">
          <i className="fa-solid fa-wand-magic-sparkles ml-1" />
          این پیش‌نمایش برای اطمینان از <b>ترتیب متغیرها</b> ساخته شده است. متن واقعی پترن در پنل سرویس‌دهنده ذخیره می‌شود.
        </div>

        <div className="space-y-3">
          <div className="app-section-title">متغیرهای پترن (به ترتیب)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tokenLabels.map((lbl, idx) => (
              <div key={idx}>
                <label className="app-label">{idx + 1}) {lbl}</label>
                <input
                  className="app-input"
                  value={values[idx] || ''}
                  onChange={(e) => onChangeValue(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/60 dark:bg-gray-800/40">
          <div className="app-section-title">پیش‌نمایش نمونه پیام</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 leading-7">
            {previewText || '—'}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
            <i className="fa-solid fa-xmark ml-1" />
            بستن
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SmsPatternPreviewModal;
