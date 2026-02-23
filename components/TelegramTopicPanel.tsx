import React, { useEffect, useMemo, useState } from 'react';
import Notification from './Notification';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import type { NotificationMessage } from '../types';

type AllowedType = { key: string; label: string };

type Props = {
  topic: 'sales' | 'installments' | 'reports' | 'notifications' | string;
  title: string;
  allowedTypes: AllowedType[];
};

const splitChatIds = (text: string) =>
  text
    .split(/[\n\r,\t ]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

const getDefaultTemplate = (topic: string, type: string) => {
  if (topic === 'sales') {
    if (type === 'SALES_ORDER_CREATED') return '🧾 فاکتور جدید\nشماره: {invoiceNo}\nمشتری: {customerName}\nمبلغ: {total}\n{link}';
    if (type === 'SALES_ORDER_RETURN_CREATED') return '↩️ مرجوعی ثبت شد\nشماره: {invoiceNo}\nمشتری: {customerName}\nمبلغ: {total}\n{link}';
    if (type === 'SALES_ORDER_CANCELLED') return '❌ فاکتور/سفارش لغو شد\nشماره: {invoiceNo}\nمشتری: {customerName}\n{link}';
  }
  if (topic === 'installments') {
    if (type === 'INSTALLMENT_DUE_7') return '⏳ یادآوری قسط (۷ روز مانده)\nمشتری: {customerName}\nمبلغ: {amount}\nشروع اقساط: {startDate}\n{link}';
    if (type === 'INSTALLMENT_DUE_3') return '⏳ یادآوری قسط (۳ روز مانده)\nمشتری: {customerName}\nمبلغ: {amount}\nشروع اقساط: {startDate}\n{link}';
    if (type === 'INSTALLMENT_DUE_TODAY') return '🔔 سررسید قسط امروز\nمشتری: {customerName}\nمبلغ: {amount}\nشروع اقساط: {startDate}\n{link}';
    if (type === 'INSTALLMENT_COMPLETED') return '✅ اقساط تسویه شد\nمشتری: {customerName}\nمبلغ هر قسط: {amount}\n{link}';
  }
  if (topic === 'reports') {
    if (type === 'REPORT_FINANCIAL_OVERVIEW' || type === 'financial-overview') return '📊 گزارش فروش\nاز: {fromDate}\nتا: {toDate}\nجمع فروش: {sumSales}\nتعداد فاکتور: {invoiceCount}\n{link}';
  }
  return 'پیام نمونه\n{link}';
};

const varsHelp = (topic: string) => {
  const common = ['{link}', '{now}'];
  if (topic === 'sales') return [...common, '{invoiceNo}', '{total}', '{subtotal}', '{discount}', '{customerName}', '{customerPhone}'];
  if (topic === 'installments') return [...common, '{customerName}', '{customerPhone}', '{amount}', '{installments}', '{startDate}', '{downPayment}', '{total}', '{saleType}'];
  if (topic === 'reports') return [...common, '{fromDate}', '{toDate}', '{sumSales}', '{invoiceCount}'];
  return common;
};

const TelegramTopicPanel: React.FC<Props> = ({ topic, title, allowedTypes }) => {
  const { token } = useAuth();

  const [chatIdsText, setChatIdsText] = useState('');
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [activeType, setActiveType] = useState<string>(allowedTypes?.[0]?.key || '');
  const [tplText, setTplText] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [sampleInfo, setSampleInfo] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const enabledSet = useMemo(() => new Set(enabledTypes), [enabledTypes]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}`, {
        headers: { ...(getAuthHeaders(token) as any) },
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در دریافت تنظیمات تلگرام');
      setChatIdsText(String(json.data?.chatIdsText || ''));
      setEnabledTypes(Array.isArray(json.data?.enabledTypes) ? json.data.enabledTypes : []);

      const typeKeys = allowedTypes.map((t) => t.key).join(',');
      const res2 = await fetch(
        `/api/telegram/topic-config/${encodeURIComponent(topic)}/templates?types=${encodeURIComponent(typeKeys)}`,
        { headers: { ...(getAuthHeaders(token) as any) } }
      );
      const json2 = await res2.json();
      if (!json2?.success) throw new Error(json2?.message || 'خطا در دریافت قالب‌های تلگرام');
      const tpls = (json2.data?.templates && typeof json2.data.templates === 'object') ? json2.data.templates : {};
      setTemplates(tpls);
      setSampleInfo(json2.data?.sample || null);

      const first = allowedTypes?.[0]?.key || '';
      const nextActive = activeType || first;
      setActiveType(nextActive);
      setTplText(String(tpls?.[nextActive] || getDefaultTemplate(topic, nextActive)));
      setPreviewText('');
    } catch (e: any) {
      setNotification({ type: 'error', message: e?.message || 'خطا در دریافت تنظیمات تلگرام' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  useEffect(() => {
    if (!activeType) return;
    setTplText(String(templates?.[activeType] || getDefaultTemplate(topic, activeType)));
    setPreviewText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  const toggleType = (key: string) => {
    setEnabledTypes((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders(token) as any),
        },
        body: JSON.stringify({ chatIdsText, enabledTypes }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در ذخیره تنظیمات');

      const merged = { ...templates, [activeType]: tplText };
      setTemplates(merged);

      const res2 = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders(token) as any),
        },
        body: JSON.stringify({ templates: merged }),
      });
      const json2 = await res2.json();
      if (!json2?.success) throw new Error(json2?.message || 'خطا در ذخیره قالب‌ها');

      setNotification({ type: 'success', message: 'تنظیمات و قالب‌ها ذخیره شد.' });
    } catch (e: any) {
      setNotification({ type: 'error', message: e?.message || 'خطا در ذخیره تنظیمات' });
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    try {
      const res = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders(token) as any),
        },
        body: JSON.stringify({ type: activeType, template: tplText }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در پیش‌نمایش');
      setPreviewText(String(json.data?.text || ''));
      setSampleInfo(json.data?.sample || null);
    } catch (e: any) {
      setNotification({ type: 'error', message: e?.message || 'خطا در پیش‌نمایش' });
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const res = await fetch(`/api/telegram/topic-config/${encodeURIComponent(topic)}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders(token) as any),
        },
        body: JSON.stringify({ type: activeType, template: tplText }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'خطا در ارسال تست');
      const sent = json.data?.sent ?? 0;
      const total = json.data?.total ?? 0;
      setNotification({ type: 'success', message: `ارسال تست انجام شد. موفق: ${sent} از ${total}` });
    } catch (e: any) {
      setNotification({ type: 'error', message: e?.message || 'خطا در ارسال تست' });
    } finally {
      setSendingTest(false);
    }
  };

  const previewChats = splitChatIds(chatIdsText);

  return (
    <div className="p-4">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type as any}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Premium panel */}
      <div className="tg-panel">
        <div className="tg-panel__bar" />
        <div className="tg-panel__header">
          <div className="min-w-0">
            <div className="tg-panel__title">{title}</div>
            <div className="tg-panel__subtitle">
              مقصدها را با Enter یا ویرگول جدا کنید. اگر خالی باشد، از مقصدهای پیش‌فرض تلگرام استفاده می‌شود.
            </div>
          </div>

          <div className="tg-panel__meta">
            <span className="tg-chip">📬 {previewChats.length.toLocaleString('fa-IR')} مقصد</span>
            <span className="tg-chip">✅ {enabledTypes.length.toLocaleString('fa-IR')} فعال</span>
          </div>

          <div className="tg-panel__actions">
            <button className="tg-btn tg-btn--ghost" disabled={loading} onClick={load}>
              بازخوانی
            </button>
            <button className="tg-btn tg-btn--primary" disabled={saving || loading} onClick={save}>
              {saving ? 'در حال ذخیره…' : 'ذخیره'}
            </button>
          </div>
        </div>

        <div className="tg-grid">
          <div className="tg-stack">
            <div className="tg-card">
              <div className="tg-card__head">
                <div className="tg-card__title">📍 مقصدها (Chat ID)</div>
                <div className="tg-card__hint">هر خط یک Chat ID</div>
              </div>
              <textarea
                className="tg-textarea"
                value={chatIdsText}
                onChange={(e) => setChatIdsText(e.target.value)}
                placeholder={`مثال:\n-1001234567890\n672412513`}
                disabled={loading}
              />
              <div className="tg-card__foot">
                <span className="tg-muted">تعداد مقصدها:</span>
                <span className="tg-strong">{previewChats.length.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            <div className="tg-card">
              <div className="tg-card__head">
                <div className="tg-card__title">⚡ نوع پیام‌های فعال</div>
                <div className="tg-card__hint">خاموش/روشن کردن ارسال‌ها</div>
              </div>

              {loading ? (
                <div className="tg-muted text-sm">در حال بارگذاری…</div>
              ) : (
                <div className="tg-switches">
                  {allowedTypes.map((t) => {
                    const on = enabledSet.has(t.key);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        className={on ? 'tg-switch tg-switch--on' : 'tg-switch'}
                        onClick={() => toggleType(t.key)}
                      >
                        <span className="tg-switch__dot" />
                        <span className="tg-switch__label">{t.label}</span>
                        <span className="tg-switch__key">{t.key}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="tg-card tg-card--wide">
            <div className="tg-card__head tg-card__head--split">
              <div>
                <div className="tg-card__title">🧩 قالب پیام</div>
                <div className="tg-card__hint">متغیرها را در متن استفاده کنید</div>
              </div>
              <select
                className="tg-select"
                value={activeType}
                onChange={(e) => setActiveType(e.target.value)}
                disabled={loading}
              >
                {allowedTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="tg-vars">
              {varsHelp(topic).map((v) => (
                <span key={v} className="tg-var">
                  {v}
                </span>
              ))}
            </div>

            <textarea
              className="tg-textarea tg-textarea--mono"
              value={tplText}
              onChange={(e) => setTplText(e.target.value)}
              disabled={loading}
            />

            <div className="tg-actions-row">
              <button className="tg-btn" onClick={preview} disabled={loading}>
                پیش‌نمایش
              </button>
              <button className="tg-btn tg-btn--indigo" onClick={sendTest} disabled={loading || sendingTest}>
                {sendingTest ? 'در حال ارسال…' : 'ارسال تست'}
              </button>
              <button
                className="tg-btn tg-btn--ghost"
                onClick={() => setTplText(getDefaultTemplate(topic, activeType))}
                disabled={loading}
                title="بازگشت به پیش‌فرض"
              >
                پیش‌فرض
              </button>
            </div>

            {previewText ? (
              <div className="tg-preview">
                <div className="tg-preview__title">پیش‌نمایش پیام</div>
                <pre className="tg-preview__body">{previewText}</pre>
              </div>
            ) : (
              <div className="tg-preview tg-preview--empty">
                برای دیدن خروجی، «پیش‌نمایش» را بزنید.
              </div>
            )}

            {!!sampleInfo && (
              <details className="tg-sample">
                <summary>نمونه‌داده (برای Preview)</summary>
                <pre>{JSON.stringify(sampleInfo, null, 2)}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramTopicPanel;
