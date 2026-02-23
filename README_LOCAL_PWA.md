# نصب واقعی PWA روی موبایل (لوکال و بدون اینترنت)

این پروژه طوری تنظیم شده که روی شبکه داخلی **با HTTPS** اجرا شود تا موبایل آن را **واقعاً به‌صورت PWA (Standalone)** نصب کند.

## 1) راه‌اندازی (یک‌بار ـ نیازمند اینترنت)
روی کامپیوتر/سیستم فروشگاه:

- ویندوز: فایل `setup.bat` را اجرا کنید.

یا دستی:
```bash
npm i --legacy-peer-deps
npm i -D @vitejs/plugin-basic-ssl --legacy-peer-deps
```

## 2) اجرا (هر بار)
- ویندوز: فایل `start_https.bat` را اجرا کنید.

یا دستی:
```bash
npm run dev -- --host
```

## 3) نصب روی موبایل
1. موبایل و کامپیوتر باید روی یک Wi‑Fi باشند.
2. IP کامپیوتر را پیدا کنید (در ویندوز: `ipconfig`).
3. روی موبایل باز کنید:
   - `https://IP:5173/#/`
4. اگر هشدار امنیتی دیدید:
   - **Advanced → Proceed**
5. سپس:
   - Android Chrome: **Install app**
   - iOS Safari: Share → **Add to Home Screen**

> نکته: این HTTPS محلی Self‑Signed است؛ فقط برای شبکه داخلی استفاده می‌شود.
