// ==========================================
// server/index.ts
// اپ API فروشگاه (نسخه پاک‌سازی‌شده + داکیومنت)
// ==========================================

/**
 * ساختار کلی فایل:
 *  1) Imports و پیکربندی پایه
 *  2) Helperهای عمومی (Jalali, token, summary/total محاسبه)
// *  3) احراز هویت (Public routes: login + barcode)
// *  4) Middleware احراز هویت
 *  5) داشبورد
 *  6) محصولات و دسته‌بندی
 *  7) گوشی‌ها
 *  8) فروش/فاکتورها (sellable-items, sales, sales-orders)
// *     - GET /api/sales-orders , GET /api/sales  ← لیست یکپارچه
// *     - POST /api/sales-orders                  ← ثبت فاکتور جدید
// *     - GET /api/sales-orders/:id               ← دیتای چاپ فاکتور (با fallback)
// *     - (سازگاری قدیمی) POST /api/sales        ← فروش تکی قدیم
 *  9) مشتریان
 * 10) همکاران/تأمین‌کنندگان
 * 11) گزارش‌ها (Summary/Top/Phone/Compare)
 * 12) تنظیمات + آپلود لوگو + بکاپ/ریستور
 * 13) کاربران و نقش‌ها
 * 14) فروش اقساطی + تراکنش قسط + وضعیت چک
 * 15) تحلیل هوشمند
 * 16) پیامک رویدادی
 * 17) مرکز تعمیرات
 * 18) خدمات (Services) + آپلود فایل عمومی
 * 19) 404 و Error Handler + راه‌اندازی سرور و Shutdown
 */

import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import moment from 'jalali-moment';
import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import dns from 'dns';
import bwipjs from 'bwip-js';
import upload from './upload';
import cors from 'cors';
import cron from 'node-cron';

import { startDailyBackupJob, createDbBackup, listBackups, getBackupPath, deleteBackup, pruneBackups, testRestoreBackup } from './backup';
// --- اتصال به دیتابیس و توابع دامنه (همان قبلی‌ها) -------------------------
import {
  addProductToDb,
  getAllProductsFromDb,
  updateProductInDb,
  deleteProductFromDb,
  addCategoryToDb,
  getAllCategoriesFromDb,
  updateCategoryInDb,
  deleteCategoryFromDb,
  addPhoneEntryToDb,
  updatePhoneEntryInDb,
  deletePhoneEntryFromDb,
  getAllPhoneEntriesFromDb,
  getAllPhoneModelsFromDb,
  addPhoneModelToDb,
  getAllPhoneColorsFromDb,
  addPhoneColorToDb,
  getSellableItemsFromDb,
  getAllSalesTransactionsFromDb,
  recordSaleTransactionInDb,
  getDbInstance,
  DB_PATH,
  closeDbConnection,
  addCustomerToDb,
  getAllCustomersWithBalanceFromDb,
  getCustomerByIdFromDb,
  updateCustomerInDb,
  updateCustomerTagsInDb,
  deleteCustomerFromDb,
  addCustomerLedgerEntryToDb,
  getLedgerForCustomerFromDb,
  getCustomerLedgerInsightsFromDb,
  addCustomerFollowupToDb,
  listCustomerFollowupsFromDb,
  closeCustomerFollowupInDb,
  updateCustomerFollowupInDb,
  setCustomerRiskOverrideInDb,
  dismissNotificationForUserInDb,
  listDismissedNotificationIdsForUserFromDb,
  addExpenseToDb,
  listExpensesFromDb,
  updateExpenseInDb,
  deleteExpenseFromDb,
  getExpensesSummaryFromDb,
  addRecurringExpenseToDb,
  listRecurringExpensesFromDb,
  updateRecurringExpenseInDb,
  deleteRecurringExpenseFromDb,
  getRecurringExpenseByIdFromDb,
  advanceRecurringExpenseNextRunDateInDb,
  markRecurringExpenseRunInDb,
  upsertDebtSnapshotInDb,
  recordInventoryInDb,
  computeFifoCogsForProduct,
  getInventoryFifoAgingForAllProducts,
  getMonthlyProfitByProductFifo,
  createInventoryAdjustmentInDb,
  getInventoryAgingBucketsFromDb,
  getRealProfitPerProductFifo,
  listSalesProfitRowsFifo,
  listDebtSnapshotsFromDb,
  addAuditLogEntry,
  addPartnerToDb,
  getAllPartnersWithBalanceFromDb,
  getPartnerByIdFromDb,
  updatePartnerInDb,
  deletePartnerFromDb,
  addPartnerLedgerEntryToDb,
  getLedgerForPartnerFromDb,
  getPurchasedItemsFromPartnerDb,
  getSalesSummaryAndProfit,
  getDebtorsList,
  getCreditorsList,
  getTopCustomersBySales,
  getTopSuppliersByPurchaseValue,
  getPhoneSalesReport,
  getPhoneInstallmentSalesReport,
  getInvoiceDataById,
  getAllSettingsAsObject,
  updateMultipleSettings,
  updateSetting,
  getAllRoles,
  addUserToDb,
  updateUserInDb,
  deleteUserFromDb,
  getAllUsersWithRoles,
  findUserByUsername,
  getAsync,
  runAsync,
  allAsync,
  getDashboardKPIs,
  getDashboardSalesChartData,
  getDashboardRecentActivities,
  getUserDashboardLayoutFromDb,
  upsertUserDashboardLayoutInDb,
  deleteUserDashboardLayoutFromDb,
  addInstallmentSaleToDb,
  getAllInstallmentSalesFromDb,
  getInstallmentSaleByIdFromDb,
  updateInstallmentPaymentStatusInDb,
  updateCheckStatusInDb,
  getInstallmentPaymentDetailsForSms,
  getInstallmentSaleDetailsForSms,
  getInstallmentCheckDetailsForSms,
  deleteInstallmentSaleFromDb,
  getPendingInstallmentPaymentsWithCustomer,
  getPendingInstallmentChecksWithCustomer,
  updateCustomerLedgerEntryInDb,
  deleteCustomerLedgerEntryFromDb,
  updatePartnerLedgerEntryInDb,
  deletePartnerLedgerEntryFromDb,
  changePasswordInDb,
  resetUserPasswordInDb,
  updateAvatarPathInDb,
  createRepairInDb,
  getAllRepairsFromDb,
  getRepairByIdFromDb,
  updateRepairInDb,
  finalizeRepairInDb,
  addPartToRepairInDb,
  deletePartFromRepairInDb,
  getRepairDetailsForSms,
  getOverdueInstallmentsFromDb,
  getRepairsReadyForPickupFromDb,
  ProductPayload,
  UpdateProductPayload,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
  SaleDataPayload,
  CustomerPayload,
  LedgerEntryPayload,
  PartnerPayload,
  SettingItem,
  fromShamsiStringToISO,
  InstallmentSalePayload,
  CheckStatus,
  UserUpdatePayload,
  ChangePasswordPayload,
  NewRepairData,
  FinalizeRepairPayload,
  Service,
  getAllServicesFromDb,
  addServiceToDb,
  updateServiceInDb,
  deleteServiceFromDb,
  addInstallmentTransactionToDb,
  updateInstallmentTransactionInDb,
  deleteInstallmentTransactionFromDb,
  getProfitPerSaleMapFromDb,
  getInvoiceDataForSaleIds,
  listReportSavedFilters,
  createOrReplaceReportSavedFilter,
  deleteReportSavedFilter,
  getInventoryTurnoverReport,
  getDeadStockReport,
  getAbcReport,
  getAgingReceivablesReport,
  getCashflowReport
} from './database';


// P0 Imports
import {
  adjustProductStockInDb,
  createPurchaseReceiptInDb,
  getAllPurchasesFromDb,
  getPurchaseByIdFromDb,
  createStockCountInDb,
  getAllStockCountsFromDb,
  getStockCountByIdFromDb,
  upsertStockCountItemInDb,
  completeStockCountInDb,
} from './database';


import {
  createSalesOrder,
  getSalesOrderForInvoice,
  getAllSalesOrdersFromDb,
  getSalesOrderItemsForOrders,
  deleteSalesOrder,
  cancelSalesOrder,
  createSalesReturn,
  getSalesReturnsForOrder,
} from './salesOrders';

import { analyzeProfitability, analyzeInventoryVelocity, generatePurchaseSuggestions } from './analysis';
// Import SMS sending functions for all supported providers
import {
  sendMeliPayamakPatternSms,
  sendKavenegarPatternSms,
  sendSmsIrPatternSms,
  sendIppanelPatternSms,
  sendPatternSms, // backwards compatible alias for MeliPayamak
} from './smsService';
import { getTelegramBotInfo, sendTelegramMessage, sendTelegramMessages, parseChatIdList, setTelegramProxy } from './telegramService';
import { ActionItem, SalesOrderPayload, InstallmentSalePayload } from '../types';

// Import audit logging and reporting helpers
import {
  addAuditLog,
  getAuditLogs,
  getRfmReport,
  getCohortReport,
} from './database';

// Validators
import { validateSalesOrderPayload, validateInstallmentSalePayload } from './validators';

// =====================================================
// 1) پیکربندی پایه
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =====================================================
// DB Migrations (auto-run *.sql in server/migrations)
// =====================================================
const execDb = (db: any, sql: string) =>
  new Promise<void>((resolve, reject) => db.exec(sql, (err: any) => (err ? reject(err) : resolve())));

const runDb = (db: any, sql: string, params: any[] = []) =>
  new Promise<void>((resolve, reject) => db.run(sql, params, (err: any) => (err ? reject(err) : resolve())));

const getDb = <T = any>(db: any, sql: string, params: any[] = []) =>
  new Promise<T | undefined>((resolve, reject) => db.get(sql, params, (err: any, row: any) => (err ? reject(err) : resolve(row))));


function splitSqlStatements(sql: string): string[] {
  // Safer splitter:
  // - ignores semicolons inside single/double-quoted strings
  // - strips line comments (--) and block comments (/* */)
  const stmts: string[] = [];
  let cur = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  const push = () => {
    const s = cur.trim();
    if (s) stmts.push(s.endsWith(';') ? s : s + ';');
    cur = '';
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    // End line comment
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        cur += '\n';
      }
      i++;
      continue;
    }

    // End block comment
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Start comments (only if not inside strings)
    if (!inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
    }

    // Toggle strings
    if (!inDouble && ch === "'" ) {
      // handle escaped single quote '' inside single-quoted strings
      if (inSingle && next === "'") {
        cur += "''";
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      cur += ch;
      i++;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      cur += ch;
      i++;
      continue;
    }

    // Statement boundary
    if (!inSingle && !inDouble && ch === ';') {
      cur += ';';
      push();
      i++;
      continue;
    }

    cur += ch;
    i++;
  }

  push();
  return stmts;
}

function isIgnorableMigrationError(stmt: string, err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();

  // 1) SQLite: ALTER TABLE ... ADD COLUMN X -> duplicate column name: X
  if (msg.includes('duplicate column name') && /alter\s+table\s+\w+\s+add\s+column/i.test(stmt)) return true;

  // 2) Some sqlite builds report "already exists" on ADD COLUMN
  if (msg.includes('already exists') && /alter\s+table\s+\w+\s+add\s+column/i.test(stmt)) return true;

  // 3) DB variants: column name differences between legacy schemas.
  // If an index targets a column that doesn't exist in this DB, skip it
  // (we prefer the server to start; you can add a follow-up migration later).
  if (msg.includes('no such column') && /create\s+(unique\s+)?index/i.test(stmt)) return true;

  return false;
}

async function runPendingMigrations(db: any) {
  const migrationsDir = join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  await execDb(db, `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      appliedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'));

  for (const file of files) {
    const already = await getDb(db, 'SELECT id FROM schema_migrations WHERE id = ? LIMIT 1', [file]);
    if (already) continue;

    const fullPath = join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');

    // Safety: skip empty files
    if (!sql.trim()) {
      await runDb(db, 'INSERT INTO schema_migrations (id) VALUES (?)', [file]);
      continue;
    }

    console.log(`[migrations] applying ${file} ...`);
    await execDb(db, 'BEGIN');
    try {
      const stmts = splitSqlStatements(sql);
      for (const stmt of stmts) {
        try {
          await execDb(db, stmt);
        } catch (err) {
          if (isIgnorableMigrationError(stmt, err)) {
            console.warn(`[migrations] skipped (already applied): ${file} :: ${stmt.slice(0, 80)}...`);
            continue;
          }
          throw err;
        }
      }
      await runDb(db, 'INSERT INTO schema_migrations (id) VALUES (?)', [file]);
      await execDb(db, 'COMMIT');
      console.log(`[migrations] applied ${file}`);
    } catch (e) {
      await execDb(db, 'ROLLBACK');
      console.error(`[migrations] failed ${file}`, e);
      throw e;
    }
  }
}



// Prefer IPv4 first to avoid undici fetch failures on networks with broken IPv6
dns.setDefaultResultOrder('ipv4first');
const app = express();

// Daily DB backup job (started after DB init using settings)

// ------------------------------
// Auth middleware (session-based)
// ------------------------------
const requireAuth = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers?.authorization as string | undefined;
    const token =
      (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined) ||
      (req.headers?.["x-session-token"] as string | undefined) ||
      (req.query?.token as string | undefined);

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const session = (activeSessions as any)[token];
    if (!session) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (session.expires && Date.now() > session.expires) {
      delete (activeSessions as any)[token];
      return res.status(401).json({ success: false, message: "Session expired" });
    }

    req.user = {
      id: session.userId,
      username: session.username,
      roleName: session.roleName,
      avatarUrl: session.avatarUrl
    };

    return next();
  } catch (e) {
    return next(e);
  }
};

const port = 3001;

// ─────────────────────────────────────────────────────────
// CORS configuration
//
// Trust proxy headers (e.g., X-Forwarded-For) so that req.ip resolves to the client IP
app.set('trust proxy', true);
app.use(cors({
  origin: [
    /^http:\/\/localhost:5173$/,
    /^http:\/\/127\.0\.0\.1:5173$/,
    // Allow any 192.168.x.x:5173 for local network testing
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
  ],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}));
// Always respond to OPTIONS to satisfy CORS preflight; do not rate‑limit OPTIONS
app.options('*', cors());

app.use(express.json());

// ===============================
// AUTH: LOGIN (CLEAN & SAFE)
// ===============================
app.post('/api/login', async (req, res, next) => {
  try {
    // Accept multiple payload shapes from frontend
    const username =
      req.body?.username ??
      req.body?.userName ??
      req.body?.email ??
      req.body?.user ??
      null;

    const password = req.body?.password ?? req.body?.pass ?? null;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'نام کاربری و کلمه عبور الزامی هستند.' });
    }

    // DEV bootstrap: ensure default admin exists and its password matches DEFAULT_ADMIN_PASSWORD
    // (disabled automatically in production)
    const isDev = process.env.NODE_ENV !== 'production';
    const allowBootstrap = isDev && process.env.ALLOW_DEFAULT_ADMIN_BOOTSTRAP !== 'false';

    if (allowBootstrap && username === 'admin' && password === 'password123') {
      await getDbInstance();

      // Ensure Admin role exists
      await runAsync('INSERT OR IGNORE INTO roles (name) VALUES (?)', ['Admin']);
      const adminRole = await getAsync('SELECT id FROM roles WHERE name = ?', ['Admin']);

      if (adminRole?.id) {
        const hashed = await bcryptjs.hash('password123', 10);

        // Ensure admin user exists
        await runAsync(
          'INSERT OR IGNORE INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)',
          ['admin', hashed, adminRole.id]
        );

        // Ensure password is reset to default for local dev (idempotent)
        await runAsync('UPDATE users SET passwordHash = ? WHERE username = ?', [hashed, 'admin']);
      }
    }

    const user = await findUserByUsername(String(username));
    if (!user) {
      return res.status(401).json({ success: false, message: 'نام کاربری یا کلمه عبور نامعتبر است.' });
    }

    const isMatch = await bcryptjs.compare(String(password), user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'نام کاربری یا کلمه عبور نامعتبر است.' });
    }

    const token = generateToken();
    const avatarUrl = user.avatarPath ? `/uploads/avatars/${user.avatarPath}` : null;

    activeSessions[token] = {
      userId: user.id,
      username: user.username,
      roleName: user.roleName,
      avatarUrl,
      expires: Date.now() + SESSION_DURATION_MS,
    };

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        roleName: user.roleName,
        dateAdded: user.dateAdded,
        avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});
// Apply auth to all routes except public endpoints
app.use((req, res, next) => {
  const p = req.path || "";
  // Public endpoints:
  if (
    p === "/api/login" ||
    p === "/api/auth/login" ||
    p === "/api/auth/register" ||
    p.startsWith("/uploads") ||
    p.startsWith("/public") ||
    p === "/health" ||
    p.startsWith("/barcode") ||
    p.startsWith("/api/barcode")
  ) {
    return next();
  }
  return requireAuth(req as any, res as any, next as any);
});

import { dashboardRouter } from "./dashboard";
app.use("/dashboard", dashboardRouter);

// =====================================================
//  Rate limiting middleware
//
// The simple in‑memory rate limiter below was causing too many 429 responses in development
// because it counted every request (including preflight OPTIONS, HMR/SSE connections and
// asset loads). To provide a smoother developer experience, we now:
//   - Enable rate limiting only in production (process.env.NODE_ENV === 'production')
//   - Skip counting preflight OPTIONS requests, HMR/SSE streams, and static asset paths
//   - Use IP and logged‑in user id to build the rate bucket key
//   - Allow a generous number of requests per window (tunable below)
//
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 300; // Maximum allowed requests per window
type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

app.use((req, res, next) => {
  // Only enforce rate limits in production
  if (process.env.NODE_ENV !== 'production') return next();

  // Skip OPTIONS (CORS preflight) and HMR/SSE and static asset requests
  const isSkippable =
    req.method === 'OPTIONS' ||
    req.headers.accept?.includes('text/event-stream') ||
    req.path.startsWith('/@') ||
    req.path.startsWith('/assets') ||
    req.path.startsWith('/static') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/health') ||
    req.path === '/';
  if (isSkippable) return next();

  // Determine IP and user id (if authenticated) to build a unique key
  const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;
  const ip = forwardedFor?.split(',')[0]?.trim() || req.socket.remoteAddress || req.ip || 'unknown';
  // @ts-ignore user may be attached by authenticateToken middleware
  const userId = req.user?.id ? `|u${req.user.id}` : '|anon';
  const key = `${ip}${userId}`;

  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    // create a new window
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  bucket.count++;
  rateBuckets.set(key, bucket);
  if (bucket.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({ success: false, message: 'تعداد درخواست‌ها زیاد است؛ چند لحظه بعد دوباره تلاش کنید.' });
  }
  next();
});

const uploadsDir = join(__dirname, '..', 'uploads');
const avatarsDir = join(uploadsDir, 'avatars');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

// =====================================================
// 2) Helperهای عمومی
//    - تاریخ شمسی → ISO
//    - فرمت مبلغ برای SMS
//    - احراز هویت سشن
//    - Helperهای پایدار برای خلاصه آیتم‌ها و مبلغ کل فاکتور
// =====================================================
// === Unified search (FTS5) ===
const normDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

const normalizeQuery = (q: string) =>
  normDigits(q)
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ـ"']/g, ' ') // tatweel & quotes
    .trim();
	
const faNum = (v: any) => Number(v ?? 0).toLocaleString('fa-IR');

const toPrefixQuery = (q: string) =>
  normalizeQuery(q)
    .split(/\s+/)
    .filter(Boolean)
    .map(t => (t.endsWith('*') ? t : t + '*'))
    .join(' ');

// از اینجا به بعد همه‌ی روترها پشت authenticateToken هستند (app.use(authenticateToken))
app.get('/api/search', async (req, res, next) => {
  try {
    const rawQ = String(req.query.q || '').slice(0, 100);
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);

    if (!rawQ) return res.json({ items: [] });

    // مطمئن شو search_index ساخته شده
    const hasFts = await getAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='search_index'");
    if (!hasFts) {
      return res.status(501).json({ success: false, message: 'FTS5 فعال نیست یا search_index ساخته نشده.' });
    }

    const q = toPrefixQuery(rawQ);

    const rows = await allAsync(
      `
      SELECT 
        rowid,
        domain,
        entity_id as entityId,
        highlight(search_index, 2, '<mark>','</mark>') AS titleHL,
        snippet(search_index, 3, '<mark>','</mark>', ' … ', 8) AS snippet,
        bm25(search_index) AS score
      FROM search_index
      WHERE search_index MATCH ?
      ORDER BY score ASC
      LIMIT ?;
      `,
      [q, limit]
    );

    // گروه‌بندی id ها برای گرفتن دیتای خلاصه هر دامنه
	    const ids = {
	      product: [] as number[],
	      phone: [] as number[],
	      customer: [] as number[],
	      service: [] as number[],
	      invoice: [] as number[],
	      repair: [] as number[],
	      installment: [] as number[],
	    };
    rows.forEach((r: any) => {
      if (ids[r.domain as keyof typeof ids]) ids[r.domain as keyof typeof ids].push(r.entityId);
    });

    const inClause = (arr: number[]) => arr.map(() => '?').join(',');

	    const [prodRows, phoneRows, custRows, servRows, invRows, repRows, insRows] = await Promise.all([
      ids.product.length ? allAsync(
        `SELECT id, name, sellingPrice FROM products WHERE id IN (${inClause(ids.product)})`, ids.product
      ) : Promise.resolve([]),
      ids.phone.length ? allAsync(
        `SELECT id, model, storage, ram, color, imei, status, salePrice FROM phones WHERE id IN (${inClause(ids.phone)})`, ids.phone
      ) : Promise.resolve([]),
      ids.customer.length ? allAsync(
        `SELECT id, fullName, phoneNumber FROM customers WHERE id IN (${inClause(ids.customer)})`, ids.customer
      ) : Promise.resolve([]),
      ids.service.length ? allAsync(
        `SELECT id, name, price FROM services WHERE id IN (${inClause(ids.service)})`, ids.service
	      ) : Promise.resolve([]),
	      ids.invoice.length ? allAsync(
	        `SELECT i.id, i.invoiceNumber, i.date, i.grandTotal, i.customerId, c.fullName AS customerName
	         FROM invoices i LEFT JOIN customers c ON c.id = i.customerId
	         WHERE i.id IN (${inClause(ids.invoice)})`, ids.invoice
	      ) : Promise.resolve([]),
	      ids.repair.length ? allAsync(
	        `SELECT r.id, r.deviceModel, r.status, r.dateReceived, r.dateCompleted, r.estimatedCost, r.finalCost, r.customerId, c.fullName AS customerName
	         FROM repairs r LEFT JOIN customers c ON c.id = r.customerId
	         WHERE r.id IN (${inClause(ids.repair)})`, ids.repair
	      ) : Promise.resolve([]),
	      ids.installment.length ? allAsync(
	        `SELECT ins.id, ins.actualSalePrice, ins.downPayment, ins.numberOfInstallments, ins.installmentAmount, ins.installmentsStartDate, ins.saleType, ins.dateCreated,
	                ins.customerId, c.fullName AS customerName
	         FROM installment_sales ins LEFT JOIN customers c ON c.id = ins.customerId
	         WHERE ins.id IN (${inClause(ids.installment)})`, ids.installment
	      ) : Promise.resolve([]),
    ]);

    const byId = (arr: any[], key='id') => Object.fromEntries(arr.map((x:any)=>[x[key], x]));
	    const pMap = byId(prodRows);
	    const phMap = byId(phoneRows);
	    const cMap = byId(custRows);
	    const sMap = byId(servRows);
	    const iMap = byId(invRows);
	    const rMap = byId(repRows);
	    const insMap = byId(insRows);

    const items = rows.map((r: any) => {
      const base = {
        id: r.entityId,
        domain: r.domain,
        score: r.score,
        titleHL: r.titleHL,
        snippet: r.snippet
      };
      switch (r.domain) {
        case 'product': {
          const d = pMap[r.entityId] || {};
          return { ...base, title: d.name, subtitle: d.sellingPrice != null ? `قیمت فروش: ${Number(d.sellingPrice).toLocaleString('fa-IR')} تومان` : undefined };
        }
        case 'phone': {
          const d = phMap[r.entityId] || {};
          const sub = [d.color, d.storage, d.ram, d.status].filter(Boolean).join(' • ');
          return { ...base, title: d.model, subtitle: `IMEI: ${d.imei}` + (sub? ` | ${sub}`:''), price: d.salePrice };
        }
        case 'customer': {
          const d = cMap[r.entityId] || {};
          return { ...base, title: d.fullName, subtitle: d.phoneNumber };
        }
        case 'service': {
          const d = sMap[r.entityId] || {};
          return { ...base, title: d.name, subtitle: d.price != null ? `${Number(d.price).toLocaleString('fa-IR')} تومان` : undefined };
        }
	        case 'invoice': {
	          const d = iMap[r.entityId] || {};
	          const dt = d.date ? String(d.date).slice(0, 10) : '';
	          const sub = [d.customerName, dt && `تاریخ: ${dt}`, d.grandTotal != null && `جمع: ${faNum(d.grandTotal)} تومان`].filter(Boolean).join(' • ');
	          return { ...base, title: d.invoiceNumber ? `فاکتور ${d.invoiceNumber}` : `فاکتور #${d.id}`, subtitle: sub };
	        }
	        case 'repair': {
	          const d = rMap[r.entityId] || {};
	          const sub = [d.customerName, d.deviceModel, d.status && `وضعیت: ${d.status}`].filter(Boolean).join(' • ');
	          return { ...base, title: `تعمیر #${d.id}`, subtitle: sub };
	        }
	        case 'installment': {
	          const d = insMap[r.entityId] || {};
	          const sub = [d.customerName, d.actualSalePrice != null && `مبلغ: ${faNum(d.actualSalePrice)} تومان`, d.saleType && `نوع: ${d.saleType}`].filter(Boolean).join(' • ');
	          return { ...base, title: `اقساط #${d.id}`, subtitle: sub };
	        }
        default:
          return base;
      }
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

const shamsiToISOForAPI = (shamsiDateString?: string, endOfDay: boolean = false): string | undefined => {
  if (!shamsiDateString || typeof shamsiDateString !== 'string') return undefined;
  try {
    const m = moment(shamsiDateString.trim(), 'jYYYY/jMM/jDD', true);
    if (!m.isValid()) return undefined;
    return (endOfDay ? m.endOf('day') : m.startOf('day')).toISOString();
  } catch {
    return undefined;
  }
};

const formatPriceForSms = (price: number): string =>
  Number.isFinite(price) ? price.toLocaleString('fa-IR') : '0';

// --- سشن در حافظه ---
interface ActiveSession {
  userId: number;
  username: string;
  roleName: string;
  avatarUrl?: string | null;
  expires: number;
}
const activeSessions: Record<string, ActiveSession> = {};
const generateToken = () => crypto.randomBytes(32).toString('hex');
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string; roleName: string; avatarUrl?: string | null };
    }
  }
}

const CHECK_STATUSES_OPTIONS_SERVER: CheckStatus[] = [
  'در جریان وصول',
  'وصول شده',
  'برگشت خورده',
  'نزد مشتری',
  'باطل شده',
];

// --- Middleware احراز هویت/نقش ---
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'توکن دسترسی ارائه نشده است.' });

  const session = activeSessions[token];
  if (!session || session.expires < Date.now()) {
    if (session) delete activeSessions[token];
    return res.status(403).json({ success: false, message: 'توکن نامعتبر یا منقضی شده است.' });
  }

  session.expires = Date.now() + SESSION_DURATION_MS;
  req.user = { id: session.userId, username: session.username, roleName: session.roleName, avatarUrl: session.avatarUrl };
  next();
};

const authorizeRole = (allowed: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.roleName || !allowed.includes(req.user.roleName)) {
    return res.status(403).json({ success: false, message: `عدم دسترسی مجاز. شما نقش مورد نیاز (${allowed.join(' یا ')}) را ندارید.` });
  }
  next();
};

// --- Helperهای پایدار برای خلاصه آیتم‌ها و مبلغ کل (فقط یکبار تعریف) ---
type AnyRow = Record<string, any>;

/** عددمحور خواندنِ امن یک کلید از میان چند نام‌محتمل */
const readNum = (o: AnyRow, keys: string[], def = 0) => {
  for (const k of keys) {
    const v = Number(o?.[k]);
    if (Number.isFinite(v)) return v;
  }
  return def;
};

/** از آبجکت فاکتور (یا ساختارهای جایگزین) آرایه آیتم‌ها را پیدا می‌کند */
const getItemsFromInvoice = (inv: any): any[] => {
  if (!inv) return [];
  const candidates = [
    inv.items, inv.orderItems, inv.lines, inv.details, inv.itemsData,
    inv.items_list, inv.invoiceItems, inv.rows
  ].filter(Array.isArray);
  if (candidates.length) return candidates[0];

  if (inv.itemsByType && typeof inv.itemsByType === 'object') {
    return Object.values(inv.itemsByType).flat().filter(Boolean) as any[];
  }
  return [];
};

/** نام آیتم را از مسیرهای مختلف استخراج می‌کند (Product/Service/Phone/…) */
const nameFromItem = (it: any): string => {
  const direct =
    it?.itemName ?? it?.name ?? it?.title ?? it?.productName ??
    it?.serviceName ?? it?.model ?? it?.description ?? it?.label;
  if (direct && String(direct).trim()) return String(direct).trim();

  const nested =
    it?.product?.name ?? it?.product?.title ??
    it?.service?.name ?? it?.service?.title ??
    it?.phone?.model ?? it?.device?.model ?? it?.goods?.name;
  if (nested && String(nested).trim()) return String(nested).trim();

  return 'کالا';
};

/** خلاصه کوتاهِ 1–2 آیتم اول + تعداد باقی‌مانده */
const summarize = (items: any[]) => {
  const parts = items.slice(0, 2).map(it => {
    const qty = readNum(it, ['quantity','qty','count','quantitySold','qty_sold'], 1);
    return `${nameFromItem(it)} × ${qty}`;
  });
  const more = Math.max(items.length - 2, 0);
  return parts.join('، ') + (more ? ` و ${more} قلم دیگر` : '');
};

/** محاسبه مبلغ کل فاکتور: اول از فیلدهای Top-Level، بعد جمع خطوط */
const computeTotal = (inv: any, items: any[]): number => {
  const top = readNum(inv, ['grandTotal','total','totalAmount','finalAmount','sum','invoiceTotal']);
  if (top) return top;

  let s = 0;
  for (const it of items) {
    const qty  = readNum(it, ['quantity','qty','count','quantitySold','qty_sold'], 1);
    const line = readNum(it, ['totalPrice','lineTotal','total','line_total','sum'], NaN);
    if (Number.isFinite(line)) { s += line; continue; }
    const unit = readNum(it, ['unitPrice','unit_price','price','salePrice','unitSalePrice'], 0);
    s += unit * qty;
  }
  return s;
};

/** محاسبه سود فاکتور از روی خطوط (در صورت نیاز) */
const calcInvoiceProfit = (items: AnyRow[]): number => {
  if (!Array.isArray(items) || !items.length) return 0;
  let revenue = 0;
  let cost    = 0;
  for (const it of items) {
    const qty      = readNum(it, ['quantity','qty','count','quantitySold','qty_sold'], 1);
    const unitSale = readNum(it, ['unitPrice','unit_price','price','salePrice','unitSalePrice']);
    const lineSale = readNum(it, ['totalPrice','lineTotal','total','line_total','sum'], unitSale * qty);
    const unitCost = readNum(it, ['purchasePrice','buyPrice','cost','purchase_price','unitCost','unit_cost'], 0);
    revenue += lineSale;
    cost    += unitCost * qty;
  }
  return revenue - cost;
};

/** از دیتابیس، داده خطوط چند فاکتور را می‌گیرد و یک Map سود برمی‌گرداند (در صورت نبودِ جدول آماده) */
const buildProfitMapFromInvoices = async (saleIds: number[]) => {
  const map = new Map<number, number>();
  if (!saleIds.length) return map;

  const raw = await getInvoiceDataForSaleIds(saleIds);
  if (!Array.isArray(raw) || !raw.length) return map;

  // حالت 1: هر عنصر خودش items دارد
  if ('items' in raw[0] || 'orderItems' in raw[0]) {
    for (const inv of raw as any[]) {
      const sid   = Number(inv.saleId ?? inv.sale_id ?? inv.id);
      const items = getItemsFromInvoice(inv);
      map.set(sid, calcInvoiceProfit(items));
    }
  } else {
    // حالت 2: ردیف‌های فِلت → گروه‌بندی براساس saleId
    const bySale: Record<number, any[]> = {};
    for (const row of raw as any[]) {
      const sid = Number(row.saleId ?? row.sale_id ?? row.id);
      (bySale[sid] ||= []).push(row);
    }
    Object.entries(bySale).forEach(([sid, items]) => {
      map.set(Number(sid), calcInvoiceProfit(items as any[]));
    });
  }
  return map;
};

// یک Sanitizer ساده برای ورودی‌های شمسی
const sanitizeJalali = (input: unknown): string =>
  String(input ?? '').trim().replace(/[^0-9\u06F0-\u06F9/]/g, '');

// =====================================================
// 3) مسیرهای عمومی (بدون احراز هویت): Login + Barcode
// =====================================================

// بارکد محصول
app.get('/api/barcode/product/:id', async (req, res) => {
  try {
    const product = await getAsync('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).send('Product not found');
    const text = `product-${product.id}`;
    bwipjs.toBuffer({ bcid: 'code128', text, scale: 3, height: 10, includetext: false, textxalign: 'center' },
      (err, png) => err ? res.status(500).send('Error generating barcode') : (res.writeHead(200, { 'Content-Type': 'image/png' }), res.end(png)));
  } catch { res.status(500).send('Server error'); }
});

// بارکد گوشی
app.get('/api/barcode/phone/:id', async (req, res) => {
  try {
    const phone = await getAsync('SELECT id FROM phones WHERE id = ?', [req.params.id]);
    if (!phone) return res.status(404).send('Phone not found');
    const text = `phone-${phone.id}`;
    bwipjs.toBuffer({ bcid: 'code128', text, scale: 3, height: 10, includetext: false, textxalign: 'center' },
      (err, png) => err ? res.status(500).send('Error generating barcode') : (res.writeHead(200, { 'Content-Type': 'image/png' }), res.end(png)));
  } catch { res.status(500).send('Server error'); }
});
// =====================================================
// [جدید] مسیر دریافت اطلاعات برای چاپ گروهی لیبل‌ها
// =====================================================
app.post('/api/labels/data', async (req, res, next) => {
  try {
    const db = await getDbInstance();
    if (!db) {
      return next(new Error('DB connection failed'));
    }

    // ۱. خواندن لیست ID ها از body درخواست
    const { ids } = req.body;
    console.log('[Server] Received request for label data with IDs:', ids); // لاگ برای اشکال‌زدایی

    if (!Array.isArray(ids) || ids.length === 0) {
      console.log('[Server] Error: No IDs provided in request body.');
      return res.status(400).json({ success: false, message: 'No IDs provided' });
    }

    // ۲. آماده‌سازی کوئری برای جلوگیری از SQL Injection
    const placeholders = ids.map(() => '?').join(',');

    // ۳. دریافت اطلاعات محصولات بر اساس ID های دریافتی
    // توجه: نام ستون‌ها (sku, sellingPrice) باید با ساختار جدول products شما مطابقت داشته باشد.
    const items = await db.all(
      `SELECT id, name, sku, sellingPrice FROM products WHERE id IN (${placeholders})`,
      ids
    );
    
    // ۴. فرمت کردن داده‌ها برای ارسال به فرانت‌اند
    const responseData = items.map(item => ({
        id: item.id,
        name: item.name || 'محصول بدون نام',
        price: item.sellingPrice || 0,
        code: item.sku || `product-${item.id}`, // استفاده از SKU یا ID به عنوان کد بارکد
        quantity: 1 // مقدار پیش‌فرض تعداد برای هر برچسب
    }));

    console.log(`[Server] Found ${responseData.length} items. Sending data to client.`);
    res.json({ success: true, data: responseData });
  } catch (e) {
    console.error('[Server] Error in /api/labels/data endpoint:', e);
    next(e);
  }
});
const barcodeCache = new Map<string, Buffer>();

function cacheKey(text: string, q: any) {
  const scale = Number(q.scale ?? 3);
  const height = Number(q.height ?? 12);
  const human = String(q.human ?? '1');
  return `${text}|${scale}|${height}|${human}`;
}

async function sendCode128Cached(res: Response, text: string, q: any = {}) {
  const key = cacheKey(text, q);
  const cached = barcodeCache.get(key);
  if (cached) { res.type('png').send(cached); return; }

  const scale  = Math.max(1, Math.min(8, Number(q.scale ?? 3)));
  const height = Math.max(8, Math.min(30, Number(q.height ?? 12)));
  const human  = !['0','false','no'].includes(String(q.human ?? '1').toLowerCase());

  const png = await bwipjs.toBuffer({ bcid:'code128', text, scale, height, includetext:human, textxalign:'center' });
  barcodeCache.set(key, png);
  res.type('png').send(png);
}

// =====================================================
// 4) از اینجا به بعد نیازمند احراز هویت
// =====================================================
app.use(authenticateToken);

// خروج از حساب
app.post('/api/logout', (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (token && activeSessions[token]) delete activeSessions[token];
  res.json({ success: true, message: 'خروج با موفقیت انجام شد.' });
});

// کاربر جاری
app.get('/api/me', (req, res) =>
  req.user ? res.json({ success: true, user: req.user }) : res.status(404).json({ success: false, message: 'کاربر یافت نشد.' })
);

// تغییر رمز
app.post('/api/me/change-password', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    const { oldPassword, newPassword } = req.body as ChangePasswordPayload;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'اطلاعات ارائه‌شده برای تغییر رمز عبور نامعتبر است.' });
    }
    await changePasswordInDb(req.user.id, { oldPassword, newPassword });
    res.json({ success: true, message: 'کلمه عبور با موفقیت تغییر کرد.' });
  } catch (e) { next(e); }
});

// آپلود آواتار
const avatarStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => cb(null, `avatar-${req.user!.id}-${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`)
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file: any, cb: FileFilterCallback) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype) && /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('فرمت فایل آواتار نامعتبر است.'));
  }
});

app.post('/api/me/upload-avatar', avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'هیچ فایلی برای آپلود انتخاب نشده است.' });
    if (!req.user)  return res.status(401).json({ success: false, message: 'Unauthenticated' });

    const existed = await getAsync('SELECT avatarPath FROM users WHERE id = ?', [req.user.id]);
    if (existed?.avatarPath) {
      fs.unlink(join(avatarsDir, existed.avatarPath), () => {});
    }

    const updated = await updateAvatarPathInDb(req.user.id, req.file.filename);
    res.json({ success: true, message: 'آواتار با موفقیت آپلود شد.', data: { avatarUrl: `/uploads/avatars/${updated.avatarPath}` } });
  } catch (e) { next(e); }
});

// =====================================================
// 5) داشبورد
// =====================================================
// ---- Fallback chart builder: aggregate from legacy + new orders (via invoices) ----
type PeriodKey = 'weekly' | 'monthly' | 'yearly';

const DATE_KEYS_ROW = [
  'transactionDate', 'saleDate', 'date', 'createdAt', 'created_at', 'date_added',
  'timestamp', 'invoiceDate', 'orderDate', 'dateTime', 'datetime'
];
const DATE_KEYS_INV = [
  'transactionDate', 'date', 'orderDate', 'invoiceDate', 'createdAt', 'created_at', 'timestamp'
];
// === NEW: Date normalizers for strict string-key comparison ===
type DateKeyFmt = 'YYYY-MM' | 'YYYY-MM-DD';

/** تبدیل ورودی (ISO / جلالی / عدد یونیکس / YYYY/MM/DD) به کلید روز/ماهِ استاندارد */
const normalizeDateKey = (input: any, fmt: DateKeyFmt): string | undefined => {
  if (input == null) return undefined;
  // اعداد فارسی → انگلیسی و حذف فاصله اضافی
  const s = toEnDigits(String(input)).trim();

  // 1) ISO یا میلادی‌های رایج
  const mi = moment(s, [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY/M/D', 'YYYY/MM/DD'], true);
  if (mi.isValid()) return mi.format(fmt);

  // 2) فرمت‌های جلالی
  const mj = moment(s, ['jYYYY/jM/jD','jYYYY/jMM/jDD','jYYYY-jM-jD','jYYYY-jMM-jDD'], true);
  if (mj.isValid()) return mj.format(fmt);

  // 3) یونیکس میلی‌ثانیه/ثانیه
  const mu = moment(Number(s));
  if (mu.isValid()) return mu.format(fmt);

  return undefined;
};

/** از هر آبجکت (فاکتور یا ردیف خلاصه)، اولین کلید تاریخ معتبر را به key استاندارد تبدیل می‌کند */
const extractAnyDateKey = (obj: any, fmt: DateKeyFmt): string | undefined => {
  if (!obj) return undefined;

  // اول از کلیدهای شناخته‌شده
  for (const k of [...DATE_KEYS_INV, ...DATE_KEYS_ROW]) {
    const key = normalizeDateKey((obj as any)[k], fmt);
    if (key) return key;
  }

  // محض احتیاط: هر فیلدی که اسمش بوی تاریخ/زمان بده
  try {
    for (const [k, v] of Object.entries(obj)) {
      if (!/date|time|created/i.test(k) || v == null) continue;
      const key = normalizeDateKey(v, fmt);
      if (key) return key;
    }
  } catch {}

  return undefined;
};

// --- helpers for amounts (digits/fa, commas, currency words) ---
// ارقام فارسی/عربی-indic → لاتین
const toEnDigits = (input: any): string => {
  const s = String(input ?? '');
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  return s
    .replace(/[۰-۹]/g, d => String(fa.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(ar.indexOf(d)));
};

// پارس هوشمند تاریخ (ISO/میلادی/جلالی/Epoch ثانیه/میلی‌ثانیه)
const parseSmartMoment = (raw: any): moment.Moment | null => {
  if (raw == null) return null;

  // نرمال‌سازی: ارقام لاتین، حذف کاراکترهای نامرئی، یکنواخت‌سازی جداکننده‌ها
  let s0 = toEnDigits(String(raw).trim())
    .replace(/[\u200e\u200f]/g, '') // LRM/RLM
    .replace(/[._]/g, '/')
    .replace(/\s+/g, ' ');

  // Epoch: فقط اگر کاملاً عددی و 10 یا 13 رقمی است
  if (/^\d{10,13}$/.test(s0)) {
    const ms = s0.length === 10 ? Number(s0) * 1000 : Number(s0);
    const mu = moment(ms);
    return mu.isValid() ? mu : null;
  }

  // ISO سخت‌گیرانه (شامل 2025-09-29T12:34:56Z و ...)
  const mIso = moment(s0, moment.ISO_8601, true);
  if (mIso.isValid()) return mIso;

  // قالب‌های رایج میلادی (روزانه/ماهیانه، با و بی‌ساعت)
  const gFormats = [
    'YYYY-MM-DD', 'YYYY/M/D', 'YYYY/MM/DD', 'YYYY-M-D',
    'YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss',
    'YYYY/MM/DD HH:mm', 'YYYY/MM/DD HH:mm:ss',
    'YYYY-MM', 'YYYY/MM'
  ];
  for (const f of gFormats) {
    const m = moment(s0, f, true);
    if (m.isValid()) return m;
  }

  // قالب‌های جلالی (روزانه/ماهیانه، با و بی‌ساعت)
  const jFormats = [
    'jYYYY/jMM/jDD', 'jYYYY-jMM-jDD', 'jYYYY/jM/jD', 'jYYYY-jM-jD',
    'jYYYY/jMM jHH:mm', 'jYYYY/jMM/jDD HH:mm', 'jYYYY/jMM/jDD HH:mm:ss',
    'jYYYY/jMM', 'jYYYY-jMM'
  ];
  for (const f of jFormats) {
    const m = moment(s0, f, true);
    if (m.isValid()) return m;
  }

  // آخرین تلاش منعطف
  const mLoose = moment(s0);
  return mLoose.isValid() ? mLoose : null;
};

// نرمال‌سازی مبلغ (پشتیبانی از منفی، اعشار فارسی/انگلیسی، جداکننده‌های هزارگان، پرانتزی)
const toAmount = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;

  let s = toEnDigits(String(v)).trim();

  // منفیِ پرانتزی: (1234) → -1234
  let negative = false;
  const paren = /^\s*\((.*)\)\s*$/.exec(s);
  if (paren) { negative = true; s = paren[1]; }

  // حذف واحد پول و متن‌های اضافه
  s = s.replace(/(تومان|ريال|ریال|IRR|USD|TL| تومان| ریال)/gi, '');

  // یکسان‌سازی اعشار فارسی → '.'
  s = s.replace(/\u066B/g, '.'); // '٫'

  // اگر نقطه وجود ندارد و فقط یک کاما داریم، همان را اعشار فرض کن؛
  // در غیر اینصورت، کاماها جداکنندهٔ هزارگان هستند و حذف می‌شوند.
  const hasDot = s.includes('.');
  const commaCount = (s.match(/,/g) || []).length;
  if (!hasDot && commaCount === 1) {
    s = s.replace(',', '.');
  }
  // حذف همهٔ جداکننده‌های هزارگان: کاما، «٬» U+066C، فاصلهٔ باریک/غیرشکست، اسپیس
  s = s.replace(/[,\u066C\u2009\u00A0\u202F\s]/g, '');

  // فقط ارقام، یک نقطهٔ اعشار و یک منفی ابتدای رشته را نگه دار
  s = s.replace(/[^0-9\.\-]/g, '');
  s = s.replace(/(?!^)-/g, ''); // منفی‌های اضافی حذف
  // اگر چند نقطه بود، فقط اولی را نگه داریم
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }

  let n = Number(s || '0');
  if (!Number.isFinite(n)) n = 0;
  if (negative) n = -Math.abs(n);

  return n;
};

// تاریخ از رکورد خلاصه (transactions/sales_orders)
const pickDate = (row: any): moment.Moment | null => {
  for (const k of DATE_KEYS_ROW) {
    const v = row?.[k];
    if (v == null) continue;
    const m = parseSmartMoment(v);
    if (m) return m;
  }
  return null;
};

// تاریخ از خودِ آبجکت فاکتور
const pickInvoiceMoment = (inv: any): moment.Moment | null => {
  // 1) کلیدهای شناخته‌شده
  for (const k of DATE_KEYS_INV) {
    const v = inv?.[k];
    if (v == null) continue;
    const m = parseSmartMoment(v);
    if (m) return m;
  }

  // 2) ساختارهای رایج جدید: invoiceMetadata.{transactionDate|date}
  {
    const md = inv?.invoiceMetadata?.transactionDate ?? inv?.invoiceMetadata?.date;
    const m = parseSmartMoment(md);
    if (m) return m;
  }

  // 3) جست‌وجوی سبک روی کلیدهای مشکوک (date|time|created|timestamp) در سطح اول
  try {
    for (const [k, v] of Object.entries(inv || {})) {
      if (!/date|time|created|timestamp/i.test(k) || v == null) continue;
      const m = parseSmartMoment(v);
      if (m) return m;
    }
  } catch {}

  return null;
};


const pickAmountTopLevel = (obj: any): number => {
  const keys = ['grandTotal','grand_total','total','totalAmount','finalAmount','sum','invoiceTotal','subtotal'];
  for (const k of keys) {
    const n = toAmount(obj?.[k]);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return 0;
};

const sumFromItems = (inv: any): number => {
  const container =
    inv?.items || inv?.orderItems || inv?.lines || inv?.details || inv?.invoiceItems || [];
  if (!Array.isArray(container) || container.length === 0) return 0;

  const qtyKeys = ['qty','quantity','count','amount'];
  const priceKeys = ['total','lineTotal','finalAmount','amount','totalPrice','price','unitPrice','subtotal'];

  const pickQty = (row: any) => {
    for (const k of qtyKeys) {
      const n = toAmount(row?.[k]);
      if (n) return n;
    }
    return 1;
  };
  const pickPrice = (row: any) => {
    for (const k of priceKeys) {
      const n = toAmount(row?.[k]);
      if (n) return n;
    }
    return 0;
  };

  // اگر خودِ سطر «total» دارد، از همان استفاده می‌کنیم؛
  // در غیر اینصورت price * qty.
  let sum = 0;
  for (const it of container) {
    const rowTotal = toAmount(it?.total) || toAmount(it?.lineTotal) || 0;
    if (rowTotal) { sum += rowTotal; continue; }
    const q = pickQty(it);
    const p = pickPrice(it);
    sum += (p && q) ? (p * (q || 1)) : 0;
  }
  return sum;
};

const buildBuckets = (period: PeriodKey) => {
  const now = moment().locale('en');
  if (period === 'weekly') {
    const start = now.clone().startOf('day').subtract(6, 'days');
    const buckets: { key: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = start.clone().add(i, 'days');
      buckets.push({ key: d.locale('en').format('YYYY-MM-DD'), label: d.locale('fa').format('jMM/jDD') });

    }
    return { buckets, start, end: now.clone().endOf('day'), fmt: 'YYYY-MM-DD' as const };
  }
  if (period === 'monthly') {
    const start = now.clone().startOf('day').subtract(29, 'days');
    const buckets: { key: string; label: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = start.clone().add(i, 'days');
      buckets.push({ key: d.locale('en').format('YYYY-MM-DD'), label: d.locale('fa').format('jMM/jDD') });

    }
    return { buckets, start, end: now.clone().endOf('day'), fmt: 'YYYY-MM-DD' as const };
  }
  // yearly
  const start = now.clone().startOf('month').subtract(11, 'months');
  const buckets: { key: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = start.clone().add(i, 'months');
    buckets.push({ key: d.locale('en').format('YYYY-MM'), label: d.locale('fa').format('jYYYY jMMM') });

  }
  return { buckets, start, end: now.clone().endOf('month'), fmt: 'YYYY-MM' as const };
};

const buildSalesChartDataFallback = async (period: PeriodKey) => {
  const { buckets, fmt } = buildBuckets(period);
  const map = new Map<string, number>();
  for (const b of buckets) map.set(b.key, 0);

  // منابع داده
  let legacy: any[] = [];
  let modern: any[] = [];
  try { legacy = await getAllSalesTransactionsFromDb(); } catch (e) { console.warn('[fallback] legacy err', e); }
  try { modern = await getAllSalesOrdersFromDb(); } catch (e) { console.warn('[fallback] modern err', e); }

  // ادغام رکوردهای خلاصه بر اساس شناسهٔ فاکتور (رکورد جدید ارجح است)
  const byId = new Map<number, any>();
  for (const r of [...legacy, ...modern]) {
    const sid = Number(r?.id ?? r?.saleId ?? r?.sale_id ?? r?.orderId ?? r?.invoiceId);
    if (!sid) continue;
    byId.set(sid, { ...(byId.get(sid) || {}), ...r });
  }
  const ids = Array.from(byId.keys());

  // برای دیباگ: اولین و آخرین کلیدهای باکت‌ها
  const firstBucketKey = buckets[0]?.key;
  const lastBucketKey  = buckets[buckets.length - 1]?.key;
  console.log('[dash-summary] bucket window:', { fmt, firstBucketKey, lastBucketKey });

  let used = 0, skippedNoDate = 0, skippedRange = 0;
  const debugAdds: any[] = [];

  for (const id of ids) {
    // تلاش برای یافتن آبجکت فاکتور: اول ساختار جدید، بعد قدیمی
    let inv: any = null;
    try { inv = await getSalesOrderForInvoice(id); } catch {}
    if (!inv) { try { inv = await getInvoiceDataById(id); } catch {} }
    if (!inv) { skippedNoDate++; continue; }

    // تاریخ فاکتور را انتخاب کن (از خود فاکتور، و در صورت لزوم از ردیف خلاصه)
    const m = pickInvoiceMoment(inv) || pickDate(byId.get(id));
    if (!m) { skippedNoDate++; continue; }

    // کلید تاریخ مطابق fmt و با ارقام انگلیسی تا با کلیدهای باکت یکی شود
    const key = toEnDigits(m.clone().locale('en').format(fmt));
    if (!map.has(key)) { skippedRange++; continue; }

    // مبلغ فاکتور: اول فیلدهای top-level، در غیراینصورت جمع خطوط
    let total = pickAmountTopLevel(inv);
    if (!total) total = sumFromItems(inv);

    const prev = map.get(key) || 0;
    const next = prev + (Number(total) || 0);
    map.set(key, next);
    used++;

    if (debugAdds.length < 8) {
      debugAdds.push({ id, key, add: Number(total) || 0, newSum: next });
    }
  }

  if (debugAdds.length) console.log('[dash-summary] fallback adds sample:', debugAdds);
  console.log('[dash-summary] fallback stats → used=', used, 'noDate=', skippedNoDate, 'notInBuckets=', skippedRange);

  // خروجی نهایی برای چارت
  return buckets.map(b => ({ name: b.label, sales: map.get(b.key) || 0 }));
};

// ---- روت داشبورد با فالبک امن ----
app.get('/api/dashboard/summary', async (req, res, next) => {
  try {
    const period = (req.query.period as string) || 'monthly';

    const [kpis, salesChartDataRaw, recentActivities] = await Promise.all([
      getDashboardKPIs(),
      getDashboardSalesChartData(period),
      getDashboardRecentActivities(),
    ]);

    console.log('[dash-summary] period=', period);

    let salesChartData: any[] = Array.isArray(salesChartDataRaw) ? salesChartDataRaw : [];
    if (!Array.isArray(salesChartData) || salesChartData.length === 0) {
      console.warn('[dash-summary] salesChartData empty → using fallback aggregator (invoices)');
      const safePeriod: PeriodKey = (['weekly','monthly','yearly'] as PeriodKey[]).includes(period as any)
        ? (period as PeriodKey) : 'monthly';
      salesChartData = await buildSalesChartDataFallback(safePeriod);
      console.log('[dash-summary] fallback sample=', salesChartData.slice(0, 3));
    } else {
      if (Array.isArray(salesChartDataRaw)) {
        console.log('[dash-summary] sample rows:', salesChartDataRaw.slice(0, 3));
      } else if (salesChartDataRaw && typeof salesChartDataRaw === 'object') {
        console.log('[dash-summary] sample entries:', Object.entries(salesChartDataRaw).slice(0, 3));
      }
    }

    res.json({ success: true, data: { kpis, salesChartData, recentActivities } });
  } catch (e) { next(e as any); }
});


// ===================== Dashboard Layout (per-user) =====================
app.get('/api/dashboard/layout', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const layouts = await getUserDashboardLayoutFromDb(userId);
    return res.json({ success: true, data: layouts ? { layouts } : null });
  } catch (error: any) {
    console.error('Error fetching dashboard layout:', error);
    return res.status(500).json({ success: false, message: 'خطا در دریافت چیدمان داشبورد' });
  }
});

app.put('/api/dashboard/layout', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const body = req.body ?? {};
    const layouts = body.layouts ?? body;

    await upsertUserDashboardLayoutInDb(userId, layouts);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving dashboard layout:', error);
    const msg = typeof error?.message === 'string' ? error.message : 'خطا در ذخیره چیدمان داشبورد';
    return res.status(500).json({ success: false, message: msg });
  }
});

app.delete('/api/dashboard/layout', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    await deleteUserDashboardLayoutFromDb(userId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting dashboard layout:', error);
    return res.status(500).json({ success: false, message: 'خطا در حذف چیدمان داشبورد' });
  }
});

app.get('/api/dashboard/action-center', async (_req, res, next) => {
  try {
    const actionItems: ActionItem[] = [];

    // پیشنهاد خرید / کمبود موجودی
    try {
      const suggestions = await generatePurchaseSuggestions();
      (suggestions || []).forEach(item => {
        actionItems.push({
          id: `stock-alert-${item.itemId}`,
          type: 'StockAlert',
          priority: 'High',
          title: `موجودی کم: ${item.itemName ?? 'کالا'}`,
          description: `موجودی فعلی: ${faNum(item.currentStock)}. موجودی برای ${faNum(item.daysOfStockLeft)} روز آینده کافیست.`,
          actionText: 'بررسی پیشنهاد خرید',
          actionLink: '/reports/analysis/suggestions',
        });
      });
    } catch (e) {
      console.warn('generatePurchaseSuggestions failed:', e);
    }

    // اقساط معوق
    try {
      const allUnpaid = await getOverdueInstallmentsFromDb();
      const overdue = (allUnpaid || [])
        .filter(p => {
          const j = moment(p?.dueDate, 'jYYYY/jMM/jDD', true);
          const m = j.isValid() ? j : moment(p?.dueDate);
          return m.isBefore(moment(), 'day');
        })
        .slice(0, 5);

      overdue.forEach(item => {
        actionItems.push({
          id: `overdue-payment-${item.id}`,
          type: 'OverdueInstallment',
          priority: 'High',
          title: `قسط معوق: ${item.customerFullName ?? ''}`,
          description: `قسط به مبلغ ${faNum(item.amountDue)} تومان با سررسید ${item.dueDate} پرداخت نشده است.`,
          actionText: 'مشاهده پرونده',
          actionLink: `/installment-sales/${item.saleId}`,
        });
      });
    } catch (e) {
      console.warn('getOverdueInstallmentsFromDb failed:', e);
    }

    // تعمیرات آماده تحویل
    try {
      const ready = ((await getRepairsReadyForPickupFromDb()) || []).slice(0, 5);
      ready.forEach(item => {
        actionItems.push({
          id: `repair-ready-${item.id}`,
          type: 'RepairReady',
          priority: 'Medium',
          title: `تعمیر آماده تحویل: ${item.deviceModel ?? ''}`,
          description: `دستگاه آقای/خانم ${item.customerFullName ?? ''} به مبلغ نهایی ${faNum(item.finalCost)} تومان آماده تحویل است.`,
          actionText: 'مشاهده جزئیات',
          actionLink: `/repairs/${item.id}`,
        });
      });
    } catch (e) {
      console.warn('getRepairsReadyForPickupFromDb failed:', e);
    }

    res.json({ success: true, data: actionItems });
  } catch (e) {
    next(e);
  }
});

// =====================================================
// Notification Center
// این مسیر، اقساط و چک‌هایی را که ۷ روز، ۳ روز یا همان روز سررسیدشان باقی مانده
// اعلام می‌کند و برای نمایش در بخش «نوتیفیکیشن‌ها» کاربرد دارد. همچنین اطلاعات
// لازم برای ارسال SMS را شامل می‌شود.
// =====================================================
app.get('/api/notifications', authorizeRole(['Admin', 'Salesperson']), async (_req, res, next) => {
  try {
    /**
     * Unified notification list that contains both action-center items (stock alerts, overdue installments,
     * repair ready notifications) and due reminders for installments and checks. Each notification has a
     * `type` to indicate its category, a `title` and `description` for display, and optional fields for
     * further actions such as SMS triggering or navigation. The client can group notifications by `type` and
     * render an appropriate icon for each category.
     */
    const unified: any[] = [];

    // ============ Action Center Items ============
    // Suggestions / Low stock alerts
    try {
      const suggestions = await generatePurchaseSuggestions();
      (suggestions || []).forEach(item => {
        unified.push({
          id: `stock-alert-${item.itemId}`,
          type: 'StockAlert',
          title: `موجودی کم: ${item.itemName ?? 'کالا'}`,
          description: `موجودی فعلی: ${faNum(item.currentStock)}. موجودی برای ${faNum(item.daysOfStockLeft)} روز آینده کافیست.`,
          priority: 'High',
          actionText: 'بررسی پیشنهاد خرید',
          actionLink: '/reports/analysis/suggestions'
        });

// Dismiss a notification for current user
app.post('/api/notifications/:notificationId/dismiss', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const nid = String(req.params.notificationId || '');
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    await dismissNotificationForUserInDb(req.user.id, nid);
    try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'notification', null, `Dismiss notification: ${nid}`); } catch {}
    
    // Filter dismissed notifications for current user
    try {
      if (req.user?.id) {
        const dismissedIds = await listDismissedNotificationIdsForUserFromDb(req.user.id);
        if (dismissedIds?.length) {
          const setIds = new Set(dismissedIds);
          unified = (unified || []).filter((n: any) => !setIds.has(String(n.id)));
        }
      }
    } catch {}


    // ============ Recurring Expenses Due ============
    try {
      const todayIsoDate = moment().format('YYYY-MM-DD');
      const dueRows = await allAsync(
        `SELECT id, title, category, amount, nextRunDate, vendor
           FROM recurring_expenses
          WHERE isActive = 1
            AND nextRunDate <= ?
          ORDER BY nextRunDate ASC, amount DESC
          LIMIT 50`,
        [todayIsoDate]
      );

      (dueRows || []).forEach((r: any) => {
        const isOverdue = String(r.nextRunDate) < todayIsoDate;
        unified.push({
          id: `recurring-expense-${r.id}-${r.nextRunDate}`,
          type: 'RecurringExpenseDue',
          title: isOverdue ? `هزینه تکرارشونده عقب‌افتاده: ${r.title}` : `هزینه تکرارشونده سررسید: ${r.title}`,
          description: `تاریخ: ${r.nextRunDate} • مبلغ: ${(Number(r.amount||0)).toLocaleString('fa-IR')}` + (r.vendor ? ` • طرف حساب: ${r.vendor}` : ''),
          priority: isOverdue ? 'High' : 'Medium',
          actionText: 'باز کردن هزینه‌ها',
          actionLink: '/expenses',
          meta: { amount: Number(r.amount||0), dueDate: r.nextRunDate, recurringExpenseId: Number(r.id) } as any,
        });
      });
    } catch {}

    // ============ Negative Margin Alerts (FIFO) ============
    try {
      const recent = await allAsync(
        `SELECT itemId, itemName, SUM(quantity) as qty, SUM(totalPrice) as revenue
           FROM sales_transactions
          WHERE itemType = 'inventory'
            AND transactionDate >= ?
          GROUP BY itemId, itemName`,
        [moment().subtract(30, 'days').toDate().toISOString()]
      );

      for (const r of recent || []) {
        const pid = Number(r.itemId);
        const qty = Number(r.qty || 0);
        const revenue = Number(r.revenue || 0);
        const fifo = await computeFifoCogsForProduct(pid, qty);
        const profit = revenue - Number(fifo.cogs || 0);
        if (revenue > 0 && profit < 0) {
          unified.push({
            id: `neg-margin-${pid}-${moment().format('YYYY-MM-DD')}`,
            type: 'NegativeMarginAlert',
            title: `هشدار سود منفی: ${String(r.itemName)}`,
            description: `۳۰ روز اخیر • درآمد: ${revenue.toLocaleString('fa-IR')} • سود: ${profit.toLocaleString('fa-IR')}`,
            priority: 'High',
            actionText: 'گزارش سود محصولات',
            actionLink: '/reports/product-margins',
            meta: { productId: pid, revenue, profit } as any,
          });
        }
      }
    } catch {}
res.json({ success: true });
  } catch (e) { next(e); }
});

      });
    } catch (e) {
      console.warn('generatePurchaseSuggestions failed:', e);
    }

    // Overdue installments (past due date)
    try {
      const allUnpaid = await getOverdueInstallmentsFromDb();
      const overdue = (allUnpaid || [])
        .filter(p => {
          const j = moment(p?.dueDate, 'jYYYY/jMM/jDD', true);
          const m = j.isValid() ? j : moment(p?.dueDate);
          return m.isBefore(moment(), 'day');
        })
        .slice(0, 5);

      overdue.forEach(item => {
        unified.push({
          id: `overdue-payment-${item.id}`,
          type: 'OverdueInstallment',
          title: `قسط معوق: ${item.customerFullName ?? ''}`,
          description: `قسط به مبلغ ${faNum(item.amountDue)} تومان با سررسید ${item.dueDate} پرداخت نشده است.`,
          priority: 'High',
          actionText: 'مشاهده پرونده',
          actionLink: `/installment-sales/${item.saleId}`,
          // Enable reminder actions on the client
          targetId: item.id,
          eventType: 'INSTALLMENT_REMINDER',
          meta: {
            customer: item.customerFullName ?? undefined,
            dueDate: item.dueDate ?? undefined,
            amount: item.amountDue ?? undefined,
          }
        });
      });
    } catch (e) {
      console.warn('getOverdueInstallmentsFromDb failed:', e);
    }

    // Repair ready notifications
    try {
      const ready = ((await getRepairsReadyForPickupFromDb()) || []).slice(0, 5);
      ready.forEach(item => {
        unified.push({
          id: `repair-ready-${item.id}`,
          type: 'RepairReady',
          title: `تعمیر آماده تحویل: ${item.deviceModel ?? ''}`,
          description: `دستگاه آقای/خانم ${item.customerFullName ?? ''} به مبلغ نهایی ${faNum(item.finalCost)} تومان آماده تحویل است.`,
          priority: 'Medium',
          actionText: 'مشاهده جزئیات',
          actionLink: `/repairs/${item.id}`
        });
      });
    } catch (e) {
      console.warn('getRepairsReadyForPickupFromDb failed:', e);
    }

    // ============ Due Reminders for Installments & Checks ============
    try {
      // Fetch all unpaid installment payments and pending checks with customer info
      const payments = await getPendingInstallmentPaymentsWithCustomer();
      const checks = await getPendingInstallmentChecksWithCustomer();
      const today = moment().startOf('day');
      // Helper for Persian numbers
      const faNumLocal = (v: any) => Number(v ?? 0).toLocaleString('fa-IR');
      // Iterate payments (installment dues)
      for (const p of payments || []) {
        const due = moment(p.dueDate, 'jYYYY/jMM/jDD', true);
        const diff = due.diff(today, 'days');
        // Only consider future or same-day reminders; skip overdue
        if (diff === 7 || diff === 3 || diff === 0) {
          const daysRemaining = diff;
          let eventType: string;
          if (diff === 7) eventType = 'INSTALLMENT_DUE_7';
          else if (diff === 3) eventType = 'INSTALLMENT_DUE_3';
          else eventType = 'INSTALLMENT_DUE_TODAY';
          const title = diff === 0
            ? 'امروز موعد پرداخت قسط'
            : `${faNumLocal(diff)} روز مانده به پرداخت قسط`;
          const description = `قسط به مبلغ ${faNumLocal(p.amountDue)} تومان برای ${p.customerFullName ?? ''} در تاریخ ${p.dueDate} سررسید دارد.`;
          unified.push({
            id: `installment-${p.paymentId}-${diff}`,
            type: 'InstallmentDue',
            daysRemaining,
            title,
            description,
            targetId: p.paymentId,
            eventType
          });
        }
      }
      // Iterate checks (check dues)
      for (const c of checks || []) {
        const due = moment(c.dueDate, 'jYYYY/jMM/jDD', true);
        const diff = due.diff(today, 'days');
        if (diff === 7 || diff === 3 || diff === 0) {
          const daysRemaining = diff;
          let eventType: string;
          if (diff === 7) eventType = 'CHECK_DUE_7';
          else if (diff === 3) eventType = 'CHECK_DUE_3';
          else eventType = 'CHECK_DUE_TODAY';
          const title = diff === 0
            ? 'امروز موعد چک'
            : `${faNumLocal(diff)} روز مانده به موعد چک`;
          const description = `چک شماره ${c.checkNumber ?? ''} متعلق به ${c.customerFullName ?? ''} به مبلغ ${faNumLocal(c.amount)} تومان در تاریخ ${c.dueDate} سررسید دارد.`;
          unified.push({
            id: `check-${c.checkId}-${diff}`,
            type: 'CheckDue',
            daysRemaining,
            title,
            description,
            targetId: c.checkId,
            eventType
          });
        }
      }
    } catch (e) {
      console.warn('build due notifications failed:', e);
    }

    // Sort unified list: group by category and then by recency
    // We'll put high priority categories first: OverdueInstallment, InstallmentDue (0 days), CheckDue (0 days), RepairReady, StockAlert, StagnantStock, InstallmentDue (3 & 7 days), CheckDue (3 & 7 days).
    unified.sort((a, b) => {
      // Helper to assign numeric weight per type
      const weight = (item: any) => {
        switch (item.type) {
          case 'OverdueInstallment': return 0;
          case 'InstallmentDue': return item.daysRemaining === 0 ? 1 : item.daysRemaining === 3 ? 2 : 3;
          case 'CheckDue': return item.daysRemaining === 0 ? 4 : item.daysRemaining === 3 ? 5 : 6;
          case 'RepairReady': return 7;
          case 'StockAlert': return 8;
          case 'StagnantStock': return 9;
          default: return 10;
        }
      };
      const wA = weight(a);
      const wB = weight(b);
      return wA - wB;
    });

    
    // ============ Customer Followups Due ============
    try {
      const todayIso = moment().startOf('day').toISOString();
      const dueFollowups = await allAsync(
        `SELECT cf.id, cf.customerId, cf.note, cf.nextFollowupDate, c.fullName
           FROM customer_followups cf
           JOIN customers c ON c.id = cf.customerId
          WHERE cf.status='open'
            AND cf.nextFollowupDate IS NOT NULL
            AND cf.nextFollowupDate <= ?
          ORDER BY cf.nextFollowupDate ASC
          LIMIT 50`,
        [todayIso]
      );
      (dueFollowups || []).forEach((f: any) => {
        unified.push({
          id: `customer-followup-${f.id}`,
          type: 'CustomerFollowup',
          title: `پیگیری مشتری: ${f.fullName ?? 'مشتری'}`,
          description: `موعد پیگیری رسیده است. ${f.note ? '(' + f.note + ')' : ''}`,
          priority: 'Medium',
          actionText: 'باز کردن مشتری',
          actionTo: `/customers/${f.customerId}`,
        });
      });
    } catch {}


    // ============ Smart Installment Alerts ============
    // هدف: هشدار هوشمند اقساط (نه فقط تقویم) با تجمیع مشتری و اولویت‌بندی
    try {
      const todayJ = moment().locale('fa').format('jYYYY/jMM/jDD');
      const soonJ = moment().add(3, 'day').locale('fa').format('jYYYY/jMM/jDD'); // ۳ روز آینده

      // Overdue installments grouped by customer
      const overdueByCustomer = await allAsync(
        `SELECT s.customerId,
                c.fullName AS customerName,
                c.phone AS customerPhone,
                COUNT(*) AS overdueCount,
                MIN(ip.dueDate) AS earliestDueDate
           FROM installment_payments ip
           JOIN installment_sales s ON s.id = ip.saleId
           JOIN customers c ON c.id = s.customerId
          WHERE ip.status != 'پرداخت شده'
            AND ip.dueDate < ?
          GROUP BY s.customerId
          ORDER BY overdueCount DESC, earliestDueDate ASC
          LIMIT 50`,
        [todayJ]
      );

      (overdueByCustomer || []).forEach((r: any) => {
        const overdueCount = Number(r.overdueCount || 0);
        const priority = overdueCount >= 3 ? 'High' : overdueCount >= 1 ? 'Medium' : 'Low';
        unified.push({
          id: `smart-installment-overdue-${r.customerId}`,
          type: 'SmartInstallmentAlert',
          meta: { customer: r.customerName, customerId: Number(r.customerId), customerPhone: r.customerPhone },
          title: `اقساط عقب‌افتاده: ${r.customerName ?? 'مشتری'}`,
          description: `تعداد اقساط عقب‌افتاده: ${overdueCount.toLocaleString('fa-IR')} • قدیمی‌ترین سررسید: ${r.earliestDueDate || '—'}`,
          priority,
          actionText: 'باز کردن مشتری',
          actionLink: `/customers/${r.customerId}`,
        });
      });

      // Upcoming installments in next 3 days grouped by customer
      const upcomingByCustomer = await allAsync(
        `SELECT s.customerId,
                c.fullName AS customerName,
                c.phone AS customerPhone,
                COUNT(*) AS dueSoonCount,
                MIN(ip.dueDate) AS nearestDueDate
           FROM installment_payments ip
           JOIN installment_sales s ON s.id = ip.saleId
           JOIN customers c ON c.id = s.customerId
          WHERE ip.status != 'پرداخت شده'
            AND ip.dueDate >= ?
            AND ip.dueDate <= ?
          GROUP BY s.customerId
          ORDER BY nearestDueDate ASC, dueSoonCount DESC
          LIMIT 50`,
        [todayJ, soonJ]
      );

      (upcomingByCustomer || []).forEach((r: any) => {
        const cnt = Number(r.dueSoonCount || 0);
        // if customer already overdue, skip (to avoid duplicates); overdue alerts already higher signal
        const alreadyOverdue = (overdueByCustomer || []).some((o: any) => Number(o.customerId) === Number(r.customerId));
        if (alreadyOverdue) return;

        unified.push({
          id: `smart-installment-upcoming-${r.customerId}`,
          type: 'SmartInstallmentAlert',
          meta: { customer: r.customerName, customerId: Number(r.customerId), customerPhone: r.customerPhone },
          title: `اقساط نزدیک سررسید: ${r.customerName ?? 'مشتری'}`,
          description: `تا ۳ روز آینده: ${cnt.toLocaleString('fa-IR')} قسط • نزدیک‌ترین سررسید: ${r.nearestDueDate || '—'}`,
          priority: cnt >= 2 ? 'Medium' : 'Low',
          actionText: 'باز کردن مشتری',
          actionLink: `/customers/${r.customerId}`,
        });
      });

      // Smart checks alerts (overdue + due soon) grouped by customer (optional but useful)
      const overdueChecks = await allAsync(
        `SELECT s.customerId,
                c.fullName AS customerName,
                c.phone AS customerPhone,
                COUNT(*) AS overdueCount,
                MIN(ic.dueDate) AS earliestDueDate
           FROM installment_checks ic
           JOIN installment_sales s ON s.id = ic.saleId
           JOIN customers c ON c.id = s.customerId
          WHERE ic.status != 'وصول شده'
            AND ic.dueDate < ?
          GROUP BY s.customerId
          ORDER BY overdueCount DESC, earliestDueDate ASC
          LIMIT 50`,
        [todayJ]
      );

      (overdueChecks || []).forEach((r: any) => {
        const overdueCount = Number(r.overdueCount || 0);
        const priority = overdueCount >= 2 ? 'High' : 'Medium';
        unified.push({
          id: `smart-check-overdue-${r.customerId}`,
          type: 'SmartCheckAlert',
          meta: { customer: r.customerName, customerId: Number(r.customerId), customerPhone: r.customerPhone },
          title: `چک عقب‌افتاده: ${r.customerName ?? 'مشتری'}`,
          description: `تعداد چک عقب‌افتاده: ${overdueCount.toLocaleString('fa-IR')} • قدیمی‌ترین سررسید: ${r.earliestDueDate || '—'}`,
          priority,
          actionText: 'باز کردن مشتری',
          actionLink: `/customers/${r.customerId}`,
        });
      });

      const upcomingChecks = await allAsync(
        `SELECT s.customerId,
                c.fullName AS customerName,
                c.phone AS customerPhone,
                COUNT(*) AS dueSoonCount,
                MIN(ic.dueDate) AS nearestDueDate
           FROM installment_checks ic
           JOIN installment_sales s ON s.id = ic.saleId
           JOIN customers c ON c.id = s.customerId
          WHERE ic.status != 'وصول شده'
            AND ic.dueDate >= ?
            AND ic.dueDate <= ?
          GROUP BY s.customerId
          ORDER BY nearestDueDate ASC, dueSoonCount DESC
          LIMIT 50`,
        [todayJ, soonJ]
      );

      (upcomingChecks || []).forEach((r: any) => {
        const cnt = Number(r.dueSoonCount || 0);
        const alreadyOverdue = (overdueChecks || []).some((o: any) => Number(o.customerId) === Number(r.customerId));
        if (alreadyOverdue) return;

        unified.push({
          id: `smart-check-upcoming-${r.customerId}`,
          type: 'SmartCheckAlert',
          meta: { customer: r.customerName, customerId: Number(r.customerId), customerPhone: r.customerPhone },
          title: `چک نزدیک سررسید: ${r.customerName ?? 'مشتری'}`,
          description: `تا ۳ روز آینده: ${cnt.toLocaleString('fa-IR')} چک • نزدیک‌ترین سررسید: ${r.nearestDueDate || '—'}`,
          priority: cnt >= 2 ? 'Medium' : 'Low',
          actionText: 'باز کردن مشتری',
          actionLink: `/customers/${r.customerId}`,
        });
      });
    } catch {}

res.json({ success: true, data: unified });
  } catch (e) {
    next(e);
  }
});


// =====================================================
// 6) محصولات و دسته‌بندی
// =====================================================
app.post('/api/products', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const result = await addProductToDb(req.body as ProductPayload);
    // Log creation in audit log. Ignore errors.
    if (req.user) {
      await addAuditLog(
        req.user.id,
        req.user.username,
        req.user.roleName,
        'create',
        'product',
        result?.id || null,
        `افزودن محصول ${result?.name ?? ''}`
      );
    }
    res.status(201).json({ success: true, data: result });
  }
  catch (e) { next(e); }
});
app.get('/api/products', async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllProductsFromDb() }); }
  catch (e) { next(e); }
});
app.put('/api/products/:id', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const result = await updateProductInDb(id, req.body as UpdateProductPayload);
    // Log update
    if (req.user) {
      await addAuditLog(
        req.user.id,
        req.user.username,
        req.user.roleName,
        'update',
        'product',
        id,
        `ویرایش محصول ${id}`
      );
    }
    res.json({ success: true, data: result });
  }
  catch (e) { next(e); }
});


// P0: Manual inventory adjustment for a product
app.post('/api/products/:id/adjust-stock', authorizeRole(['Admin','Manager','Warehouse']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Number(req.params.id);
    if (!productId) return res.status(400).json({ success:false, message:'شناسه محصول نامعتبر است.' });
    const delta = Number(req.body?.delta);
    if (!Number.isFinite(delta) || delta === 0) return res.status(400).json({ success:false, message:'delta نامعتبر است.' });

    // @ts-ignore
    const userId = req.user?.id;
    const result = await adjustProductStockInDb(productId, {
      delta,
      reason: req.body?.reason,
      notes: req.body?.notes,
      createdByUserId: userId || null,
    });

    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'product', productId, `اصلاح موجودی محصول #${productId} (delta=${delta})`); } catch {}
    }

    return res.json({ success:true, data: result });
  } catch (e) { next(e); }
});

app.delete('/api/products/:id', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const ok = await deleteProductFromDb(id);
    if (ok) {
      // Log deletion
      if (req.user) {
        await addAuditLog(
          req.user.id,
          req.user.username,
          req.user.roleName,
          'delete',
          'product',
          id,
          `حذف محصول ${id}`
        );
      }
      res.json({ success: true, message: 'محصول با موفقیت حذف شد.' });
    } else {
      res.status(404).json({ success: false, message: 'محصول برای حذف یافت نشد.' });
    }
  } catch (e) { next(e); }
});


// =====================================================
// P0: Purchases (stock-in receipts from suppliers)
// =====================================================
app.post('/api/purchases', authorizeRole(['Admin','Manager','Warehouse']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const payload = { ...(req.body || {}), createdByUserId: userId || null };
    const data = await createPurchaseReceiptInDb(payload);

    // A
    // Inventory ledger IN (FIFO layers)
    try {
      const items = (data as any)?.items || [];
      for (const it of items) {
        if (it?.productId && it?.quantity) {
          const unitCost = Number(it?.unitCost || it?.price || 0);
          await recordInventoryInDb({
            productId: Number(it.productId),
            entryType: 'in',
            quantity: Number(it.quantity),
            unitCost,
            refType: 'purchase',
            refId: Number((data as any)?.id),
            entryDate: String((data as any)?.purchaseDate || new Date().toISOString()),
          });
        }
      }
    } catch {}
    // Auto expense for inventory purchase (to make financial report real)
    try {
      const totalCost = Number((data as any)?.totalCost || 0);
      if (totalCost > 0) {
        let vendor: string | null = null;
        const supplierId = (data as any)?.supplierId;
        if (supplierId) {
          try {
            const sp = await getAsync(`SELECT name FROM partners WHERE id = ?`, [Number(supplierId)]);
            vendor = sp?.name ? String(sp.name) : null;
          } catch {}
        }
        const actor = req.user ? { userId: req.user.id, username: req.user.username } : undefined;
        await addExpenseToDb(
          {
            expenseDate: String((data as any)?.purchaseDate || new Date().toISOString()),
            category: 'inventory',
            title: `خرید کالا (رسید #${(data as any)?.id ?? ''})`,
            amount: totalCost,
            vendor,
            notes: (data as any)?.invoiceNumber ? `فاکتور: ${(data as any).invoiceNumber}` : null,
          } as any,
          actor as any
        );
      }
    } catch {}
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'purchase', data?.id || null, `ثبت رسید خرید #${data?.id ?? ''}`); } catch {}
    }
    return res.status(201).json({ success:true, data });
  } catch (e) { next(e); }
});

app.get('/api/purchases', authorizeRole(['Admin','Manager','Warehouse']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await getAllPurchasesFromDb();
    return res.json({ success:true, data: rows });
  } catch (e) { next(e); }
});

app.get('/api/purchases/:id', authorizeRole(['Admin','Manager','Warehouse']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success:false, message:'شناسه نامعتبر است.' });
    const row = await getPurchaseByIdFromDb(id);
    if (!row) return res.status(404).json({ success:false, message:'رسید خرید یافت نشد.' });
    return res.json({ success:true, data: row });
  } catch (e) { next(e); }
});

// =====================================================
// P0: Stock Count (inventory counting)
// =====================================================
app.post('/api/stock-counts', authorizeRole(['Admin','Manager','Warehouse']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const sc = await createStockCountInDb({ title: req.body?.title, notes: req.body?.notes, createdByUserId: userId || null });
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'stock_count', sc?.id || null, `ایجاد انبارگردانی #${sc?.id ?? ''}`); } catch {}
    }
    return res.status(201).json({ success:true, data: sc });
  } catch (e) { next(e); }
});

app.get('/api/stock-counts', authorizeRole(['Admin','Manager','Warehouse']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await getAllStockCountsFromDb();
    return res.json({ success:true, data: rows });
  } catch (e) { next(e); }
});

app.get('/api/stock-counts/:id', authorizeRole(['Admin','Manager','Warehouse']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success:false, message:'شناسه نامعتبر است.' });
    const sc = await getStockCountByIdFromDb(id);
    if (!sc) return res.status(404).json({ success:false, message:'انبارگردانی یافت نشد.' });
    return res.json({ success:true, data: sc });
  } catch (e) { next(e); }
});

app.post('/api/stock-counts/:id/items', authorizeRole(['Admin','Manager','Warehouse']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success:false, message:'شناسه نامعتبر است.' });
    const productId = Number(req.body?.productId);
    const countedQty = Number(req.body?.countedQty);
    if (!productId || !Number.isFinite(countedQty)) return res.status(400).json({ success:false, message:'پارامترها نامعتبر است.' });
    await upsertStockCountItemInDb(id, productId, countedQty);
    return res.json({ success:true });
  } catch (e) { next(e); }
});

app.post('/api/stock-counts/:id/complete', authorizeRole(['Admin','Manager','Warehouse']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success:false, message:'شناسه نامعتبر است.' });
    // @ts-ignore
    const userId = req.user?.id;
    const sc = await completeStockCountInDb(id, userId || null);
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'stock_count', id, `اتمام انبارگردانی #${id}`); } catch {}
    }
    return res.json({ success:true, data: sc });
  } catch (e) { next(e); }
});


// دسته‌بندی
app.post('/api/categories', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'نام دسته‌بندی الزامی است.' });
    res.status(201).json({ success: true, data: await addCategoryToDb(name) });
  } catch (e) { next(e); }
});
app.get('/api/categories', async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllCategoriesFromDb() }); }
  catch (e) { next(e); }
});
app.put('/api/categories/:id', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'نام دسته‌بندی الزامی است.' });
    res.json({ success: true, data: await updateCategoryInDb(+req.params.id, name) });
  } catch (e) { next(e); }
});
app.delete('/api/categories/:id', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const ok = await deleteCategoryFromDb(+req.params.id);
    ok ? res.json({ success: true, message: 'دسته‌بندی با موفقیت حذف شد.' })
       : res.status(404).json({ success: false, message: 'دسته‌بندی برای حذف یافت نشد.' });
  } catch (e) { next(e); }
});

// =====================================================
// 7) گوشی‌ها
// =====================================================
app.post('/api/phones', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const p = req.body as PhoneEntryPayload;
    if (!p.imei || !p.model || p.purchasePrice == null)
      return res.status(400).json({ success: false, message: 'فیلدهای مدل، IMEI و قیمت خرید الزامی هستند.' });
    res.status(201).json({ success: true, data: await addPhoneEntryToDb(p) });
  } catch (e) { next(e); }
});
app.get('/api/phones', async (req, res, next) => {
  try {
    const phoneId = req.query.id ? parseInt(String(req.query.id), 10) : undefined;
    res.json({ success: true, data: await getAllPhoneEntriesFromDb(null, req.query.status as string, phoneId) });
  } catch (e) { next(e); }
});
app.put('/api/phones/:id', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try { res.json({ success: true, data: await updatePhoneEntryInDb(+req.params.id, req.body as PhoneEntryUpdatePayload), message: 'گوشی با موفقیت ویرایش شد.' }); }
  catch (e) { next(e); }
});
app.delete('/api/phones/:id', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const ok = await deletePhoneEntryFromDb(+req.params.id);
    ok ? res.json({ success: true, message: 'گوشی با موفقیت حذف شد.' })
       : res.status(404).json({ success: false, message: 'گوشی برای حذف یافت نشد.' });
  } catch (e) { next(e); }
});

// --- لیست مدل‌ها/رنگ‌ها برای فرم ثبت گوشی (ذخیرهٔ پایدار) ---
app.get('/api/phone-models', async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllPhoneModelsFromDb() }); }
  catch (e) { next(e); }
});
app.post('/api/phone-models', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'نام مدل الزامی است.' });
    const data = await addPhoneModelToDb(name);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/phone-colors', async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllPhoneColorsFromDb() }); }
  catch (e) { next(e); }
});
app.post('/api/phone-colors', authorizeRole(['Admin','Manager','Warehouse']), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'نام رنگ الزامی است.' });
    const data = await addPhoneColorToDb(name);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
});

// =====================================================
// 8) فروش/فاکتورها
//    - آیتم‌های قابل فروش
//    - لیست فاکتورها (یکپارچه)
//    - ثبت سفارش جدید
//    - نمایش فاکتور (با fallback)
//    - سازگاری با فروش تکی قدیمی
// =====================================================

app.get('/api/sellable-items', async (_req, res, next) => {
  try { res.json({ success: true, data: await getSellableItemsFromDb() }); }
  catch (e) { next(e); }
});

// --- تابع مشترک لیست فاکتورها ---
const listSalesHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // A) منبع قدیمی (transactions قدیمی) + منبع جدید (sales_orders)
    const legacyRows: any[] = await getAllSalesTransactionsFromDb();
    let newRows: any[] = [];
    try { newRows = await getAllSalesOrdersFromDb(); } catch { newRows = []; }

    // B) ادغام رکوردها بر اساس شناسه (ردیف جدید ارجح است)
    const byId = new Map<number, any>();
    for (const r of [...legacyRows, ...newRows]) {
      const sid = Number(r.id ?? r.saleId ?? r.sale_id);
      if (!sid) continue;
      byId.set(sid, { ...byId.get(sid), ...r });
    }
    const ids = Array.from(byId.keys()).sort((a, b) => b - a);

    // C) نقشه سود (از DB؛ در صورت عدم‌دسترس، از خطوط فاکتور محاسبه می‌کنیم)
    let profitMap = new Map<number, number>();
    try {
      profitMap = await getProfitPerSaleMapFromDb(ids);
    } catch {
      profitMap = await buildProfitMapFromInvoices(ids);
    }

    // D) ساخت خروجی نهایی با شرح/مبلغ درست
    const rows: any[] = [];
    for (const id of ids) {
      const base = byId.get(id) || {};

      let description: string = base.itemName ?? base.description ?? '';
      let grandTotal: number | null = Number(base.grandTotal ?? base.total);
      if (!Number.isFinite(grandTotal)) grandTotal = null;

      // تلاش ۱: فاکتور جدید
      let invoice: any = null;
      try { invoice = await getSalesOrderForInvoice(id); } catch {}
      // تلاش ۲: فاکتور قدیم
      if (!invoice) { try { invoice = await getInvoiceDataById(id); } catch {} }

      if (invoice) {
        if (Array.isArray(invoice.lineItems)) {
          const items = invoice.lineItems;
          if (!description) description = summarize(items);
          if (grandTotal == null) {
            const fin = invoice.financialSummary;
            const gt = Number(fin?.grandTotal ?? NaN);
            if (Number.isFinite(gt)) grandTotal = gt;
          }
        } else {
          const items = getItemsFromInvoice(invoice);
          if (!description) description = summarize(items);
          if (grandTotal == null) grandTotal = computeTotal(invoice, items);
        }
      }

      const customerName =
        base.customerFullName ?? base.customerName ?? base.fullName ??
        (base.customerId ? 'مشتری' : 'مهمان');

      rows.push({
        ...base,
        id,
        description: description || '—',
        grandTotal,
        profit: profitMap.get(id) ?? 0,
        customerName,
        customerFullName: customerName,
      });
    }

    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};
app.get('/api/sales-orders', authorizeRole(['Admin','Manager','Salesperson']), listSalesHandler);  // مسیر جدید
app.get('/api/sales',        authorizeRole(['Admin','Manager','Salesperson']), listSalesHandler);  // برای سازگاری با نسخه قدیمی


// ---------- C) ایجاد و مشاهده فاکتور ----------

/** ثبت سفارش جدید (فاکتور جدید) */
app.post('/api/sales-orders', authorizeRole(['Admin','Manager','Salesperson']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as SalesOrderPayload;
    const errors = validateSalesOrderPayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const result = await createSalesOrder(payload);

        // Internal Telegram notification (sales topic) - template-based
    try {
      const who = String((req as any)?.user?.username || '').trim() || 'admin';
      const orderId = Number((result as any)?.orderId || (result as any)?.id || 0);

      // Fetch full invoice data to ensure totals/customer are present
      let invoice: any = null;
      try { invoice = await getSalesOrderForInvoice(orderId); } catch {}

      const settings = await getAllSettingsAsObject();
      const baseUrl = String((settings as any).app_base_url || '').trim();
      const link = baseUrl ? `${baseUrl}/#/sales` : '';

      const customerName = String(
        invoice?.customerDetails?.fullName ??
        invoice?.customerDetails?.name ??
        (payload as any)?.customerName ??
        (payload as any)?.customerFullName ??
        ''
      ).trim();

      const grandTotalRaw =
        invoice?.financialSummary?.grandTotal ??
        invoice?.financialSummary?.total ??
        (payload as any)?.financialSummary?.grandTotal ??
        (payload as any)?.grandTotal ??
        (payload as any)?.total ??
        0;

      const grandTotal = Number(grandTotalRaw) || 0;

      const tplKey = `telegram_tpl_sales_sales_order_created`;
      const tpl =
        String((settings as any)[tplKey] || '').trim() ||
        `🧾 فاکتور جدید ثبت شد
شماره: {invoiceNo}
مشتری: {customerName}
مبلغ: {total}
ثبت‌کننده: {who}
{link}`;

      const formattedTotal = `${formatPriceForSms(grandTotal)} تومان`;

      const text = safeReplaceTemplate(tpl, {
        invoiceNo: orderId ? `#${orderId}` : '-',
        customerName,
        total: formattedTotal,
        amount: formattedTotal,
        who,
        link,
        now: new Date().toISOString(),
      });

      await enqueueTelegramToTopicTargets(
        'sales',
        'SALES_ORDER_CREATED',
        text,
        { entityType: 'sales_order', entityId: orderId || undefined }
      );
    } catch {}
// Audit: create sales order
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'sales_order', result?.id || null, `ثبت فاکتور فروش #${result?.id ?? ''}`); } catch {}
    }
    res.status(201).json({ success: true, message: 'سفارش با موفقیت ثبت شد.', data: result });
  } catch (e) { next(e); }
});
/** حذف فاکتور + برگشت موجودی + اصلاح دفتر مشتری */
app.delete('/api/sales-orders/:id', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success:false, message:'شناسه نامعتبر است.' });

    const result = await deleteSalesOrder(id);
    if (!result) return res.status(404).json({ success:false, message:'فاکتور یافت نشد.' });

    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'delete', 'sales_order', id, `حذف فاکتور فروش #${id}`); } catch {}
    }

    res.json({ success:true, message:'فاکتور حذف شد.' });
  } catch (e) { next(e); }
});


// P0: Cancel invoice (soft-cancel) + Returns
app.post('/api/sales-orders/:id/cancel', authorizeRole(['Admin','Manager','Salesperson']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).json({ success: false, message: 'شناسه فاکتور نامعتبر است.' });
    // @ts-ignore
    const userId = req.user?.id;
    const result = await cancelSalesOrder(orderId, { reason: req.body?.reason });
    if (!result) return res.status(404).json({ success: false, message: 'فاکتور یافت نشد.' });
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'sales_order', orderId, `ابطال فاکتور فروش #${orderId}` + (req.body?.reason ? ` | دلیل: ${req.body.reason}` : '')); } catch {}
    }
    // Internal Telegram notification (sales topic) - template-based
try {
  const who = String((req as any)?.user?.username || '').trim();
  const settings = await getAllSettingsAsObject();
  const baseUrl = String(settings.app_base_url || '').trim();
  const link = baseUrl ? `${baseUrl}/#/sales` : '';
  const tplKey = `telegram_tpl_sales_sales_order_cancelled`;
  const tpl = String((settings as any)[tplKey] || '').trim() || `❌ فاکتور/سفارش لغو شد
شماره: {invoiceNo}
ثبت‌کننده: {who}
{link}`;
  const text = safeReplaceTemplate(tpl, {
    invoiceNo: orderId ? `#${orderId}` : '-',
    who,
    link,
    now: new Date().toISOString(),
  });
  await enqueueTelegramToTopicTargets('sales', 'SALES_ORDER_CANCELLED', text, { entityType: 'sales_order', entityId: orderId });
} catch {}
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

app.get('/api/sales-orders/:id/returns', authorizeRole(['Admin','Manager','Salesperson']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).json({ success: false, message: 'شناسه فاکتور نامعتبر است.' });
    const rows = await getSalesReturnsForOrder(orderId);
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

app.post('/api/sales-orders/:id/returns', authorizeRole(['Admin','Manager','Salesperson']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).json({ success: false, message: 'شناسه فاکتور نامعتبر است.' });
    // @ts-ignore
    const userId = req.user?.id;
    const payload = { ...(req.body || {}), createdByUserId: userId || null };
    const row = await createSalesReturn(orderId, payload);
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'sales_return', (row?.id || null) as any, `ثبت مرجوعی برای فاکتور #${orderId} (مرجوعی #${row?.id})`); } catch {}
    }
    // Internal Telegram notification (sales topic) - template-based
try {
  const who = String((req as any)?.user?.username || '').trim();
  const settings = await getAllSettingsAsObject();
  const baseUrl = String(settings.app_base_url || '').trim();
  const link = baseUrl ? `${baseUrl}/#/sales` : '';
  const tplKey = `telegram_tpl_sales_sales_order_return_created`;
  const tpl = String((settings as any)[tplKey] || '').trim() || `↩️ مرجوعی ثبت شد
شماره: {invoiceNo}
ثبت‌کننده: {who}
{link}`;
  const text = safeReplaceTemplate(tpl, {
    invoiceNo: orderId ? `#${orderId}` : '-',
    who,
    link,
    now: new Date().toISOString(),
  });
  await enqueueTelegramToTopicTargets('sales', 'SALES_ORDER_RETURN_CREATED', text, { entityType: 'sales_return', entityId: (row as any)?.id || undefined });
} catch {}
    return res.json({ success: true, data: row });
  } catch (err) { next(err); }
});


/** نمایش فاکتور برای چاپ: اول سفارش‌های جدید، اگر نبود فاکتور قدیمی */
app.get('/api/sales-orders/:id', authorizeRole(['Admin','Manager','Salesperson']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success:false, message:'شناسه نامعتبر است.' });
    }

    let invoice = await getSalesOrderForInvoice(id);  // ساختار جدید
    if (!invoice) invoice = await getInvoiceDataById(id); // سازگاری با ساختار قدیم

    if (!invoice) {
      return res.status(404).json({ success:false, message:'فاکتور یافت نشد.' });
    }
    res.json({ success:true, data: invoice });
  } catch (e) { next(e); }
});

/** (قدیمی) فروش تکی — فقط برای سازگاریِ صفحاتی که هنوز از این مسیر استفاده می‌کنند */
app.post('/api/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saleData = req.body as SaleDataPayload;
    const data = await recordSaleTransactionInDb(saleData);

    // Internal Telegram notification for sales (optional, based on settings)
    try {
      const { botToken, chatIds } = await getTelegramTargetsForTopic('sales');
      if (botToken && chatIds.length) {
        const p: any = saleData as any;
        const amount = Number((data as any)?.totalAmount ?? (data as any)?.amount ?? p?.totalAmount ?? p?.amount ?? 0);
        const customer = String((data as any)?.customerName ?? p?.customerName ?? p?.customerFullName ?? '').trim();
        const desc = String(p?.itemName ?? p?.description ?? '').trim();
        const text =
          `🧾 فروش ثبت شد\n` +
          (customer ? `مشتری: ${customer}\n` : '') +
          (desc ? `شرح: ${desc}\n` : '') +
          `مبلغ: ${formatPriceForSms(amount)} تومان`;
        await sendTelegramMessages(botToken, chatIds, text);
      }
    } catch (e) {}


    // Inventory ledger OUT (FIFO consumption) - only for inventory sales
    try {
      const p = saleData as any;
      if (p?.itemType === 'inventory' && p?.itemId && p?.quantity) {
        await recordInventoryInDb({
          productId: Number(p.itemId),
          entryType: 'out',
          quantity: Number(p.quantity),
          refType: 'sale',
          refId: Number((data as any)?.id || 0),
          entryDate: (() => {
            const d = String((data as any)?.transactionDate || p?.transactionDate || '');
            const m = moment(d, ['YYYY-MM-DD', 'jYYYY/jMM/jDD', moment.ISO_8601], true);
            return m.isValid() ? m.toDate().toISOString() : new Date().toISOString();
          })(),
        });
      }
    } catch {}

    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

/** دسترسی مستقیم به داده‌های فاکتور قدیمی: تکی */
app.get('/api/invoice-data/:saleId(\\d+)', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saleId = parseInt(req.params.saleId, 10);
    const data   = await getInvoiceDataById(saleId);
    if (!data) return res.status(404).json({ success: false, message: 'فاکتور برای این فروش یافت نشد.' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

/** دسترسی مستقیم به داده‌های فاکتور قدیمی: چندتایی (۱۲,۱۳,۱۴ → [12,13,14]) */
app.get('/api/invoice-data/:saleIds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = String(req.params.saleIds).split(',').map(s => parseInt(s, 10)).filter(Boolean);
    if (!ids.length) return res.status(400).json({ success: false, message: 'شناسهٔ فروش نامعتبر است.' });
    const data = await getInvoiceDataForSaleIds(ids);
    if (!data) return res.status(404).json({ success: false, message: 'فاکتور برای فروش‌های خواسته‌شده یافت نشد.' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});




// =====================================================
// Inventory Adjustments (increase/decrease stock with FIFO ledger)
// =====================================================
app.post('/api/inventory/adjustments', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const payload = req.body as any;
    const data = await createInventoryAdjustmentInDb({
      productId: Number(payload.productId),
      direction: payload.direction,
      quantity: Number(payload.quantity),
      unitCost: payload.unitCost != null ? Number(payload.unitCost) : 0,
      reason: payload.reason,
      entryDate: String(payload.entryDate || new Date().toISOString()),
    });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
});

// =====================================================
// 9) مشتریان
// =====================================================
app.post('/api/customers', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await addCustomerToDb(req.body as CustomerPayload) }); }
  catch (e) { next(e); }
});
app.get('/api/customers', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllCustomersWithBalanceFromDb() }); }
  catch (e) { next(e); }
});
app.get('/api/customers/:id', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const profile = await getCustomerByIdFromDb(id);
    if (!profile) return res.status(404).json({ success: false, message: 'مشتری یافت نشد.' });

    const ledger = await getLedgerForCustomerFromDb(id);
    const followups = await listCustomerFollowupsFromDb(id);
    const purchaseHistory = await getAllSalesTransactionsFromDb(id);

    res.json({ success: true, data: { profile, ledger, followups, purchaseHistory } });
  } catch (e) { next(e); }
});

// Ledger insights (smart debt/credit snapshot)
app.get('/api/customers/:id/ledger/insights', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const profile = await getCustomerByIdFromDb(id);
    if (!profile) return res.status(404).json({ success: false, message: 'مشتری یافت نشد.' });

    const insights = await getCustomerLedgerInsightsFromDb(id);
    res.json({ success: true, data: insights });
  } catch (e) { next(e); }
});

// Customer followups (CRM)
app.get('/api/customers/:id/followups', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const rows = await listCustomerFollowupsFromDb(id);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

app.post('/api/customers/:id/followups', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const payload = req.body as any;
    const user = (req as any).user;
    const created = await addCustomerFollowupToDb(id, {
      note: payload?.note,
      nextFollowupDate: payload?.nextFollowupDate ?? null,
      createdByUserId: user?.id,
      createdByUsername: user?.username,
    });
    res.status(201).json({ success: true, data: created });
  } catch (e) { next(e); }
});

app.post('/api/customers/:id/followups/:followupId/close', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const followupId = +req.params.followupId;
    const updated = await closeCustomerFollowupInDb(id, followupId);
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

app.patch('/api/customers/:id/followups/:followupId', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const followupId = +req.params.followupId;
    const updated = await updateCustomerFollowupInDb(id, followupId, req.body || {});
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

app.put('/api/customers/:id', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try { res.json({ success: true, data: await updateCustomerInDb(+req.params.id, req.body as CustomerPayload) }); }
  catch (e) { next(e); }
});

// CRM: update tags only
app.patch('/api/customers/:id/tags', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    const updated = await updateCustomerTagsInDb(id, tags);
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'customer', id, 'ویرایش تگ‌های مشتری'); } catch {}
    }
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});


// === Deletion for Customers & Partners ===
app.delete('/api/customers/:id', authorizeRole(['Admin']), async (req, res, next) => {
  try {
    const ok = await deleteCustomerFromDb(+req.params.id);
    res.json({ success: true, data: ok });
  } catch (e) { next(e); }
});

app.delete('/api/partners/:id', authorizeRole(['Admin']), async (req, res, next) => {
  try {
    const ok = await deletePartnerFromDb(+req.params.id);
    res.json({ success: true, data: ok });
  } catch (e) { next(e); }
});

// === Edit/Delete ledger entries (Customers & Partners) ===

// POST: افزودن رکورد دفتر مشتری
app.post(
  '/api/customers/:id/ledger',
  authorizeRole(['Admin', 'Salesperson']),
  async (req, res) => {
    try {
      const data = await addCustomerLedgerEntryToDb(
        +req.params.id,
        req.body as LedgerEntryPayload
      );
      res.status(201).json({ success: true, data });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('مبالغ نامعتبر')) {
        return res.status(400).json({ success: false, message: msg });
      }
      if (msg.includes('یافت نشد') || msg.toLowerCase().includes('not found')) {
        return res.status(404).json({ success: false, message: msg });
      }
      console.error('POST /customers ledger error', e);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// PUT: ویرایش رکورد دفتر مشتری
app.put(
  '/api/customers/:id/ledger/:entryId',
  authorizeRole(['Admin', 'Salesperson']),
  async (req, res) => {
    try {
      const data = await updateCustomerLedgerEntryInDb(
        +req.params.id,
        +req.params.entryId,
        req.body
      );
      res.json({ success: true, data });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('رکورد دفتر یافت نشد')) {
        return res.status(404).json({ success: false, message: msg });
      }
      if (msg.includes('عدم تطابق مشتری')) {
        return res.status(409).json({ success: false, message: msg });
      }
      if (msg.includes('مبالغ نامعتبر')) {
        return res.status(400).json({ success: false, message: msg });
      }
      console.error('PUT /customers ledger error', e);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// DELETE: حذف رکورد دفتر مشتری
app.delete(
  '/api/customers/:id/ledger/:entryId',
  authorizeRole(['Admin']),
  async (req, res) => {
    try {
      const ok = await deleteCustomerLedgerEntryFromDb(
        +req.params.id,
        +req.params.entryId
      );
      res.json({ success: true, data: ok });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('رکورد دفتر یافت نشد')) {
        return res.status(404).json({ success: false, message: msg });
      }
      if (msg.includes('عدم تطابق مشتری')) {
        return res.status(409).json({ success: false, message: msg });
      }
      console.error('DELETE /customers ledger error', e);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// PUT: ویرایش رکورد دفتر همکار
app.put(
  '/api/partners/:id/ledger/:entryId',
  authorizeRole(['Admin', 'Salesperson']),
  async (req, res) => {
    try {
      const data = await updatePartnerLedgerEntryInDb(
        +req.params.id,
        +req.params.entryId,
        req.body
      );
      res.json({ success: true, data });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('رکورد دفتر یافت نشد')) {
        return res.status(404).json({ success: false, message: msg });
      }
      if (msg.includes('عدم تطابق همکار')) {
        return res.status(409).json({ success: false, message: msg });
      }
      if (msg.includes('مبالغ نامعتبر')) {
        return res.status(400).json({ success: false, message: msg });
      }
      console.error('PUT /partners ledger error', e);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// DELETE: حذف رکورد دفتر همکار
app.delete(
  '/api/partners/:id/ledger/:entryId',
  authorizeRole(['Admin']),
  async (req, res) => {
    try {
      const ok = await deletePartnerLedgerEntryFromDb(
        +req.params.id,
        +req.params.entryId
      );
      res.json({ success: true, data: ok });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('رکورد دفتر یافت نشد')) {
        return res.status(404).json({ success: false, message: msg });
      }
      if (msg.includes('عدم تطابق همکار')) {
        return res.status(409).json({ success: false, message: msg });
      }
      console.error('DELETE /partners ledger error', e);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// =====================================================
// 10) همکاران/تأمین‌کنندگان
// =====================================================
app.post('/api/partners', authorizeRole(['Admin']), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await addPartnerToDb(req.body as PartnerPayload) }); }
  catch (e) { next(e); }
});
app.get('/api/partners', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try { res.json({ success: true, data: await getAllPartnersWithBalanceFromDb(req.query.partnerType as string | undefined) }); }
  catch (e) { next(e); }
});
app.get('/api/partners/:id', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    const profile = await getPartnerByIdFromDb(id);
    if (!profile) return res.status(404).json({ success: false, message: 'همکار یافت نشد.' });
    const ledger = await getLedgerForPartnerFromDb(id);
    const normalized = (await getPurchasedItemsFromPartnerDb(id)).map((r: any) => {
      // enrichment (شبیه نسخه قبلی)
      let qty = Number(r.quantityPurchased ?? 0);
      if (!qty && r.type === 'product' && r.description) {
        const m = String(r.description).match(/(\d+)\s*(?:عدد|تا|Qty|x)\b/);
        if (m) qty = Number(m[1]);
      }
      if (!qty && r.type === 'phone') qty = 1;
      const unit = Number(r.purchasePrice ?? 0);
      return { ...r, quantityPurchased: qty, totalPrice: qty && unit ? qty * unit : 0 };
    });
    res.json({ success: true, data: { profile, ledger, purchaseHistory: normalized } });
  } catch (e) { next(e); }
});
app.put('/api/partners/:id', authorizeRole(['Admin']), async (req, res, next) => {
  try { res.json({ success: true, data: await updatePartnerInDb(+req.params.id, req.body as PartnerPayload) }); }
  catch (e) { next(e); }
});
app.post('/api/partners/:id/ledger', authorizeRole(['Admin']), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await addPartnerLedgerEntryToDb(+req.params.id, req.body as LedgerEntryPayload) }); }
  catch (e) { next(e); }
});

// =====================================================
// 11) گزارش‌ها
// =====================================================

// نقش‌های مجاز برای گزارش‌ها
const REPORT_ROLES = ['Admin', 'Manager', 'Salesperson', 'Marketer'];

app.get('/api/reports/sales-summary', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ success: false, message: 'بازه زمانی الزامی است.' });
    }

    const data = await getSalesSummaryAndProfit(fromDate as string, toDate as string);

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

app.get('/api/reports/debtors', authorizeRole(REPORT_ROLES), async (_req, res, next) => {
  try {
    const data = await getDebtorsList();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

app.get('/api/reports/creditors', authorizeRole(REPORT_ROLES), async (_req, res, next) => {
  try {
    const data = await getCreditorsList();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

app.get('/api/reports/top-customers', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ success: false, message: 'بازه زمانی الزامی است.' });
    }

    const data = await getTopCustomersBySales(fromDate as string, toDate as string);

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

app.get('/api/reports/top-suppliers', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ success: false, message: 'بازه زمانی الزامی است.' });
    }

    const f = fromShamsiStringToISO(fromDate as string);
    const t = fromShamsiStringToISO(toDate as string);
    if (!f || !t) {
      return res
        .status(400)
        .json({ success: false, message: 'فرمت تاریخ نامعتبر است.' });
    }

    const data = await getTopSuppliersByPurchaseValue(f, t);

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

app.get('/api/reports/phone-sales', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ success: false, message: 'بازه زمانی الزامی است.' });
    }

    const f = fromShamsiStringToISO(fromDate as string);
    const t = fromShamsiStringToISO(toDate as string);
    if (!f || !t) {
      return res
        .status(400)
        .json({ success: false, message: 'فرمت تاریخ نامعتبر است.' });
    }

    const data = await getPhoneSalesReport(f, t);

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

app.get(
  '/api/reports/phone-installment-sales',
  authorizeRole(REPORT_ROLES),
  async (req, res, next) => {
    try {
      const { fromDate, toDate } = req.query;
      if (!fromDate || !toDate) {
        return res
          .status(400)
          .json({ success: false, message: 'بازه زمانی الزامی است.' });
      }

      const f = fromShamsiStringToISO(fromDate as string);
      const t = fromShamsiStringToISO(toDate as string);
      if (!f || !t) {
        return res
          .status(400)
          .json({ success: false, message: 'فرمت تاریخ نامعتبر است.' });
      }

      const data = await getPhoneInstallmentSalesReport(f, t);

      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
);

app.get('/api/reports/compare-sales', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const mFrom = moment(
      sanitizeJalali((req.query as any)?.fromDate),
      'jYYYY/jMM/jDD',
      true
    );
    const mTo = moment(
      sanitizeJalali((req.query as any)?.toDate),
      'jYYYY/jMM/jDD',
      true
    );

    if (!mFrom.isValid() || !mTo.isValid() || mTo.isBefore(mFrom, 'day')) {
      return res
        .status(400)
        .json({ success: false, message: 'فرمت تاریخ نامعتبر است.' });
    }

    const baseline = (req.query as any)?.baseline as 'prev' | 'last_year' | undefined;

    let prevFrom = mFrom.clone();
    let prevTo = mTo.clone();

    if (baseline === 'last_year') {
      // مقایسه با همین بازه در سال قبل (سال شمسی)
      prevFrom = mFrom.clone().subtract(1, 'jYear');
      prevTo = mTo.clone().subtract(1, 'jYear');
    } else {
      // مقایسه با بازه‌ی قبلی مشابه از لحاظ تعداد روز
      const days = mTo.diff(mFrom, 'days') + 1; // طول بازه جاری
      prevTo = mFrom.clone().subtract(1, 'day');
      prevFrom = prevTo.clone().subtract(days - 1, 'days');
    }

    const currentSummary = await getSalesSummaryAndProfit(
      mFrom.format('jYYYY/jMM/jDD'),
      mTo.format('jYYYY/jMM/jDD')
    );

    const previousSummary = await getSalesSummaryAndProfit(
      prevFrom.format('jYYYY/jMM/jDD'),
      prevTo.format('jYYYY/jMM/jDD')
    );

    const pickAmount = (obj: any): number => {
      const keys = ['totalRevenue', 'revenue', 'totalSales', 'salesAmount', 'total', 'sum'];
      if (!obj) return 0;

      for (const k of keys) {
        if (typeof obj?.[k] === 'number') return obj[k];
      }

      if (Array.isArray(obj) && obj.length) {
        for (const k of keys) {
          if (typeof obj[0]?.[k] === 'number') return obj[0][k];
        }
      }

      return 0;
    };

    const currentProfit =
      typeof (currentSummary as any)?.grossProfit === 'number'
        ? (currentSummary as any).grossProfit
        : 0;

    const previousProfit =
      typeof (previousSummary as any)?.grossProfit === 'number'
        ? (previousSummary as any).grossProfit
        : 0;

    const profitChange =
      previousProfit === 0
        ? null
        : ((currentProfit - previousProfit) / previousProfit) * 100;

    const currentAmount = pickAmount(currentSummary);
    const previousAmount = pickAmount(previousSummary);

    const percentageChange =
      previousAmount === 0
        ? null
        : ((currentAmount - previousAmount) / previousAmount) * 100;

    res.json({
      success: true,
      data: {
        currentAmount,
        previousAmount,
        percentageChange,
        currentProfit,
        previousProfit,
        profitChange,
        currentRange: {
          from: mFrom.format('jYYYY/jMM/jDD'),
          to: mTo.format('jYYYY/jMM/jDD'),
        },
        previousRange: {
          from: prevFrom.format('jYYYY/jMM/jDD'),
          to: prevTo.format('jYYYY/jMM/jDD'),
        },
        baseline: baseline === 'last_year' ? 'last_year' : 'prev',
      },
    });
  } catch (e) {
    next(e);
  }
});

// =====================================================
// 12) تنظیمات + لوگو + بکاپ/ریستور
// =====================================================
app.get('/api/settings', authorizeRole(['Admin']), async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllSettingsAsObject() }); }
  catch (e) { next(e); }
});
app.post('/api/settings', authorizeRole(['Admin']), async (req, res, next) => {
  try {
    const config = req.body || {};
    const settingsArray: SettingItem[] = Object.keys(config).map(key => ({ key, value: config[key] }));
    await updateMultipleSettings(settingsArray);
    res.json({ success: true, message: 'تنظیمات با موفقیت ذخیره شد.' });
  } catch (e) { next(e); }
});

// آپلود لوگو
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `logo${path.extname(file.originalname)}`),
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file: any, cb: FileFilterCallback) => {
    const ok = /jpeg|jpg|png|gif|svg\+xml|webp/.test(file.mimetype) && /jpeg|jpg|png|gif|svg|webp/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('فرمت فایل لوگو نامعتبر است.'));
  }
});
app.post('/api/settings/upload-logo', authorizeRole(['Admin']), logoUpload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'هیچ فایلی برای آپلود انتخاب نشده است.' });
    await updateSetting('store_logo_path', req.file.filename);
    res.json({ success: true, message: 'لوگو با موفقیت آپلود شد.', data: { filePath: req.file.filename } });
  } catch (e) { next(e); }
});

app.get('/api/settings/backup', authorizeRole(['Admin']), (_req, res) => {
  res.download(DB_PATH, `kourosh_dashboard_backup_${new Date().toISOString().split('T')[0]}.db`, err => {
    if (err) res.status(500).json({ success: false, message: 'خطا در دانلود فایل پشتیبان.' });
  });
});

const dbUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file: any, cb: FileFilterCallback) => (/\.db$/i.test(file.originalname) ? cb(null, true) : cb(new Error('فایل پشتیبان باید با فرمت .db باشد.')))
});
app.post('/api/settings/restore', authorizeRole(['Admin']), dbUpload.single('dbfile'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'فایل پشتیبان انتخاب نشده است.' });
  try {
    await closeDbConnection();
    fs.writeFileSync(DB_PATH, req.file.buffer);
    await getDbInstance(true);
    res.json({ success: true, message: 'پایگاه داده با موفقیت بازیابی شد.' });
  } catch (e) { next(e); }
});


// ---- Advanced Backups (list/create/download/delete/restore/test)
app.get('/api/backup/list', authorizeRole(['Admin']), (_req, res, next) => {
  try { res.json({ success: true, data: listBackups() }); } catch (e) { next(e); }
});

app.post('/api/backup/create', authorizeRole(['Admin']), async (_req, res, next) => {
  try {
    const created = await createDbBackup();
    const settings = await getAllSettingsAsObject();
    const keep = Number(settings.backup_retention || 14);
    pruneBackups(keep);
    res.json({ success: true, message: 'بکاپ با موفقیت ایجاد شد.', data: created });
  } catch (e) { next(e); }
});

app.get('/api/backup/download/:file', authorizeRole(['Admin']), (req, res, next) => {
  try {
    const p = getBackupPath(req.params.file);
    res.download(p, req.params.file);
  } catch (e) { next(e); }
});

app.delete('/api/backup/:file', authorizeRole(['Admin']), (req, res, next) => {
  try { deleteBackup(req.params.file); res.json({ success: true, message: 'بکاپ حذف شد.' }); }
  catch (e) { next(e); }
});

app.post('/api/backup/restore', authorizeRole(['Admin']), async (req, res, next) => {
  const { fileName } = req.body || {};
  if (!fileName) return res.status(400).json({ success: false, message: 'نام فایل بکاپ مشخص نیست.' });
  try {
    const p = getBackupPath(fileName);
    await closeDbConnection();
    fs.copyFileSync(p, DB_PATH);
    await getDbInstance(true);
    res.json({ success: true, message: 'بازیابی از بکاپ با موفقیت انجام شد. لطفاً برنامه را ریستارت کنید.' });
  } catch (e) { next(e); }
});

app.post('/api/backup/test-restore', authorizeRole(['Admin']), async (req, res, next) => {
  const { fileName } = req.body || {};
  if (!fileName) return res.status(400).json({ success: false, message: 'نام فایل بکاپ مشخص نیست.' });
  try {
    const result = await testRestoreBackup(fileName);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});


// =====================================================
// 13) کاربران و نقش‌ها
// =====================================================
app.get('/api/roles', authorizeRole(['Admin']), async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllRoles() }); }
  catch (e) { next(e); }
});
app.get('/api/users', authorizeRole(['Admin']), async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllUsersWithRoles() }); }
  catch (e) { next(e); }
});
app.post('/api/users', authorizeRole(['Admin']), async (req, res, next) => {
  try {
    const { username, password, roleId } = req.body || {};
    if (!username || !password || !roleId) return res.status(400).json({ success: false, message: 'اطلاعات کاربر ناقص است.' });
    res.status(201).json({ success: true, data: await addUserToDb(username, password, roleId) });
  } catch (e) { next(e); }
});
app.put('/api/users/:id', authorizeRole(['Admin']), async (req, res, next) => {
  try { res.json({ success: true, data: await updateUserInDb(+req.params.id, req.body as UserUpdatePayload) }); }
  catch (e) { next(e); }
});
app.delete('/api/users/:id', authorizeRole(['Admin']), async (req, res, next) => {
  try { await deleteUserFromDb(+req.params.id); res.json({ success: true, message: 'کاربر با موفقیت حذف شد.' }); }
  catch (e) { next(e); }
});
app.post('/api/users/:id/reset-password', authorizeRole(['Admin']), async (req, res, next) => {
  try {
    const pwd = String(req.body?.password || '');
    if (pwd.length < 6) return res.status(400).json({ success: false, message: 'کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.' });
    await resetUserPasswordInDb(+req.params.id, pwd);
    res.json({ success: true, message: 'کلمه عبور با موفقیت بازنشانی شد.' });
  } catch (e) { next(e); }
});

// =====================================================
// 14) فروش اقساطی
// =====================================================
app.post('/api/installment-sales', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const payload = req.body as InstallmentSalePayload;
    const errors = validateInstallmentSalePayload(payload);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    const data = await addInstallmentSaleToDb(payload);
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'installment_sale', data?.id || null, `ثبت فروش اقساطی #${data?.id ?? ''}`); } catch {}
    }
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
});
app.get('/api/installment-sales', authorizeRole(['Admin','Manager','Salesperson']), async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllInstallmentSalesFromDb() }); }
  catch (e) { next(e); }
});
app.get('/api/installment-sales/:id', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const d = await getInstallmentSaleByIdFromDb(+req.params.id);
    d ? res.json({ success: true, data: d }) : res.status(404).json({ success: false, message: 'فروش اقساطی یافت نشد.' });
  } catch (e) { next(e); }
});

// حذف فروش اقساطی
// Only Admins can delete an installment sale. This will also remove all related payments and checks and return
// the associated phone to inventory. The phone status is set to "مرجوعی اقساطی" in the DB layer.
app.delete('/api/installment-sales/:id', authorizeRole(['Admin']), async (req, res, next) => {
  try {
    await deleteInstallmentSaleFromDb(+req.params.id);
    res.json({ success: true, message: 'فروش اقساطی حذف شد.' });
  } catch (e) {
    next(e);
  }
});
app.put('/api/installment-sales/payment/:id', async (req, res, next) => {
  try { res.json({ success: await updateInstallmentPaymentStatusInDb(+req.params.id, !!req.body?.paid, req.body?.paymentDate), message: 'وضعیت قسط بروزرسانی شد.' }); }
  catch (e) { next(e); }
});
app.put('/api/installment-sales/check/:id', async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!CHECK_STATUSES_OPTIONS_SERVER.includes(status)) return res.status(400).json({ success: false, message: 'وضعیت چک نامعتبر است.' });
    res.json({ success: await updateCheckStatusInDb(+req.params.id, status), message: 'وضعیت چک بروزرسانی شد.' });
  } catch (e) { next(e); }
});
app.post('/api/installment-sales/payment/:paymentId/transaction', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const { amount, date, notes } = req.body || {};
    if (!amount || !date || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'مبلغ و تاریخ پرداخت الزامی است.' });
    const isoDate = moment(date, ['jYYYY/jMM/jDD','YYYY/MM/DD','YYYY-MM-DD', moment.ISO_8601], true).locale('en').format('YYYY-MM-DD');
    if (!moment(isoDate, 'YYYY-MM-DD', true).isValid()) return res.status(400).json({ success: false, message: 'فرمت تاریخ نامعتبر است.' });

    // Detect "final payment" (when all installments in a sale become fully paid)
    const paymentRow = await getAsync('SELECT saleId FROM installment_payments WHERE id = ?', [+req.params.paymentId]);
    const saleIdForFinal = paymentRow?.saleId ? Number(paymentRow.saleId) : null;
    let unpaidBefore = 0;
    if (saleIdForFinal) {
      const r = await getAsync(
        "SELECT COUNT(1) as cnt FROM installment_payments WHERE saleId = ? AND status != 'پرداخت شده'",
        [saleIdForFinal]
      );
      unpaidBefore = Number(r?.cnt || 0);
    }

    const x = await addInstallmentTransactionToDb(+req.params.paymentId, Number(amount), isoDate, notes);

    // Re-check unpaid installments AFTER the transaction; if it transitioned to 0 unpaid, send "INSTALLMENT_COMPLETED" SMS
    let sms: any = undefined;
    let finalizedNow = false;
    let smsAttempted = false;
    let smsSuccess = false;
    let smsError: string | undefined = undefined;
    try {
      if (saleIdForFinal && unpaidBefore > 0) {
        const r2 = await getAsync(
          "SELECT COUNT(1) as cnt FROM installment_payments WHERE saleId = ? AND status != 'پرداخت شده'",
          [saleIdForFinal]
        );
        const unpaidAfter = Number(r2?.cnt || 0);
        if (unpaidAfter === 0) {
          finalizedNow = true;
          const settings = await getAllSettingsAsObject();
          const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();
          const s = await getInstallmentSaleDetailsForSms(saleIdForFinal);
          if (s?.customerPhoneNumber) {
            const recipientNumber = s.customerPhoneNumber;
            const tokens = [s.customerFullName, String(s.saleId), formatPriceForSms(s.totalPrice)];

            // Provider-specific identifiers (pattern-only)
            const meliBodyId = settings.meli_payamak_installment_completed_pattern_id ? Number(settings.meli_payamak_installment_completed_pattern_id) : undefined;
            const kavenegarTemplate = settings.kavenegar_installment_completed_template;
            const smsIrTemplateId = settings.sms_ir_installment_completed_template_id ? Number(settings.sms_ir_installment_completed_template_id) : undefined;
            const ippanelPatternCode = settings.ippanel_installment_completed_pattern_code;
            const telegramTemplate = settings.telegram_installment_completed_message;

            switch (provider) {
              case 'meli_payamak': {
                const username = settings.meli_payamak_username;
                const password = settings.meli_payamak_password;
                if (username && password && meliBodyId) {
                  smsAttempted = true;
                  sms = await sendMeliPayamakPatternSms(recipientNumber, meliBodyId, tokens, username, password);
                  smsSuccess = !!sms;
                }
                break;
              }
              case 'kavenegar': {
                const apiKey = settings.kavenegar_api_key;
                if (apiKey && kavenegarTemplate) {
                  smsAttempted = true;
                  sms = await sendKavenegarPatternSms(recipientNumber, kavenegarTemplate, tokens, apiKey);
                  smsSuccess = !!sms;
                }
                break;
              }
              case 'sms_ir': {
                const apiKey = settings.sms_ir_api_key;
                if (apiKey && smsIrTemplateId) {
                  smsAttempted = true;
                  sms = await sendSmsIrPatternSms(recipientNumber, smsIrTemplateId, tokens, apiKey);
                  smsSuccess = !!sms;
                }
                break;
              }
              case 'ippanel': {
                const tokenAuth = settings.ippanel_token;
                const fromNumber = settings.ippanel_from_number;
                if (tokenAuth && fromNumber && ippanelPatternCode) {
                  smsAttempted = true;
                  sms = await sendIppanelPatternSms(recipientNumber, ippanelPatternCode, tokens, tokenAuth, fromNumber);
                  smsSuccess = !!sms;
                }
                break;
              }
              case 'telegram': {
          setTelegramProxy((settings as any).telegram_proxy);
          const botToken = settings.telegram_bot_token;
          const chatId = settings.telegram_chat_id;
          if (!botToken || !chatId) throw new Error('توکن ربات یا شناسه چت تلگرام در تنظیمات وجود ندارد.');
          if (!telegramTemplate) throw new Error('قالب پیام تلگرام یافت نشد.');
          // Build message by replacing placeholders like {name}, {amount}, {dueDate}, {checkNumber}, {saleId}, {total}, {deviceModel}, {repairId}, ...
          const buildMessage = (template: string, values: Record<string, string>): string => {
            return template.replace(/\{(\w+)\}/g, (_m, p) => (values[p] !== undefined ? values[p] : ''));
          };

          const values: Record<string, string> = {
            name: tokens[0] ?? '',
            amount: '',
            dueDate: '',
            checkNumber: '',
            saleId: '',
            total: '',
            deviceModel: '',
            repairId: String(targetId),
            estimatedCost: '',
            finalCost: '',
          };

          if (eventType === 'INSTALLMENT_REMINDER' || eventType === 'INSTALLMENT_DUE_7' || eventType === 'INSTALLMENT_DUE_3' || eventType === 'INSTALLMENT_DUE_TODAY') {
            values.amount = tokens[1] ?? '';
            values.dueDate = tokens[2] ?? '';
          } else if (eventType === 'INSTALLMENT_COMPLETED') {
            values.saleId = tokens[1] ?? '';
            values.total = tokens[2] ?? '';
          } else if (eventType === 'CHECK_DUE_7' || eventType === 'CHECK_DUE_3' || eventType === 'CHECK_DUE_TODAY') {
            values.checkNumber = tokens[1] ?? '';
            values.dueDate = tokens[2] ?? '';
            values.amount = tokens[3] ?? '';
          } else if (eventType === 'REPAIR_RECEIVED') {
            values.deviceModel = tokens[1] ?? '';
            values.repairId = tokens[2] ?? String(targetId);
          } else if (eventType === 'REPAIR_COST_ESTIMATED') {
            values.deviceModel = tokens[1] ?? '';
            values.estimatedCost = tokens[2] ?? '';
          } else if (eventType === 'REPAIR_READY_FOR_PICKUP') {
            values.deviceModel = tokens[1] ?? '';
            values.finalCost = tokens[2] ?? '';
          }

          const text = buildMessage(telegramTemplate, values);
          smsResult = await sendTelegramMessage(botToken, chatId, text);
          break;
        }
              default:
                break;
            }
          }
        }
      }
    } catch (err) {
      // Never fail the payment request if SMS fails
      smsError = (err && (err as any).message) ? String((err as any).message) : "SMS_FAILED";
      console.error('Failed to auto-send INSTALLMENT_COMPLETED SMS:', err);
    }

    // Log auto-sent final payment SMS (if attempted)
    if (smsAttempted && saleIdForFinal) {
      await insertSmsLog({
        reqUser: req.user,
        provider: String((await getAllSettingsAsObject()).sms_provider || 'meli_payamak').toLowerCase(),
        eventType: 'INSTALLMENT_COMPLETED',
        entityType: 'installment',
        entityId: Number(saleIdForFinal),
        recipient: (sms && (sms as any).to) ? String((sms as any).to) : (await getInstallmentSaleDetailsForSms(saleIdForFinal))?.customerPhoneNumber || '',
        patternId: undefined,
        tokens: undefined,
        success: !!(sms && (sms as any).success),
        response: sms,
        error: smsError,
      });
    }

    res.status(201).json({ success: true, data: x, message: 'پرداخت با موفقیت ثبت شد.', finalizedNow, smsAttempted, smsSuccess, smsError, sms });
  } catch (e) { next(e); }
});
// ویرایش پرداخت جزئی
app.put('/api/installment-sales/payment/transaction/:txId', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const { amount, date, notes } = req.body || {};
    if (!amount || !date || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'مبلغ و تاریخ پرداخت الزامی است.' });
    const isoDate = moment(date, ['jYYYY/jMM/jDD','YYYY/MM/DD','YYYY-MM-DD', moment.ISO_8601], true).locale('en').format('YYYY-MM-DD');
    if (!moment(isoDate, 'YYYY-MM-DD', true).isValid()) return res.status(400).json({ success: false, message: 'فرمت تاریخ نامعتبر است.' });
    const x = await updateInstallmentTransactionInDb(+req.params.txId, Number(amount), isoDate, notes);
    res.json({ success: true, data: x, message: 'پرداخت ویرایش شد.' });
  } catch (e) { next(e); }
});

// حذف پرداخت جزئی
app.delete('/api/installment-sales/payment/transaction/:txId', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const ok = await deleteInstallmentTransactionFromDb(+req.params.txId);
    res.json({ success: ok, message: ok ? 'پرداخت حذف شد.' : 'حذفی انجام نشد.' });
  } catch (e) { next(e); }
});

// =====================================================
// 15) تحلیل هوشمند
// =====================================================
app.get('/api/analysis/profitability', authorizeRole(['Admin']), async (_req, res, next) => {
  try { res.json({ success: true, data: await analyzeProfitability() }); }
  catch (e) { next(e); }
});
app.get('/api/analysis/inventory-velocity', authorizeRole(['Admin']), async (_req, res, next) => {
  try { res.json({ success: true, data: await analyzeInventoryVelocity() }); }
  catch (e) { next(e); }
});
app.get('/api/analysis/purchase-suggestions', authorizeRole(['Admin']), async (_req, res, next) => {
  try { res.json({ success: true, data: await generatePurchaseSuggestions() }); }
  catch (e) { next(e); }
});

// =====================================================
// 11.5) RFM and Cohort Reports & Audit Log (Phase 2)
// The following endpoints serve advanced analytics. Only Admin, Manager and Marketer roles
// are permitted to access RFM and Cohort reports. Audit logs are visible to Admin and Manager.

// Returns the RFM analysis for all customers. Each item includes recency (days since last
// purchase), frequency (number of orders), monetary (total spend), scores (1–3) and the
// composite RFM code. Use this report to identify valuable customer segments.
app.get('/api/reports/rfm', authorizeRole(['Admin','Manager','Marketer']), async (_req, res, next) => {
  try {
    const items = await getRfmReport();
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
});

// Cohort analysis groups customers by the month of their first purchase and tracks how many
// return in subsequent months. The response contains an array of objects where counts[i]
// represents the number of customers in cohort who purchased again i months after their
// first purchase. The totals property indicates the size of the cohort. This can be used
// to visualize retention curves.
app.get('/api/reports/cohort', authorizeRole(['Admin','Manager','Marketer']), async (_req, res, next) => {
  try {
    const items = await getCohortReport();
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
});

// -------------------------------------------------
// Financial overview (Phase P1)
// -------------------------------------------------


// ------------------------------
// Expenses (ثبت هزینه‌ها)
// ------------------------------
app.get('/api/expenses', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const category = String(req.query.category || 'all');
    const data = await listExpensesFromDb({ from: from || undefined, to: to || undefined, category });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.post('/api/expenses', authorizeRole(['Admin','Manager']), async (req, res) => {
  try {
    const actor = req.user ? { userId: req.user.id, username: req.user.username } : undefined;
    const data = await addExpenseToDb(req.body, actor);
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'expense', data?.id, 'ثبت هزینه'); } catch {}
    }
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('خالی') || msg.includes('نامعتبر')) return res.status(400).json({ success: false, message: msg });
    console.error('POST /api/expenses error', e);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.patch('/api/expenses/:id', authorizeRole(['Admin','Manager']), async (req, res) => {
  try {
    const id = +req.params.id;
    const data = await updateExpenseInDb(id, req.body || {});
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'expense', id, 'ویرایش هزینه'); } catch {}
    }
    res.json({ success: true, data });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('خالی') || msg.includes('نامعتبر')) return res.status(400).json({ success: false, message: msg });
    console.error('PATCH /api/expenses error', e);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.delete('/api/expenses/:id', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    await deleteExpenseFromDb(id);
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'delete', 'expense', id, 'حذف هزینه'); } catch {}
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

app.get('/api/reports/expenses-summary', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const data = await getExpensesSummaryFromDb({ from: from || undefined, to: to || undefined });

// ------------------------------
// Recurring Expenses (هزینه‌های تکرارشونده)
// ------------------------------
app.get('/api/recurring-expenses', authorizeRole(['Admin','Manager']), async (_req, res, next) => {
  try {
    const data = await listRecurringExpensesFromDb();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.post('/api/recurring-expenses', authorizeRole(['Admin','Manager']), async (req, res) => {
  try {
    const actor = req.user ? { userId: req.user.id, username: req.user.username } : undefined;
    const data = await addRecurringExpenseToDb(req.body, actor);
    if (req.user) { try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'recurring_expense', data?.id, 'ثبت هزینه تکرارشونده'); } catch {} }
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('خالی') || msg.includes('نامعتبر')) return res.status(400).json({ success:false, message: msg });
    console.error('POST /api/recurring-expenses error', e);
    res.status(500).json({ success:false, message: 'Internal Server Error' });
  }
});

app.patch('/api/recurring-expenses/:id', authorizeRole(['Admin','Manager']), async (req, res) => {
  try {
    const id = +req.params.id;
    const data = await updateRecurringExpenseInDb(id, req.body || {});
    if (req.user) { try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'recurring_expense', id, 'ویرایش هزینه تکرارشونده'); } catch {} }
    res.json({ success: true, data });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('خالی') || msg.includes('نامعتبر')) return res.status(400).json({ success:false, message: msg });
    console.error('PATCH /api/recurring-expenses error', e);
    res.status(500).json({ success:false, message: 'Internal Server Error' });
  }
});

app.delete('/api/recurring-expenses/:id', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const id = +req.params.id;
    await deleteRecurringExpenseFromDb(id);
    if (req.user) { try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'delete', 'recurring_expense', id, 'حذف هزینه تکرارشونده'); } catch {} }
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Run recurring expense now: creates an expense row and advances nextRunDate by one month (clamped by dayOfMonth)

    // Prevent double run for same month (anti double-click)
    const runMonth = moment(String(row.nextRunDate)).format('YYYY-MM');
    const mark = await markRecurringExpenseRunInDb(id, runMonth);
    if (!mark.inserted) {
      return res.status(409).json({ success: false, message: 'برای این ماه قبلاً ثبت شده است.' });
    }

app.post('/api/recurring-expenses/:id/run', authorizeRole(['Admin','Manager']), async (req, res) => {
  try {
    const id = +req.params.id;
    const row: any = await getRecurringExpenseByIdFromDb(id);
    if (!row) return res.status(404).json({ success:false, message: 'یافت نشد.' });
    if (Number(row.isActive) !== 1) return res.status(400).json({ success:false, message: 'این مورد غیرفعال است.' });

    const actor = req.user ? { userId: req.user.id, username: req.user.username } : undefined;

    // create expense for this run date (end of that day in UTC ISO)
    const runIso = moment(String(row.nextRunDate)).endOf('day').toDate().toISOString();
    const created = await addExpenseToDb(
      {
        expenseDate: runIso,
        category: row.category,
        title: `${row.title} (تکرارشونده)`,
        amount: Number(row.amount || 0),
        vendor: row.vendor ?? null,
        notes: row.notes ?? null,
      } as any,
      actor as any
    );

    // advance nextRunDate
    const dayOfMonth = Math.max(1, Math.min(31, Number(row.dayOfMonth || 1)));
    const next = moment(String(row.nextRunDate)).add(1, 'month');
    const dim = next.daysInMonth();
    next.date(Math.min(dayOfMonth, dim));
    const nextRunDate = next.format('YYYY-MM-DD');
    await advanceRecurringExpenseNextRunDateInDb(id, nextRunDate);

    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'expense', created?.id, `ثبت هزینه تکرارشونده #${id}`); } catch {}
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'recurring_expense', id, `Advance nextRunDate => ${nextRunDate}`); } catch {}
    }

    res.json({ success:true, data: { createdExpense: created, nextRunDate } });
  } catch (e: any) {
    console.error('POST /api/recurring-expenses/:id/run error', e);
    res.status(500).json({ success:false, message: 'Internal Server Error' });
  }
});


    res.json({ success: true, data });
  } catch (e) { next(e); }
});



// ------------------------------
// Next-gen Analytics Dashboard
// ------------------------------


// Inventory FIFO report (on-hand + aging)


app.get('/api/reports/inventory-aging-buckets', authorizeRole(['Admin','Manager']), async (_req, res, next) => {
  try {
    const data = await getInventoryAgingBucketsFromDb();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/reports/sales-profit', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const fromQ = String(req.query.from || '');
    const toQ = String(req.query.to || '');
    const from = fromQ ? moment(fromQ) : moment().subtract(30, 'days').startOf('day');
    const to = toQ ? moment(toQ) : moment().endOf('day');
    const fromIso = from.toDate().toISOString();
    const toIso = to.toDate().toISOString();
    const data = await listSalesProfitRowsFifo(fromIso, toIso);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/reports/inventory-fifo', authorizeRole(['Admin','Manager']), async (_req, res, next) => {
  try {
    const data = await getInventoryFifoAgingForAllProducts();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Product margin report (FIFO) for last N months


// Real profit per product (FIFO) within date range




// Export: Sales profit rows (FIFO) -> Excel
app.get('/api/exports/sales-profit.xlsx', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const fromQ = String(req.query.from || '');
    const toQ = String(req.query.to || '');
    const from = fromQ ? moment(fromQ) : moment().subtract(30, 'days').startOf('day');
    const to = toQ ? moment(toQ) : moment().endOf('day');

    const data = await listSalesProfitRowsFifo(from.toDate().toISOString(), to.toDate().toISOString());
    const rows = (data || []).map((r: any) => ({
      'تاریخ': r.date,
      'محصول': r.name,
      'تعداد': r.qty,
      'درآمد': r.revenue,
      'COGS (FIFO)': r.cogs,
      'سود': r.profit,
      'حاشیه (%)': r.marginPct,
    }));
    const buf = await jsonToXlsxBuffer(rows, 'SalesProfit');
    const fileName = `sales_profit_${moment().format('YYYY-MM-DD')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buf);
  } catch (e) { next(e); }
});

// Export: Product margins (FIFO, monthsBack) -> Excel
app.get('/api/exports/product-margins.xlsx', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const monthsBack = Number(req.query.monthsBack || 6);
    const data = await getMonthlyProfitByProductFifo(monthsBack);
    const rows = (data || []).map((r: any) => ({
      'ماه': r.month,
      'محصول': r.name,
      'تعداد': r.qty,
      'درآمد': r.revenue,
      'COGS (FIFO)': r.cogs,
      'سود': r.profit,
      'حاشیه (%)': r.marginPct,
    }));
    const buf = await jsonToXlsxBuffer(rows, 'Margins');
    const fileName = `product_margins_${moment().format('YYYY-MM-DD')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buf);
  } catch (e) { next(e); }
});

// Export: Inventory FIFO (aging layers) -> Excel
app.get('/api/exports/inventory-fifo.xlsx', authorizeRole(['Admin','Manager']), async (_req, res, next) => {
  try {
    const data = await getInventoryFifoAgingForAllProducts();
    const flat: any[] = [];
    for (const p of (data || [])) {
      if (!p.layers || p.layers.length === 0) {
        flat.push({
          'محصول': p.name,
          'موجودی': p.onHandQty,
          'ارزش موجودی': p.onHandValue,
          'میانگین قیمت': p.avgCost,
          'تاریخ لایه': '',
          'سن (روز)': '',
          'باقی‌مانده لایه': '',
          'قیمت خرید لایه': '',
          'ارزش لایه': '',
        });
      } else {
        for (const l of p.layers) {
          flat.push({
            'محصول': p.name,
            'موجودی': p.onHandQty,
            'ارزش موجودی': p.onHandValue,
            'میانگین قیمت': p.avgCost,
            'تاریخ لایه': l.entryDate,
            'سن (روز)': l.ageDays,
            'باقی‌مانده لایه': l.remainingQty,
            'قیمت خرید لایه': l.unitCost,
            'ارزش لایه': l.value,
          });
        }
      }
    }
    const buf = await jsonToXlsxBuffer(flat, 'InventoryFIFO');
    const fileName = `inventory_fifo_${moment().format('YYYY-MM-DD')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buf);
  } catch (e) { next(e); }
});

// Export: Expenses list -> Excel
app.get('/api/exports/expenses.xlsx', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const fromQ = String(req.query.from || '');
    const toQ = String(req.query.to || '');
    const from = fromQ ? moment(fromQ) : moment().startOf('month');
    const to = toQ ? moment(toQ) : moment().endOf('day');
    const category = req.query.category ? String(req.query.category) : undefined;

    const data = await listExpensesFromDb({ from: from.toDate().toISOString(), to: to.toDate().toISOString(), category });
    const rows = (data || []).map((r: any) => ({
      'تاریخ': r.date,
      'عنوان': r.title,
      'دسته‌بندی': r.category,
      'مبلغ': r.amount,
      'توضیحات': r.description,
      'تکرارشونده؟': r.isRecurring ? 'بله' : 'خیر',
    }));

    const buf = await jsonToXlsxBuffer(rows, 'Expenses');
    const fileName = `expenses_${moment().format('YYYY-MM-DD')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buf);
  } catch (e) { next(e); }
});

// Export: Real profit per product (FIFO) -> Excel
app.get('/api/exports/product-profit-real.xlsx', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const fromQ = String(req.query.from || '');
    const toQ = String(req.query.to || '');
    const from = fromQ ? moment(fromQ) : moment().startOf('month');
    const to = toQ ? moment(toQ) : moment().endOf('day');

    const data = await getRealProfitPerProductFifo(from.toDate().toISOString(), to.toDate().toISOString());
    const rows = (data.items || []).map((r: any) => ({
      'محصول': r.name,
      'تعداد فروش': r.qty,
      'درآمد': r.revenue,
      'COGS (FIFO)': r.cogs,
      'سود': r.profit,
      'قیمت خرید (میانگین)': r.avgBuyPrice,
      'قیمت فروش (میانگین)': r.avgSellPrice,
      'سهم از درآمد (%)': r.shareOfRevenue,
      'حاشیه (%)': r.marginPct,
    }));

    const buf = await jsonToXlsxBuffer(rows, 'Profit');
    const fileName = `product_profit_real_${moment().format('YYYY-MM-DD')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buf);
  } catch (e) { next(e); }
});

app.get('/api/reports/product-profit-real', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const fromQ = String(req.query.from || '');
    const toQ = String(req.query.to || '');
    const from = fromQ ? moment(fromQ) : moment().startOf('month');
    const to = toQ ? moment(toQ) : moment().endOf('day');
    const data = await getRealProfitPerProductFifo(from.toDate().toISOString(), to.toDate().toISOString());
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/reports/product-margins', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const monthsBack = Number(req.query.monthsBack || 6);
    const data = await getMonthlyProfitByProductFifo(monthsBack);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/reports/analytics-dashboard', authorizeRole(['Admin','Manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fromQ = String(req.query.from || '');
    const toQ = String(req.query.to || '');
    const from = fromQ ? moment(fromQ) : moment().subtract(30, 'days').startOf('day');
    const to = toQ ? moment(toQ) : moment().endOf('day');

    const fromIso = from.toDate().toISOString();
    const toIso = to.toDate().toISOString();

    // Sales trend (daily) from sales_transactions + installment down payments
    const dailySalesRows = await allAsync(
      `SELECT substr(transactionDate, 1, 10) as day, SUM(totalPrice) as total
         FROM sales_transactions
        WHERE transactionDate >= ? AND transactionDate <= ?
        GROUP BY substr(transactionDate, 1, 10)
        ORDER BY day ASC`,
      [fromIso, toIso]
    );

    const dailyDownRows = await allAsync(
      `SELECT substr(createdAt, 1, 10) as day, SUM(downPayment) as total
         FROM installment_sales
        WHERE createdAt >= ? AND createdAt <= ?
        GROUP BY substr(createdAt, 1, 10)
        ORDER BY day ASC`,
      [fromIso, toIso]
    );

    const dailyMap: Record<string, number> = {};
    (dailySalesRows || []).forEach((r: any) => { dailyMap[String(r.day)] = (dailyMap[String(r.day)] || 0) + Number(r.total || 0); })
    // Debt snapshot (daily total) - store today's snapshot so we can show a real trend
    try {
      const today = moment().format('YYYY-MM-DD');
      const debtNowRow = await getAsync(
        `SELECT SUM(amountDue) as total FROM installment_payments WHERE status != 'پرداخت شده'`,
        []
      );
      const debtNow = Number(debtNowRow?.total || 0);
      await upsertDebtSnapshotInDb(today, debtNow);
    } catch {}

    // Debt trend (daily) from snapshots (fallback to due-month aggregation if no snapshot history)
    const snapFrom = from.clone().format('YYYY-MM-DD');
    const snapTo = to.clone().format('YYYY-MM-DD');
    const snaps = await listDebtSnapshotsFromDb(snapFrom, snapTo);
    const debtDailyTrend = (snaps || []).map((r: any) => ({ date: String(r.snapshotDate), debt: Number(r.totalDebt || 0) }));


    // Profit (approx): revenue - (avg purchase cost * qty). avg cost is weighted average from purchase_items; fallback to products.purchasePrice.
    const costMapRows = await allAsync(
      `SELECT productId, SUM(lineTotal) as totalCost, SUM(quantity) as qty
         FROM purchase_items
        GROUP BY productId`,
      []
    );
    const avgCostById: Record<string, number> = {};
    (costMapRows || []).forEach((r: any) => {
      const q = Number(r.qty || 0);
      const tc = Number(r.totalCost || 0);
      if (q > 0) avgCostById[String(r.productId)] = tc / q;
    });

    // fallback purchasePrice from products
    const productPriceRows = await allAsync(`SELECT id, purchasePrice FROM products`, []);
    const fallbackCost: Record<string, number> = {};
    (productPriceRows || []).forEach((r: any) => { fallbackCost[String(r.id)] = Number(r.purchasePrice || 0); });

    const profitRows = (prodRows || []).map((r: any) => {
      const id = String(r.itemId);
      const qty = Number(r.qty || 0);
      const revenue = Number(r.revenue || 0);
      const unitCost = Number(avgCostById[id] ?? fallbackCost[id] ?? 0);
      const cogs = unitCost * qty;
      const profit = revenue - cogs;
      return { id: Number(r.itemId), name: String(r.itemName), qty, revenue, unitCost, cogs, profit };
    }).sort((a, b) => b.profit - a.profit);

    const bestProductsByProfit = profitRows.slice(0, 5);
    const worstProductsByProfit = profitRows.slice(-5).reverse();

;
    (dailyDownRows || []).forEach((r: any) => { dailyMap[String(r.day)] = (dailyMap[String(r.day)] || 0) + Number(r.total || 0); });

    // fill missing days
    const salesTrend: any[] = [];
    const cursor = from.clone().startOf('day');
    const endDay = to.clone().startOf('day');
    while (cursor.isSameOrBefore(endDay)) {
      const d = cursor.format('YYYY-MM-DD');
      salesTrend.push({ date: d, revenue: Number(dailyMap[d] || 0) });
      cursor.add(1, 'day');
    }

    // Month comparison (last 6 months)
    const months: string[] = [];
    const mcur = moment().startOf('month').subtract(5, 'month');
    for (let i = 0; i < 6; i++) {
      months.push(mcur.format('YYYY-MM'));
      mcur.add(1, 'month');
    }

    const monthComparison: any[] = [];
    for (const m of months) {
      const mStart = moment(m + '-01').startOf('month').toDate().toISOString();
      const mEnd = moment(m + '-01').endOf('month').toDate().toISOString();

      const sRow = await getAsync(
        `SELECT SUM(totalPrice) as total FROM sales_transactions WHERE transactionDate >= ? AND transactionDate <= ?`,
        [mStart, mEnd]
      );
      const dRow = await getAsync(
        `SELECT SUM(downPayment) as total FROM installment_sales WHERE createdAt >= ? AND createdAt <= ?`,
        [mStart, mEnd]
      );
      const revenue = Number(sRow?.total || 0) + Number(dRow?.total || 0);
      monthComparison.push({ month: m, revenue });
    }

    // Debt trend (unpaid installments grouped by due month)
    const debtRows = await allAsync(
      `SELECT substr(dueDate, 1, 7) as month, SUM(amountDue) as total
         FROM installment_payments
        WHERE status != 'پرداخت شده'
        GROUP BY substr(dueDate, 1, 7)
        ORDER BY month ASC
        LIMIT 24`,
      []
    );
    const debtTrend = (debtRows || []).map((r: any) => ({ month: String(r.month), debt: Number(r.total || 0) }));

    // Best/Worst products (inventory itemType)
    const prodRows = await allAsync(
      `SELECT itemId, itemName, SUM(quantity) as qty, SUM(totalPrice) as revenue
         FROM sales_transactions
        WHERE itemType = 'inventory'
        GROUP BY itemId, itemName
        HAVING SUM(quantity) > 0
        ORDER BY revenue DESC`,
      []
    );

    const bestProducts = (prodRows || []).slice(0, 5).map((r: any) => ({ id: Number(r.itemId), name: String(r.itemName), qty: Number(r.qty||0), revenue: Number(r.revenue||0) }));
    const worstProducts = (prodRows || []).slice(-5).map((r: any) => ({ id: Number(r.itemId), name: String(r.itemName), qty: Number(r.qty||0), revenue: Number(r.revenue||0) })).reverse();

    res.json({
      success: true,
      data: {
        range: { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') },
        salesTrend,
        debtTrend,
        monthComparison,
        bestProducts,
        worstProducts,
      }
    });
  } catch (e) { next(e); }
});

app.get('/api/reports/financial-overview', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    // Dates are provided as Shamsi (jYYYY/jMM/jDD) for UI consistency.
    // Defaults: current Shamsi month.
    const nowJ = moment().locale('fa');
    const fromJ = String(req.query.from || nowJ.clone().startOf('jMonth').format('jYYYY/jMM/jDD'));
    const toJ = String(req.query.to || nowJ.clone().endOf('jMonth').format('jYYYY/jMM/jDD'));

    const fromISO = fromShamsiStringToISO(fromJ);
    const toISO = fromShamsiStringToISO(toJ);
    if (!fromISO || !toISO) {
      return res.status(400).json({ success: false, message: 'بازه زمانی نامعتبر است.' });
    }

    // Aggregate sales from sales_orders (invoice system)
    const orders = await allAsync(
      `SELECT so.id, so.transactionDate, so.subtotal, so.discount, so.tax, so.grandTotal,
              COALESCE(SUM(soi.discountPerItem), 0) AS itemsDiscount,
              COALESCE(SUM(CASE
                WHEN soi.itemType='inventory' THEN COALESCE(p.purchasePrice,0) * soi.quantity
                WHEN soi.itemType='phone' THEN COALESCE(ph.purchasePrice,0) * soi.quantity
                ELSE 0 END), 0) AS cogs
         FROM sales_orders so
         LEFT JOIN sales_order_items soi ON so.id = soi.orderId
         LEFT JOIN products p ON soi.itemType='inventory' AND p.id = soi.itemId
         LEFT JOIN phones ph ON soi.itemType='phone' AND ph.id = soi.itemId
        WHERE so.transactionDate BETWEEN ? AND ?
        GROUP BY so.id
        ORDER BY so.id DESC`,
      [fromISO, toISO]
    );


    // فروش محصولات (اقلام inventory) در بازه - بدون گوشی
    const invSalesRow = await getAsync(
      `SELECT COALESCE(SUM((soi.quantity * soi.unitPrice) - COALESCE(soi.discountPerItem,0)),0) AS total
         FROM sales_orders so
         JOIN sales_order_items soi ON so.id = soi.orderId
        WHERE soi.itemType='inventory' AND so.transactionDate BETWEEN ? AND ?`,
      [fromISO, toISO]
    );
    const invSalesTotal = Number(invSalesRow?.total) || 0;

    let ordersCount = 0;
    let subtotal = 0;
    let discounts = 0;
    let netSalesBeforeTax = 0;
    let taxAmount = 0;
    let totalSales = 0;
    let totalCogs = 0;
    let grossProfit = 0;
    let productSalesTotal = 0; // مجموع فروش محصولات (اقلام inventory) بدون گوشی

    for (const o of orders) {
      ordersCount += 1;
      const oSubtotal = Number(o.subtotal) || 0;
      const oGlobalDiscount = Number(o.discount) || 0;
      const oItemsDiscount = Number(o.itemsDiscount) || 0;
      const oCogs = Number(o.cogs) || 0;
      const oGrandTotal = Number(o.grandTotal) || 0;

      const oNet = Math.max(0, oSubtotal - oGlobalDiscount - oItemsDiscount);
      const oTax = Math.max(0, oGrandTotal - oNet);
      const oProfit = oNet - oCogs;

      subtotal += oSubtotal;
      discounts += (oGlobalDiscount + oItemsDiscount);
      netSalesBeforeTax += oNet;
      taxAmount += oTax;
      totalSales += oGrandTotal;
      totalCogs += oCogs;
      grossProfit += oProfit;
    }

    // Purchases total cost in range
    const purchasesRow = await getAsync(
      `SELECT COALESCE(SUM(totalCost), 0) AS total FROM purchases
        WHERE substr(purchaseDate, 1, 10) BETWEEN ? AND ?`,
      [fromISO, toISO]
    );
    const purchasesTotal = Number(purchasesRow?.total) || 0;

    // Refunds (sales_returns) in range
    const refundsRow = await getAsync(
      `SELECT COALESCE(SUM(refundAmount), 0) AS total FROM sales_returns
        WHERE substr(createdAt, 1, 10) BETWEEN ? AND ?`,
      [fromISO, toISO]
    );
    const refundsTotal = Number(refundsRow?.total) || 0;

    // Inventory value snapshot
    const invRow = await getAsync(
      `SELECT COALESCE(SUM(stock_quantity * purchasePrice), 0) AS total FROM products`,
      []
    );
    const phonesRow = await getAsync(
      `SELECT COALESCE(SUM(purchasePrice), 0) AS total FROM phones
        WHERE status IN ('موجود در انبار','مرجوعی','مرجوعی اقساطی')`,
      []
    );
    const inventoryValue = (Number(invRow?.total) || 0) + (Number(phonesRow?.total) || 0);

    // Receivables / Payables (current balances)
    const debtors = await getDebtorsList();
    const creditors = await getCreditorsList();
    const receivables = debtors.reduce((s, d) => s + (Number((d as any).balance) || 0), 0);
    const payables = creditors.reduce((s, c) => s + (Number((c as any).balance) || 0), 0);

    res.json({
      success: true,
      data: {
        range: { from: fromJ, to: toJ, fromISO, toISO },
        sales: {
          ordersCount,
          subtotal,
          discounts,
          netSalesBeforeTax,
          taxAmount,
          totalSales,
          refundsTotal,
        },
        profit: { grossProfit, cogs: totalCogs },
        purchases: { total: purchasesTotal },
        workingCapital: { receivables, payables },
        inventory: { inventoryValue },
        top: {
          debtors: debtors.slice(0, 10),
          creditors: creditors.slice(0, 10),
        },
      },
    });


// -----------------------------------------------------
// Reports: Financial Overview Drill-down (KPI -> invoices)
// -----------------------------------------------------
app.get('/api/reports/financial-overview/drilldown', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const nowJ = moment().locale('fa');
    const fromJ = String(req.query.from || nowJ.clone().startOf('jMonth').format('jYYYY/jMM/jDD'));
    const toJ = String(req.query.to || nowJ.clone().endOf('jMonth').format('jYYYY/jMM/jDD'));
    const kpi = String(req.query.kpi || 'totalSales');

    const fromISO = fromShamsiStringToISO(fromJ);
    const toISO = fromShamsiStringToISO(toJ);
    if (!fromISO || !toISO) return res.status(400).json({ success: false, message: 'بازه زمانی نامعتبر است.' });

    // Base list of orders in range
    const orders = await allAsync(
      `SELECT so.id, so.transactionDate, so.grandTotal, so.subtotal, so.discount, so.tax,
              c.fullName AS customerName, c.phoneNumber AS customerPhone
         FROM sales_orders so
         LEFT JOIN customers c ON c.id = so.customerId
        WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        ORDER BY date(so.transactionDate) DESC, so.id DESC`,
      [fromISO, toISO]
    );

    if (kpi === 'totalSales') {
      return res.json({ success: true, data: orders.map((o:any) => ({
        orderId: o.id,
        date: o.transactionDate,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        amount: Number(o.grandTotal) || 0,
        profit: null,
      }))});
    }

    // Fetch items for those orders
    const orderIds = orders.map((o:any)=>o.id);
    if (orderIds.length === 0) return res.json({ success: true, data: [] });

    const inClause = orderIds.map(()=>'?').join(',');
    const items = await allAsync(
      `SELECT orderId, itemType, itemId, quantity, unitPrice, totalPrice, COALESCE(discountPerItem,0) AS discountPerItem
         FROM sales_order_items
        WHERE orderId IN (${inClause})`,
      orderIds
    );

    // Fetch costs for inventory and phones
    const invIds = Array.from(new Set(items.filter((i:any)=>i.itemType==='inventory').map((i:any)=>i.itemId)));
    const phoneIds = Array.from(new Set(items.filter((i:any)=>i.itemType==='phone').map((i:any)=>i.itemId)));

    const [invRows, phoneRows] = await Promise.all([
      invIds.length ? allAsync(`SELECT id, purchasePrice FROM products WHERE id IN (${invIds.map(()=>'?').join(',')})`, invIds) : Promise.resolve([]),
      phoneIds.length ? allAsync(`SELECT id, purchasePrice FROM phones WHERE id IN (${phoneIds.map(()=>'?').join(',')})`, phoneIds) : Promise.resolve([]),
    ]);

    const invCost = new Map<number, number>(invRows.map((r:any)=>[Number(r.id), Number(r.purchasePrice)||0]));
    const phoneCost = new Map<number, number>(phoneRows.map((r:any)=>[Number(r.id), Number(r.purchasePrice)||0]));

    // Aggregate per order
    const agg = new Map<number, { productSales: number; profit: number }>();
    for (const it of items as any[]) {
      const oid = Number(it.orderId);
      const qty = Number(it.quantity)||0;
      const revenue = Number(it.totalPrice)||0;
      let cost = 0;
      if (it.itemType === 'inventory') cost = (invCost.get(Number(it.itemId))||0) * qty;
      else if (it.itemType === 'phone') cost = (phoneCost.get(Number(it.itemId))||0) * qty;

      const cur = agg.get(oid) || { productSales: 0, profit: 0 };
      if (it.itemType === 'inventory') cur.productSales += revenue;
      cur.profit += (revenue - cost);
      agg.set(oid, cur);
    }

    if (kpi === 'productSalesTotal') {
      const out = orders.map((o:any)=> {
        const a = agg.get(Number(o.id));
        return a && a.productSales>0 ? {
          orderId: o.id,
          date: o.transactionDate,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          amount: a.productSales,
          profit: null,
        } : null;
      }).filter(Boolean);
      return res.json({ success: true, data: out });
    }

    if (kpi === 'grossProfit') {
      const out = orders.map((o:any)=> {
        const a = agg.get(Number(o.id));
        return a ? {
          orderId: o.id,
          date: o.transactionDate,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          amount: Number(o.grandTotal)||0,
          profit: a.profit,
        } : null;
      }).filter(Boolean).sort((a:any,b:any)=>(b.profit||0)-(a.profit||0));
      return res.json({ success: true, data: out });
    }

    return res.status(400).json({ success: false, message: 'kpi نامعتبر است.' });
  } catch (e) { next(e); }
});

  } catch (e) { next(e); }
});

// ------------------------------
// فروش محصولات (بدون گوشی) - Summary + Details
// ------------------------------


// ------------------------------
// گزارش پیگیری‌ها (CRM Followups)
// ------------------------------
app.get('/api/reports/followups', authorizeRole(['Admin','Manager','Salesperson','Marketer']), async (req, res, next) => {
  try {
    const status = String(req.query.status || 'open'); // open|closed|all
    const from = String(req.query.from || ''); // ISO date (start)
    const to = String(req.query.to || '');     // ISO date (end)
    const owner = String(req.query.owner || ''); // createdByUsername contains
    const dateField = String(req.query.dateField || 'next'); // next|created

    const allowedStatus = ['open', 'closed', 'all'];
    if (!allowedStatus.includes(status)) return res.status(400).json({ success: false, message: 'status نامعتبر است.' });

        const noDue = String(req.query.noDue || '') === '1'; // فقط موارد بدون موعد
const where: string[] = [];
    const params: any[] = [];

    if (status !== 'all') {
      where.push("cf.status = ?");
      params.push(status);
    }

    if (owner) {
      where.push("(cf.createdByUsername LIKE ?)");
      params.push(`%${owner}%`);
    }

    if (noDue) {
      where.push('cf.nextFollowupDate IS NULL');
    } else if (dateField === 'created') {
      if (from) { where.push("cf.createdAt >= ?"); params.push(from); }
      if (to) { where.push("cf.createdAt <= ?"); params.push(to); }
    } else {
      // next followup date filter
      where.push("cf.nextFollowupDate IS NOT NULL");
      if (from) { where.push("cf.nextFollowupDate >= ?"); params.push(from); }
      if (to) { where.push("cf.nextFollowupDate <= ?"); params.push(to); }
    }

    const whereSql = where.length ? ("WHERE " + where.join(" AND ")) : "";

    const rows = await allAsync(
      `SELECT cf.*,
              c.fullName AS customerName,
              c.phoneNumber AS customerPhone
         FROM customer_followups cf
         JOIN customers c ON c.id = cf.customerId
         ${whereSql}
        ORDER BY (CASE WHEN cf.nextFollowupDate IS NULL THEN 1 ELSE 0 END),
                 cf.nextFollowupDate ASC,
                 cf.createdAt DESC,
                 cf.id DESC
        LIMIT 1000`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});
app.get('/api/reports/product-sales', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const nowJ = moment().locale('fa');
    const fromJ = String(req.query.from || nowJ.clone().startOf('jMonth').format('jYYYY/jMM/jDD'));
    const toJ = String(req.query.to || nowJ.clone().endOf('jMonth').format('jYYYY/jMM/jDD'));

    const fromISO = fromShamsiStringToISO(fromJ);
    const toISO = fromShamsiStringToISO(toJ);
    if (!fromISO || !toISO) return res.status(400).json({ success: false, message: 'بازه زمانی نامعتبر است.' });

    const totalRow = await getAsync(
      `SELECT COALESCE(SUM((soi.quantity * soi.unitPrice) - COALESCE(soi.discountPerItem,0)),0) AS total
         FROM sales_orders so
         JOIN sales_order_items soi ON so.id = soi.orderId
        WHERE soi.itemType='inventory' AND so.transactionDate BETWEEN ? AND ?`,
      [fromISO, toISO]
    );

    const byDay = await allAsync(
      `SELECT DATE(so.transactionDate) AS day,
              COALESCE(SUM((soi.quantity * soi.unitPrice) - COALESCE(soi.discountPerItem,0)),0) AS total
         FROM sales_orders so
         JOIN sales_order_items soi ON so.id = soi.orderId
        WHERE soi.itemType='inventory' AND so.transactionDate BETWEEN ? AND ?
        GROUP BY DATE(so.transactionDate)
        ORDER BY DATE(so.transactionDate) ASC`,
      [fromISO, toISO]
    );

    res.json({
      success: true,
      data: {
        from: fromJ,
        to: toJ,
        total: Number(totalRow?.total || 0),
        byDay,
      },
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/reports/product-sales/details', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const nowJ = moment().locale('fa');
    const fromJ = String(req.query.from || nowJ.clone().startOf('jMonth').format('jYYYY/jMM/jDD'));
    const toJ = String(req.query.to || nowJ.clone().endOf('jMonth').format('jYYYY/jMM/jDD'));

    const fromISO = fromShamsiStringToISO(fromJ);
    const toISO = fromShamsiStringToISO(toJ);
    if (!fromISO || !toISO) return res.status(400).json({ success: false, message: 'بازه زمانی نامعتبر است.' });

    const rows = await allAsync(
      `SELECT so.id AS orderId,
              so.transactionDate,
              COALESCE(so.grandTotal,0) AS invoiceGrandTotal,
              soi.itemId AS productId,
              COALESCE(p.name, '—') AS productName,
              soi.quantity,
              soi.unitPrice,
              COALESCE(soi.discountPerItem,0) AS discountPerItem,
              ((soi.quantity * soi.unitPrice) - COALESCE(soi.discountPerItem,0)) AS lineTotal
         FROM sales_orders so
         JOIN sales_order_items soi ON so.id = soi.orderId
         LEFT JOIN products p ON p.id = soi.itemId
        WHERE soi.itemType='inventory'
          AND so.transactionDate BETWEEN ? AND ?
        ORDER BY so.transactionDate DESC, so.id DESC`,
      [fromISO, toISO]
    );

    res.json({
      success: true,
      data: { from: fromJ, to: toJ, rows },
    });
  } catch (err) {
    next(err);
  }
});


// -------------------------------------------------
// Installments calendar (Phase P1)
// -------------------------------------------------
app.get('/api/reports/installments-calendar', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const nowJ = moment().locale('fa');
    const fromJ = String(req.query.from || nowJ.clone().startOf('jMonth').format('jYYYY/jMM/jDD'));
    const toJ = String(req.query.to || nowJ.clone().endOf('jMonth').format('jYYYY/jMM/jDD'));

    // Basic validation
    const fromIso = fromShamsiStringToISO(fromJ);
    const toIso = fromShamsiStringToISO(toJ);
    if (!fromIso || !toIso) {
      return res.status(400).json({ success: false, message: 'بازه زمانی نامعتبر است.' });
    }

    const payments = await allAsync(
      `SELECT ip.id AS id, ip.saleId, ip.dueDate, ip.amountDue AS amount, ip.status,
              isale.customerId, c.fullName AS customerFullName, c.phoneNumber AS customerPhoneNumber
         FROM installment_payments ip
         JOIN installment_sales isale ON ip.saleId = isale.id
         JOIN customers c ON isale.customerId = c.id
        WHERE ip.dueDate BETWEEN ? AND ?
        ORDER BY ip.dueDate ASC`,
      [fromJ, toJ]
    );

    const checks = await allAsync(
      `SELECT ic.id AS id, ic.saleId, ic.checkNumber, ic.bankName, ic.dueDate, ic.amount, ic.status,
              isale.customerId, c.fullName AS customerFullName, c.phoneNumber AS customerPhoneNumber
         FROM installment_checks ic
         JOIN installment_sales isale ON ic.saleId = isale.id
         JOIN customers c ON isale.customerId = c.id
        WHERE ic.dueDate BETWEEN ? AND ?
        ORDER BY ic.dueDate ASC`,
      [fromJ, toJ]
    );

    const items = [
      ...payments.map((p: any) => ({
        type: 'payment',
        id: p.id,
        saleId: p.saleId,
        dueDate: p.dueDate,
        amount: p.amount,
        status: p.status,
        customerId: p.customerId,
        customerFullName: p.customerFullName,
        customerPhoneNumber: p.customerPhoneNumber,
      })),
      ...checks.map((c: any) => ({
        type: 'check',
        id: c.id,
        saleId: c.saleId,
        dueDate: c.dueDate,
        amount: c.amount,
        status: c.status,
        checkNumber: c.checkNumber,
        bankName: c.bankName,
        customerId: c.customerId,
        customerFullName: c.customerFullName,
        customerPhoneNumber: c.customerPhoneNumber,
      })),
    ].sort((a: any, b: any) => String(a.dueDate).localeCompare(String(b.dueDate)));

    res.json({ success: true, data: { range: { from: fromJ, to: toJ }, items } });
  } catch (e) { next(e); }
});

// Audit log endpoint: returns a list of recent audit entries. Supports pagination via
// query parameters 'limit' and 'offset'. Only Admin and Manager roles can access logs.
app.get('/api/audit-log', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
    const logs = await getAuditLogs(limit, offset);
    res.json({ success: true, data: logs });
  } catch (e) { next(e); }
});


// -----------------------------------------------------
// Reports: Saved Filters (per-user, per-report)
// -----------------------------------------------------
app.get('/api/reports/saved-filters', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const reportKey = String(req.query.reportKey || '').trim();
    if (!reportKey) return res.status(400).json({ success: false, message: 'reportKey الزامی است.' });

    const userId = Number((req as any).user?.id || (req as any).currentUser?.id || (req as any).authUser?.id);
    if (!userId) return res.status(401).json({ success: false, message: 'احراز هویت نامعتبر است.' });

    const data = await listReportSavedFilters(userId, reportKey);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.post('/api/reports/saved-filters', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const { reportKey, name, filters } = req.body || {};
    if (!reportKey || !name) return res.status(400).json({ success: false, message: 'reportKey و name الزامی است.' });

    const userId = Number((req as any).user?.id || (req as any).currentUser?.id || (req as any).authUser?.id);
    if (!userId) return res.status(401).json({ success: false, message: 'احراز هویت نامعتبر است.' });

    const row = await createOrReplaceReportSavedFilter(userId, String(reportKey), String(name), filters);
    res.status(201).json({ success: true, data: row });
  } catch (e) { next(e); }
});

app.delete('/api/reports/saved-filters/:id', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = Number((req as any).user?.id || (req as any).currentUser?.id || (req as any).authUser?.id);
    if (!userId) return res.status(401).json({ success: false, message: 'احراز هویت نامعتبر است.' });

    const data = await deleteReportSavedFilter(userId, id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});


// -----------------------------------------------------
// Reports: Scheduling (Telegram/SMS) - CEO summaries
// -----------------------------------------------------
type ReportScheduleRow = {
  id: number;
  userId: number;
  reportKey: string;
  cronExpr: string; // e.g. "0 9 * * *" (09:00 daily)
  channel: 'telegram' | 'sms';
  isEnabled: number;
  createdAt: string;
};

const ensureReportSchedulesTable = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS report_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      reportKey TEXT NOT NULL,
      cronExpr TEXT NOT NULL,
      payloadJson TEXT,
      channel TEXT NOT NULL DEFAULT 'telegram',
      isEnabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Lightweight migration for older DBs that were created before payloadJson existed
  try {
    await runAsync(`ALTER TABLE report_schedules ADD COLUMN payloadJson TEXT`);
  } catch {
    // ignore (already exists)
  }
};

const listReportSchedules = async (userId: number) => {
  await ensureReportSchedulesTable();
  return allAsync(`SELECT * FROM report_schedules WHERE userId = ? ORDER BY id DESC`, [userId]);
};

const createReportSchedule = async (userId: number, row: { reportKey: string; cronExpr: string; payloadJson?: any; channel?: string }) => {
  await ensureReportSchedulesTable();
  const reportKey = String(row.reportKey || '').trim();
  const cronExpr = String(row.cronExpr || '').trim();
  const payloadJson = row.payloadJson != null ? JSON.stringify(row.payloadJson) : null;
  const channel = (row.channel === 'sms' ? 'sms' : 'telegram');
  if (!reportKey || !cronExpr) throw new Error('reportKey و cronExpr الزامی است.');

  // Validate cron (node-cron will throw if invalid)
  if (!cron.validate(cronExpr)) throw new Error('فرمت cronExpr نامعتبر است.');

  const r = await runAsync(
    `INSERT INTO report_schedules (userId, reportKey, cronExpr, payloadJson, channel, isEnabled) VALUES (?,?,?,?,?,1)`,
    [userId, reportKey, cronExpr, payloadJson, channel]
  );
  return r?.lastID;
};

const deleteReportSchedule = async (userId: number, id: number) => {
  await ensureReportSchedulesTable();
  await runAsync(`DELETE FROM report_schedules WHERE id = ? AND userId = ?`, [id, userId]);
};

// Scheduler runtime
const scheduleTasks = new Map<number, any>();

const buildScheduledTelegramReportText = async (reportKey: string, payloadJsonRaw?: any) => {
  // payloadJson is optional; default range = today (Shamsi)
  let payload: any = null;
  try {
    if (typeof payloadJsonRaw === 'string' && payloadJsonRaw.trim()) payload = JSON.parse(payloadJsonRaw);
    else if (payloadJsonRaw && typeof payloadJsonRaw === 'object') payload = payloadJsonRaw;
  } catch {
    payload = null;
  }

  const nowJ = moment().locale('fa');
  const nowText = nowJ.format('jYYYY/jMM/jDD HH:mm');
  const fromJ = String(payload?.range?.fromJ || payload?.range?.from || nowJ.clone().format('jYYYY/jMM/jDD'));
  const toJ = String(payload?.range?.toJ || payload?.range?.to || nowJ.clone().format('jYYYY/jMM/jDD'));

  // ISO range (useful for some advanced reports)
  const fromISO = String(payload?.range?.fromISO || fromShamsiStringToISO(fromJ) || '');
  const toISO = String(payload?.range?.toISO || fromShamsiStringToISO(toJ) || '');

  const moneyFa = (n: any) => `${(Number(n) || 0).toLocaleString('fa-IR')} تومان`;

  const settings = await getAllSettingsAsObject();
  const baseUrl = String((settings as any).app_base_url || '').trim();
  const keyPath = String(reportKey || '').trim();

  const isFinancialOverview = keyPath === 'financial-overview';
  const fromParam = isFinancialOverview ? 'from' : 'fromDate';
  const toParam = isFinancialOverview ? 'to' : 'toDate';

  const link =
    baseUrl && keyPath
      ? `${baseUrl}/#/reports/${encodeURIComponent(keyPath)}?${fromParam}=${encodeURIComponent(fromJ)}&${toParam}=${encodeURIComponent(toJ)}`
      : '';

  // 1) Sales summary (Sales + Profit) – executive-friendly numbers
  if (keyPath === 'sales-summary') {
    const data = await getSalesSummaryAndProfit(fromJ, toJ);
    const tplKey = 'telegram_tpl_reports_sales-summary';
    const customTpl = String((settings as any)[tplKey] || '').trim();

    const vars = {
      title: 'گزارش فروش و سود',
      fromDate: fromJ,
      toDate: toJ,
      totalRevenue: Number((data as any)?.totalRevenue) || 0,
      grossProfit: Number((data as any)?.grossProfit) || 0,
      totalTransactions: Number((data as any)?.totalTransactions) || 0,
      averageSaleValue: Number((data as any)?.averageSaleValue) || 0,
      link,
      // ✅ Telegram-facing timestamps should be Shamsi like the rest of the app
      now: nowText,
    };

    const defaultText =
`📊 گزارش خودکار | فروش و سود
📅 از ${fromJ} تا ${toJ}

💰 فروش کل: ${moneyFa(vars.totalRevenue)}
📈 سود ناخالص: ${moneyFa(vars.grossProfit)}
🧾 تعداد فاکتور/تراکنش: ${(vars.totalTransactions).toLocaleString('fa-IR')}
💳 میانگین فروش: ${moneyFa(vars.averageSaleValue)}
${link ? `\n🔗 ${link}` : ''}`;

    return customTpl ? safeReplaceTemplate(customTpl, vars) : defaultText;
  }

  // 2) Financial overview – summary using invoices table (sales_orders)
  if (isFinancialOverview) {
    const fo = await (async () => {
      const ordersCountRow = await getAsync(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(grandTotal),0) AS totalSales
           FROM sales_orders
          WHERE date(transactionDate) BETWEEN date(?) AND date(?)`,
        [fromISO, toISO]
      );
      const productSalesRow = await getAsync(
        `SELECT COALESCE(SUM(soi.totalPrice),0) AS productSales
           FROM sales_order_items soi
           JOIN sales_orders so ON so.id = soi.orderId
          WHERE soi.itemType='inventory'
            AND date(so.transactionDate) BETWEEN date(?) AND date(?)`,
        [fromISO, toISO]
      );
      const items = await allAsync(
        `SELECT soi.itemType, soi.itemId, soi.quantity, soi.totalPrice
           FROM sales_order_items soi
           JOIN sales_orders so ON so.id = soi.orderId
          WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)`,
        [fromISO, toISO]
      );
      const invIds = Array.from(new Set((items as any[]).filter((i:any)=>i.itemType==='inventory').map((i:any)=>i.itemId)));
      const phoneIds = Array.from(new Set((items as any[]).filter((i:any)=>i.itemType==='phone').map((i:any)=>i.itemId)));
      const [invRows, phoneRows] = await Promise.all([
        invIds.length ? allAsync(`SELECT id, purchasePrice FROM products WHERE id IN (${invIds.map(()=>'?').join(',')})`, invIds) : Promise.resolve([]),
        phoneIds.length ? allAsync(`SELECT id, purchasePrice FROM phones WHERE id IN (${phoneIds.map(()=>'?').join(',')})`, phoneIds) : Promise.resolve([]),
      ]);
      const invCost = new Map<number, number>((invRows as any[]).map((r:any)=>[Number(r.id), Number(r.purchasePrice)||0]));
      const phoneCost = new Map<number, number>((phoneRows as any[]).map((r:any)=>[Number(r.id), Number(r.purchasePrice)||0]));
      let profit=0;
      for (const it of items as any[]) {
        const qty = Number(it.quantity)||0;
        const rev = Number(it.totalPrice)||0;
        let cost=0;
        if (it.itemType==='inventory') cost=(invCost.get(Number(it.itemId))||0)*qty;
        if (it.itemType==='phone') cost=(phoneCost.get(Number(it.itemId))||0)*qty;
        profit += (rev - cost);
      }
      return {
        ordersCount: Number((ordersCountRow as any)?.cnt)||0,
        totalSales: Number((ordersCountRow as any)?.totalSales)||0,
        productSales: Number((productSalesRow as any)?.productSales)||0,
        grossProfit: profit,
      };
    })();

    const tplKey = 'telegram_tpl_reports_financial-overview';
    const customTpl = String((settings as any)[tplKey] || '').trim();

    const vars = {
      title: 'نمای کلی مالی',
      fromDate: fromJ,
      toDate: toJ,
      sumSales: fo.totalSales,
      invoiceCount: fo.ordersCount,
      productSales: fo.productSales,
      grossProfit: Math.round(fo.grossProfit),
      link,
      now: nowText,
    };

    const defaultText =
`📊 گزارش خودکار | نمای کلی مالی
📅 از ${fromJ} تا ${toJ}

🧾 تعداد فاکتور: ${fo.ordersCount.toLocaleString('fa-IR')}
💰 فروش کل: ${moneyFa(fo.totalSales)}
📦 فروش محصولات (بدون گوشی): ${moneyFa(fo.productSales)}
📈 سود ناخالص تقریبی: ${moneyFa(Math.round(fo.grossProfit))}
${link ? `\n🔗 ${link}` : ''}`;

    return customTpl ? safeReplaceTemplate(customTpl, vars) : defaultText;
  }

  // 3) Fallback: link-only (works for ALL reports)
  const niceTitle = (keyPath || 'گزارش').replace(/[-_/]/g, ' ');
  const tplKey = `telegram_tpl_reports_${keyPath}`;
  const customTpl = String((settings as any)[tplKey] || '').trim();

  const vars = {
    title: niceTitle,
    reportKey: keyPath,
    fromDate: fromJ,
    toDate: toJ,
    link,
    now: nowText,
  };

  const defaultText =
`📊 گزارش خودکار | ${niceTitle}
📅 از ${fromJ} تا ${toJ}
${link ? `\n🔗 ${link}` : ''}`;

  return customTpl ? safeReplaceTemplate(customTpl, vars) : defaultText;
};

const startReportSchedulers = async () => {
  await ensureReportSchedulesTable();
  // Respect local timezone for cron (defaults to Asia/Tehran).
  // This matters a lot when the server is running in UTC.
  let schedulerTz = 'Asia/Tehran';
  try {
    const s = await getAllSettingsAsObject();
    schedulerTz = String((s as any).report_scheduler_timezone || (s as any).backup_timezone || (s as any).app_timezone || 'Asia/Tehran');
  } catch {}

  const rows = await allAsync(`SELECT * FROM report_schedules WHERE isEnabled = 1`);
  for (const r of rows as any[]) {
    const id = Number(r.id);
    if (scheduleTasks.has(id)) continue;
    if (!cron.validate(String(r.cronExpr))) continue;

    const task = cron.schedule(String(r.cronExpr), async () => {
      try {
        const settings = await getAllSettingsAsObject();
        // ✅ scheduled jobs also need proxy (manual/test endpoints set it, but cron callbacks didn't)
        setTelegramProxy((settings as any).telegram_proxy);

        if (String(r.channel) === 'telegram') {
          const okType = await isTopicTypeEnabled('reports', String(r.reportKey));
          if (!okType) return;
          const { botToken, chatIds } = await getTelegramTargetsForTopic('reports');
          if (botToken && chatIds.length) {
            const text = await buildScheduledTelegramReportText(String(r.reportKey), (r as any).payloadJson);

            // Send per-chat to get real success/failure (sendTelegramMessages didn't validate TelegramResult.success)
            let sent = 0;
            const results: any[] = [];
            for (const cid of chatIds) {
              const rr = await sendTelegramMessage(botToken, cid, text);
              results.push({ chatId: cid, success: !!(rr as any)?.success, message: (rr as any)?.message });
              if ((rr as any)?.success) sent++;
            }

            // Unified log viewer uses sms_logs even for telegram.
            try {
              await insertSmsLog({
                provider: 'telegram',
                eventType: `REPORT_SCHEDULE:${String(r.reportKey)}`,
                entityType: 'report_schedule',
                entityId: id,
                recipient: chatIds.join(', '),
                patternId: 'TELEGRAM_REPORT_SCHEDULE',
                tokens: [String(r.reportKey), String(r.cronExpr)],
                success: sent > 0,
                response: { scheduleId: id, reportKey: String(r.reportKey), sent, total: chatIds.length, results },
                error: sent > 0 ? undefined : 'No successful telegram deliveries',
              });
            } catch {}
          }
        } else if (String(r.channel) === 'sms') {
          // SMS scheduling requires provider-specific templates; left as a safe no-op by default.
        }
      } catch (e) {
        // swallow scheduler errors to avoid crashing the process
        console.error('Report scheduler error:', e);
      }
    }, { timezone: schedulerTz });

    scheduleTasks.set(id, task);
  }
};

app.get('/api/reports/schedules', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const userId = Number((req as any).user?.id || (req as any).currentUser?.id || (req as any).authUser?.id);
    if (!userId) return res.status(401).json({ success: false, message: 'احراز هویت نامعتبر است.' });
    const data = await listReportSchedules(userId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.post('/api/reports/schedules', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const userId = Number((req as any).user?.id || (req as any).currentUser?.id || (req as any).authUser?.id);
    if (!userId) return res.status(401).json({ success: false, message: 'احراز هویت نامعتبر است.' });

    const { reportKey, cronExpr, payloadJson, channel } = req.body || {};
    const id = await createReportSchedule(userId, { reportKey, cronExpr, payloadJson, channel });
    // refresh schedulers
    await startReportSchedulers();

    res.json({ success: true, id });
  } catch (e) { next(e); }
});

app.delete('/api/reports/schedules/:id', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const userId = Number((req as any).user?.id || (req as any).currentUser?.id || (req as any).authUser?.id);
    if (!userId) return res.status(401).json({ success: false, message: 'احراز هویت نامعتبر است.' });

    const id = Number(req.params.id);
    await deleteReportSchedule(userId, id);
    // stop task if exists
    const t = scheduleTasks.get(id);
    if (t) { try { t.stop(); } catch {} scheduleTasks.delete(id); }
    res.json({ success: true });
  } catch (e) { next(e); }
});

// -----------------------------------------------------
// Reports: Send to Telegram NOW (manual button on all report pages)
// -----------------------------------------------------
app.post('/api/reports/send-telegram', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const userId = Number((req as any).user?.id || (req as any).currentUser?.id || (req as any).authUser?.id);
    if (!userId) return res.status(401).json({ success: false, message: 'احراز هویت نامعتبر است.' });

    const { reportKey, payloadJson } = req.body || {};
    const key = String(reportKey || '').trim();
    if (!key) return res.status(400).json({ success: false, message: 'reportKey الزامی است.' });

    const settings = await getAllSettingsAsObject();
    setTelegramProxy((settings as any).telegram_proxy);

    const { botToken, chatIds } = await getTelegramTargetsForTopic('reports');
    if (!botToken) return res.status(400).json({ success: false, message: 'توکن تلگرام تنظیم نشده است.' });
    if (!chatIds?.length) return res.status(400).json({ success: false, message: 'Chat ID برای گزارشات تنظیم نشده است.' });

    const text = await buildScheduledTelegramReportText(key, payloadJson);

    let sent = 0;
    const results: any[] = [];
    for (const cid of chatIds) {
      const rr = await sendTelegramMessage(botToken, cid, text);
      results.push({ chatId: cid, success: !!(rr as any)?.success, message: (rr as any)?.message });
      if ((rr as any)?.success) sent++;
    }

    try {
      await insertSmsLog({
        provider: 'telegram',
        eventType: `REPORT_MANUAL:${key}`,
        entityType: 'report_manual',
        entityId: 0,
        recipient: chatIds.join(', '),
        patternId: 'TELEGRAM_REPORT_MANUAL',
        tokens: [key],
        success: sent > 0,
        response: { reportKey: key, sent, total: chatIds.length, results },
        error: sent > 0 ? undefined : 'No successful telegram deliveries',
      });
    } catch {}

    res.json({ success: true, data: { sent, total: chatIds.length, results } });
  } catch (e) { next(e); }
});



// -----------------------------------------------------
// Reports: New executive-grade reports
// -----------------------------------------------------
app.get('/api/reports/inventory-turnover', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const { fromISO, toISO } = req.query;
    if (!fromISO || !toISO) return res.status(400).json({ success: false, message: 'fromISO و toISO الزامی است.' });
    const data = await getInventoryTurnoverReport(String(fromISO), String(toISO));
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/reports/dead-stock', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const days = Number(req.query.days ?? 60);
    const data = await getDeadStockReport(Math.max(1, days));
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/reports/abc', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const { fromISO, toISO, metric } = req.query;
    if (!fromISO || !toISO) return res.status(400).json({ success: false, message: 'fromISO و toISO الزامی است.' });
    const m = (metric === 'profit' ? 'profit' : 'sales') as any;
    const data = await getAbcReport(String(fromISO), String(toISO), m);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/reports/aging-receivables', authorizeRole(REPORT_ROLES), async (_req, res, next) => {
  try {
    const data = await getAgingReceivablesReport();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.get('/api/reports/cashflow', authorizeRole(REPORT_ROLES), async (req, res, next) => {
  try {
    const { fromISO, toISO, forecastDays } = req.query;
    if (!fromISO || !toISO) return res.status(400).json({ success: false, message: 'fromISO و toISO الزامی است.' });
    const fd = forecastDays ? Number(forecastDays) : 30;
    const data = await getCashflowReport(String(fromISO), String(toISO), Math.max(1, Math.min(120, fd)));
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// =====================================================
// 16) پیامک رویدادی
// =====================================================

const makeCorrId = () => `sms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;


type SmsLogInsert = {
  reqUser?: { id?: number; username?: string };
  provider: string;
  eventType?: string;
  entityType?: string;
  entityId?: number;
  recipient: string;
  patternId?: string;
  tokens?: string[];
  success: boolean;
  response?: any;
  error?: string;
  request?: any;
  httpStatus?: number;
  rawResponseText?: string;
  durationMs?: number;
  correlationId?: string;
  relatedLogId?: number;
};

const insertSmsLog = async (x: SmsLogInsert) => {
  try {
    await runAsync(
      `INSERT INTO sms_logs (
        createdByUserId,
        createdByUsername,
        provider,
        eventType,
        entityType,
        entityId,
        recipient,
        patternId,
        tokensJson,
        success,
        requestJson,
        httpStatus,
        rawResponseText,
        durationMs,
        correlationId,
        responseJson,
        error,
        errorText,
        relatedLogId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        x.reqUser?.id ?? null,
        x.reqUser?.username ?? null,
        x.provider,
        x.eventType ?? null,
        x.entityType ?? null,
        x.entityId ?? null,
        x.recipient,
        x.patternId ?? null,
        x.tokens ? JSON.stringify(x.tokens) : null,
        x.success ? 1 : 0,
        x.request ? JSON.stringify(x.request) : null,
        typeof x.httpStatus === 'number' ? x.httpStatus : null,
        x.rawResponseText ?? null,
        typeof x.durationMs === 'number' ? x.durationMs : null,
        x.correlationId ?? null,
        x.response ? JSON.stringify(x.response) : null,
        x.error ?? null,
        x.error ?? null,
        x.relatedLogId ?? null,
      ]
    );
  } catch (e) {
    // don't break main flows
    console.error('Failed to insert sms_logs:', e);
  }
};

const inferEntityTypeFromEvent = (eventType?: string): string | undefined => {
  if (!eventType) return undefined;
  if (eventType.startsWith('INSTALLMENT')) return 'installment';
  if (eventType.startsWith('REPAIR')) return 'repair';
  if (eventType.startsWith('CHECK')) return 'check';
  return undefined;
};

// ارسال تست پیامک (Pattern) - برای بررسی سریع تنظیمات
// فعلاً فقط ملی پیامک (SendByBaseNumber) به صورت پترن اجباری پشتیبانی می‌شود.
app.post('/api/sms/test-pattern', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const { bodyId, to, tokens } = req.body || {};
    const bid = Number(bodyId);
    const recipient = String(to || '').trim();
    const tokenArr: string[] = Array.isArray(tokens) ? tokens.map((x) => String(x ?? '')) : [];

    if (!bid || isNaN(bid) || bid <= 0) {
      return res.status(400).json({ success: false, message: 'شناسه پترن (BodyId) نامعتبر است.' });
    }
    if (!recipient || recipient.length < 10) {
      return res.status(400).json({ success: false, message: 'شماره گیرنده نامعتبر است.' });
    }

    const settings = await getAllSettingsAsObject();
    const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();
    if (provider !== 'meli_payamak') {
      return res.status(400).json({ success: false, message: 'ارسال تست در حال حاضر فقط برای «ملی پیامک» فعال است.' });
    }

    const username = settings.meli_payamak_username;
    const password = settings.meli_payamak_password;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'نام کاربری/رمز عبور ملی پیامک در تنظیمات وارد نشده است.' });
    }

    const correlationId = makeCorrId();
    const smsResult = await sendMeliPayamakPatternSms(recipient, bid, tokenArr, username, password);
    const d: any = (smsResult as any)?.details || {};
    await insertSmsLog({
      correlationId,
      reqUser: req.user,
      provider,
      eventType: 'TEST_PATTERN',
      entityType: 'settings',
      entityId: undefined,
      recipient,
      patternId: String(bid),
      tokens: tokenArr,
      success: !!smsResult?.success,
      request: {
        provider,
        endpoint: d.endpoint || 'https://api.payamak-panel.com/post/send.asmx',
        method: 'SendByBaseNumber',
        bodyId: String(bid),
        to: recipient,
        tokensCount: tokenArr.length,
      },
      httpStatus: typeof d.httpStatus === 'number' ? d.httpStatus : undefined,
      rawResponseText: d.rawResponseText || undefined,
      durationMs: typeof d.durationMs === 'number' ? d.durationMs : undefined,
      response: smsResult,
      error: smsResult?.success ? undefined : smsResult?.message,
    });
    if (smsResult?.success) {
      return res.json({ success: true, message: 'پیامک تست ارسال شد.', data: smsResult });
    }

    // خطاهای برگشتی از سرویس پیامک (مثل BodyId نامعتبر، خطای اعتبارسنجی، ...) خطای سرور ما نیست.
    // برای جلوگیری از نمایش «500» در مرورگر، همیشه 200 برگردانیم و success=false را اعلام کنیم.
    return res.json({
      success: false,
      message: smsResult?.message || 'خطا در ارسال پیامک تست',
      data: smsResult,
    });
  } catch (e) {
    next(e);
  }
});

// بررسی سلامت تنظیمات پیامک‌های پترنی (Health Check)
// هدف: یک گزارش سریع از اینکه کدام پترن‌ها تنظیم شده‌اند/نیستند.
app.get('/api/sms/health-check', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const settings = await getAllSettingsAsObject();
    const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();

    // فعلاً Health Check برای ملی پیامک (پترن) فعال است.
    if (provider !== 'meli_payamak') {
      return res.json({
        success: false,
        message: 'Health Check در حال حاضر فقط برای «ملی پیامک» فعال است.',
        provider,
        items: [],
      });
    }

    const required = [
      { key: 'meli_payamak_installment_reminder_pattern_id', label: 'یادآوری قسط (کلی)', category: 'اقساط' },
      { key: 'meli_payamak_installment_completed_pattern_id', label: 'تسویه کامل اقساط (پرداخت نهایی)', category: 'اقساط' },
      { key: 'meli_payamak_installment_due_7_pattern_id', label: 'قسط - ۷ روز قبل', category: 'اقساط' },
      { key: 'meli_payamak_installment_due_3_pattern_id', label: 'قسط - ۳ روز قبل', category: 'اقساط' },
      { key: 'meli_payamak_installment_due_today_pattern_id', label: 'قسط - همان روز', category: 'اقساط' },

      { key: 'meli_payamak_repair_received_pattern_id', label: 'پذیرش تعمیر', category: 'تعمیرات' },
      { key: 'meli_payamak_repair_cost_estimated_pattern_id', label: 'برآورد هزینه تعمیر', category: 'تعمیرات' },
      { key: 'meli_payamak_repair_ready_pattern_id', label: 'آماده تحویل تعمیر', category: 'تعمیرات' },

      { key: 'meli_payamak_check_due_7_pattern_id', label: 'چک - ۷ روز قبل', category: 'چک‌ها' },
      { key: 'meli_payamak_check_due_3_pattern_id', label: 'چک - ۳ روز قبل', category: 'چک‌ها' },
      { key: 'meli_payamak_check_due_today_pattern_id', label: 'چک - همان روز', category: 'چک‌ها' },
    ] as const;

    const items = required.map((r) => {
      const raw = String(settings[r.key] || '').trim();
      const configured = !!raw;
      const bodyId = configured ? Number(raw) : undefined;
      return {
        key: r.key,
        label: r.label,
        category: r.category,
        configured,
        bodyId: bodyId && !isNaN(bodyId) ? bodyId : null,
      };
    });

    const username = String(settings.meli_payamak_username || '').trim();
    const password = String(settings.meli_payamak_password || '').trim();
    const credsOk = !!(username && password);

    return res.json({
      success: true,
      provider,
      credsOk,
      items,
    });
  } catch (e) {
    next(e);
  }
});

// تست گروهی چند پترن انتخابی (Bulk Test)
app.post('/api/sms/bulk-test', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const settings = await getAllSettingsAsObject();
    const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();
    if (provider !== 'meli_payamak') {
      return res.status(400).json({ success: false, message: 'تست گروهی فعلاً فقط برای «ملی پیامک» فعال است.' });
    }

    const username = settings.meli_payamak_username;
    const password = settings.meli_payamak_password;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'نام کاربری/رمز عبور ملی پیامک در تنظیمات وارد نشده است.' });
    }

    const { to, tests } = req.body || {};
    const recipient = String(to || '').trim();
    if (!recipient || recipient.length < 10) {
      return res.status(400).json({ success: false, message: 'شماره گیرنده نامعتبر است.' });
    }

    const arr: any[] = Array.isArray(tests) ? tests : [];
    if (!arr.length) {
      return res.status(400).json({ success: false, message: 'هیچ پیامکی برای تست انتخاب نشده است.' });
    }

    const results: any[] = [];
    for (const t of arr) {
      const bodyId = Number(t?.bodyId);
      const key = String(t?.key || '').trim();
      const label = String(t?.label || key || 'پیامک');
      const tokenArr: string[] = Array.isArray(t?.tokens) ? t.tokens.map((x: any) => String(x ?? '')) : [];

      if (!bodyId || isNaN(bodyId) || bodyId <= 0) {
        results.push({ key, label, bodyId, success: false, message: 'BodyId نامعتبر است.' });
        continue;
      }

      const smsResult = await sendMeliPayamakPatternSms(recipient, bodyId, tokenArr, username, password);
      await insertSmsLog({
        reqUser: req.user,
        provider,
        eventType: 'TEST_BULK',
        entityType: 'settings',
        recipient,
        patternId: String(bodyId),
        tokens: tokenArr,
        success: !!smsResult?.success,
        response: smsResult,
        error: smsResult?.success ? undefined : smsResult?.message,
      });

      results.push({
        key,
        label,
        bodyId,
        success: !!smsResult?.success,
        message: smsResult?.success ? 'ارسال شد' : (smsResult?.message || 'ناموفق'),
        data: smsResult,
      });
    }

    return res.json({ success: true, provider, to: recipient, results });
  } catch (e) {
    next(e);
  }
});


// =====================================================
// Notification Outbox (Queue/Retry) + Auto-Send Rules
// =====================================================
type OutboxStatus = 'pending' | 'processing' | 'done' | 'failed';
type OutboxChannel = 'sms' | 'telegram';

type OutboxRow = {
  id: number;
  channel: OutboxChannel;
  provider?: string | null;
  eventType?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  recipient: string;
  payloadJson: string;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
};

const ensureNotificationOutboxTables = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS notification_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      provider TEXT,
      eventType TEXT,
      entityType TEXT,
      entityId INTEGER,
      recipient TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      maxAttempts INTEGER NOT NULL DEFAULT 6,
      nextAttemptAt TEXT,
      lastError TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS notification_sent_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dayKey TEXT NOT NULL,
      channel TEXT NOT NULL,
      eventType TEXT,
      entityType TEXT,
      entityId INTEGER,
      recipient TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `);

  await runAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_sent_dedupe
    ON notification_sent_log(dayKey, channel, eventType, entityType, entityId, recipient);
  `);
};

const computeNextAttemptISO = (attempts: number) => {
  // 30s, 60s, 120s, 240s, 480s, 600s (cap 10 min)
  const base = 30;
  const sec = Math.min(base * Math.pow(2, Math.max(0, attempts)), 600);
  return moment().add(sec, 'seconds').toISOString();
};

const didSendToday = async (row: { channel: OutboxChannel; eventType?: string | null; entityType?: string | null; entityId?: number | null; recipient?: string | null; }) => {
  await ensureNotificationOutboxTables();
  const dayKey = moment().format('YYYY-MM-DD');
  const exists = await getAsync(
    `SELECT id FROM notification_sent_log WHERE dayKey=? AND channel=? AND IFNULL(eventType,'')=? AND IFNULL(entityType,'')=? AND IFNULL(entityId,0)=? AND IFNULL(recipient,'')=? LIMIT 1`,
    [dayKey, row.channel, row.eventType ?? '', row.entityType ?? '', Number(row.entityId ?? 0), row.recipient ?? '']
  );
  return !!exists;
};

const markSentToday = async (row: { channel: OutboxChannel; eventType?: string | null; entityType?: string | null; entityId?: number | null; recipient?: string | null; }) => {
  await ensureNotificationOutboxTables();
  const dayKey = moment().format('YYYY-MM-DD');
  try {
    await runAsync(
      `INSERT OR IGNORE INTO notification_sent_log (dayKey, channel, eventType, entityType, entityId, recipient) VALUES (?,?,?,?,?,?)`,
      [dayKey, row.channel, row.eventType ?? null, row.entityType ?? null, row.entityId ?? null, row.recipient ?? null]
    );
  } catch {}
};

const enqueueOutbox = async (opts: {
  channel: OutboxChannel;
  provider?: string | null;
  eventType?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  recipient: string;
  payload: any;
  dedupeToday?: boolean;
  maxAttempts?: number;
}) => {
  await ensureNotificationOutboxTables();
  if (opts.dedupeToday) {
    const already = await didSendToday({
      channel: opts.channel,
      eventType: opts.eventType,
      entityType: opts.entityType,
      entityId: opts.entityId,
      recipient: opts.recipient,
    });
    if (already) return { queued: false, reason: 'deduped' as const };
  }

  const payloadJson = JSON.stringify(opts.payload ?? {});
  const r = await runAsync(
    `INSERT INTO notification_outbox (channel, provider, eventType, entityType, entityId, recipient, payloadJson, status, attempts, maxAttempts, nextAttemptAt)
     VALUES (?,?,?,?,?,?,?,'pending',0,?,?)`,
    [
      opts.channel,
      opts.provider ?? null,
      opts.eventType ?? null,
      opts.entityType ?? null,
      opts.entityId ?? null,
      opts.recipient,
      payloadJson,
      Number(opts.maxAttempts ?? 6),
      moment().toISOString(),
    ]
  );
  return { queued: true, id: r?.lastID as number };
};

const trySendTelegramNow = async (text: string, chatIdOverride?: string | null) => {
  const settings = await getAllSettingsAsObject();
  // Optional proxy (e.g. socks5://127.0.0.1:10808 for v2rayN)
  setTelegramProxy((settings as any).telegram_proxy);
  const botToken = String(settings.telegram_bot_token || '').trim();
  const chatId = String((chatIdOverride && String(chatIdOverride).trim()) || settings.telegram_chat_id || '').trim();
  if (!botToken || !chatId) return { success: false, message: 'توکن ربات یا Chat ID تلگرام تنظیم نشده است.' };
  return await sendTelegramMessage(botToken, chatId, text);
};

const trySendSmsNow = async (payload: any) => {
  const settings = await getAllSettingsAsObject();
  const provider: string = String(payload?.provider || settings.sms_provider || 'meli_payamak').toLowerCase();
  const recipientNumber = String(payload?.recipient || '').trim();
  const tokens: string[] = Array.isArray(payload?.tokens) ? payload.tokens.map((x: any) => String(x ?? '')) : [];
  if (!recipientNumber) return { success: false, message: 'شماره گیرنده نامعتبر است.' };

  if (provider === 'meli_payamak') {
    const username = settings.meli_payamak_username;
    const password = settings.meli_payamak_password;
    const bodyId = Number(payload?.meliBodyId || 0);
    if (!username || !password) return { success: false, message: 'نام کاربری/رمز عبور ملی پیامک وارد نشده است.' };
    if (!bodyId || isNaN(bodyId)) return { success: false, message: 'BodyId الگو نامعتبر است.' };
    return await sendMeliPayamakPatternSms(recipientNumber, bodyId, tokens, username, password);
  }

  if (provider === 'kavenegar') {
    const apiKey = String(settings.kavenegar_api_key || '').trim();
    const template = String(payload?.kavenegarTemplate || '').trim();
    if (!apiKey) return { success: false, message: 'API Key کاوه‌نگار تنظیم نشده است.' };
    if (!template) return { success: false, message: 'نام قالب کاوه‌نگار تنظیم نشده است.' };
    return await sendKavenegarVerifySms(apiKey, template, recipientNumber, tokens);
  }

  if (provider === 'sms_ir') {
    const apiKey = String(settings.sms_ir_api_key || '').trim();
    const templateId = Number(payload?.smsIrTemplateId || 0);
    if (!apiKey) return { success: false, message: 'API Key SMS.ir تنظیم نشده است.' };
    if (!templateId || isNaN(templateId)) return { success: false, message: 'شناسه قالب SMS.ir نامعتبر است.' };
    return await sendSmsIrPatternSms(apiKey, templateId, recipientNumber, tokens);
  }

  if (provider === 'ippanel') {
    const apiKey = String(settings.ippanel_api_key || '').trim();
    const patternCode = String(payload?.ippanelPatternCode || '').trim();
    const sender = String(settings.ippanel_sender || '').trim();
    if (!apiKey) return { success: false, message: 'API Key آی‌پنل تنظیم نشده است.' };
    if (!patternCode) return { success: false, message: 'کد الگوی آی‌پنل تنظیم نشده است.' };
    return await sendIppanelPatternSms(apiKey, sender, patternCode, recipientNumber, tokens);
  }

  return { success: false, message: 'سرویس پیامک ناشناخته است.' };
};

const processOneOutboxRow = async () => {
  await ensureNotificationOutboxTables();
  const row = await getAsync(
    `SELECT * FROM notification_outbox
      WHERE status IN ('pending','failed')
        AND (nextAttemptAt IS NULL OR nextAttemptAt <= ?)
      ORDER BY id ASC
      LIMIT 1`,
    [moment().toISOString()]
  ) as any as OutboxRow | undefined;

  if (!row) return false;

  await runAsync(`UPDATE notification_outbox SET status='processing', updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`, [row.id]);

  try {
    const payload = JSON.parse(String(row.payloadJson || '{}'));
    let result: any;

    if (row.channel === 'telegram') {
      const text = String(payload?.text || payload?.message || payload?.body || '');
      const chatIdOverride = payload?.chatId || payload?.recipient || null;

      // Respect silent hours (telegram_silent_hours) to prevent noisy nights.
      try {
        const settings = await readAllSettings();
        const nextAllowed = computeNextAllowedTelegramSendISO((settings as any).telegram_silent_hours);
        if (nextAllowed) {
          await runAsync(
            `UPDATE notification_outbox SET status='pending', nextAttemptAt=?, lastError=NULL, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
            [nextAllowed, row.id]
          );
          return true;
        }
      } catch {
        // ignore silent-hours errors
      }

      result = await trySendTelegramNow(text, chatIdOverride);
    } else {
      result = await trySendSmsNow(payload);
    }

    if (result?.success) {
      await runAsync(
        `UPDATE notification_outbox SET status='done', lastError=NULL, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
        [row.id]
      );
      await markSentToday({ channel: row.channel, eventType: row.eventType, entityType: row.entityType, entityId: row.entityId, recipient: row.recipient });
      return true;
    }

    const attempts = Number(row.attempts || 0) + 1;
    const maxAttempts = Number(row.maxAttempts || 6);
    const nextAttemptAt = attempts >= maxAttempts ? null : computeNextAttemptISO(attempts);
    const status: OutboxStatus = attempts >= maxAttempts ? 'failed' : 'pending';

    await runAsync(
      `UPDATE notification_outbox SET status=?, attempts=?, nextAttemptAt=?, lastError=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
      [status, attempts, nextAttemptAt, String(result?.message || 'خطا در ارسال'), row.id]
    );
    return true;
  } catch (e: any) {
    const attempts = Number(row.attempts || 0) + 1;
    const maxAttempts = Number(row.maxAttempts || 6);
    const nextAttemptAt = attempts >= maxAttempts ? null : computeNextAttemptISO(attempts);
    const status: OutboxStatus = attempts >= maxAttempts ? 'failed' : 'pending';
    await runAsync(
      `UPDATE notification_outbox SET status=?, attempts=?, nextAttemptAt=?, lastError=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`,
      [status, attempts, nextAttemptAt, String(e?.message || 'خطای ناشناخته'), row.id]
    );
    return true;
  }
};

let outboxWorkerStarted = false;
const startOutboxWorker = () => {
  if (outboxWorkerStarted) return;
  outboxWorkerStarted = true;

  // Tick every 30s
  setInterval(async () => {
    try {
      // process up to 10 messages per tick
      for (let i = 0; i < 10; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const did = await processOneOutboxRow();
        if (!did) break;
      }
    } catch (e) {
      console.error('Outbox worker error:', e);
    }
  }, 30_000);
};

// Admin endpoints for outbox

// --------------------------------------------------
// Manual messaging (SMS/Telegram) – free text
// --------------------------------------------------

// --------------------------------------------------
// Person report text for Telegram/SMS
// --------------------------------------------------
const moneyFa = (v: any) => {
  const n = Number(v || 0);
  return `${Math.round(n).toLocaleString('fa-IR')} تومان`;
};

const buildCustomerReportText = async (customerId: number) => {
  const c = await getCustomerByIdFromDb(customerId);
  if (!c) return null;

  // invoices
  const invAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(grandTotal),0) as total, MAX(date) as lastDate
       FROM invoices
      WHERE customerId = ?`,
    [customerId]
  );

  // installment sales
  const instAgg = await getAsync(
    `SELECT COUNT(1) as cnt,
            COALESCE(SUM(actualSalePrice),0) as total,
            COALESCE(SUM(downPayment),0) as down
       FROM installment_sales
      WHERE customerId = ?`,
    [customerId]
  );

  // unpaid / overdue / due soon (uses shamsi dueDate in installment_payments)
  const todayJ = moment().locale('fa').format('jYYYY/jMM/jDD');
  const soon7J = moment().add(7, 'day').locale('fa').format('jYYYY/jMM/jDD');

  const unpaidAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(ip.amountDue),0) as total
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND ip.status != 'پرداخت شده'`,
    [customerId]
  );

  const overdueAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(ip.amountDue),0) as total
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND ip.status != 'پرداخت شده'
        AND ip.dueDate < ?`,
    [customerId, todayJ]
  );

  const dueSoonAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(ip.amountDue),0) as total
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND ip.status != 'پرداخت شده'
        AND ip.dueDate >= ?
        AND ip.dueDate <= ?`,
    [customerId, todayJ, soon7J]
  );

  const lines: string[] = [];
  lines.push(`گزارش مشتری / Customer report`);
  lines.push(`نام / Name: ${c.fullName || '—'}`);
  lines.push(`موبایل / Mobile: ${(c.phoneNumber || '').trim() || '—'}`);
  lines.push('');
  lines.push(`فروش نقدی / Cash invoices: ${Number(invAgg?.cnt || 0).toLocaleString('fa-IR')} فاکتور • ${moneyFa(invAgg?.total)}`);
  if (invAgg?.lastDate) lines.push(`آخرین خرید / Last invoice: ${String(invAgg.lastDate).slice(0, 10)}`);
  lines.push(`فروش اقساطی / Installments: ${Number(instAgg?.cnt || 0).toLocaleString('fa-IR')} فروش • ${moneyFa(instAgg?.total)} (پیش‌پرداخت / Down: ${moneyFa(instAgg?.down)})`);
  lines.push(`مانده اقساط / Outstanding: ${moneyFa(unpaidAgg?.total)} • تعداد / Count: ${Number(unpaidAgg?.cnt || 0).toLocaleString('fa-IR')}`);
  lines.push(`معوق / Overdue: ${moneyFa(overdueAgg?.total)} • ${Number(overdueAgg?.cnt || 0).toLocaleString('fa-IR')} قسط`);
  lines.push(`۷ روز آینده / Due in 7 days: ${moneyFa(dueSoonAgg?.total)} • ${Number(dueSoonAgg?.cnt || 0).toLocaleString('fa-IR')} قسط`);

  return lines.join('\n');
};

const buildPartnerReportText = async (partnerId: number) => {
  const p = await getPartnerByIdFromDb(partnerId);
  if (!p) return null;

  const purAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(totalCost),0) as total, MAX(purchaseDate) as lastDate
       FROM purchases
      WHERE supplierId = ?`,
    [partnerId]
  );

  const repAgg = await getAsync(
    `SELECT COUNT(1) as cnt, COALESCE(SUM(finalCost),0) as total
       FROM repairs
      WHERE technicianId = ?`,
    [partnerId]
  );

  const lines: string[] = [];
  lines.push(`گزارش همکار / Partner report`);
  lines.push(`نام / Name: ${p.partnerName || '—'}`);
  lines.push(`موبایل / Mobile: ${(p.phoneNumber || '').trim() || '—'}`);
  lines.push(`نوع / Type: ${(p.partnerType || '—')}`);
  lines.push('');
  lines.push(`خریدها / Purchases: ${Number(purAgg?.cnt || 0).toLocaleString('fa-IR')} سند • ${moneyFa(purAgg?.total)}`);
  if (purAgg?.lastDate) lines.push(`آخرین خرید / Last purchase: ${String(purAgg.lastDate).slice(0, 10)}`);
  lines.push(`تعمیرات (تکنسین) / Repairs (tech): ${Number(repAgg?.cnt || 0).toLocaleString('fa-IR')} مورد • ${moneyFa(repAgg?.total)}`);
  return lines.join('\n');
};

app.get('/api/reports/customer/:id/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });
    const text = await buildCustomerReportText(id);
    if (!text) return res.status(404).json({ success: false, message: 'مشتری پیدا نشد.' });
    return res.json({ success: true, data: { text } });
  } catch (e) {
    return next(e);
  }
});

app.get('/api/reports/partner/:id/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'شناسه همکار نامعتبر است.' });
    const text = await buildPartnerReportText(id);
    if (!text) return res.status(404).json({ success: false, message: 'همکار پیدا نشد.' });
    return res.json({ success: true, data: { text } });
  } catch (e) {
    return next(e);
  }
});

app.post('/api/messages/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body || {};
    const recipientType = String(body.recipientType || '').trim();
    const recipientId = body.recipientId != null ? Number(body.recipientId) : null;
    const phoneNumberRaw = String(body.phoneNumber || '').trim();
    const telegramChatIdRaw = String(body.telegramChatId || '').trim();
    const channels: string[] = Array.isArray(body.channels) ? body.channels : [];
    const text = String(body.text || '').trim();
    const saveToProfile = body.saveToProfile !== false;

    if (!text) return res.status(400).json({ success: false, message: 'متن پیام الزامی است.' });
    if (!channels.length) return res.status(400).json({ success: false, message: 'حداقل یک کانال انتخاب کنید.' });
    if (!['customer', 'partner', 'manual'].includes(recipientType)) {
      return res.status(400).json({ success: false, message: 'نوع گیرنده نامعتبر است.' });
    }

    const settings = await getAllSettingsAsObject();

    // Resolve recipient info
    let resolvedName: string | null = null;
    let resolvedPhone: string | null = phoneNumberRaw || null;
    let resolvedChatId: string | null = telegramChatIdRaw || null;

    if (recipientType !== 'manual') {
      if (!recipientId || Number.isNaN(recipientId)) {
        return res.status(400).json({ success: false, message: 'شناسه گیرنده نامعتبر است.' });
      }
      if (recipientType === 'customer') {
        const c = await getCustomerByIdFromDb(recipientId);
        if (!c) return res.status(404).json({ success: false, message: 'مشتری پیدا نشد.' });
        resolvedName = c.fullName || null;
        resolvedPhone = resolvedPhone || c.phoneNumber || null;
        resolvedChatId = resolvedChatId || (c as any).telegramChatId || null;
        // save chat id if asked
        if (saveToProfile && telegramChatIdRaw) {
          await updateCustomerInDb(recipientId, {
            fullName: c.fullName,
            phoneNumber: c.phoneNumber,
            address: c.address,
            notes: c.notes,
            telegramChatId: telegramChatIdRaw,
          });
        }
      } else {
        const p = await getPartnerByIdFromDb(recipientId);
        if (!p) return res.status(404).json({ success: false, message: 'همکار پیدا نشد.' });
        resolvedName = p.partnerName || null;
        resolvedPhone = resolvedPhone || p.phoneNumber || null;
        resolvedChatId = resolvedChatId || (p as any).telegramChatId || null;
        if (saveToProfile && telegramChatIdRaw) {
          await updatePartnerInDb(recipientId, {
            partnerName: p.partnerName,
            partnerType: p.partnerType,
            contactPerson: p.contactPerson,
            phoneNumber: p.phoneNumber,
            email: p.email,
            address: p.address,
            notes: p.notes,
            telegramChatId: telegramChatIdRaw,
          });
        }
      }
    }

    const normalizedPhone = (resolvedPhone || '').replace(/\D/g, '');
    const normalizedChatId = String(resolvedChatId || '').trim();

    // Validate per channel
    if (channels.includes('sms') && (!normalizedPhone || normalizedPhone.length < 10)) {
      return res.status(400).json({ success: false, message: 'شماره موبایل برای پیامک معتبر نیست.' });
    }
    if (channels.includes('telegram') && !normalizedChatId) {
      return res.status(400).json({ success: false, message: 'Chat ID تلگرام گیرنده مشخص نیست.' });
    }

    // Build & enqueue
    const entityType = recipientType === 'partner' ? 'partner' : 'customer';
    const entityId = recipientType === 'manual' ? null : recipientId;
    const baseContext = {
      name: resolvedName || '',
      phoneNumber: normalizedPhone,
      telegramChatId: normalizedChatId,
    };

    const queued: any[] = [];

    if (channels.includes('telegram')) {
      const tgProvider = String(settings.telegram_provider || 'bot');
      const payload = {
        provider: tgProvider,
        chatId: normalizedChatId,
        text,
        context: baseContext,
      };
      const rowId = await enqueueOutbox({
        channel: 'telegram',
        provider: tgProvider,
        eventType: 'MANUAL_MESSAGE',
        entityType: entityType,
        entityId: entityId,
        recipient: normalizedChatId,
        payload,
      });
      queued.push({ channel: 'telegram', id: rowId });
    }

    if (channels.includes('sms')) {
      const smsProvider = String(settings.sms_provider || 'meli_payamak');
      // Free-text via pattern/template requires a configured "custom" template per provider.
      const nameToken = (resolvedName || '').trim() || 'مشتری';
      const tokens = [nameToken, text];

      let smsPayload: any = { provider: smsProvider, recipient: normalizedPhone, tokens };
      if (smsProvider === 'meli_payamak') {
        const bodyId = String(settings.meli_payamak_custom_body_id || '').trim();
        if (!bodyId) {
          return res.status(400).json({ success: false, message: 'برای پیامک متن آزاد، «کد بدنه/BodyId سفارشی» در تنظیمات پیامک را تنظیم کنید.' });
        }
        smsPayload = { ...smsPayload, meliBodyId: bodyId };
      } else if (smsProvider === 'kavenegar') {
        const template = String(settings.kavenegar_custom_template || '').trim();
        if (!template) {
          return res.status(400).json({ success: false, message: 'برای پیامک متن آزاد، «نام قالب/Template سفارشی» کاوه‌نگار را در تنظیمات پیامک تنظیم کنید.' });
        }
        smsPayload = { ...smsPayload, kavenegarTemplate: template };
      } else if (smsProvider === 'sms_ir') {
        const templateId = String(settings.sms_ir_custom_template_id || '').trim();
        if (!templateId) {
          return res.status(400).json({ success: false, message: 'برای پیامک متن آزاد، «TemplateId سفارشی» SMS.ir را در تنظیمات پیامک تنظیم کنید.' });
        }
        smsPayload = { ...smsPayload, smsIrTemplateId: templateId };
      } else if (smsProvider === 'ippanel') {
        const patternCode = String(settings.ippanel_custom_pattern_code || '').trim();
        if (!patternCode) {
          return res.status(400).json({ success: false, message: 'برای پیامک متن آزاد، «PatternCode سفارشی» IPPanel را در تنظیمات پیامک تنظیم کنید.' });
        }
        smsPayload = { ...smsPayload, ippanelPatternCode: patternCode };
      }

      const rowId = await enqueueOutbox({
        channel: 'sms',
        provider: smsProvider,
        eventType: 'MANUAL_MESSAGE',
        entityType: entityType,
        entityId: entityId,
        recipient: normalizedPhone,
        payload: smsPayload,
      });
      queued.push({ channel: 'sms', id: rowId });
    }

    return res.json({ success: true, data: { queued } });
  } catch (err) {
    next(err);
  }
});

// Admin endpoints for outbox
app.get('/api/notifications/outbox', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    await ensureNotificationOutboxTables();
    const status = String(req.query.status || 'pending');
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
    const rows = await allAsync(
      `SELECT * FROM notification_outbox ${status && status !== 'ALL' ? 'WHERE status = ?' : ''} ORDER BY id DESC LIMIT ?`,
      status && status !== 'ALL' ? [status, limit] : [limit]
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

app.post('/api/notifications/outbox/:id/retry', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await ensureNotificationOutboxTables();
    await runAsync(`UPDATE notification_outbox SET status='pending', nextAttemptAt=?, updatedAt=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE id=?`, [moment().toISOString(), id]);
    // kick worker once
    try { await processOneOutboxRow(); } catch {}
    res.json({ success: true });
  } catch (e) { next(e); }
});

// -----------------------------------------------------
// Auto-send rules (daily 09:00) - SMS / Telegram / Both
// Keys in settings: auto_send_installment_due, auto_send_check_due, auto_send_repair_ready
// Values: off | sms | telegram | both
// -----------------------------------------------------
const normalizeAutoSendMode = (v: any): 'off' | 'sms' | 'telegram' | 'both' => {
  const s = String(v || 'off').toLowerCase();
  if (s === 'sms') return 'sms';
  if (s === 'telegram') return 'telegram';
  if (s === 'both') return 'both';
  return 'off';
};




// --- Telegram extras: silent hours + deep links ---
const parseTimeHHmm = (s: string): { h: number; m: number } | null => {
  const m = String(s || '').trim().match(/^([0-1]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
};

// telegram_silent_hours format: "22:00-08:00" (Tehran time, +03:30)
const computeNextAllowedTelegramSendISO = (silent: string | undefined | null): string | null => {
  const raw = String(silent || '').trim();
  if (!raw) return null;

  const parts = raw.split('-').map((p) => p.trim());
  if (parts.length !== 2) return null;
  const start = parseTimeHHmm(parts[0]);
  const end = parseTimeHHmm(parts[1]);
  if (!start || !end) return null;

  const nowTehran = moment().utcOffset(210);
  const startToday = nowTehran.clone().hour(start.h).minute(start.m).second(0).millisecond(0);
  const endToday = nowTehran.clone().hour(end.h).minute(end.m).second(0).millisecond(0);

  const crossesMidnight = endToday.isSameOrBefore(startToday);

  const inSilent = (() => {
    if (!crossesMidnight) return nowTehran.isSameOrAfter(startToday) && nowTehran.isBefore(endToday);
    return nowTehran.isSameOrAfter(startToday) || nowTehran.isBefore(endToday);
  })();

  if (!inSilent) return null;

  const next = crossesMidnight
    ? (nowTehran.isBefore(endToday) ? endToday : endToday.clone().add(1, 'day'))
    : endToday;

  return next.clone().utc().toISOString();
};

const buildAppLink = (baseUrl: string, hashPath: string): string => {
  const b = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!b) return '';
  const p = String(hashPath || '').trim().replace(/^\/+/, '');
  return `${b}/#/${p}`;
};

const safeReplaceTemplate = (tpl: string, vars: Record<string, any>): string => {
  const raw = String(tpl || '');
  return raw.replace(/\{(\w+)\}/g, (_m, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return '';
    return String(v);
  });
};
const getTelegramTargetsForTopic = async (topic: 'reports' | 'installments' | 'sales' | 'notifications'): Promise<{ botToken: string; chatIds: string[] }> => {
  const settings = await getAllSettingsAsObject();
  setTelegramProxy((settings as any).telegram_proxy);
  const botToken = String(settings.telegram_bot_token || '').trim();
  const fallback = String(settings.telegram_chat_id || '').trim();
  const topicKey =
    topic === 'reports' ? 'telegram_chat_ids_reports'
    : topic === 'installments' ? 'telegram_chat_ids_installments'
    : topic === 'sales' ? 'telegram_chat_ids_sales'
    : 'telegram_chat_ids_notifications';

  const chatIds = parseChatIdList((settings as any)[topicKey]);
  const finalIds = chatIds.length ? chatIds : (fallback ? [fallback] : []);
  return { botToken, chatIds: finalIds };
};

const TOPIC_TYPES_KEYS: Record<string, string> = {
  reports: 'telegram_topic_types_reports',
  installments: 'telegram_topic_types_installments',
  sales: 'telegram_topic_types_sales',
  notifications: 'telegram_topic_types_notifications',
};

const getEnabledTypesForTopic = async (topic: 'reports' | 'installments' | 'sales' | 'notifications'): Promise<Set<string>> => {
  const settings = await getAllSettingsAsObject();
  const key = TOPIC_TYPES_KEYS[topic];
  const raw = String((settings as any)[key] || '').trim();
  if (!raw) return new Set(); // empty => allow all
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(x => String(x)));
  } catch {
    // also accept comma/newline-separated
    const arr = raw.split(/[,\n\r\t\s]+/g).map(s => s.trim()).filter(Boolean);
    if (arr.length) return new Set(arr);
  }
  return new Set();
};

const isTopicTypeEnabled = async (topic: 'reports' | 'installments' | 'sales' | 'notifications', typeKey: string): Promise<boolean> => {
  const set = await getEnabledTypesForTopic(topic);
  if (!set.size) return true;
  return set.has(typeKey);
};

const enqueueTelegramToTopicTargets = async (topic: 'reports' | 'installments' | 'sales' | 'notifications', typeKey: string, text: string, meta?: { entityType?: string; entityId?: number }) => {
  try {
    const ok = await isTopicTypeEnabled(topic, typeKey);
    if (!ok) return;
    const { botToken, chatIds } = await getTelegramTargetsForTopic(topic);
    if (!botToken || !chatIds.length) return;

    for (const chatId of chatIds) {
      // eslint-disable-next-line no-await-in-loop
      await enqueueOutbox({
        channel: 'telegram',
        provider: null,
        eventType: typeKey,
        entityType: meta?.entityType || topic,
        entityId: meta?.entityId || null,
        recipient: String(chatId),
        payload: { text, chatId },
        dedupeToday: false,
      });
    }
  } catch {
    // never break main flows
  }
};

const enqueueEventNotifications = async (eventType: string, targetId: number, mode: 'sms'|'telegram'|'both') => {
  const settings = await getAllSettingsAsObject();
  const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();

  // Build common payloads (same logic as manual trigger)
  if (eventType.startsWith('INSTALLMENT_')) {
    const p = await getInstallmentPaymentDetailsForSms(targetId);
    if (!p) return;
    const recipientNumber = String(p.customerPhoneNumber || '').trim();
    const tokens = [p.customerFullName, formatPriceForSms(p.amountDue), p.dueDate];

    // SMS identifiers
    const smsPayload: any = { provider, recipient: recipientNumber, tokens };
    if (eventType === 'INSTALLMENT_DUE_7') {
      smsPayload.meliBodyId = Number(settings.meli_payamak_installment_due_7_pattern_id);
      smsPayload.kavenegarTemplate = settings.kavenegar_installment_due_7_template;
      smsPayload.smsIrTemplateId = settings.sms_ir_installment_due_7_template_id ? Number(settings.sms_ir_installment_due_7_template_id) : undefined;
      smsPayload.ippanelPatternCode = settings.ippanel_installment_due_7_pattern_code;
    } else if (eventType === 'INSTALLMENT_DUE_3') {
      smsPayload.meliBodyId = Number(settings.meli_payamak_installment_due_3_pattern_id);
      smsPayload.kavenegarTemplate = settings.kavenegar_installment_due_3_template;
      smsPayload.smsIrTemplateId = settings.sms_ir_installment_due_3_template_id ? Number(settings.sms_ir_installment_due_3_template_id) : undefined;
      smsPayload.ippanelPatternCode = settings.ippanel_installment_due_3_pattern_code;
    } else if (eventType === 'INSTALLMENT_DUE_TODAY') {
      smsPayload.meliBodyId = Number(settings.meli_payamak_installment_due_today_pattern_id);
      smsPayload.kavenegarTemplate = settings.kavenegar_installment_due_today_template;
      smsPayload.smsIrTemplateId = settings.sms_ir_installment_due_today_template_id ? Number(settings.sms_ir_installment_due_today_template_id) : undefined;
      smsPayload.ippanelPatternCode = settings.ippanel_installment_due_today_pattern_code;
    } else if (eventType === 'INSTALLMENT_REMINDER') {
      smsPayload.meliBodyId = Number(settings.meli_payamak_installment_reminder_pattern_id);
      smsPayload.kavenegarTemplate = settings.kavenegar_installment_template;
      smsPayload.smsIrTemplateId = settings.sms_ir_installment_template_id ? Number(settings.sms_ir_installment_template_id) : undefined;
      smsPayload.ippanelPatternCode = settings.ippanel_installment_pattern_code;
    } else if (eventType === 'INSTALLMENT_COMPLETED') {
      smsPayload.meliBodyId = settings.meli_payamak_installment_completed_pattern_id ? Number(settings.meli_payamak_installment_completed_pattern_id) : undefined;
      smsPayload.kavenegarTemplate = settings.kavenegar_installment_completed_template;
      smsPayload.smsIrTemplateId = settings.sms_ir_installment_completed_template_id ? Number(settings.sms_ir_installment_completed_template_id) : undefined;
      smsPayload.ippanelPatternCode = settings.ippanel_installment_completed_pattern_code;
    } else {
      return;
    }

    // Telegram template
    const baseUrl = String((settings as any).app_base_url || '').trim();
    const link = buildAppLink(baseUrl, 'installment-sales');
    const values: Record<string, any> = {
      name: tokens[0] ?? '',
      amount: tokens[1] ?? '',
      dueDate: tokens[2] ?? '',
      link,
      saleId: (p as any)?.saleId ?? '',
      customerId: (p as any)?.customerId ?? '',
    };
    const tgTemplateKey = (
      eventType === 'INSTALLMENT_DUE_7' ? 'telegram_installment_due_7_message' :
      eventType === 'INSTALLMENT_DUE_3' ? 'telegram_installment_due_3_message' :
      eventType === 'INSTALLMENT_DUE_TODAY' ? 'telegram_installment_due_today_message' :
      eventType === 'INSTALLMENT_COMPLETED' ? 'telegram_installment_completed_message' :
      'telegram_installment_reminder_message'
    );
    const tgTemplate = String((settings as any)[tgTemplateKey] || '').trim();
    // جایگزینی متغیرها مثل {name} {amount} {dueDate} {link}
    const build = (tpl: string, vals: Record<string, any>) => safeReplaceTemplate(tpl, vals);
    const tgText = build(tgTemplate || '🔔 یادآوری قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}', values);

    if (mode === 'sms' || mode === 'both') {
      await enqueueOutbox({
        channel: 'sms',
        provider,
        eventType,
        entityType: 'installment_payment',
        entityId: targetId,
        recipient: recipientNumber,
        payload: smsPayload,
        dedupeToday: true,
      });
    }
    if (mode === 'telegram' || mode === 'both') {
      await enqueueOutbox({
        channel: 'telegram',
        provider: null,
        eventType,
        entityType: 'installment_payment',
        entityId: targetId,
        recipient: 'telegram_chat',
        payload: { text: tgText },
        dedupeToday: true,
      });
    }

    // Optional: send an internal copy to configured installments chats
    try {
      const enabled = await isTopicTypeEnabled('installments', eventType);
      if (!enabled) {
        // skip internal copy
      } else {
      const { botToken, chatIds } = await getTelegramTargetsForTopic('installments');
      if (botToken && chatIds.length) {
        const adminText =
          `📌 یادآوری اقساط\n` +
          `مشتری: ${String((p as any)?.customerFullName || (p as any)?.customerName || '').trim()}\n` +
          `تاریخ: ${String((p as any)?.dueDate || '').trim()}\n` +
          `مبلغ: ${formatPriceForSms(Number((p as any)?.amount || 0))} تومان\n` +
          `وضعیت: ${eventType.replace('INSTALLMENT_', '')}`;
        await sendTelegramMessages(botToken, chatIds, adminText);
      }
      }
    } catch (e) {
      // do not fail the main flow
    }

    return;
  }


  if (eventType.startsWith('CHECK_')) {
    const c = await getInstallmentCheckDetailsForSms(targetId);
    if (!c) return;
    const recipientNumber = String(c.customerPhoneNumber || '').trim();
    const tokens = [c.customerFullName, c.checkNumber, c.dueDate, formatPriceForSms(c.amount)];

    const smsPayload: any = { provider, recipient: recipientNumber, tokens };
    if (eventType === 'CHECK_DUE_7') {
      smsPayload.meliBodyId = Number(settings.meli_payamak_check_due_7_pattern_id);
      smsPayload.kavenegarTemplate = settings.kavenegar_check_due_7_template;
      smsPayload.smsIrTemplateId = settings.sms_ir_check_due_7_template_id ? Number(settings.sms_ir_check_due_7_template_id) : undefined;
      smsPayload.ippanelPatternCode = settings.ippanel_check_due_7_pattern_code;
    } else if (eventType === 'CHECK_DUE_3') {
      smsPayload.meliBodyId = Number(settings.meli_payamak_check_due_3_pattern_id);
      smsPayload.kavenegarTemplate = settings.kavenegar_check_due_3_template;
      smsPayload.smsIrTemplateId = settings.sms_ir_check_due_3_template_id ? Number(settings.sms_ir_check_due_3_template_id) : undefined;
      smsPayload.ippanelPatternCode = settings.ippanel_check_due_3_pattern_code;
    } else if (eventType === 'CHECK_DUE_TODAY') {
      smsPayload.meliBodyId = Number(settings.meli_payamak_check_due_today_pattern_id);
      smsPayload.kavenegarTemplate = settings.kavenegar_check_due_today_template;
      smsPayload.smsIrTemplateId = settings.sms_ir_check_due_today_template_id ? Number(settings.sms_ir_check_due_today_template_id) : undefined;
      smsPayload.ippanelPatternCode = settings.ippanel_check_due_today_pattern_code;
    } else {
      return;
    }

    const values: Record<string, string> = { name: tokens[0] ?? '', checkNumber: tokens[1] ?? '', dueDate: tokens[2] ?? '', amount: tokens[3] ?? '' };
    const tgTemplateKey = (
      eventType === 'CHECK_DUE_7' ? 'telegram_check_due_7_message' :
      eventType === 'CHECK_DUE_3' ? 'telegram_check_due_3_message' :
      'telegram_check_due_today_message'
    );
    const tgTemplate = String((settings as any)[tgTemplateKey] || '').trim();
    // جایگزینی متغیرها مثل {name} {amount} {dueDate} {link}
    const build = (tpl: string, vals: Record<string, any>) => safeReplaceTemplate(tpl, vals);
    const tgText = build(tgTemplate || '🧾 یادآوری چک\nمشتری: {name}\nشماره چک: {checkNumber}\nتاریخ: {dueDate}\nمبلغ: {amount}', values);

    if (mode === 'sms' || mode === 'both') {
      await enqueueOutbox({
        channel: 'sms',
        provider,
        eventType,
        entityType: 'installment_check',
        entityId: targetId,
        recipient: recipientNumber,
        payload: smsPayload,
        dedupeToday: true,
      });
    }
    if (mode === 'telegram' || mode === 'both') {
      await enqueueOutbox({
        channel: 'telegram',
        provider: null,
        eventType,
        entityType: 'installment_check',
        entityId: targetId,
        recipient: 'telegram_chat',
        payload: { text: tgText },
        dedupeToday: true,
      });
    }
    return;
  }

  if (eventType === 'REPAIR_READY_FOR_PICKUP') {
    const r = await getRepairDetailsForSms(targetId);
    if (!r || r.finalCost == null) return;
    const recipientNumber = String(r.customerPhoneNumber || '').trim();
    const tokens = [r.customerFullName, r.deviceModel, formatPriceForSms(r.finalCost)];

    const smsPayload: any = {
      provider,
      recipient: recipientNumber,
      tokens,
      meliBodyId: Number(settings.meli_payamak_repair_ready_pattern_id),
      kavenegarTemplate: settings.kavenegar_repair_ready_template,
      smsIrTemplateId: settings.sms_ir_repair_ready_template_id ? Number(settings.sms_ir_repair_ready_template_id) : undefined,
      ippanelPatternCode: settings.ippanel_repair_ready_pattern_code,
    };

    const values: Record<string, string> = { name: tokens[0] ?? '', deviceModel: tokens[1] ?? '', finalCost: tokens[2] ?? '', repairId: String(targetId) };
    const tgTemplate = String(settings.telegram_repair_ready_message || '').trim();
    // جایگزینی متغیرها مثل {name} {amount} {dueDate} {link}
    const build = (tpl: string, vals: Record<string, any>) => safeReplaceTemplate(tpl, vals);
    const tgText = build(tgTemplate || '📦 آماده تحویل\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}\nهزینه نهایی: {finalCost}', values);

    if (mode === 'sms' || mode === 'both') {
      await enqueueOutbox({
        channel: 'sms',
        provider,
        eventType,
        entityType: 'repair',
        entityId: targetId,
        recipient: recipientNumber,
        payload: smsPayload,
        dedupeToday: true,
      });
    }
    if (mode === 'telegram' || mode === 'both') {
      await enqueueOutbox({
        channel: 'telegram',
        provider: null,
        eventType,
        entityType: 'repair',
        entityId: targetId,
        recipient: 'telegram_chat',
        payload: { text: tgText },
        dedupeToday: true,
      });
    }
  }
};

const runAutoSendRulesOnce = async () => {
  const settings = await getAllSettingsAsObject();
  const modeInstallment = normalizeAutoSendMode((settings as any).auto_send_installment_due);
  const modeCheck = normalizeAutoSendMode((settings as any).auto_send_check_due);
  const modeRepair = normalizeAutoSendMode((settings as any).auto_send_repair_ready);

  // compute target due dates in Shamsi (stored in DB as jYYYY/jMM/jDD)
  const nowJ = moment().locale('fa');
  const d0 = nowJ.clone().format('jYYYY/jMM/jDD');
  const d3 = nowJ.clone().add(3, 'day').format('jYYYY/jMM/jDD');
  const d7 = nowJ.clone().add(7, 'day').format('jYYYY/jMM/jDD');

  // installments
  if (modeInstallment !== 'off') {
    const rows = await getPendingInstallmentPaymentsWithCustomer();
    const mapDue: Record<string, string> = { [d7]: 'INSTALLMENT_DUE_7', [d3]: 'INSTALLMENT_DUE_3', [d0]: 'INSTALLMENT_DUE_TODAY' };
    for (const r of (rows || []) as any[]) {
      const et = mapDue[String(r.dueDate)];
      if (!et) continue;
      // eslint-disable-next-line no-await-in-loop
      await enqueueEventNotifications(et, Number(r.paymentId), modeInstallment === 'both' ? 'both' : (modeInstallment as any));
    }
  }

  // checks
  if (modeCheck !== 'off') {
    const rows = await getPendingInstallmentChecksWithCustomer();
    const mapDue: Record<string, string> = { [d7]: 'CHECK_DUE_7', [d3]: 'CHECK_DUE_3', [d0]: 'CHECK_DUE_TODAY' };
    for (const r of (rows || []) as any[]) {
      const et = mapDue[String(r.dueDate)];
      if (!et) continue;
      // eslint-disable-next-line no-await-in-loop
      await enqueueEventNotifications(et, Number(r.checkId), modeCheck === 'both' ? 'both' : (modeCheck as any));
    }
  }

  // repairs ready
  if (modeRepair !== 'off') {
    const rows = await getRepairsReadyForPickupFromDb();
    for (const r of (rows || []) as any[]) {
      // eslint-disable-next-line no-await-in-loop
      await enqueueEventNotifications('REPAIR_READY_FOR_PICKUP', Number(r.id), modeRepair === 'both' ? 'both' : (modeRepair as any));
    }
  }

  // process a small batch immediately
  try {
    for (let i = 0; i < 20; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const did = await processOneOutboxRow();
      if (!did) break;
    }
  } catch {}
};

let autoSendSchedulerStarted = false;
const startAutoSendScheduler = () => {
  if (autoSendSchedulerStarted) return;
  autoSendSchedulerStarted = true;
  // run daily 09:00
  try {
    cron.schedule('0 9 * * *', async () => {
      try { await runAutoSendRulesOnce(); } catch (e) { console.error('Auto-send rule error:', e); }
    });
  } catch (e) {
    console.error('Failed to start auto-send scheduler:', e);
  }
};

app.post('/api/automation/run-auto-send', authorizeRole(['Admin','Manager']), async (_req, res, next) => {
  try {
    await runAutoSendRulesOnce();
    res.json({ success: true });
  } catch (e) { next(e); }
});


// SMS Logs (آخرین ارسال‌ها)
app.get('/api/sms/logs', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
    const success = typeof req.query.success === 'string' ? String(req.query.success) : undefined;
    const eventType = typeof req.query.eventType === 'string' ? String(req.query.eventType) : undefined;
    const recipient = typeof req.query.recipient === 'string' ? String(req.query.recipient) : undefined;

    const where: string[] = [];
    const params: any[] = [];
    if (success === 'true') { where.push('success = 1'); }
    if (success === 'false') { where.push('success = 0'); }
    if (eventType && eventType !== 'ALL') { where.push('eventType = ?'); params.push(eventType); }
    if (recipient && recipient.trim()) { where.push('recipient LIKE ?'); params.push(`%${recipient.trim()}%`); }

    const sql = `SELECT * FROM sms_logs ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY id DESC LIMIT ? OFFSET ?`;
    const rows = await allAsync(sql, [...params, limit, offset]);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// Retry a previous sms log entry (pattern re-send)
app.post('/api/sms/logs/:id/retry', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'شناسه لاگ نامعتبر است.' });
    const log = await getAsync('SELECT * FROM sms_logs WHERE id = ?', [id]);
    if (!log) return res.status(404).json({ success: false, message: 'لاگ یافت نشد.' });

    const settings = await getAllSettingsAsObject();
    const provider: string = String(log.provider || settings.sms_provider || 'meli_payamak').toLowerCase();
    const recipientNumber = String(log.recipient || '').trim();
    const tokens: string[] = log.tokensJson ? JSON.parse(String(log.tokensJson) || '[]') : [];
    const patternId = String(log.patternId || '').trim();
    if (!recipientNumber) return res.status(400).json({ success: false, message: 'شماره گیرنده در لاگ موجود نیست.' });
    if (!patternId) return res.status(400).json({ success: false, message: 'شناسه پترن در لاگ موجود نیست.' });

    let result: any;
    if (provider === 'meli_payamak') {
      const username = settings.meli_payamak_username;
      const password = settings.meli_payamak_password;
      const bid = Number(patternId);
      if (!username || !password) return res.status(400).json({ success: false, message: 'نام کاربری/رمز عبور ملی پیامک در تنظیمات وارد نشده است.' });
      if (!bid || isNaN(bid)) return res.status(400).json({ success: false, message: 'BodyId نامعتبر است.' });
      result = await sendMeliPayamakPatternSms(recipientNumber, bid, tokens, username, password);
    } else {
      return res.status(400).json({ success: false, message: 'ارسال مجدد فعلاً فقط برای ملی پیامک فعال است.' });
    }

    await insertSmsLog({
      correlationId,
      reqUser: req.user,
      provider,
      eventType: String(log.eventType || 'RETRY'),
      entityType: log.entityType || inferEntityTypeFromEvent(log.eventType),
      entityId: log.entityId ? Number(log.entityId) : undefined,
      recipient: recipientNumber,
      patternId,
      tokens,
      success: !!result?.success,
      response: result,
      error: result?.success ? undefined : result?.message,
      relatedLogId: id,
    });

    if (result?.success) return res.json({ success: true, message: 'ارسال مجدد انجام شد.', data: result });
    return res.status(500).json({ success: false, message: result?.message || 'خطا در ارسال مجدد', data: result });
  } catch (e) { next(e); }
});

app.post('/api/sms/trigger-event', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const { targetId, eventType } = req.body || {};
    const correlationId = makeCorrId();
    if (!targetId || isNaN(Number(targetId))) return res.status(400).json({ success: false, message: 'شناسه هدف نامعتبر است.' });

    const settings = await getAllSettingsAsObject();
    // Determine which SMS provider to use. Default to MeliPayamak if none is set.
    const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();

    // Will hold common values across providers
    let recipientNumber = '';
    let tokens: string[] = [];
    let meliBodyId: number | undefined;
    let kavenegarTemplate: string | undefined;
    let smsIrTemplateId: number | undefined;
    let ippanelPatternCode: string | undefined;
    let telegramTemplate: string | undefined;

    // Prepare data based on event type
    if (eventType === 'INSTALLMENT_REMINDER') {
      const p = await getInstallmentPaymentDetailsForSms(targetId);
      if (!p) throw new Error('اطلاعات قسط یافت نشد.');
      recipientNumber = p.customerPhoneNumber;
      // For all providers we build tokens in order: name, amount, due date
      tokens = [p.customerFullName, formatPriceForSms(p.amountDue), p.dueDate];
      // Provider-specific pattern/template identifiers
      // Default pattern for "یادآوری قسط (کلی)" if setting is empty
      meliBodyId = Number(settings.meli_payamak_installment_reminder_pattern_id) || 341283;
      kavenegarTemplate = settings.kavenegar_installment_template;
      smsIrTemplateId = settings.sms_ir_installment_template_id ? Number(settings.sms_ir_installment_template_id) : undefined;
      ippanelPatternCode = settings.ippanel_installment_pattern_code;
    } else if (eventType === 'INSTALLMENT_COMPLETED') {
      const s = await getInstallmentSaleDetailsForSms(targetId);
      if (!s) throw new Error('اطلاعات فروش اقساطی یافت نشد.');
      recipientNumber = s.customerPhoneNumber;
      // Tokens: name, sale id, total sale price
      tokens = [s.customerFullName, String(s.saleId), formatPriceForSms(s.totalPrice)];
      meliBodyId = settings.meli_payamak_installment_completed_pattern_id ? Number(settings.meli_payamak_installment_completed_pattern_id) : undefined;
      kavenegarTemplate = settings.kavenegar_installment_completed_template;
      smsIrTemplateId = settings.sms_ir_installment_completed_template_id ? Number(settings.sms_ir_installment_completed_template_id) : undefined;
      ippanelPatternCode = settings.ippanel_installment_completed_pattern_code;
      telegramTemplate = settings.telegram_installment_completed_message;
    } else if (eventType === 'REPAIR_RECEIVED') {
      const r = await getRepairDetailsForSms(targetId);
      if (!r) throw new Error('اطلاعات تعمیر یافت نشد.');
      recipientNumber = r.customerPhoneNumber;
      // Tokens: name, device model, repair ID
      tokens = [r.customerFullName, r.deviceModel, String(r.id)];
      meliBodyId = Number(settings.meli_payamak_repair_received_pattern_id);
      kavenegarTemplate = settings.kavenegar_repair_received_template;
      smsIrTemplateId = settings.sms_ir_repair_received_template_id ? Number(settings.sms_ir_repair_received_template_id) : undefined;
      ippanelPatternCode = settings.ippanel_repair_received_pattern_code;
    } else if (eventType === 'REPAIR_COST_ESTIMATED') {
      const r = await getRepairDetailsForSms(targetId);
      if (!r || r.estimatedCost == null) throw new Error('اطلاعات هزینه تخمینی یافت نشد.');
      recipientNumber = r.customerPhoneNumber;
      tokens = [r.customerFullName, r.deviceModel, formatPriceForSms(r.estimatedCost)];
      meliBodyId = Number(settings.meli_payamak_repair_cost_estimated_pattern_id);
      kavenegarTemplate = settings.kavenegar_repair_cost_estimated_template;
      smsIrTemplateId = settings.sms_ir_repair_cost_estimated_template_id ? Number(settings.sms_ir_repair_cost_estimated_template_id) : undefined;
      ippanelPatternCode = settings.ippanel_repair_cost_estimated_pattern_code;
    } else if (eventType === 'REPAIR_READY_FOR_PICKUP') {
      const r = await getRepairDetailsForSms(targetId);
      if (!r || r.finalCost == null) throw new Error('اطلاعات هزینه نهایی یافت نشد.');
      recipientNumber = r.customerPhoneNumber;
      tokens = [r.customerFullName, r.deviceModel, formatPriceForSms(r.finalCost)];
      meliBodyId = Number(settings.meli_payamak_repair_ready_pattern_id);
      kavenegarTemplate = settings.kavenegar_repair_ready_template;
      smsIrTemplateId = settings.sms_ir_repair_ready_template_id ? Number(settings.sms_ir_repair_ready_template_id) : undefined;
      ippanelPatternCode = settings.ippanel_repair_ready_pattern_code;
    } else if (eventType === 'INSTALLMENT_DUE_7' || eventType === 'INSTALLMENT_DUE_3' || eventType === 'INSTALLMENT_DUE_TODAY') {
      // Installment payment due reminders: 7 days, 3 days, or same-day
      const p = await getInstallmentPaymentDetailsForSms(targetId);
      if (!p) throw new Error('اطلاعات قسط یافت نشد.');
      recipientNumber = p.customerPhoneNumber;
      // Tokens: customer name, amount due, due date
      tokens = [p.customerFullName, formatPriceForSms(p.amountDue), p.dueDate];
      // Choose correct template/pattern based on days remaining
      if (eventType === 'INSTALLMENT_DUE_7') {
        meliBodyId = Number(settings.meli_payamak_installment_due_7_pattern_id);
        kavenegarTemplate = settings.kavenegar_installment_due_7_template;
        smsIrTemplateId = settings.sms_ir_installment_due_7_template_id ? Number(settings.sms_ir_installment_due_7_template_id) : undefined;
        ippanelPatternCode = settings.ippanel_installment_due_7_pattern_code;
        telegramTemplate = settings.telegram_installment_due_7_message;
      } else if (eventType === 'INSTALLMENT_DUE_3') {
        meliBodyId = Number(settings.meli_payamak_installment_due_3_pattern_id);
        kavenegarTemplate = settings.kavenegar_installment_due_3_template;
        smsIrTemplateId = settings.sms_ir_installment_due_3_template_id ? Number(settings.sms_ir_installment_due_3_template_id) : undefined;
        ippanelPatternCode = settings.ippanel_installment_due_3_pattern_code;
        telegramTemplate = settings.telegram_installment_due_3_message;
      } else {
        // Same-day reminder
        meliBodyId = Number(settings.meli_payamak_installment_due_today_pattern_id);
        kavenegarTemplate = settings.kavenegar_installment_due_today_template;
        smsIrTemplateId = settings.sms_ir_installment_due_today_template_id ? Number(settings.sms_ir_installment_due_today_template_id) : undefined;
        ippanelPatternCode = settings.ippanel_installment_due_today_pattern_code;
        telegramTemplate = settings.telegram_installment_due_today_message;
      }
    } else if (eventType === 'CHECK_DUE_7' || eventType === 'CHECK_DUE_3' || eventType === 'CHECK_DUE_TODAY') {
      // Installment check due reminders: 7 days, 3 days, or same-day
      const c = await getInstallmentCheckDetailsForSms(targetId);
      if (!c) throw new Error('اطلاعات چک یافت نشد.');
      recipientNumber = c.customerPhoneNumber;
      // Tokens: customer name, check number, due date
      tokens = [c.customerFullName, c.checkNumber, c.dueDate, formatPriceForSms(c.amount)];
      if (eventType === 'CHECK_DUE_7') {
        meliBodyId = Number(settings.meli_payamak_check_due_7_pattern_id);
        kavenegarTemplate = settings.kavenegar_check_due_7_template;
        smsIrTemplateId = settings.sms_ir_check_due_7_template_id ? Number(settings.sms_ir_check_due_7_template_id) : undefined;
        ippanelPatternCode = settings.ippanel_check_due_7_pattern_code;
        telegramTemplate = settings.telegram_check_due_7_message;
      } else if (eventType === 'CHECK_DUE_3') {
        meliBodyId = Number(settings.meli_payamak_check_due_3_pattern_id);
        kavenegarTemplate = settings.kavenegar_check_due_3_template;
        smsIrTemplateId = settings.sms_ir_check_due_3_template_id ? Number(settings.sms_ir_check_due_3_template_id) : undefined;
        ippanelPatternCode = settings.ippanel_check_due_3_pattern_code;
        telegramTemplate = settings.telegram_check_due_3_message;
      } else {
        meliBodyId = Number(settings.meli_payamak_check_due_today_pattern_id);
        kavenegarTemplate = settings.kavenegar_check_due_today_template;
        smsIrTemplateId = settings.sms_ir_check_due_today_template_id ? Number(settings.sms_ir_check_due_today_template_id) : undefined;
        ippanelPatternCode = settings.ippanel_check_due_today_pattern_code;
        telegramTemplate = settings.telegram_check_due_today_message;
      }
    } else {
      throw new Error('نوع رویداد نامعتبر است.');
    }

    if (!recipientNumber) throw new Error('شماره تماس گیرنده یافت نشد.');

    let smsResult;
    try {
      switch (provider) {
        case 'meli_payamak': {
          const username = settings.meli_payamak_username;
          const password = settings.meli_payamak_password;
          if (!username || !password) throw new Error('نام کاربری یا رمز عبور پنل ملی پیامک در تنظیمات وجود ندارد.');
          if (!meliBodyId) throw new Error('شناسه الگوی پیامک ملی پیامک یافت نشد.');
          smsResult = await sendMeliPayamakPatternSms(recipientNumber, meliBodyId, tokens, username, password);
          break;
        }
        case 'kavenegar': {
          const apiKey = settings.kavenegar_api_key;
          if (!apiKey) throw new Error('کلید API کاوه‌نگار در تنظیمات وجود ندارد.');
          if (!kavenegarTemplate) throw new Error('نام قالب کاوه‌نگار یافت نشد.');
          smsResult = await sendKavenegarPatternSms(recipientNumber, kavenegarTemplate, tokens, apiKey);
          break;
        }
        case 'sms_ir': {
          const apiKey = settings.sms_ir_api_key;
          if (!apiKey) throw new Error('کلید API سرویس SMS.ir در تنظیمات وجود ندارد.');
          if (!smsIrTemplateId) throw new Error('شناسه قالب SMS.ir یافت نشد.');
          smsResult = await sendSmsIrPatternSms(recipientNumber, smsIrTemplateId, tokens, apiKey);
          break;
        }
        case 'ippanel': {
          const tokenAuth = settings.ippanel_token;
          const fromNumber = settings.ippanel_from_number;
          if (!tokenAuth || !fromNumber) throw new Error('توکن یا شماره فرستنده IPPanel در تنظیمات وجود ندارد.');
          if (!ippanelPatternCode) throw new Error('کد الگو برای IPPanel یافت نشد.');
          smsResult = await sendIppanelPatternSms(recipientNumber, ippanelPatternCode, tokens, tokenAuth, fromNumber);
          break;
        }
        case 'telegram': {
          setTelegramProxy((settings as any).telegram_proxy);
          const botToken = settings.telegram_bot_token;
          const chatId = settings.telegram_chat_id;
          if (!botToken || !chatId) throw new Error('توکن ربات یا شناسه چت تلگرام در تنظیمات وجود ندارد.');
          if (!telegramTemplate) throw new Error('قالب پیام تلگرام یافت نشد.');
          // Build message by replacing placeholders {name}, {amount}, {dueDate}, {checkNumber}
          const buildMessage = (template: string, values: Record<string, string>): string => {
            return template.replace(/\{(\w+)\}/g, (_m, p) => {
              return values[p] !== undefined ? values[p] : '';
            });
          };
          const values: Record<string, string> = {
            name: tokens[0] ?? '',
            amount: tokens[1] ?? '',
            dueDate: tokens[2] ?? '',
            checkNumber: tokens[1] ?? '',
            saleId: tokens[1] ?? '',
            total: tokens[2] ?? '',
          };
          const text = buildMessage(telegramTemplate, values);
          smsResult = await sendTelegramMessage(botToken, chatId, text);
          break;
        }
        default:
          throw new Error('سرویس دهنده پیامک ناشناخته است.');
      }
    } catch (err) {
      // If provider-specific error thrown, wrap to unify error handling
      return next(err);
    }

    // Store sms log
    await insertSmsLog({
      reqUser: req.user,
      provider,
      eventType,
      entityType: inferEntityTypeFromEvent(eventType),
      entityId: Number(targetId),
      recipient: recipientNumber,
      patternId: provider === 'meli_payamak' ? String(meliBodyId ?? '') : (provider === 'kavenegar' ? String(kavenegarTemplate ?? '') : (provider === 'sms_ir' ? String(smsIrTemplateId ?? '') : (provider === 'ippanel' ? String(ippanelPatternCode ?? '') : (provider === 'telegram' ? 'TELEGRAM' : '')))),
      tokens,
      success: !!smsResult?.success,
      response: smsResult,
      request: { eventType, targetId: Number(targetId), provider, patternId: String(meliBodyId ?? kavenegarTemplate ?? smsIrTemplateId ?? ''), recipient: recipientNumber, tokensCount: tokens.length },
      httpStatus: (smsResult as any)?.details?.httpStatus,
      rawResponseText: (smsResult as any)?.details?.rawResponseText,
      durationMs: (smsResult as any)?.details?.durationMs,
      error: smsResult?.success ? undefined : smsResult?.message,
    });

    // Respond to client based on SMS result
    if (smsResult && smsResult.success) {
      res.status(200).json({ success: true, message: 'پیامک با موفقیت زمان‌بندی شد.', data: smsResult });
    } else {
      const msg = smsResult?.message || 'خطا در ارسال پیامک';
      res.status(500).json({ success: false, message: `خطا از سرویس پیامک: ${msg}`, data: smsResult });
    }
  } catch (e) { next(e); }
});


// ======================= Telegram Notifications =======================
// بررسی اتصال ربات تلگرام (getMe)
app.get('/api/telegram/health', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const settings = await getAllSettingsAsObject();
    setTelegramProxy((settings as any).telegram_proxy);
    const botToken = String(settings.telegram_bot_token || '').trim();
    if (!botToken) return res.status(400).json({ success: false, message: 'توکن ربات تلگرام تنظیم نشده است.' });

    const result = await getTelegramBotInfo(botToken);

    // audit log (in sms_logs for unified viewer)
    try {
      await insertSmsLog({
        reqUser: (req as any).user,
        provider: 'telegram',
        eventType: 'HEALTH_CHECK',
        entityType: 'telegram',
        entityId: null as any,
        recipient: 'telegram:getMe',
        patternId: 'TELEGRAM_GETME',
        tokens: [],
        success: !!result?.success,
        response: result,
        error: result?.success ? undefined : result?.message,
      });
    } catch {}

    if (result?.success) {
      const bot = (result as any)?.data?.result;
      return res.json({
        success: true,
        message: 'اتصال تلگرام برقرار است.',
        data: {
          bot,
        },
      });
    }
    return res.status(500).json({ success: false, message: result?.message || 'خطا در بررسی اتصال تلگرام', data: result });
  } catch (e) { next(e); }
});

// -----------------------------------------------------
// Telegram per-topic configuration (chat ids + enabled types)
// -----------------------------------------------------
const TOPIC_CHATID_KEYS: Record<string, string> = {
  reports: 'telegram_chat_ids_reports',
  installments: 'telegram_chat_ids_installments',
  sales: 'telegram_chat_ids_sales',
  notifications: 'telegram_chat_ids_notifications',
};

app.get('/api/telegram/topic-config/:topic', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const topic = String(req.params.topic || '').trim();
    if (!TOPIC_CHATID_KEYS[topic]) return res.status(400).json({ success: false, message: 'Topic نامعتبر است.' });
    const settings = await getAllSettingsAsObject();
    const chatIdsText = String((settings as any)[TOPIC_CHATID_KEYS[topic]] || '');
    const typesKey = TOPIC_TYPES_KEYS[topic];
    let enabledTypes: string[] = [];
    const raw = String((settings as any)[typesKey] || '').trim();
    if (raw) {
      try { enabledTypes = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []; }
      catch { enabledTypes = raw.split(/[,\n\r\t\s]+/g).map(s => s.trim()).filter(Boolean); }
    }
    return res.json({ success: true, data: { chatIdsText, enabledTypes } });
  } catch (e) { next(e); }
});

app.post('/api/telegram/topic-config/:topic', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const topic = String(req.params.topic || '').trim();
    if (!TOPIC_CHATID_KEYS[topic]) return res.status(400).json({ success: false, message: 'Topic نامعتبر است.' });
    const chatIdsText = String(req.body?.chatIdsText || '');
    const enabledTypes = Array.isArray(req.body?.enabledTypes) ? (req.body.enabledTypes as any[]).map(x => String(x)) : [];

    const payload: any = {};
    payload[TOPIC_CHATID_KEYS[topic]] = chatIdsText;
    payload[TOPIC_TYPES_KEYS[topic]] = enabledTypes.length ? JSON.stringify(enabledTypes) : '';
    const settingsArray: SettingItem[] = Object.keys(payload).map(key => ({ key, value: payload[key] }));
    await updateMultipleSettings(settingsArray);
    return res.json({ success: true });
  } catch (e) { next(e); }
});



    // -----------------------------------------------------
    // Telegram per-topic templates (edit/preview/test)
    // -----------------------------------------------------
    const tplKey = (topic: string, type: string) => `telegram_tpl_${topic}_${type}`.toLowerCase();

    const getTopicTemplates = async (topic: string, types: string[]) => {
      const settings = await getAllSettingsAsObject();
      const out: Record<string, string> = {};
      for (const t of types) {
        const k = tplKey(topic, t);
        out[t] = String((settings as any)[k] || '');
      }
      return out;
    };

    const upsertTopicTemplates = async (topic: string, templates: Record<string, string>) => {
      const settingsArray: SettingItem[] = Object.keys(templates).map((t) => ({
        key: tplKey(topic, t),
        value: String(templates[t] ?? ''),
      }));
      if (settingsArray.length) await updateMultipleSettings(settingsArray);
    };

    const getSampleVarsForTopic = async (topic: string) => {
      // Provide sane sample data for preview/test (latest entities)
      try {
        const nowText = moment().locale('fa').format('jYYYY/jMM/jDD HH:mm');
        if (topic === 'sales') {
          const inv = await getAsync(`SELECT * FROM invoices ORDER BY id DESC LIMIT 1`);
          const cust = inv?.customerId ? await getAsync(`SELECT * FROM customers WHERE id=?`, [inv.customerId]) : null;
          const invoiceNo = inv?.invoiceNumber || (inv?.id ? `INV-${inv.id}` : 'INV-1001');
          const total = Number(inv?.grandTotal || inv?.subtotal || 0);
          const customerName = cust?.name || cust?.fullName || 'مشتری نمونه';
          const customerPhone = cust?.phone || cust?.mobile || '';
          return {
            invoiceId: inv?.id ?? 0,
            invoiceNo,
            total,
            subtotal: Number(inv?.subtotal || 0),
            discount: Number(inv?.discountAmount || 0),
            customerId: cust?.id ?? inv?.customerId ?? 0,
            customerName,
            customerPhone,
            date: inv?.date || new Date().toISOString(),
          };
        }

        if (topic === 'installments') {
          const sale = await getAsync(`SELECT * FROM installment_sales ORDER BY id DESC LIMIT 1`);
          const cust = sale?.customerId ? await getAsync(`SELECT * FROM customers WHERE id=?`, [sale.customerId]) : null;
          const customerName = cust?.name || cust?.fullName || 'مشتری نمونه';
          const customerPhone = cust?.phone || cust?.mobile || '';
          return {
            installmentSaleId: sale?.id ?? 0,
            customerId: cust?.id ?? sale?.customerId ?? 0,
            customerName,
            customerPhone,
            amount: Number(sale?.installmentAmount || 0),
            installments: Number(sale?.numberOfInstallments || 0),
            startDate: String(sale?.installmentsStartDate || '1405/01/01'),
            downPayment: Number(sale?.downPayment || 0),
            total: Number(sale?.actualSalePrice || 0),
            saleType: String(sale?.saleType || 'installment'),
          };
        }

        if (topic === 'reports') {
          // last 7 days summary from invoices
          const to = new Date();
          const from = new Date(Date.now() - 7 * 24 * 3600 * 1000);
          const fromIso = from.toISOString().slice(0, 10);
          const toIso = to.toISOString().slice(0, 10);
          // Telegram-facing dates should be Shamsi (Jalali)
          const fromJ = moment(fromIso).locale('fa').format('jYYYY/jMM/jDD');
          const toJ = moment(toIso).locale('fa').format('jYYYY/jMM/jDD');
          const row = await getAsync(
            `SELECT COALESCE(SUM(grandTotal),0) as sumSales, COUNT(*) as countInv FROM invoices WHERE date(date) BETWEEN date(?) AND date(?)`,
            [fromIso, toIso]
          );
          return {
            fromDate: fromJ,
            toDate: toJ,
            fromISO: fromIso,
            toISO: toIso,
            sumSales: Number(row?.sumSales || 0),
            invoiceCount: Number(row?.countInv || 0),
          };
        }

        return { now: nowText };
      } catch {
        return { now: nowText };
      }
    };

    // GET topic config + templates for provided types
    app.get('/api/telegram/topic-config/:topic/templates', authorizeRole(['Admin','Manager']), async (req, res, next) => {
      try {
        const topic = String(req.params.topic || '').trim();
        if (!TOPIC_CHATID_KEYS[topic]) return res.status(400).json({ success: false, message: 'Topic نامعتبر است.' });
        const rawTypes = String(req.query.types || '').trim();
        const types = rawTypes ? rawTypes.split(/[\n\t\s,]+/g).map(s => s.trim()).filter(Boolean) : [];
        const templates = types.length ? await getTopicTemplates(topic, types) : {};
        const sample = await getSampleVarsForTopic(topic);
        return res.json({ success: true, data: { templates, sample } });
      } catch (e) { next(e); }
    });

    // Save templates for topic
    app.post('/api/telegram/topic-config/:topic/templates', authorizeRole(['Admin','Manager']), async (req, res, next) => {
      try {
        const topic = String(req.params.topic || '').trim();
        if (!TOPIC_CHATID_KEYS[topic]) return res.status(400).json({ success: false, message: 'Topic نامعتبر است.' });
        const templates = (req.body?.templates && typeof req.body.templates === 'object') ? req.body.templates : {};
        await upsertTopicTemplates(topic, templates);
        return res.json({ success: true });
      } catch (e) { next(e); }
    });

    // Preview a template with sample vars
    app.post('/api/telegram/topic-config/:topic/preview', authorizeRole(['Admin','Manager']), async (req, res, next) => {
      try {
        const topic = String(req.params.topic || '').trim();
        if (!TOPIC_CHATID_KEYS[topic]) return res.status(400).json({ success: false, message: 'Topic نامعتبر است.' });
        const type = String(req.body?.type || '').trim();
        const tpl = String(req.body?.template || '').trim();
        if (!type) return res.status(400).json({ success: false, message: 'نوع پیام مشخص نیست.' });
        const sample = await getSampleVarsForTopic(topic);
        const settings = await getAllSettingsAsObject();
        const baseUrl = String(settings.app_base_url || '').trim();
        const link =
          topic === 'sales' ? `${baseUrl}/#/sales` :
          topic === 'installments' ? `${baseUrl}/#/installment-sales` :
          `${baseUrl}/#/reports`;
        const vars = { ...sample, link, now: moment().locale('fa').format('jYYYY/jMM/jDD HH:mm') };
        const text = safeReplaceTemplate(tpl, vars);
        return res.json({ success: true, data: { text, sample: vars } });
      } catch (e) { next(e); }
    });

    // Send a test message for a template to topic chat ids
    app.post('/api/telegram/topic-config/:topic/test', authorizeRole(['Admin','Manager']), async (req, res, next) => {
      try {
        const topic = String(req.params.topic || '').trim();
        if (!TOPIC_CHATID_KEYS[topic]) return res.status(400).json({ success: false, message: 'Topic نامعتبر است.' });
        const type = String(req.body?.type || '').trim();
        const tpl = String(req.body?.template || '').trim();
        if (!type) return res.status(400).json({ success: false, message: 'نوع پیام مشخص نیست.' });

        const settings = await getAllSettingsAsObject();
        setTelegramProxy((settings as any).telegram_proxy);
        const botToken = String(settings.telegram_bot_token || '').trim();
        if (!botToken) return res.status(400).json({ success: false, message: 'توکن تلگرام تنظیم نشده است.' });
        const { chatIds } = await getTelegramTargetsForTopic(topic as any);
        if (!chatIds.length) return res.status(400).json({ success: false, message: 'Chat ID مقصد برای این بخش تنظیم نشده است.' });

        const sample = await getSampleVarsForTopic(topic);
        const baseUrl = String(settings.app_base_url || '').trim();
        const link =
          topic === 'sales' ? `${baseUrl}/#/sales` :
          topic === 'installments' ? `${baseUrl}/#/installment-sales` :
          `${baseUrl}/#/reports`;
        const vars = { ...sample, link, now: moment().locale('fa').format('jYYYY/jMM/jDD HH:mm') };
        const text = safeReplaceTemplate(tpl, vars);

        const results: any[] = [];
        let sent = 0;
        for (const cid of chatIds) {
          const r = await sendTelegramMessage(botToken, cid, text);
          results.push({ chatId: cid, success: !!(r as any)?.success, message: (r as any)?.message });
          if ((r as any)?.success) sent++;
        }
        return res.json({ success: true, data: { sent, total: chatIds.length, results } });
      } catch (e) { next(e); }
    });

// ارسال تست پیام تلگرام (متن ساده)
app.post('/api/telegram/test-message', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const { text } = req.body || {};
    const settings = await getAllSettingsAsObject();
    setTelegramProxy((settings as any).telegram_proxy);
    const botToken = String(settings.telegram_bot_token || '').trim();
    const chatId = String(settings.telegram_chat_id || '').trim();
    if (!botToken || !chatId) return res.status(400).json({ success: false, message: 'توکن ربات یا Chat ID تلگرام تنظیم نشده است.' });
    const msg = String(text || '').trim();
    if (!msg) return res.status(400).json({ success: false, message: 'متن پیام خالی است.' });

    const result = await sendTelegramMessage(botToken, chatId, msg);

    // log like sms_logs for uniform audit
    try {
      await insertSmsLog({
        reqUser: req.user,
        provider: 'telegram',
        eventType: 'TEST_MESSAGE',
        entityType: 'telegram',
        entityId: null as any,
        recipient: chatId,
        patternId: 'TELEGRAM_TEXT',
        tokens: [msg],
        success: !!result?.success,
        response: result,
        error: result?.success ? undefined : result?.message,
      });
    } catch {}

    if (result?.success) return res.json({ success: true, message: 'پیام تلگرام ارسال شد.', data: result });
    return res.status(500).json({ success: false, message: result?.message || 'خطا در ارسال تلگرام', data: result });
  } catch (e) { next(e); }
});

// Telegram Logs (بر اساس sms_logs اما فقط provider=telegram)
app.get('/api/telegram/logs', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
    const success = typeof req.query.success === 'string' ? String(req.query.success) : undefined;
    const eventType = typeof req.query.eventType === 'string' ? String(req.query.eventType) : undefined;
    const recipient = typeof req.query.recipient === 'string' ? String(req.query.recipient) : undefined;

    const where: string[] = ['provider = ?'];
    const params: any[] = ['telegram'];
    if (success === 'true') where.push('success = 1');
    if (success === 'false') where.push('success = 0');
    if (eventType && eventType !== 'ALL') { where.push('eventType = ?'); params.push(eventType); }
    if (recipient && recipient.trim()) { where.push('recipient LIKE ?'); params.push(`%${recipient.trim()}%`); }

    const sql = `SELECT * FROM sms_logs WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const rows = await allAsync(sql, [...params, limit, offset]);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// ارسال تلگرام بر اساس رویداد (مشابه SMS trigger-event)
app.post('/api/telegram/trigger-event', authorizeRole(['Admin','Manager','Salesperson']), async (req, res, next) => {
  try {
    const { targetId, eventType } = req.body || {};
    const correlationId = makeCorrId();
    if (!targetId || isNaN(Number(targetId))) return res.status(400).json({ success: false, message: 'شناسه هدف نامعتبر است.' });
    if (!eventType) return res.status(400).json({ success: false, message: 'نوع رویداد نامعتبر است.' });

    const settings = await getAllSettingsAsObject();
    setTelegramProxy((settings as any).telegram_proxy);
    const botToken = String(settings.telegram_bot_token || '').trim();
    const chatId = String(settings.telegram_chat_id || '').trim();
    if (!botToken || !chatId) return res.status(400).json({ success: false, message: 'توکن ربات یا Chat ID تلگرام تنظیم نشده است.' });

    let tokens: string[] = [];
    let template: string | undefined;

    if (eventType === 'INSTALLMENT_REMINDER') {
      const p = await getInstallmentPaymentDetailsForSms(targetId);
      if (!p) throw new Error('اطلاعات قسط یافت نشد.');
      tokens = [p.customerFullName, formatPriceForSms(p.amountDue), p.dueDate];
      template = settings.telegram_installment_reminder_message;
    } else if (eventType === 'INSTALLMENT_COMPLETED') {
      const s = await getInstallmentSaleDetailsForSms(targetId);
      if (!s) throw new Error('اطلاعات فروش اقساطی یافت نشد.');
      tokens = [s.customerFullName, String(s.saleId), formatPriceForSms(s.totalPrice)];
      template = settings.telegram_installment_completed_message;
    } else if (eventType === 'INSTALLMENT_DUE_7') {
      const p = await getInstallmentPaymentDetailsForSms(targetId);
      if (!p) throw new Error('اطلاعات قسط یافت نشد.');
      tokens = [p.customerFullName, formatPriceForSms(p.amountDue), p.dueDate];
      template = settings.telegram_installment_due_7_message;
    } else if (eventType === 'INSTALLMENT_DUE_3') {
      const p = await getInstallmentPaymentDetailsForSms(targetId);
      if (!p) throw new Error('اطلاعات قسط یافت نشد.');
      tokens = [p.customerFullName, formatPriceForSms(p.amountDue), p.dueDate];
      template = settings.telegram_installment_due_3_message;
    } else if (eventType === 'INSTALLMENT_DUE_TODAY') {
      const p = await getInstallmentPaymentDetailsForSms(targetId);
      if (!p) throw new Error('اطلاعات قسط یافت نشد.');
      tokens = [p.customerFullName, formatPriceForSms(p.amountDue), p.dueDate];
      template = settings.telegram_installment_due_today_message;
    } else if (eventType === 'CHECK_DUE_7') {
      const c = await getInstallmentCheckDetailsForSms(targetId);
      if (!c) throw new Error('اطلاعات چک یافت نشد.');
      tokens = [c.customerFullName, c.checkNumber, c.dueDate, formatPriceForSms(c.amount)];
      template = settings.telegram_check_due_7_message;
    } else if (eventType === 'CHECK_DUE_3') {
      const c = await getInstallmentCheckDetailsForSms(targetId);
      if (!c) throw new Error('اطلاعات چک یافت نشد.');
      tokens = [c.customerFullName, c.checkNumber, c.dueDate, formatPriceForSms(c.amount)];
      template = settings.telegram_check_due_3_message;
    } else if (eventType === 'CHECK_DUE_TODAY') {
      const c = await getInstallmentCheckDetailsForSms(targetId);
      if (!c) throw new Error('اطلاعات چک یافت نشد.');
      tokens = [c.customerFullName, c.checkNumber, c.dueDate, formatPriceForSms(c.amount)];
      template = settings.telegram_check_due_today_message;
    } else if (eventType === 'REPAIR_RECEIVED') {
      const r = await getRepairDetailsForSms(targetId);
      if (!r) throw new Error('اطلاعات تعمیر یافت نشد.');
      tokens = [r.customerFullName, r.deviceModel, String(r.id)];
      template = settings.telegram_repair_received_message;
    } else if (eventType === 'REPAIR_COST_ESTIMATED') {
      const r = await getRepairDetailsForSms(targetId);
      if (!r || r.estimatedCost == null) throw new Error('اطلاعات هزینه تخمینی یافت نشد.');
      tokens = [r.customerFullName, r.deviceModel, String(r.id), formatPriceForSms(r.estimatedCost)];
      template = settings.telegram_repair_cost_estimated_message;
    } else if (eventType === 'REPAIR_READY_FOR_PICKUP') {
      const r = await getRepairDetailsForSms(targetId);
      if (!r || r.finalCost == null) throw new Error('اطلاعات هزینه نهایی یافت نشد.');
      tokens = [r.customerFullName, r.deviceModel, String(r.id), formatPriceForSms(r.finalCost)];
      template = settings.telegram_repair_ready_message;
    } else {
      throw new Error('نوع رویداد نامعتبر است.');
    }

    // Default templates (fallback) if admin hasn't set one yet
    if (!template) {
      switch (eventType) {
        case 'INSTALLMENT_REMINDER':
          template = '🔔 یادآوری قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}';
          break;
        case 'INSTALLMENT_COMPLETED':
          template = '✅ تسویه اقساط\nمشتری: {name}\nشماره فروش: {saleId}\nمبلغ کل: {total}';
          break;
        case 'INSTALLMENT_DUE_7':
          template = '⏳ ۷ روز مانده تا سررسید قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}';
          break;
        case 'INSTALLMENT_DUE_3':
          template = '⏳ ۳ روز مانده تا سررسید قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}';
          break;
        case 'INSTALLMENT_DUE_TODAY':
          template = '⏰ امروز سررسید قسط است\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}';
          break;
        case 'CHECK_DUE_7':
          template = '🧾 ۷ روز مانده تا سررسید چک\nمشتری: {name}\nشماره چک: {checkNumber}\nتاریخ: {dueDate}\nمبلغ: {amount}';
          break;
        case 'CHECK_DUE_3':
          template = '🧾 ۳ روز مانده تا سررسید چک\nمشتری: {name}\nشماره چک: {checkNumber}\nتاریخ: {dueDate}\nمبلغ: {amount}';
          break;
        case 'CHECK_DUE_TODAY':
          template = '🧾 امروز سررسید چک است\nمشتری: {name}\nشماره چک: {checkNumber}\nتاریخ: {dueDate}\nمبلغ: {amount}';
          break;
        case 'REPAIR_RECEIVED':
          template = '📥 پذیرش تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}';
          break;
        case 'REPAIR_COST_ESTIMATED':
          template = '🧮 برآورد هزینه تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}\nهزینه: {estimatedCost}';
          break;
        case 'REPAIR_READY_FOR_PICKUP':
          template = '📦 آماده تحویل\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}\nهزینه نهایی: {finalCost}';
          break;
      }
    }

    const values: Record<string, string> = {
      name: tokens[0] ?? '',
      amount: tokens[1] ?? '',
      dueDate: tokens[2] ?? '',
      saleId: tokens[1] ?? '',
      total: tokens[2] ?? '',
      checkNumber: tokens[1] ?? '',
      deviceModel: tokens[1] ?? '',
      repairId: tokens[2] ?? '',
      estimatedCost: tokens[3] ?? '',
      finalCost: tokens[3] ?? '',
    };

    const text = String(template).replace(/\{(\w+)\}/g, (_m, p) => (values[p] ?? ''));

    const result = await sendTelegramMessage(botToken, chatId, text);

    try {
      await insertSmsLog({
        reqUser: req.user,
        provider: 'telegram',
        eventType,
        entityType: inferEntityTypeFromEvent(eventType) as any,
        entityId: Number(targetId),
        recipient: chatId,
        patternId: 'TELEGRAM_TEMPLATE',
        tokens,
        success: !!result?.success,
        response: result,
        error: result?.success ? undefined : result?.message,
      });
    } catch {}

    if (result?.success) return res.json({ success: true, message: 'تلگرام ارسال شد.', data: result });
    return res.status(500).json({ success: false, message: result?.message || 'خطا در ارسال تلگرام', data: result });
  } catch (e) { next(e); }
});

// =====================================================
// 17) مرکز تعمیرات
// =====================================================
app.post('/api/repairs', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try {
    const created = await createRepairInDb(req.body as NewRepairData);
    if (req.user) {
      try { addAuditLog(req.user.id, req.user.username, req.user.roleName, 'create', 'repair', created?.id || null, `ثبت تعمیر #${created?.id ?? ''}`); } catch {}
    }
    res.status(201).json({ success: true, data: created });
  }
  catch (e) { next(e); }
});
app.get('/api/repairs', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try { res.json({ success: true, data: await getAllRepairsFromDb(req.query.status as string | undefined) }); }
  catch (e) { next(e); }
});
app.get('/api/repairs/:id', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try {
    const details = await getRepairByIdFromDb(+req.params.id);
    details ? res.json({ success: true, data: details }) : res.status(404).json({ success: false, message: 'تعمیر یافت نشد.' });
  } catch (e) { next(e); }
});
app.put('/api/repairs/:id', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try {
    const rid = +req.params.id;
    let beforeStatus: string | undefined;
    try {
      const before = await getRepairByIdFromDb(rid);
      beforeStatus = before?.repair?.status;
    } catch {}

    const updated = await updateRepairInDb(rid, req.body);

    // P1: Auto notify customer on important status changes (uses SMS provider settings when possible)
    try {
      const afterStatus = (updated as any)?.repair?.status ?? (updated as any)?.status;
      const statusChanged = beforeStatus && afterStatus && beforeStatus !== afterStatus;

      const sendRepairEvent = async (eventType: 'REPAIR_RECEIVED' | 'REPAIR_READY_FOR_PICKUP') => {
        const settings = await getAllSettingsAsObject();
        const provider: string = (settings.sms_provider || 'meli_payamak').toLowerCase();
        const r = await getRepairDetailsForSms(rid);
        if (!r || !r.customerPhoneNumber) return;

        // Tokens are aligned with the SMS trigger endpoint
        let tokens: string[] = [];
        let meliBodyId: number | undefined;
        let kavenegarTemplate: string | undefined;
        let smsIrTemplateId: number | undefined;
        let ippanelPatternCode: string | undefined;

        if (eventType === 'REPAIR_RECEIVED') {
          tokens = [r.customerFullName, r.deviceModel, String(r.id)];
          meliBodyId = Number(settings.meli_payamak_repair_received_pattern_id);
          kavenegarTemplate = settings.kavenegar_repair_received_template;
          smsIrTemplateId = settings.sms_ir_repair_received_template_id ? Number(settings.sms_ir_repair_received_template_id) : undefined;
          ippanelPatternCode = settings.ippanel_repair_received_pattern_code;
        } else {
          if (r.finalCost == null) return; // avoid sending incomplete message
          tokens = [r.customerFullName, r.deviceModel, formatPriceForSms(r.finalCost)];
          meliBodyId = Number(settings.meli_payamak_repair_ready_pattern_id);
          kavenegarTemplate = settings.kavenegar_repair_ready_template;
          smsIrTemplateId = settings.sms_ir_repair_ready_template_id ? Number(settings.sms_ir_repair_ready_template_id) : undefined;
          ippanelPatternCode = settings.ippanel_repair_ready_pattern_code;
        }

        // Telegram provider: send a simple message to store chat (useful as fallback)
        if (provider === 'telegram') {
          setTelegramProxy((settings as any).telegram_proxy);
          const botToken = settings.telegram_bot_token;
          const chatId = settings.telegram_chat_id;
          if (!botToken || !chatId) return;
          const msg = eventType === 'REPAIR_RECEIVED'
            ? `✅ پذیرش تعمیر ثبت شد\nمشتری: ${r.customerFullName}\nدستگاه: ${r.deviceModel}\nکد تعمیر: #${r.id}`
            : `📦 تعمیر آماده تحویل\nمشتری: ${r.customerFullName}\nدستگاه: ${r.deviceModel}\nهزینه: ${formatPriceForSms(r.finalCost)} تومان\nکد تعمیر: #${r.id}`;
          await sendTelegramMessage(botToken, chatId, msg);
          return;
        }

        // SMS providers
        if (provider === 'meli_payamak') {
          const username = settings.meli_payamak_username;
          const password = settings.meli_payamak_password;
          if (!username || !password || !meliBodyId) return;
          await sendMeliPayamakPatternSms(r.customerPhoneNumber, meliBodyId, tokens, username, password);
          return;
        }
        if (provider === 'kavenegar') {
          const apiKey = settings.kavenegar_api_key;
          if (!apiKey || !kavenegarTemplate) return;
          await sendKavenegarPatternSms(r.customerPhoneNumber, kavenegarTemplate, tokens, apiKey);
          return;
        }
        if (provider === 'sms_ir') {
          const apiKey = settings.sms_ir_api_key;
          if (!apiKey || !smsIrTemplateId) return;
          await sendSmsIrPatternSms(r.customerPhoneNumber, smsIrTemplateId, tokens, apiKey);
          return;
        }
        if (provider === 'ippanel') {
          const tokenAuth = settings.ippanel_api_key;
          const fromNumber = settings.ippanel_from;
          if (!tokenAuth || !fromNumber || !ippanelPatternCode) return;
          await sendIppanelPatternSms(r.customerPhoneNumber, ippanelPatternCode, tokens, tokenAuth, fromNumber);
          return;
        }
      };

      if (statusChanged) {
        if (afterStatus === 'پذیرش شده') {
          await sendRepairEvent('REPAIR_RECEIVED');
        }
        if (afterStatus === 'آماده تحویل') {
          await sendRepairEvent('REPAIR_READY_FOR_PICKUP');
        }
      }
    } catch (notifyErr) {
      console.warn('repair auto-notify failed:', notifyErr);
    }

    if (req.user) {
      try {
        const afterStatus = (updated as any)?.repair?.status ?? (updated as any)?.status;
        if (req.body?.status && beforeStatus && afterStatus && beforeStatus !== afterStatus) {
          addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'repair', rid, `تغییر وضعیت تعمیر #${rid}: "${beforeStatus}" → "${afterStatus}"`);
        } else {
          addAuditLog(req.user.id, req.user.username, req.user.roleName, 'update', 'repair', rid, `ویرایش تعمیر #${rid}`);
        }
      } catch {}
    }

    res.json({ success: true, data: updated });
  }
  catch (e) { next(e); }
});
app.post('/api/repairs/:id/finalize', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try { res.json({ success: true, data: await finalizeRepairInDb(+req.params.id, req.body as FinalizeRepairPayload) }); }
  catch (e) { next(e); }
});
app.post('/api/repairs/:id/parts', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try {
    const { productId, quantityUsed } = req.body || {};
    res.status(201).json({ success: true, data: await addPartToRepairInDb(+req.params.id, productId, quantityUsed) });
  } catch (e) { next(e); }
});
app.delete('/api/repairs/:id/parts/:partId', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try { res.json({ success: await deletePartFromRepairInDb(+req.params.partId), message: 'قطعه با موفقیت حذف شد.' }); }
  catch (e) { next(e); }
});

// =====================================================
// 18) خدمات (Services) + آپلود فایل عمومی
// =====================================================
app.get('/api/services', async (_req, res, next) => {
  try { res.json({ success: true, data: await getAllServicesFromDb() }); }
  catch (e) { next(e); }
});
app.post('/api/services', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await addServiceToDb(req.body as Omit<Service, 'id'>), message: 'خدمت با موفقیت اضافه شد.' }); }
  catch (e) { next(e); }
});
app.put('/api/services/:id', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try { res.json({ success: true, data: await updateServiceInDb(+req.params.id, req.body as Omit<Service, 'id'>), message: 'خدمت با موفقیت ویرایش شد.' }); }
  catch (e) { next(e); }
});
app.delete('/api/services/:id', authorizeRole(['Admin','Manager','Technician']), async (req, res, next) => {
  try { await deleteServiceFromDb(+req.params.id); res.json({ success: true, message: 'خدمت با موفقیت حذف شد.' }); }
  catch (e) { next(e); }
});

// آپلود عمومی (تصویر/فایل)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'NO_FILE' });
  res.json({ ok: true, path: `/uploads/${req.file.filename}`, mime: req.file.mimetype, size: req.file.size });
});

// =====================================================
// 19) 404 + ErrorHandler + Boot + Shutdown
// =====================================================
app.use((_req, res) => res.status(404).json({ success: false, message: 'مسیر API مورد نظر یافت نشد.' }));

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('An error occurred:', err);
  res.status((err as any).statusCode || 500).json({ success: false, message: err?.message || 'خطای داخلی سرور' });
};
app.use(errorHandler);

getDbInstance().then(async db => {
  if (!db) {
    console.error('Failed to get DB instance, server not started.');
    (process as any).exit(1);
  }
  await runPendingMigrations(db);
  app.listen(port, '0.0.0.0', () => console.log(`Server running at http://localhost:${port}`));
  startReportSchedulers().catch((e)=>console.error('Failed to start report schedulers:', e));
  startOutboxWorker();
  startAutoSendScheduler();
  // Start DB backup scheduler using settings
  getAllSettingsAsObject().then((s)=>{
    const enabled = String(s.backup_enabled ?? '1') !== '0';
    const cronExpr = String(s.backup_cron ?? '0 2 * * *');
    const tz = String(s.backup_timezone ?? 'Asia/Tehran');
    const retention = Number(s.backup_retention ?? 14);
    startDailyBackupJob({ enabled, cronExpr, tz, retention });
  }).catch(()=> startDailyBackupJob());



}).catch(err => {
  console.error('Failed to initialize database:', err);
  (process as any).exit(1);
});

const cleanup = async () => {
  console.log('Closing database connection...'); await closeDbConnection();
  console.log('Exiting process.'); (process as any).exit();
};
(process as any).on('SIGINT', cleanup);
(process as any).on('SIGTERM', cleanup);

import { inventoryAlertsRouter } from "./inventoryAlerts";
app.use("/inventory/alerts", inventoryAlertsRouter);


// =====================================================
// Admin: DB Backups (Manager/Admin only)
// =====================================================
app.get('/api/admin/backups', authorizeRole(['Admin','Manager']), async (_req, res, next) => {
  try {
    const data = listBackups();
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

app.post('/api/admin/backups', authorizeRole(['Admin','Manager']), async (_req, res, next) => {
  try {
    const data = await createDbBackup();
    res.status(201).json({ success: true, data, message: 'بکاپ ایجاد شد.' });
  } catch (e) { next(e); }
});

app.get('/api/admin/backups/:fileName', authorizeRole(['Admin','Manager']), async (req, res, next) => {
  try {
    const p = getBackupPath(String(req.params.fileName));
    res.download(p);
  } catch (e) { next(e); }
});