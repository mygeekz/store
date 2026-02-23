import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { apiFetch } from '../utils/apiFetch';

type RecipientType = 'customer' | 'partner' | 'manual';

type Props = {
  open: boolean;
  onClose: () => void;
  /** called after successfully queued (Outbox) */
  onQueued?: () => void;
  /** optionally prefill */
  initialRecipient?: { type: RecipientType; id?: number; name?: string; phoneNumber?: string; telegramChatId?: string };
  /** optionally prefill message text */
  initialText?: string;
  /** optionally pre-select channels */
  initialChannels?: { sms?: boolean; telegram?: boolean };
};

type PersonOption = { id: number; name: string; phoneNumber?: string | null; telegramChatId?: string | null };

const channelLabel: Record<string, string> = { sms: 'پیامک', telegram: 'تلگرام' };

const MessageComposerModal: React.FC<Props> = ({ open, onClose, onQueued, initialRecipient, initialText, initialChannels }) => {
  const [recipientType, setRecipientType] = useState<RecipientType>(initialRecipient?.type ?? 'customer');
  const [recipientId, setRecipientId] = useState<string>(initialRecipient?.id ? String(initialRecipient.id) : '');
  const [recipientName, setRecipientName] = useState<string>(initialRecipient?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState<string>(initialRecipient?.phoneNumber ?? '');
  const [telegramChatId, setTelegramChatId] = useState<string>(initialRecipient?.telegramChatId ?? '');
  const [saveTelegramChatId, setSaveTelegramChatId] = useState<boolean>(true);

  // When a recipient is provided by the parent page (e.g. Customers/Partners report),
  // we don't need "recipient type" and "select person" controls.
  const recipientLocked = !!initialRecipient?.id && (initialRecipient?.type === 'customer' || initialRecipient?.type === 'partner');

  const [channels, setChannels] = useState<{ sms: boolean; telegram: boolean }>({ sms: true, telegram: false });
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [customers, setCustomers] = useState<PersonOption[]>([]);
  const [partners, setPartners] = useState<PersonOption[]>([]);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    // hydrate recipient fields from props on open
    if (initialRecipient) {
      setRecipientType(initialRecipient.type ?? 'customer');
      setRecipientId(initialRecipient.id ? String(initialRecipient.id) : '');
      setRecipientName(initialRecipient.name ?? '');
      setPhoneNumber(initialRecipient.phoneNumber ?? '');
      setTelegramChatId(initialRecipient.telegramChatId ?? '');
    }
    // apply initial channels/text every time modal opens
    if (initialChannels) {
      setChannels((s) => ({
        sms: initialChannels.sms ?? s.sms,
        telegram: initialChannels.telegram ?? s.telegram,
      }));
    } else {
      setChannels({ sms: true, telegram: false });
    }
    if (typeof initialText === 'string') {
      setText(initialText);
    } else {
      setText('');
    }
    // lazy-load lists for selection
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          apiFetch('/api/customers').catch(() => null),
          apiFetch('/api/partners').catch(() => null),
        ]);
        if (cRes && 'ok' in cRes) {
          const c = await (cRes as Response).json().catch(() => null);
          if ((cRes as Response).ok && c?.success && Array.isArray(c.data)) setCustomers(c.data);
        }
        if (pRes && 'ok' in pRes) {
          const p = await (pRes as Response).json().catch(() => null);
          if ((pRes as Response).ok && p?.success && Array.isArray(p.data)) setPartners(p.data);
        }
      } catch {
        // ignore; manual mode still works
      }
    })();
  }, [open, initialRecipient, initialText, initialChannels]);

  // keep fields in sync when choosing from dropdown
  const options = useMemo(() => (recipientType === 'partner' ? partners : customers), [recipientType, customers, partners]);

  useEffect(() => {
    if (!open) return;
    if (recipientType === 'manual') return;
    const idNum = Number(recipientId);
    if (!idNum) return;
    const found = options.find((x) => x.id === idNum);
    if (!found) return;
    setRecipientName(found.name ?? '');
    setPhoneNumber(found.phoneNumber ?? '');
    setTelegramChatId(found.telegramChatId ?? '');
  }, [recipientId, recipientType, options, open]);

  const toggleChannel = (key: 'sms' | 'telegram') => setChannels((s) => ({ ...s, [key]: !s[key] }));

  const canSend = useMemo(() => {
    if (!text.trim()) return false;
    if (!channels.sms && !channels.telegram) return false;

    if (channels.sms && !phoneNumber.trim()) return false;
    if (channels.telegram && !telegramChatId.trim()) return false;

    if (recipientType !== 'manual' && !Number(recipientId)) return false;
    return true;
  }, [text, channels, phoneNumber, telegramChatId, recipientType, recipientId]);

  const handleSend = async () => {
    setErr(null);
    if (!canSend) return;

    const payload = {
      recipientType,
      recipientId: recipientType === 'manual' ? undefined : Number(recipientId),
      phoneNumber: channels.sms ? (phoneNumber || undefined) : undefined,
      telegramChatId: channels.telegram ? (telegramChatId || undefined) : undefined,
      channels: (Object.keys(channels) as Array<'sms' | 'telegram'>).filter((k) => channels[k]),
      text: text.trim(),
      saveToProfile: recipientType === 'manual' ? false : (channels.telegram ? saveTelegramChatId : false),
    };

    setLoading(true);
    try {
      const res = await apiFetch('/api/messages/send', { method: 'POST', body: JSON.stringify(payload) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setErr(json?.message || 'ارسال پیام ناموفق بود.');
        return;
      }
      onQueued?.();
      onClose();
      setText('');
    } catch (e: any) {
      setErr(e?.message || 'خطا در ارسال پیام.');
    } finally {
      setLoading(false);
    }
  };

  const tgBotUsername =
    (import.meta as any)?.env?.VITE_TELEGRAM_BOT_USERNAME ||
    (import.meta as any)?.env?.VITE_TELEGRAM_BOT ||
    '';

  const tgStartLink = useMemo(() => {
    const bot = String(tgBotUsername || '').trim().replace(/^@/, '');
    if (!bot) return '';
    if (recipientType === 'manual') return '';
    const idNum = Number(recipientId);
    if (!idNum) return '';
    return `https://t.me/${bot}?start=${recipientType}_${idNum}`;
  }, [tgBotUsername, recipientType, recipientId]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  const Label = ({ fa, en }: { fa: string; en: string }) => (
    <div className="mb-1">
      <div className="text-xs text-muted">{fa}</div>
      <div className="text-[11px] opacity-70">{en}</div>
    </div>
  );

  return (
    <Modal title="ارسال پیام (SMS / Telegram)" isOpen={open} onClose={onClose} widthClass="max-w-2xl">
      <div className="space-y-4 p-1">
        {/* Premium header strip */}
        <div className="app-card relative overflow-hidden p-3">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(700px 240px at 20% 0%, rgba(124,58,237,.22), transparent 60%), radial-gradient(700px 240px at 80% 0%, rgba(16,185,129,.18), transparent 60%)',
            }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold">ارسال پیام</div>
              <div className="text-xs opacity-70">Message composer • SMS / Telegram</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-surface/70 px-2 py-1 text-xs">
                {recipientType === 'customer' ? 'مشتری • Customer' : recipientType === 'partner' ? 'همکار • Partner' : 'دستی • Manual'}
              </span>
            </div>
          </div>
        </div>

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
        )}

        <div className="app-card p-3">
          {!recipientLocked ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <Label fa="نوع گیرنده" en="Recipient type" />
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  value={recipientType}
                  onChange={(e) => {
                    const v = e.target.value as RecipientType;
                    setRecipientType(v);
                    setRecipientId('');
                    setRecipientName('');
                    setPhoneNumber('');
                    setTelegramChatId('');
                  }}
                >
                  <option value="customer">مشتری • Customer</option>
                  <option value="partner">همکار • Partner</option>
                  <option value="manual">دستی • Manual</option>
                </select>
              </label>

              {recipientType !== 'manual' ? (
                <label className="block">
                  <Label fa="انتخاب" en="Select person" />
                  <select
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                  >
                    <option value="">انتخاب کنید… • Select…</option>
                    {options.map((o) => (
                      <option key={o.id} value={String(o.id)}>
                        {o.name} {o.phoneNumber ? `— ${o.phoneNumber}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <Label fa="نام (اختیاری)" en="Name (optional)" />
                  <input
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="مثلاً: آقای احمدی"
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs opacity-70">گیرنده • Recipient</div>
                  <div className="truncate text-sm font-extrabold">
                    {recipientName || initialRecipient?.name || '—'}
                    <span className="ms-2 ml-2 text-xs font-bold opacity-70">
                      {recipientType === 'customer' ? 'مشتری' : 'همکار'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-80" dir="ltr">
                    {phoneNumber ? <span className="rounded-full border border-border px-2 py-0.5">{phoneNumber}</span> : null}
                    {telegramChatId ? <span className="rounded-full border border-border px-2 py-0.5">ChatID: {telegramChatId}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold hover:bg-surface/80"
                    onClick={() => {
                      const txt = telegramChatId || phoneNumber || recipientName;
                      if (!txt) return;
                      navigator?.clipboard?.writeText(String(txt)).catch(() => void 0);
                    }}
                    title="کپی"
                  >
                    کپی
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Channels */}
          <div className="mt-4">
            <Label fa="کانال ارسال" en="Delivery channels" />
            <div className="flex flex-wrap items-center gap-2">
              {(['sms', 'telegram'] as const).map((k) => {
                const active = channels[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleChannel(k)}
                    className={[
                      'rounded-full border px-3 py-1 text-sm transition',
                      active
                        ? 'border-transparent bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow'
                        : 'border-border bg-surface hover:bg-surface/80',
                    ].join(' ')}
                  >
                    {channelLabel[k]} {k === 'sms' ? '• SMS' : '• Telegram'}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs opacity-70">
              تلگرام فقط با <b>Chat ID</b> ممکن است (ارسال به شماره موبایل امکان‌پذیر نیست).
              <span className="mx-1">•</span>
              Telegram requires <b>Chat ID</b>; sending by phone number is not supported.
            </div>
          </div>
        </div>

        {/* Channel-specific fields */}
        <div className="app-card p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {channels.sms && (
              <label className="block">
                <Label fa="شماره موبایل (برای پیامک)" en="Phone number (for SMS)" />
                <input
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="09xxxxxxxxx"
                />
              </label>
            )}

            {channels.telegram && (
              <label className="block">
                <Label fa="شناسه چت تلگرام (Chat ID)" en="Telegram Chat ID" />
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="مثلاً: 123456789"
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface/80"
                    onClick={() => telegramChatId && copyToClipboard(telegramChatId)}
                    disabled={!telegramChatId}
                    title="کپی"
                  >
                    کپی
                  </button>
                </div>

                {recipientType !== 'manual' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <label className="flex items-center gap-2 text-muted">
                      <input
                        id="saveChatId"
                        type="checkbox"
                        checked={saveTelegramChatId}
                        onChange={(e) => setSaveTelegramChatId(e.target.checked)}
                      />
                      <span>در پروفایل ذخیره شود • Save to profile</span>
                    </label>

                    {tgStartLink ? (
                      <>
                        <a
                          className="rounded-full border border-border bg-surface px-3 py-1 hover:bg-surface/80"
                          href={tgStartLink}
                          target="_blank"
                          rel="noreferrer"
                          title="کاربر باید یک‌بار Start را بزند"
                        >
                          دریافت Chat ID • Get Chat ID
                        </a>
                        <button
                          type="button"
                          className="rounded-full border border-border bg-surface px-3 py-1 hover:bg-surface/80"
                          onClick={() => copyToClipboard(tgStartLink)}
                          title="کپی لینک"
                        >
                          کپی لینک • Copy link
                        </button>
                      </>
                    ) : (
                      <span className="text-muted opacity-80">
                        برای دکمه دریافت Chat ID، در فایل env مقدار <b>VITE_TELEGRAM_BOT_USERNAME</b> را تنظیم کنید.
                      </span>
                    )}
                  </div>
                )}

                {!telegramChatId.trim() && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    برای ارسال تلگرام، ابتدا کاربر باید یک‌بار به ربات پیام بدهد تا Chat ID ثبت شود.
                    <span className="mx-1">•</span>
                    User must start the bot once so their Chat ID is available.
                  </div>
                )}
              </label>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="app-card p-3">
          <Label fa="متن پیام" en="Message text" />
          <textarea
            className="h-40 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="متن پیام را بنویسید…"
          />

          <div className="mt-2 text-xs opacity-70">
            پیام‌ها در Outbox ثبت می‌شوند و در صورت خطا قابل Retry هستند. • Messages are queued in Outbox and can be retried.
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:bg-surface/80"
              onClick={onClose}
              disabled={loading}
            >
              انصراف
            </button>
            <button
              type="button"
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold text-white shadow',
                canSend ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500' : 'bg-gray-400',
              ].join(' ')}
              onClick={handleSend}
              disabled={!canSend || loading}
            >
              {loading ? 'در حال ارسال…' : 'ارسال'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};


export default MessageComposerModal;
