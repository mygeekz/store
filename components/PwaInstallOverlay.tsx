import React, { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone(): boolean {
  // Android/desktop
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navAny = navigator as any;
  if (typeof navAny.standalone === 'boolean' && navAny.standalone) return true;
  return false;
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isInAppBrowser(): boolean {
  // Instagram/Telegram/WhatsApp in-app browsers sometimes block install prompts.
  const ua = window.navigator.userAgent.toLowerCase();
  return /instagram|fbav|fb_iab|fban|line|snapchat|telegram|whatsapp/.test(ua);
}

const DISMISS_KEY = 'pwa_install_overlay_dismissed_v1';

const PwaInstallOverlay: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const ios = useMemo(() => isIOS(), []);
  const inApp = useMemo(() => isInAppBrowser(), []);

  useEffect(() => {
    const onBip = (e: Event) => {
      // This only fires when Chrome considers the site installable.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Re-check standalone on visibility change (some browsers update late)
  useEffect(() => {
    const handler = () => setInstalled(isStandalone());
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const shouldShow = !installed && !dismissed;

  const canShowCTA = ios || deferredPrompt;

  if (!shouldShow) return null;

  const onDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const onInstallClick = async () => {
    setLastError(null);
    if (inApp) {
      setLastError('این صفحه داخل مرورگر داخلی (مثل اینستاگرام/تلگرام) باز شده. لطفاً با Chrome یا Safari باز کنید.');
      return;
    }

    if (ios) {
      setShowIOSHelp(true);
      return;
    }

    if (!deferredPrompt) {
      // Most common cause in local networks: HTTPS not trusted / SW not allowed.
      setLastError('مرورگر هنوز اجازه نصب نداده. معمولاً علت: HTTPS معتبر نیست یا سرویس‌ورکر فعال نشده.');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDismissed(true);
        try {
          localStorage.setItem(DISMISS_KEY, '1');
        } catch {
          // ignore
        }
      }
      setDeferredPrompt(null);
    } catch (err) {
      setLastError('خطا در نمایش پنجره نصب. یک بار صفحه را رفرش کنید و دوباره تلاش کنید.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white text-gray-900 shadow-2xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold">نصب برنامه</div>
              <div className="mt-1 text-sm text-gray-600 leading-6">
                برای تجربه بهتر، برنامه را روی موبایل نصب کنید تا مثل اپلیکیشن مستقل اجرا شود.
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="shrink-0 rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
              aria-label="dismiss"
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold">وضعیت نصب</div>
            <div className="mt-2 text-sm text-gray-700">
              {ios
                ? 'iPhone/iPad: از طریق گزینه Add to Home Screen نصب می‌شود.'
                : deferredPrompt
                  ? 'Android/Chrome: آماده نصب است.'
                  : 'Android/Chrome: هنوز شرایط نصب فراهم نیست.'}
            </div>
            {inApp && (
              <div className="mt-2 text-xs text-amber-700">
                این صفحه داخل مرورگر داخلی باز شده و ممکن است نصب فعال نشود.
              </div>
            )}
          </div>

          {lastError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {lastError}
            </div>
          )}

          {showIOSHelp && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 leading-7">
              <div className="font-semibold mb-1">نصب روی iPhone/iPad</div>
              1) دکمه Share (⤴︎) را بزنید
              <br />
              2) گزینه <b>Add to Home Screen</b> را انتخاب کنید
              <br />
              3) Add را بزنید
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onInstallClick}
              className={`w-full rounded-xl px-4 py-3 text-white font-semibold ${canShowCTA ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
              disabled={!canShowCTA}
            >
              نصب برنامه
            </button>
            <a
              href="#/login"
              className="w-full rounded-xl px-4 py-3 text-center font-semibold border border-gray-300 text-gray-800 hover:bg-gray-50"
            >
              ادامه در مرورگر
            </a>
          </div>

          {!deferredPrompt && !ios && (
            <div className="mt-3 text-xs text-gray-500 leading-6">
              اگر گزینه نصب ظاهر نمی‌شود، معمولاً دلیلش این است که اتصال HTTPS «امن» تشخیص داده نشده (گواهی معتبر/مورد اعتماد نیست) یا سرویس‌ورکر فعال نشده.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PwaInstallOverlay;
