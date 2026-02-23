# نصب PWA واقعی روی موبایل (بدون اینترنت)

این پروژه به صورت لوکال اجرا می‌شود و برای اینکه روی موبایل **واقعاً به صورت PWA (Standalone)** نصب شود، باید از **HTTPS** استفاده کنیم.

## 1) نصب اولیه (فقط یک‌بار و با اینترنت)
روی کامپیوتر فروشگاه:

- ویندوز: روی فایل `setup.bat` دوبار کلیک کنید.

یا دستی:

```bash
npm i --legacy-peer-deps
npm i -D @vitejs/plugin-basic-ssl --legacy-peer-deps
```

## 2) اجرای برنامه (هر بار)
- ویندوز: روی فایل `start.bat` دوبار کلیک کنید.

یا دستی:

```bash
npm run start:https
```

## 3) نصب روی موبایل
1) موبایل باید به همان Wi‑Fi فروشگاه وصل باشد.
2) آدرس زیر را در مرورگر موبایل باز کنید:

`https://IP-کامپیوتر:5173/#/`

مثال:
`https://192.168.1.106:5173/#/`

3) بار اول یک هشدار امنیتی می‌آید (چون گواهی Self‑Signed است):
- **Android Chrome**: Advanced → Proceed
- **iPhone Safari**: ممکن است "Show Details" / "Visit" بخواهد

4) سپس نصب:
- **Android**: منو → Install app / Add to Home screen
- **iPhone**: Share → Add to Home Screen

## نکته مهم
حتماً با **https** باز کنید. اگر با `http` باز کنید، معمولاً فقط Shortcut ساخته می‌شود و داخل مرورگر باز می‌گردد.
