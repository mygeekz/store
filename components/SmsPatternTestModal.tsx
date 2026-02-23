import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bodyId: string;
  tokenLabels: string[];
};

const SmsPatternTestModal: React.FC<Props> = ({ isOpen, onClose, title, bodyId, tokenLabels }) => {
  const { token } = useAuth();
  const [to, setTo] = useState('');
  const [values, setValues] = useState<string[]>(() => tokenLabels.map(() => ''));
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const canSend = useMemo(() => {
    const bid = Number(bodyId);
    return !!token && !!to.trim() && !isNaN(bid) && bid > 0;
  }, [token, to, bodyId]);

  const onChangeValue = (idx: number, v: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  };

  const sendTest = async () => {
    if (!canSend) return;
    setIsSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/sms/test-pattern', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bodyId: Number(bodyId),
          to: to.trim(),
          tokens: values.map((x) => String(x ?? '')),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setResult({ ok: true, message: data?.message || 'پیامک تست ارسال شد.' });
      } else {
        setResult({ ok: false, message: data?.message || 'ارسال پیامک تست ناموفق بود.' });
      }
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || 'خطای شبکه در ارسال پیامک تست.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} widthClass="max-w-lg">
      <div className="space-y-4">
        <div className="rounded-xl border border-blue-200/60 dark:border-blue-900/30 bg-blue-50/70 dark:bg-blue-900/20 p-3 text-sm text-blue-900 dark:text-blue-200">
          <i className="fa-solid fa-circle-info ml-1" />
          این پیامک با «ارسال بر اساس پترن» ملی‌پیامک ارسال می‌شود. شماره گیرنده و متغیرها را وارد کنید.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="app-label">شناسه پترن (BodyId)</label>
            <input className="app-input" value={bodyId || ''} readOnly dir="ltr" />
          </div>
          <div>
            <label className="app-label">شماره گیرنده</label>
            <input
              className="app-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="مثلاً 09121234567"
              dir="ltr"
            />
          </div>
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

        {result ? (
          <div className={`rounded-lg p-3 text-sm ${result.ok ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'}`}>
            {result.message}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
            <i className="fa-solid fa-xmark ml-1" />
            بستن
          </button>
          <button
            onClick={sendTest}
            disabled={!canSend || isSending}
            className="px-4 py-2 rounded-xl bg-primary text-white hover:brightness-110 disabled:opacity-60"
          >
            <i className={`fa-solid ${isSending ? 'fa-paper-plane fa-bounce' : 'fa-paper-plane'} ml-1`} />
            {isSending ? 'در حال ارسال...' : 'ارسال تست'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SmsPatternTestModal;
