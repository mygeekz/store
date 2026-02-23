
import sqlite3 from 'sqlite3';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import moment from 'jalali-moment';
import bcryptjs from 'bcryptjs';

import type { 
    ActivityItem as FrontendActivityItem, 
    InstallmentSale as FrontendInstallmentSale,
    DashboardKPIs as FrontendDashboardKPIs,
    SalesDataPoint as FrontendSalesDataPoint, // Keep this if used by getDashboardSalesChartData for its specific output
    DailySalesPoint, // Add this for clarity if not already here
    TopSellingItem, // Add this for clarity
    SalesSummaryData as FrontendSalesSummaryData,
    DebtorReportItem as FrontendDebtorReportItem,
    CreditorReportItem as FrontendCreditorReportItem,
    TopCustomerReportItem as FrontendTopCustomerReportItem,
    TopSupplierReportItem as FrontendTopSupplierReportItem,
    PhoneSaleProfitReportItem, // Added
    PhoneInstallmentSaleProfitReportItem, // Added
    InvoiceData as FrontendInvoiceData,
    Role as FrontendRole,
    UserForDisplay as FrontendUserForDisplay,
    ChangePasswordPayload,
    ProfitabilityAnalysisItem,
    VelocityItem,
    PurchaseSuggestionItem,
    NewRepairData, // Added
    RepairPart, // Added
    Repair as FrontendRepair, // Added
    FinalizeRepairPayload,
    Service, // Added
} from '../../types';

export type { ChangePasswordPayload, NewRepairData, FinalizeRepairPayload, Service };


// Shared types (could be imported from a shared types file if frontend and backend share one)
export interface ProductPayload {
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  stock_quantity: number;
  categoryId: number | null;
  supplierId: number | null;
}
export interface UpdateProductPayload { // For PUT /api/products/:id
  name?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  stock_quantity?: number;
  categoryId?: number | null;
  supplierId?: number | null;
}
export interface PhoneEntryPayload { // Used for POST
  model: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  imei: string;
  batteryHealth?: number | null;
  condition?: string | null;
  purchasePrice: number;
  salePrice?: number | null;
  sellerName?: string | null;
  purchaseDate?: string | null; // ISO Date string YYYY-MM-DD
  saleDate?: string | null;     // ISO Date string YYYY-MM-DD
  registerDate?: string; // ISO DateTime string
  status?: string; // e.g., "موجود در انبار", "فروخته شده"
  notes?: string | null;
  supplierId?: number | null;
}

export interface PhoneEntryUpdatePayload { // Used for PUT
  model?: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  imei?: string;
  batteryHealth?: number | string | null;
  condition?: string | null;
  purchasePrice?: number | string | null;
  salePrice?: number | string | null;
  sellerName?: string | null;
  purchaseDate?: string | null; // Can be Shamsi from datepicker, needs conversion if changed
  status?: string;
  notes?: string | null;
  supplierId?: number | string | null;
}


export interface SaleDataPayload {
  itemType: 'phone' | 'inventory' | 'service';
  itemId: number;
  quantity: number;
  transactionDate: string; // Shamsi date YYYY/MM/DD from frontend
  customerId?: number | null;
  notes?: string | null;
  discount?: number;
  paymentMethod: 'cash' | 'credit'; // Added
}
export interface CustomerPayload {
  fullName: string;
  phoneNumber?: string | null;
  address?: string | null;
  notes?: string | null;
  telegramChatId?: string | null;
}
export interface LedgerEntryPayload {
    description: string;
    debit?: number;
    credit?: number;
    transactionDate: string; // ISO DateTime string
}
export interface PartnerPayload {
  partnerName: string;
  partnerType: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  telegramChatId?: string | null;
}
export interface SettingItem {
    key: string;
    value: string;
}
export interface OldMobilePhonePayload { // For the deprecated mobile phone structure
    purchasePrice: number;
    sellingPrice: number;
    brand: string;
    model: string;
    color?: string;
    storage?: number;
    ram?: number;
    imei: string;
}

// Types for Installment Sales - Ensure these are exported if used by server/index.ts
export type CheckStatus =
  | "نزد فروشنده"
  | "در جریان وصول"
  | "نقد شد"
  | "برگشت خورد"
  | "به مشتری برگشت داده شده";


const normalizeCheckStatus = (raw: any): CheckStatus => {
  const s = String(raw || '').trim();
  if (s === 'نزد مشتری') return 'نزد فروشنده';
  if (s === 'وصول شده') return 'نقد شد';
  if (s === 'برگشت خورده') return 'برگشت خورد';
  if (s === 'باطل شده') return 'به مشتری برگشت داده شده';
  // اگر یکی از وضعیت‌های جدید بود، همان را برگردان
  return s as CheckStatus;
};

export type InstallmentPaymentStatus = "پرداخت نشده" | "پرداخت شده" | "دیرکرد";


export interface InstallmentCheckInfo {
  id?: number; 
  checkNumber: string;
  bankName: string;
  dueDate: string; 
  amount: number;
  status: CheckStatus;
}

export interface InstallmentSalePayload { 
  customerId: number;
  phoneId: number;
  actualSalePrice: number;
  downPayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  installmentsStartDate: string; 
  checks: InstallmentCheckInfo[]; 
  notes?: string;
}

export interface UserUpdatePayload { // For updating user's role
  roleId?: number;
}

export interface UserForDb {
  id: number;
  username: string;
  passwordHash: string;
  roleId: number;
  roleName: string;
  dateAdded: string;
  avatarPath?: string | null;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DB_PATH = join(__dirname, 'kourosh_inventory.db');
const MOBILE_PHONE_CATEGORY_NAME = "گوشی‌های موبایل";
const DEFAULT_CATEGORIES = ["لوازم جانبی", "قطعات"];
// const DEFAULT_SUPPLIER_NAME = "تامین‌کننده نمونه"; // This is now removed
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'password123'; // Default password for initial admin
const ADMIN_ROLE_NAME = 'Admin';
const SALESPERSON_ROLE_NAME = 'Salesperson';

// Additional role names for fine‑grained RBAC. These will be seeded on DB initialization.
// Manager: Has access to most reports and can view audit logs but cannot change settings.
// Warehouse: Manages product and inventory entries.
// Technician: Handles repair orders and service entries.
// Marketer: Can view RFM/Cohort analyses and manage campaigns.
const MANAGER_ROLE_NAME    = 'Manager';
const WAREHOUSE_ROLE_NAME  = 'Warehouse';
const TECHNICIAN_ROLE_NAME = 'Technician';
const MARKETER_ROLE_NAME   = 'Marketer';


let db: sqlite3.Database | null = null;

// Promisified DB operations
export const runAsync = (sql: string, params: any[] = []): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

export const getAsync = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

export const allAsync = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

export const execAsync = (sql: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.exec(sql, function(this: sqlite3.Statement, err: Error | null) {
      if (err) return reject(err);
      resolve();
    });
  });
};

const sanitizeJalaliDate = (input: string): string => {
  const map: Record<string, string> = {
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  };
  return String(input || '')
    .trim()
    .replace(/[۰-۹٠-٩]/g, (d) => map[d] ?? d)
    .replace(/-/g, '/')
    .replace(/\s+/g, '');
};

export const fromShamsiStringToISO = (shamsiDateString?: string | null): string | undefined => {
  if (!shamsiDateString || typeof shamsiDateString !== 'string' || shamsiDateString.trim() === '') return undefined;

  const clean = sanitizeJalaliDate(shamsiDateString);

  const m = moment(clean, ['jYYYY/jMM/jDD', 'jYYYY/jM/jD'], true).locale('en');
  return m.isValid() ? m.format('YYYY-MM-DD') : undefined;
};


const getOrCreateMobilePhoneCategory = async (): Promise<{ id: number; name: string }> => {
  let category = await getAsync("SELECT id, name FROM categories WHERE name = ?", [MOBILE_PHONE_CATEGORY_NAME]);
  if (!category) {
    const result = await runAsync("INSERT INTO categories (name) VALUES (?)", [MOBILE_PHONE_CATEGORY_NAME]);
    category = { id: result.lastID, name: MOBILE_PHONE_CATEGORY_NAME };
    console.log(`Category "${MOBILE_PHONE_CATEGORY_NAME}" created with ID: ${category.id}`);
  }
  return category;
};

const seedDefaultCategories = async (): Promise<void> => {
  for (const catName of DEFAULT_CATEGORIES) {
    const existing = await getAsync("SELECT id FROM categories WHERE name = ?", [catName]);
    if (!existing) {
      await runAsync("INSERT INTO categories (name) VALUES (?)", [catName]);
      console.log(`Default category "${catName}" created.`);
    }
  }
};

const seedInitialRolesAndAdmin = async (): Promise<void> => {
  // Ensure Admin Role
  let adminRole = await getAsync("SELECT id FROM roles WHERE name = ?", [ADMIN_ROLE_NAME]);
  if (!adminRole) {
    const adminRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [ADMIN_ROLE_NAME]);
    adminRole = { id: adminRoleResult.lastID };
    console.log(`Role "${ADMIN_ROLE_NAME}" created with ID: ${adminRole.id}`);
  }

  // Ensure Salesperson Role
  let salespersonRole = await getAsync("SELECT id FROM roles WHERE name = ?", [SALESPERSON_ROLE_NAME]);
  if (!salespersonRole) {
    const salespersonRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [SALESPERSON_ROLE_NAME]);
    salespersonRole = { id: salespersonRoleResult.lastID };
    console.log(`Role "${SALESPERSON_ROLE_NAME}" created with ID: ${salespersonRole.id}`);
  }

  // Ensure Manager Role
  let managerRole = await getAsync("SELECT id FROM roles WHERE name = ?", [MANAGER_ROLE_NAME]);
  if (!managerRole) {
    const managerRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [MANAGER_ROLE_NAME]);
    managerRole = { id: managerRoleResult.lastID };
    console.log(`Role "${MANAGER_ROLE_NAME}" created with ID: ${managerRole.id}`);
  }
  // Ensure Warehouse Role
  let warehouseRole = await getAsync("SELECT id FROM roles WHERE name = ?", [WAREHOUSE_ROLE_NAME]);
  if (!warehouseRole) {
    const warehouseRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [WAREHOUSE_ROLE_NAME]);
    warehouseRole = { id: warehouseRoleResult.lastID };
    console.log(`Role "${WAREHOUSE_ROLE_NAME}" created with ID: ${warehouseRole.id}`);
  }
  // Ensure Technician Role
  let technicianRole = await getAsync("SELECT id FROM roles WHERE name = ?", [TECHNICIAN_ROLE_NAME]);
  if (!technicianRole) {
    const technicianRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [TECHNICIAN_ROLE_NAME]);
    technicianRole = { id: technicianRoleResult.lastID };
    console.log(`Role "${TECHNICIAN_ROLE_NAME}" created with ID: ${technicianRole.id}`);
  }
  // Ensure Marketer Role
  let marketerRole = await getAsync("SELECT id FROM roles WHERE name = ?", [MARKETER_ROLE_NAME]);
  if (!marketerRole) {
    const marketerRoleResult = await runAsync("INSERT INTO roles (name) VALUES (?)", [MARKETER_ROLE_NAME]);
    marketerRole = { id: marketerRoleResult.lastID };
    console.log(`Role "${MARKETER_ROLE_NAME}" created with ID: ${marketerRole.id}`);
  }

  // Ensure Default Admin User
  const adminUser = await getAsync("SELECT id FROM users WHERE username = ?", [DEFAULT_ADMIN_USERNAME]);
  if (!adminUser && adminRole?.id) { // check adminRole.id to ensure role was created
    const hashedPassword = await bcryptjs.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await runAsync("INSERT INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)", [DEFAULT_ADMIN_USERNAME, hashedPassword, adminRole.id]);
    console.log(`Default admin user "${DEFAULT_ADMIN_USERNAME}" created.`);
  } else if (!adminRole?.id) {
    console.error(`Could not create default admin user because Admin role ID is missing.`);
  }
};

const ensureDefaultBusinessSettings = async (): Promise<void> => {
  const defaultSettings: SettingItem[] = [
    { key: 'store_name', value: 'فروشگاه کوروش' },
    { key: 'store_address_line1', value: 'خیابان اصلی، پلاک ۱۲۳' },
    { key: 'store_city_state_zip', value: 'تهران، استان تهران، ۱۲۳۴۵-۶۷۸' },
    { key: 'store_phone', value: '۰۲۱-۱۲۳۴۵۶۷۸' },
    { key: 'store_email', value: 'info@kouroshstore.example.com' },
      { key: 'backup_enabled', value: '1' },
    { key: 'backup_cron', value: '0 2 * * *' },
    { key: 'backup_timezone', value: 'Asia/Tehran' },
    { key: 'backup_retention', value: '14' },

    // Telegram routing (comma/newline separated chat ids, or JSON array)
    { key: 'telegram_chat_ids_reports', value: '' },
    { key: 'telegram_chat_ids_installments', value: '' },
    { key: 'telegram_chat_ids_sales', value: '' },
    { key: 'telegram_chat_ids_notifications', value: '' },
];

  for (const setting of defaultSettings) {
    const existing = await getAsync("SELECT value FROM settings WHERE key = ?", [setting.key]);
    if (!existing) {
      await runAsync("INSERT INTO settings (key, value) VALUES (?, ?)", [setting.key, setting.value]);
      console.log(`Default setting "${setting.key}" created.`);
    }
  }
};


const initializeDatabaseInternal = async (): Promise<void> => {
  // Non-destructive: Use CREATE TABLE IF NOT EXISTS
  try {
    await runAsync("PRAGMA foreign_keys = ON;");
    console.log("Foreign key support enabled.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `);
    console.log("Categories table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partnerName TEXT NOT NULL,
        partnerType TEXT NOT NULL DEFAULT 'Supplier',
        contactPerson TEXT,
        phoneNumber TEXT UNIQUE,
        email TEXT,
        address TEXT,
        notes TEXT,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log("Partners table ensured.");

    // Telegram chat id (optional, for direct partner messaging)
    try {
      await runAsync("ALTER TABLE partners ADD COLUMN telegramChatId TEXT");
      console.log("Partners table: telegramChatId column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegramChatId column to partners table:', e?.message || e);
      }
    }
	await runAsync(`
	  CREATE TABLE IF NOT EXISTS installment_transactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		installment_payment_id INTEGER NOT NULL,
		amount_paid REAL NOT NULL,
		payment_date TEXT NOT NULL,
		notes TEXT,
		FOREIGN KEY (installment_payment_id) REFERENCES installment_payments(id) ON DELETE CASCADE
	  );
	`);
	console.log("Installment_transactions table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS partner_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partnerId INTEGER NOT NULL,
        transactionDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        description TEXT NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL NOT NULL,
        referenceType TEXT, -- 'phone_purchase', 'product_purchase', 'manual_payment', 'repair_fee', 'other'
        referenceId INTEGER, -- phone.id, product.id, repair.id or null
        FOREIGN KEY (partnerId) REFERENCES partners(id) ON DELETE CASCADE
      );
    `);
    console.log("Partner_ledger table ensured and enhanced with referenceType/ID.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        purchasePrice REAL NOT NULL DEFAULT 0,
        sellingPrice REAL NOT NULL DEFAULT 0,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        saleCount INTEGER NOT NULL DEFAULT 0,
        categoryId INTEGER,
        date_added TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        supplierId INTEGER,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
      );
    `);
    console.log("Products table ensured.")


    // ------------------------------
// Inventory extensions (Phase 4)
// - inventory_logs table
// - products.threshold / sku / barcode columns (safe add)
// - helpful indexes
// ------------------------------
    await runAsync(`
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId INTEGER NOT NULL,
        oldQuantity INTEGER NOT NULL,
        newQuantity INTEGER NOT NULL,
        changedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    console.log("Inventory logs table ensured.");

    // SQLite doesn't support ADD COLUMN IF NOT EXISTS → check first, and also swallow duplicate column errors.
    const productCols: any[] = (await allAsync("PRAGMA table_info(products);")) as any[];
    const colNames = new Set((productCols || []).map((c: any) => c?.name).filter(Boolean));

    const safeAddColumn = async (col: string, alterSql: string) => {
      if (colNames.has(col)) return;
      try {
        await runAsync(alterSql);
        console.log(`Products.${col} column added.`);
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('duplicate column name')) {
          console.log(`Products.${col} column already exists.`);
          return;
        }
        throw e;
      }
    };

    await safeAddColumn("threshold", "ALTER TABLE products ADD COLUMN threshold INTEGER NOT NULL DEFAULT 5;");
    await safeAddColumn("sku", "ALTER TABLE products ADD COLUMN sku TEXT;");
    await safeAddColumn("barcode", "ALTER TABLE products ADD COLUMN barcode TEXT;");

    // Indexes for faster list/search (safe)
    await runAsync("CREATE INDEX IF NOT EXISTS idx_products_date_added ON products(date_added);");
    await runAsync("CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId);");
    await runAsync("CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);");
    await runAsync("CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);");

await runAsync(`
      CREATE TABLE IF NOT EXISTS mobile_phone_details ( /* Old structure */
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId INTEGER NOT NULL UNIQUE,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        color TEXT,
        storage INTEGER,
        ram INTEGER,
        imei TEXT NOT NULL UNIQUE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    console.log("Mobile_phone_details table (old structure) ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS phones ( /* New standalone */
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT NOT NULL,
        color TEXT,
        storage TEXT,
        ram TEXT,
        imei TEXT NOT NULL UNIQUE,
        batteryHealth INTEGER,
        condition TEXT,
        purchasePrice REAL NOT NULL,
        salePrice REAL,
        sellerName TEXT,
        buyerName TEXT,
        purchaseDate TEXT, /* ISO Date YYYY-MM-DD */
        saleDate TEXT,     /* ISO Date YYYY-MM-DD */
        registerDate TEXT NOT NULL, /* ISO DateTime string */
        status TEXT NOT NULL, /* e.g., "موجود در انبار", "فروخته شده", "فروخته شده (قسطی)" */
        notes TEXT,
        supplierId INTEGER,
        FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
      );
    `);
    console.log("Phones table (new standalone) ensured.");

    // اطمینان حاصل کنید که ستون returnDate برای ثبت تاریخ مرجوعی وجود داشته باشد
    try {
      await runAsync("ALTER TABLE phones ADD COLUMN returnDate TEXT");
      console.log("Phones table: returnDate column added.");
    } catch (e: any) {
      // اگر ستون قبلاً وجود داشته باشد، نادیده بگیرید
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding returnDate column to phones table:', e.message);
      }
    }

    // --- Phone Models / Colors (برای اتوکامپلیت + ذخیرهٔ پایدار) ---
    await runAsync(`
      CREATE TABLE IF NOT EXISTS phone_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    await runAsync(`
      CREATE TABLE IF NOT EXISTS phone_colors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log('Phone_models & phone_colors tables ensured.');

    // Seed مدل‌ها و رنگ‌ها (INSERT OR IGNORE => بدون تخریب داده‌های قبلی)
    const seedModels: string[] = [
      // Apple
      'iPhone SE (2022)',
      'iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max',
      'iPhone 12 mini','iPhone 12','iPhone 12 Pro','iPhone 12 Pro Max',
      'iPhone 13 mini','iPhone 13','iPhone 13 Pro','iPhone 13 Pro Max',
      'iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max',
      'iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max',
      'iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max',
      // Samsung
      'Galaxy S20','Galaxy S20+','Galaxy S20 Ultra',
      'Galaxy S21','Galaxy S21+','Galaxy S21 Ultra',
      'Galaxy S22','Galaxy S22+','Galaxy S22 Ultra',
      'Galaxy S23','Galaxy S23+','Galaxy S23 Ultra',
      'Galaxy S24','Galaxy S24+','Galaxy S24 Ultra',
      'Galaxy S25','Galaxy S25+','Galaxy S25 Ultra',
      'Galaxy Z Flip5','Galaxy Z Fold5','Galaxy Z Flip6','Galaxy Z Fold6',
      'Galaxy A14','Galaxy A15','Galaxy A24','Galaxy A25','Galaxy A34','Galaxy A35','Galaxy A54','Galaxy A55','Galaxy A56',
      // Xiaomi / Redmi
      'Xiaomi 12','Xiaomi 12 Pro','Xiaomi 12T','Xiaomi 12T Pro',
      'Xiaomi 13','Xiaomi 13 Pro','Xiaomi 13T','Xiaomi 13T Pro',
      'Xiaomi 14','Xiaomi 14 Pro','Xiaomi 14 Ultra','Xiaomi 14T','Xiaomi 14T Pro',
      'Xiaomi 15','Xiaomi 15 Pro','Xiaomi 15 Ultra',
      'Redmi Note 11','Redmi Note 11 Pro','Redmi Note 12','Redmi Note 12 Pro',
      'Redmi Note 13','Redmi Note 13 Pro','Redmi Note 13 Pro+','Redmi Note 13 4G',
      'Redmi Note 14','Redmi Note 14 Pro','Redmi Note 14 Pro+','Redmi Note 14 4G',
      // POCO (درخواستی + جدید)
      'POCO C61','POCO C65','POCO C71','POCO C75','POCO C76','POCO C85',
      'POCO M6','POCO M6 Pro','POCO X3 Pro','POCO X4 Pro','POCO X5','POCO X5 Pro','POCO X6','POCO X6 Pro',
      'POCO F4','POCO F5','POCO F5 Pro','POCO F6','POCO F6 Pro',
    ];
    const seedColors: string[] = [
      'مشکی','سفید','نقره‌ای','خاکستری','طلایی','رزگلد','آبی','آبی روشن','سرمه‌ای','سبز','سبز روشن',
      'قرمز','صورتی','بنفش','زرد','نارنجی','قهوه‌ای','کرمی','یاسی',
      'گرافیتی','بنفسج تیره','لیمویی','زیتونی',
      // رنگ‌های رایج جدید
      'آبی تیتانیوم','مشکی تیتانیوم','سفید تیتانیوم','طوسی تیتانیوم','طبیعی تیتانیوم',
    ];
    for (const m of seedModels) {
      if (m && String(m).trim()) {
        await runAsync('INSERT OR IGNORE INTO phone_models (name) VALUES (?)', [String(m).trim()]);
      }
    }
    for (const c of seedColors) {
      if (c && String(c).trim()) {
        await runAsync('INSERT OR IGNORE INTO phone_colors (name) VALUES (?)', [String(c).trim()]);
      }
    }

    await runAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        phoneNumber TEXT UNIQUE,
        address TEXT,
        notes TEXT,
        tags TEXT,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log("Customers table ensured.");

    // Customer tags (CRM)
    // Older databases may not have the column; try to add it.
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN tags TEXT");
      console.log("Customers table: tags column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding tags column to customers table:', e?.message || e);
      }
    }

    
    // Customer risk override (CRM)
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN riskOverride TEXT");
      console.log("Customers table: riskOverride column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding riskOverride column to customers table:', e?.message || e);
      }
    }

    // Telegram chat id (optional, for direct customer messaging)
    try {
      await runAsync("ALTER TABLE customers ADD COLUMN telegramChatId TEXT");
      console.log("Customers table: telegramChatId column added.");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) {
        console.error('Error adding telegramChatId column to customers table:', e?.message || e);
      }
    }

await runAsync(`
      CREATE TABLE IF NOT EXISTS customer_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        transactionDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        description TEXT NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL NOT NULL,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);
    console.log("Customer_ledger table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS customer_followups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        createdByUserId INTEGER,
        createdByUsername TEXT,
        note TEXT NOT NULL,
        nextFollowupDate TEXT, -- optional ISO
        status TEXT NOT NULL DEFAULT 'open', -- open/closed
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);
    console.log("Customer_followups table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        notificationId TEXT NOT NULL,
        dismissedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        UNIQUE(userId, notificationId)
      );
    `);
    console.log("Dismissed_notifications table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        createdByUserId INTEGER,
        createdByUsername TEXT,
        provider TEXT NOT NULL,
        eventType TEXT, -- e.g. INSTALLMENT_COMPLETED / TEST_PATTERN
        entityType TEXT, -- e.g. installment_sale / repair / invoice
        entityId INTEGER,
        recipient TEXT NOT NULL,
        patternId TEXT, -- bodyId/template/patternCode
        tokensJson TEXT, -- JSON array of strings
        success INTEGER NOT NULL DEFAULT 0,
        responseJson TEXT,
        errorText TEXT
      );
    `);
    console.log("Sms_logs table ensured.");

    // ---- SMS Logs schema migrations (non-breaking) ----
    // Older DBs may miss newer columns; add them safely.
    const addCol = async (name: str, decl: str): Promise<void> => {
      try {
        // SQLite: adding an existing column throws; we ignore.
        await runAsync(`ALTER TABLE sms_logs ADD COLUMN ${name} ${decl}`);
      } catch {}
    };

    await addCol('error', 'TEXT');
    await addCol('relatedLogId', 'INTEGER');
    await addCol('requestJson', 'TEXT');
    await addCol('httpStatus', 'INTEGER');
    await addCol('rawResponseText', 'TEXT');
    await addCol('durationMs', 'INTEGER');
    await addCol('correlationId', 'TEXT');


    await runAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expenseDate TEXT NOT NULL, -- ISO
        category TEXT NOT NULL, -- rent|salary|inventory|overhead
        title TEXT NOT NULL,
        amount INTEGER NOT NULL, -- stored in smallest currency unit (rial) or toman? using integer as before
        vendor TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        createdByUserId INTEGER,
        createdByUsername TEXT
      );
    `);
    console.log("Expenses table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL, -- rent|salary|inventory|overhead
        amount INTEGER NOT NULL,
        vendor TEXT,
        notes TEXT,
        dayOfMonth INTEGER NOT NULL DEFAULT 1, -- 1..31
        nextRunDate TEXT NOT NULL, -- YYYY-MM-DD
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        createdByUserId INTEGER,
        createdByUsername TEXT
      );
    `);
    console.log("Recurring_expenses table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS recurring_expense_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recurringExpenseId INTEGER NOT NULL,
        runMonth TEXT NOT NULL, -- YYYY-MM
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        UNIQUE(recurringExpenseId, runMonth)
      );
    `);
    console.log("Recurring_expense_runs table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS debt_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshotDate TEXT NOT NULL, -- YYYY-MM-DD
        totalDebt REAL NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        UNIQUE(snapshotDate)
      );
    `);
    console.log("Debt_snapshots table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS inventory_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId INTEGER NOT NULL,
        entryType TEXT NOT NULL, -- 'in' | 'out'
        quantity REAL NOT NULL,
        unitCost REAL NOT NULL DEFAULT 0,
        refType TEXT, -- purchase | sale | adjust
        refId INTEGER,
        entryDate TEXT NOT NULL, -- ISO
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log("Inventory_ledger table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS sales_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transactionDate TEXT NOT NULL, /* ISO date string e.g., "YYYY-MM-DD" */
        itemType TEXT NOT NULL CHECK(itemType IN ('phone', 'inventory', 'service')),
        itemId INTEGER NOT NULL,
        itemName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        pricePerItem REAL NOT NULL,
        totalPrice REAL NOT NULL, /* This is after discount */
        notes TEXT,
        customerId INTEGER,
        discount REAL DEFAULT 0,
        paymentMethod TEXT DEFAULT 'cash', /* Added paymentMethod with default 'cash' */
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
        -- No direct FK to phones or products to allow deletion of products/phones if needed, or handle soft delete
      );
    `);
    console.log("Sales_transactions table ensured.");
	// --- Sales Orders (نسل جدید فاکتور فروش) ---
	await runAsync(`
	  CREATE TABLE IF NOT EXISTS sales_orders (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		customerId     INTEGER,
		paymentMethod  TEXT   NOT NULL DEFAULT 'cash',   -- 'cash' | 'credit'
		discount       REAL   DEFAULT 0,                -- تخفیف سبد
		tax            REAL   DEFAULT 0,                -- درصد مالیات (مثلاً 9)
		subtotal       REAL   NOT NULL,                 -- جمع قبل از تخفیف و مالیات
		grandTotal     REAL   NOT NULL,                 -- مبلغ نهایی پس از همه چیز
		transactionDate TEXT  NOT NULL,                 -- ISO  YYYY-MM-DD
		notes          TEXT,
		FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
	  );
	`);
	console.log("Sales_orders table ensured.");

	await runAsync(`
	  CREATE TABLE IF NOT EXISTS sales_order_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		orderId        INTEGER NOT NULL,
		itemType       TEXT    NOT NULL,  -- 'phone' | 'inventory' | 'service'
		itemId         INTEGER NOT NULL,
		description    TEXT    NOT NULL,
		quantity       INTEGER NOT NULL,
		unitPrice      REAL    NOT NULL,
		discountPerItem REAL   DEFAULT 0,
		totalPrice     REAL    NOT NULL,  -- (qty*unit) - discountPerItem
		FOREIGN KEY (orderId) REFERENCES sales_orders(id) ON DELETE CASCADE
	  );
	`);
	console.log("Sales_order_items table ensured.");

// ------------------------------
// P0 Extensions: Returns / Purchases / Stock Count / Adjustments
// ------------------------------
// --- Add status/cancel fields to sales_orders (safe add) ---
try {
  const soCols = await allAsync("PRAGMA table_info(sales_orders);");
  const hasStatus = Array.isArray(soCols) && soCols.some((c: any) => c?.name === "status");
  const hasCanceledAt = Array.isArray(soCols) && soCols.some((c: any) => c?.name === "canceledAt");
  const hasCancelReason = Array.isArray(soCols) && soCols.some((c: any) => c?.name === "cancelReason");
  if (!hasStatus) {
    await runAsync("ALTER TABLE sales_orders ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
    console.log("Sales_orders.status column added.");
  }
  if (!hasCanceledAt) {
    await runAsync("ALTER TABLE sales_orders ADD COLUMN canceledAt TEXT;");
    console.log("Sales_orders.canceledAt column added.");
  }
  if (!hasCancelReason) {
    await runAsync("ALTER TABLE sales_orders ADD COLUMN cancelReason TEXT;");
    console.log("Sales_orders.cancelReason column added.");
  }
} catch (e: any) {
  console.error("Error ensuring sales_orders cancel columns:", e?.message || e);
}

// Returns (refund / exchange tracking)
await runAsync(`
  CREATE TABLE IF NOT EXISTS sales_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL,
    customerId INTEGER,
    type TEXT NOT NULL DEFAULT 'refund', -- 'refund' | 'exchange'
    reason TEXT,
    notes TEXT,
    refundAmount REAL NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
    createdByUserId INTEGER,
    FOREIGN KEY (orderId) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
  );
`);
await runAsync(`
  CREATE TABLE IF NOT EXISTS sales_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    returnId INTEGER NOT NULL,
    itemType TEXT NOT NULL,
    itemId INTEGER NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    unitPrice REAL NOT NULL DEFAULT 0,
    lineTotal REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (returnId) REFERENCES sales_returns(id) ON DELETE CASCADE
  );
`);
console.log("Sales_returns tables ensured.");

// Purchases (supplier stock-in receipts)
await runAsync(`
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplierId INTEGER,
    invoiceNumber TEXT,
    notes TEXT,
    totalCost REAL NOT NULL DEFAULT 0,
    purchaseDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
    createdByUserId INTEGER,
    FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
  );
`);
await runAsync(`
  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchaseId INTEGER NOT NULL,
    productId INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unitCost REAL NOT NULL DEFAULT 0,
    lineTotal REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (purchaseId) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
  );
`);
console.log("Purchases tables ensured.");

// Inventory adjustments (manual corrections)
await runAsync(`
  CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
    createdByUserId INTEGER,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
  );
`);
console.log("Inventory_adjustments table ensured.");

// Stock count (inventory audit / counting)
await runAsync(`
  CREATE TABLE IF NOT EXISTS stock_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'completed'
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
    completedAt TEXT,
    createdByUserId INTEGER
  );
`);
await runAsync(`
  CREATE TABLE IF NOT EXISTS stock_count_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stockCountId INTEGER NOT NULL,
    productId INTEGER NOT NULL,
    expectedQty INTEGER NOT NULL,
    countedQty INTEGER NOT NULL,
    FOREIGN KEY (stockCountId) REFERENCES stock_counts(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(stockCountId, productId)
  );
`);
console.log("Stock_count tables ensured.");


    await runAsync(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        price REAL NOT NULL DEFAULT 0
      );
    `);
    console.log("Services table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    console.log("Settings table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);
    console.log("Roles table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        roleId INTEGER NOT NULL,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE RESTRICT -- Prevent role deletion if in use
      );
    `);
    console.log("Users table ensured.");
    await runAsync(`
      CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
        userId INTEGER PRIMARY KEY,
        layoutJson TEXT NOT NULL,
        updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("User dashboard layouts table ensured.");


     try {
      await runAsync("ALTER TABLE users ADD COLUMN avatarPath TEXT");
      console.log("Column 'avatarPath' added to 'users' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) {
        console.error("Error adding avatarPath column to users:", e);
      }
    }

    // New Installment Sales Tables
    await runAsync(`
      CREATE TABLE IF NOT EXISTS installment_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        phoneId INTEGER, -- از نسخه جدید: می‌تواند NULL باشد (فروش خدمات/لوازم بدون گوشی)
        actualSalePrice REAL NOT NULL,
        downPayment REAL NOT NULL,
        numberOfInstallments INTEGER NOT NULL,
        installmentAmount REAL NOT NULL,
        installmentsStartDate TEXT NOT NULL, -- Shamsi Date: YYYY/MM/DD
        saleType TEXT NOT NULL DEFAULT 'installment', -- installment | check
        itemsSummary TEXT,
        metaJson TEXT,
        notes TEXT,
        dateCreated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (phoneId) REFERENCES phones(id) ON DELETE SET NULL
      );
    `);
    console.log("Installment_sales table ensured.");

    // مهاجرت امن: اگر phoneId در دیتابیس‌های قدیمی NOT NULL باشد، جدول را بازسازی می‌کنیم تا NULL را بپذیرد.
    try {
      const cols = await allAsync("PRAGMA table_info(installment_sales);");
      const phoneCol = Array.isArray(cols) ? cols.find((c: any) => c?.name === 'phoneId') : null;
      const phoneNotNull = phoneCol ? Number(phoneCol.notnull) === 1 : false;
      if (phoneNotNull) {
        console.log('Migrating installment_sales.phoneId to allow NULL...');
        await execAsync('PRAGMA foreign_keys=OFF;');
        await execAsync('BEGIN TRANSACTION;');
        await runAsync('ALTER TABLE installment_sales RENAME TO installment_sales_old;');
        await runAsync(`
          CREATE TABLE installment_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customerId INTEGER NOT NULL,
            phoneId INTEGER,
            actualSalePrice REAL NOT NULL,
            downPayment REAL NOT NULL,
            numberOfInstallments INTEGER NOT NULL,
            installmentAmount REAL NOT NULL,
            installmentsStartDate TEXT NOT NULL,
            saleType TEXT NOT NULL DEFAULT 'installment',
            itemsSummary TEXT,
            metaJson TEXT,
            notes TEXT,
            dateCreated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
            FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (phoneId) REFERENCES phones(id) ON DELETE SET NULL
          );
        `);
        await runAsync(`
          INSERT INTO installment_sales
            (id, customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, notes, dateCreated)
          SELECT id, customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, notes, dateCreated
          FROM installment_sales_old;
        `);
        await runAsync('DROP TABLE installment_sales_old;');
        await execAsync('COMMIT;');
        await execAsync('PRAGMA foreign_keys=ON;');
        console.log('Migration installment_sales done.');
      }
    } catch (e: any) {
      try { await execAsync('ROLLBACK;'); } catch {}
      try { await execAsync('PRAGMA foreign_keys=ON;'); } catch {}
      console.error('Migration error installment_sales:', e?.message || e);
    }

    // اطمینان از وجود ستون‌های جدید در دیتابیس‌های قدیمی
    try {
      await runAsync("ALTER TABLE installment_sales ADD COLUMN saleType TEXT NOT NULL DEFAULT 'installment'");
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding saleType column:', e?.message || e);
    }
    try {
      await runAsync('ALTER TABLE installment_sales ADD COLUMN itemsSummary TEXT');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding itemsSummary column:', e?.message || e);
    }
    try {
      await runAsync('ALTER TABLE installment_sales ADD COLUMN metaJson TEXT');
    } catch (e: any) {
      if (!/duplicate column/i.test(e?.message || '')) console.error('Error adding metaJson column:', e?.message || e);
    }

    // اقلام فروش اقساطی (گوشی/لوازم/خدمات)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS installment_sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        itemType TEXT NOT NULL, -- phone | inventory | service
        itemId INTEGER,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unitPrice REAL NOT NULL,
        buyPrice REAL DEFAULT 0,
        totalPrice REAL NOT NULL,
        FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
      );
    `);
    console.log('Installment_sale_items table ensured.');

    await runAsync(`
      CREATE TABLE IF NOT EXISTS installment_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        installmentNumber INTEGER NOT NULL,
        dueDate TEXT NOT NULL, -- Shamsi Date: YYYY/MM/DD
        amountDue REAL NOT NULL,
        paymentDate TEXT, -- Shamsi Date: YYYY/MM/DD
        status TEXT NOT NULL DEFAULT 'پرداخت نشده', -- ('پرداخت نشده', 'پرداخت شده')
        FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
      );
    `);
    console.log("Installment_payments table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS installment_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        checkNumber TEXT NOT NULL,
        bankName TEXT NOT NULL,
        dueDate TEXT NOT NULL, -- Shamsi Date: YYYY/MM/DD
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'نزد فروشنده', 
        FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
      );
    `);
    console.log("Installment_checks table ensured.");

    // --- Fix legacy FK references to installment_sales_old (safe migration; keeps data) ---
    const fixLegacyInstallmentFKs = async () => {
      const hasLegacyFk = async (tableName: string) => {
        try {
          const fks = await allAsync(`PRAGMA foreign_key_list(${tableName});`);
          return Array.isArray(fks) && fks.some((fk: any) => String(fk?.table || '') === 'installment_sales_old');
        } catch {
          return false;
        }
      };

      const rebuildInstallmentPayments = async () => {
        console.log('Migrating installment_payments FK -> installment_sales ...');
        await execAsync('PRAGMA foreign_keys=OFF;');
        await execAsync('BEGIN TRANSACTION;');

        const hasOld = await getAsync(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='installment_payments_old';"
        );

        if (!hasOld) {
          // If _old is missing, migration may have already completed in a previous run.
          // Avoid crashing by skipping rebuild if current table exists.
          const hasCurrent = await getAsync(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='installment_payments';"
          );
          if (hasCurrent) {
            await execAsync('ROLLBACK;');
            await execAsync('PRAGMA foreign_keys=ON;');
            console.log('installment_payments_old not found; skipping rebuild (already migrated).');
            return;
          }
        } else {
          // Ensure current table name is free to recreate
          try { await runAsync("DROP TABLE IF EXISTS installment_payments;"); } catch {}
        }

        // Rename current table to _old (best effort)
        try {
          await runAsync('ALTER TABLE installment_payments RENAME TO installment_payments_old;');
        } catch {
          // ignore: might already be renamed or not exist
        }

        await runAsync(`
          CREATE TABLE IF NOT EXISTS installment_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saleId INTEGER NOT NULL,
            installmentNumber INTEGER NOT NULL,
            dueDate TEXT NOT NULL,
            amountDue REAL NOT NULL,
            paymentDate TEXT,
            status TEXT NOT NULL DEFAULT 'پرداخت نشده',
            FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
          );
        `);

        const canCopy = await getAsync(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='installment_payments_old';"
        );
        if (canCopy) {
          await runAsync(`
            INSERT INTO installment_payments (id, saleId, installmentNumber, dueDate, amountDue, paymentDate, status)
            SELECT id, saleId, installmentNumber, dueDate, amountDue, paymentDate, status
            FROM installment_payments_old;
          `);

          await runAsync('DROP TABLE installment_payments_old;');
        }

        await execAsync('COMMIT;');
        await execAsync('PRAGMA foreign_keys=ON;');
        console.log('Migration installment_payments done.');
      };

      const rebuildInstallmentChecks = async () => {
        console.log('Migrating installment_checks FK -> installment_sales ...');
        await execAsync('PRAGMA foreign_keys=OFF;');
        await execAsync('BEGIN TRANSACTION;');

        const hasOld = await getAsync(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='installment_checks_old';"
        );

        if (!hasOld) {
          const hasCurrent = await getAsync(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='installment_checks';"
          );
          if (hasCurrent) {
            await execAsync('ROLLBACK;');
            await execAsync('PRAGMA foreign_keys=ON;');
            console.log('installment_checks_old not found; skipping rebuild (already migrated).');
            return;
          }
        } else {
          try { await runAsync("DROP TABLE IF EXISTS installment_checks;"); } catch {}
        }

        try {
          await runAsync('ALTER TABLE installment_checks RENAME TO installment_checks_old;');
        } catch {}

        await runAsync(`
          CREATE TABLE IF NOT EXISTS installment_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saleId INTEGER NOT NULL,
            checkNumber TEXT NOT NULL,
            dueDate TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'در انتظار',
            bankName TEXT,
            notes TEXT,
            FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
          );
        `);

        const canCopy = await getAsync(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='installment_checks_old';"
        );
        if (canCopy) {
          await runAsync(`
            INSERT INTO installment_checks (id, saleId, checkNumber, dueDate, amount, status, bankName, notes)
            SELECT id, saleId, checkNumber, dueDate, amount, status, bankName, notes
            FROM installment_checks_old;
          `);
          await runAsync('DROP TABLE installment_checks_old;');
        }

        await execAsync('COMMIT;');
        await execAsync('PRAGMA foreign_keys=ON;');
        console.log('Migration installment_checks done.');
      };

      try {
        if (await hasLegacyFk('installment_payments')) await rebuildInstallmentPayments();
        if (await hasLegacyFk('installment_checks')) await rebuildInstallmentChecks();
      } catch (e: any) {
        try { await execAsync('ROLLBACK;'); } catch {}
        try { await execAsync('PRAGMA foreign_keys=ON;'); } catch {}
        console.error('Fix legacy installment FK migration failed:', e?.message || e);
      }
    };

    await fixLegacyInstallmentFKs();


    // --- Fix installment_transactions FK references (installment_payments_old -> installment_payments) ---
    const fixInstallmentTransactionsFK = async () => {
      try {
        const exists = await getAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='installment_transactions';");
        if (!exists) return;

        let fkTable: string | null = null;
        try {
          const fks = await allAsync("PRAGMA foreign_key_list(installment_transactions);");
          if (Array.isArray(fks) && fks.length > 0) fkTable = String(fks[0]?.table || '');
        } catch {
          // If pragma fails, skip
          return;
        }

        if (!fkTable || fkTable === 'installment_payments') return;

        // If FK points to a legacy/missing table (e.g., installment_payments_old), rebuild table safely
        console.log(`Migrating installment_transactions FK: ${fkTable} -> installment_payments ...`);
        await execAsync('PRAGMA foreign_keys=OFF;');
        await execAsync('BEGIN TRANSACTION;');

        // Ensure target table exists
        await runAsync(`
          CREATE TABLE IF NOT EXISTS installment_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saleId INTEGER NOT NULL,
            installmentNumber INTEGER NOT NULL,
            dueDate TEXT NOT NULL,
            amountDue REAL NOT NULL,
            paymentDate TEXT,
            status TEXT NOT NULL DEFAULT 'پرداخت نشده',
            FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
          );
        `);

        // Rename existing transactions table
        try { await runAsync('ALTER TABLE installment_transactions RENAME TO installment_transactions_old;'); } catch {}

        // Recreate with correct FK
        await runAsync(`
          CREATE TABLE IF NOT EXISTS installment_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            installment_payment_id INTEGER NOT NULL,
            amount_paid REAL NOT NULL,
            payment_date TEXT NOT NULL,
            notes TEXT,
            FOREIGN KEY (installment_payment_id) REFERENCES installment_payments(id) ON DELETE CASCADE
          );
        `);

        const canCopy = await getAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='installment_transactions_old';");
        if (canCopy) {
          await runAsync(`
            INSERT INTO installment_transactions (id, installment_payment_id, amount_paid, payment_date, notes)
            SELECT id, installment_payment_id, amount_paid, payment_date, notes
            FROM installment_transactions_old;
          `);
          await runAsync('DROP TABLE installment_transactions_old;');
        }

        await execAsync('COMMIT;');
        await execAsync('PRAGMA foreign_keys=ON;');
        console.log('Migration installment_transactions done.');
      } catch (e: any) {
        try { await execAsync('ROLLBACK;'); } catch {}
        try { await execAsync('PRAGMA foreign_keys=ON;'); } catch {}
        console.error('Fix installment_transactions FK migration failed:', e?.message || e);
      }
    };

    await fixInstallmentTransactionsFK();



    // Migration: normalize legacy check statuses (keeps existing data)
    try {
      await runAsync(`UPDATE installment_checks SET status='نزد فروشنده' WHERE status IS NULL OR TRIM(status)='' OR status='نزد مشتری'`);
      await runAsync(`UPDATE installment_checks SET status='نقد شد' WHERE status='وصول شده'`);
      await runAsync(`UPDATE installment_checks SET status='برگشت خورد' WHERE status='برگشت خورده'`);
      await runAsync(`UPDATE installment_checks SET status='به مشتری برگشت داده شده' WHERE status='باطل شده'`);
    } catch (e: any) {
      console.warn("Installment checks status migration skipped:", e?.message || e);
    }


// --- بخش ساخت جداول فاکتور ---
await runAsync(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoiceNumber TEXT UNIQUE, -- شماره فاکتور یکتا (برای چاپ/ارجاع)
    customerId INTEGER,
    date TEXT NOT NULL, -- ISO Date
    subtotal REAL NOT NULL,
    discountAmount REAL DEFAULT 0,
    grandTotal REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
  );
`);
console.log("Invoices table ensured.");

await runAsync(`
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoiceId INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unitPrice REAL NOT NULL,
    totalPrice REAL NOT NULL,
    itemType TEXT, -- phone / inventory / service
    itemId INTEGER, -- ارتباط به کالای فروخته‌شده
    FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
  );
`);
console.log("Invoice_items table ensured.");


    // New Repair Center Tables
    await runAsync(`
      CREATE TABLE IF NOT EXISTS repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        deviceModel TEXT NOT NULL,
        deviceColor TEXT,
        serialNumber TEXT,
        problemDescription TEXT NOT NULL,
        technicianNotes TEXT,
        status TEXT NOT NULL,
        estimatedCost REAL,
        finalCost REAL,
        dateReceived TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        dateCompleted TEXT,
        technicianId INTEGER,
        laborFee REAL,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (technicianId) REFERENCES partners(id) ON DELETE SET NULL
      );
    `);
    console.log("Repairs table ensured.");

     try {
      await runAsync("ALTER TABLE repairs ADD COLUMN technicianId INTEGER REFERENCES partners(id) ON DELETE SET NULL");
      console.log("Column 'technicianId' added to 'repairs' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) console.error("Error adding technicianId column to repairs:", e);
    }
    try {
      await runAsync("ALTER TABLE repairs ADD COLUMN laborFee REAL");
      console.log("Column 'laborFee' added to 'repairs' table.");
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) console.error("Error adding laborFee column to repairs:", e);
    }

    await runAsync(`
      CREATE TABLE IF NOT EXISTS repair_parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repairId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantityUsed INTEGER NOT NULL,
        FOREIGN KEY (repairId) REFERENCES repairs(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT
      );
    `);
    console.log("Repair_parts table ensured.");

    // --- Audit Logs Table ---
    // This table stores a record of user actions for accountability and debugging. Each row
    // captures the user performing the action, their role at the time, the type of action
    // (create/update/delete/login/etc.), the affected entity and its ID (if applicable),
    // a free‑form description of the operation, and a timestamp. See
    // audit_logs.ts for insertion helper. A foreign key links to users table.
    await runAsync(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        username TEXT,
        role TEXT,
        action TEXT NOT NULL,
        entityType TEXT,
        entityId INTEGER,
        description TEXT,
        createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);
    console.log("Audit_logs table ensured.");


  } catch(err: any) {
    console.error("Error during table creation phase:", err);
    throw new Error(`Failed during table creation: ${err.message}`);
  }
await ensureFts5UnifiedSearch();
await initSearchIndexIfNeeded();

  // Seed initial data (idempotently)
  try {
    await getOrCreateMobilePhoneCategory();
    await seedDefaultCategories();
    // The call to seedDefaultSupplier() is removed from here.
    await seedInitialRolesAndAdmin();
    await ensureDefaultBusinessSettings();
    console.log("Initial data seeding completed/verified.");
  } catch (err: any) {
    console.error("Error seeding initial data:", err);
  }
};

let dbInstance: sqlite3.Database | null = null;
let dbInitializationPromise: Promise<sqlite3.Database | null> | null = null;

export const getDbInstance = (forceNew: boolean = false): Promise<sqlite3.Database | null> => {
  if (dbInstance && !forceNew) return Promise.resolve(dbInstance);
  if (dbInitializationPromise && !forceNew) return dbInitializationPromise;

  dbInitializationPromise = new Promise<sqlite3.Database | null>((resolveConnection, rejectConnection) => {
    const connect = () => {
        const newDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err: Error | null) => {
            if (err) {
                console.error('Error opening database connection:', err);
                dbInitializationPromise = null; // Reset promise on failure
                return rejectConnection(new Error(`Failed to open DB: ${err.message}`));
            }
            console.log('Connected to the SQLite database: kourosh_inventory.db');
            db = newDb; // Crucial: assign to the module-scoped db variable
            try {
                await initializeDatabaseInternal();
                dbInstance = newDb;
                resolveConnection(dbInstance);
            } catch (initErr: any) {
                console.error("Database initialization process failed:", initErr);
                dbInitializationPromise = null; // Reset promise on failure
                if (db) {
                    db.close(); // Attempt to close the problematic connection
                    db = null;
                }
                rejectConnection(new Error(`DB init failed: ${initErr.message}`));
            }
        });
    };

    if (db && forceNew) {
        db.close((closeErr: Error | null) => {
            if (closeErr) {
                console.error('Error closing existing DB for re-initialization:', closeErr);
                // Proceed with creating new connection anyway, but log the error
            }
            db = null;
            dbInstance = null;
            console.log('Existing DB connection closed (or attempted to close) for re-initialization.');
            connect();
        });
    } else {
        connect();
    }
  });
  return dbInitializationPromise;
};

export const closeDbConnection = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err: Error | null) => {
                if (err) {
                    console.error('Error closing the database connection:', err);
                    return reject(new Error(`Failed to close DB: ${err.message}`));
                }
                console.log('Database connection closed.');
                db = null;
                dbInstance = null;
                dbInitializationPromise = null;
                resolve();
            });
        } else {
            resolve();
        }
    });
};

// === Audit Log Helpers ===
/**
 * Inserts a new audit log entry capturing a user action. Pass null for userId if the action
 * is performed by the system (e.g. scheduled tasks). The action string should be a short
 * verb (e.g. 'create', 'update', 'delete', 'login'). The entityType is a high‑level
 * descriptor like 'product', 'sale', 'customer', etc. The entityId can be null when
 * the action is not tied to a specific row. The description should provide more
 * context; avoid storing sensitive data here. This function is fire‑and‑forget and
 * returns void; errors will be logged but not thrown.
 */
export const addAuditLog = async (
  userId: number | null,
  username: string | null,
  role: string | null,
  action: string,
  entityType: string | null,
  entityId: number | null,
  description: string | null
): Promise<void> => {
  try {
    await runAsync(
      `INSERT INTO audit_logs (userId, username, role, action, entityType, entityId, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId ?? null, username ?? null, role ?? null, action, entityType ?? null, entityId ?? null, description ?? null]
    );
  } catch (err) {
    console.error('Failed to insert audit log:', err);
  }
};

/**
 * Retrieves audit log entries in reverse chronological order. Supports simple pagination
 * using limit and offset parameters. Results include the userId, username, role,
 * action, entityType, entityId, description and createdAt fields.
 */
export const getAuditLogs = async (limit: number = 100, offset: number = 0) => {
  return allAsync(
    `SELECT id, userId, username, role, action, entityType, entityId, description, createdAt
     FROM audit_logs
     ORDER BY datetime(createdAt) DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
};

// === RFM and Cohort Reports ===
export interface RfmItem {
  customerId: number;
  customerName: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  rfm: string;
}

/**
 * Computes a simple RFM (Recency, Frequency, Monetary) analysis for all customers who
 * have at least one sales order. Recency is measured in days since the most recent
 * order, frequency is the count of orders, and monetary is the sum of order totals.
 * Scores for R/F/M are assigned from 1–3 using tertiles. Returns a list sorted
 * alphabetically by customer name.
 */
export const getRfmReport = async (): Promise<RfmItem[]> => {
  // Fetch aggregated order stats per customer. Null customerId rows are ignored.
  const rows: any[] = await allAsync(
    `SELECT c.id as customerId, c.fullName as customerName,
            MAX(o.transactionDate) as lastDate,
            COUNT(o.id) as frequency,
            SUM(o.grandTotal) as monetary
     FROM sales_orders o
     JOIN customers c ON c.id = o.customerId
     GROUP BY c.id
     HAVING COUNT(o.id) > 0`
  );
  if (!rows || rows.length === 0) return [];

  const now = moment().startOf('day');
  // Compute recency (in days) for each row and collect arrays for scoring.
  const recencies: number[] = [];
  const frequencies: number[] = [];
  const monetaries: number[] = [];
  for (const row of rows) {
    const recencyDays = now.diff(moment(row.lastDate).startOf('day'), 'days');
    row.recencyDays = recencyDays;
    recencies.push(recencyDays);
    frequencies.push(Number(row.frequency));
    monetaries.push(Number(row.monetary));
  }
  // Compute tertiles (0-33%, 34-66%, 67-100%) for scoring.
  const tertile = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const len = sorted.length;
    const t1 = sorted[Math.floor(len / 3)];
    const t2 = sorted[Math.floor((2 * len) / 3)];
    return [t1, t2];
  };
  const [recT1, recT2] = tertile(recencies);
  const [freqT1, freqT2] = tertile(frequencies);
  const [monT1, monT2] = tertile(monetaries);
  // Assign scores: for recency, lower days = higher score.
  const getScore = (v: number, t1: number, t2: number, invert: boolean = false) => {
    // invert = true means smaller values give higher score (for recency)
    if (!invert) {
      if (v <= t1) return 1;
      if (v <= t2) return 2;
      return 3;
    } else {
      if (v <= t1) return 3;
      if (v <= t2) return 2;
      return 1;
    }
  };
  const items: RfmItem[] = rows.map((row) => {
    const recScore = getScore(row.recencyDays, recT1, recT2, true);
    const freqScore = getScore(Number(row.frequency), freqT1, freqT2, false);
    const monScore = getScore(Number(row.monetary), monT1, monT2, false);
    return {
      customerId: row.customerId,
      customerName: row.customerName,
      recencyDays: row.recencyDays,
      frequency: Number(row.frequency),
      monetary: Number(row.monetary),
      rScore: recScore,
      fScore: freqScore,
      mScore: monScore,
      rfm: `${recScore}${freqScore}${monScore}`,
    };
  });
  // Sort by customer name for predictable display.
  return items.sort((a, b) => a.customerName.localeCompare(b.customerName, 'fa'));
};

export interface CohortRow {
  cohortMonth: string; // e.g. "2025-01"
  counts: number[];    // counts[i] = number of customers in cohort who purchased again i months later
  totals: number;      // total customers in cohort
}

/**
 * Generates a simple cohort analysis based on first purchase month. Each cohort is defined
 * by the month (YYYY-MM) in which a customer first made a purchase. For each cohort,
 * an array of counts is returned where index 0 represents the number of customers in
 * the cohort (baseline), index 1 the number who purchased again the following month,
 * index 2 the number who purchased again two months later, and so on. This allows
 * tracking retention over time. Note: this implementation ignores multiple purchases
 * within the same month beyond the first.
 */
export const getCohortReport = async (): Promise<CohortRow[]> => {
  // Step 1: gather first purchase month for each customer
  const firstPurchaseRows: any[] = await allAsync(
    `SELECT c.id as customerId, MIN(o.transactionDate) as firstDate
     FROM sales_orders o
     JOIN customers c ON c.id = o.customerId
     GROUP BY c.id`
  );
  if (!firstPurchaseRows || firstPurchaseRows.length === 0) return [];
  // Map customer -> first cohort month (YYYY-MM)
  const firstMonthMap: Record<number, string> = {};
  for (const row of firstPurchaseRows) {
    const monthStr = moment(row.firstDate).format('YYYY-MM');
    firstMonthMap[row.customerId] = monthStr;
  }
  // Collect all orders grouped by customer and month
  const orderRows: any[] = await allAsync(
    `SELECT o.customerId, o.transactionDate
     FROM sales_orders o
     WHERE o.customerId IS NOT NULL`
  );
  // Build a map: cohortMonth -> { customers: Set, counts: Map<offset, Set<customerId>> }
  const cohorts: Record<string, { customers: Set<number>; offsets: Map<number, Set<number>> }> = {};
  for (const row of orderRows) {
    const cid = row.customerId;
    const cohortMonth = firstMonthMap[cid];
    if (!cohortMonth) continue;
    const orderMonth = moment(row.transactionDate).format('YYYY-MM');
    // Compute offset: months difference between orderMonth and cohortMonth
    const offset = moment(orderMonth + '-01').diff(moment(cohortMonth + '-01'), 'months');
    if (offset < 0) continue; // Should not happen
    if (!cohorts[cohortMonth]) {
      cohorts[cohortMonth] = { customers: new Set<number>(), offsets: new Map<number, Set<number>>() };
    }
    cohorts[cohortMonth].customers.add(cid);
    if (!cohorts[cohortMonth].offsets.has(offset)) {
      cohorts[cohortMonth].offsets.set(offset, new Set<number>());
    }
    cohorts[cohortMonth].offsets.get(offset)!.add(cid);
  }
  // Convert to array of CohortRow
  const result: CohortRow[] = [];
  const sortedCohorts = Object.keys(cohorts).sort();
  for (const month of sortedCohorts) {
    const entry = cohorts[month];
    const maxOffset = Math.max(...Array.from(entry.offsets.keys()));
    const counts: number[] = [];
    for (let i = 0; i <= maxOffset; i++) {
      const set = entry.offsets.get(i);
      counts.push(set ? set.size : 0);
    }
    result.push({ cohortMonth: month, counts, totals: entry.customers.size });
  }
  return result;
};
// --- Reports helpers (top-level) ---
export const getProfitPerSaleMapFromDb = async (ids:number[]) => {
  await getDbInstance();
  if(!ids.length) return new Map<number,number>();
  const ph = ids.map(()=>'?').join(',');
  const rows = await allAsync(`
    SELECT st.id AS saleId,
           SUM(st.totalPrice - CASE
             WHEN st.itemType='inventory' THEN COALESCE(p.purchasePrice,0)*st.quantity
             WHEN st.itemType='phone'     THEN COALESCE(ph.purchasePrice,0)*st.quantity
             ELSE 0 END) AS profit
    FROM sales_transactions st
    LEFT JOIN products p ON st.itemType='inventory' AND st.itemId=p.id
    LEFT JOIN phones   ph ON st.itemType='phone'     AND st.itemId=ph.id
    WHERE st.id IN (${ph})
    GROUP BY st.id
  `, ids);
  const map = new Map<number,number>();
  rows.forEach(r=>map.set(Number(r.saleId), Number(r.profit)||0));
  return map;
};


// Internal helper function for adding partner ledger entries
export const addPartnerLedgerEntryInternal = async ( // Made exportable if needed, but consider if it's truly public API
  partnerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string,
  referenceType?: string,
  referenceId?: number
): Promise<any> => {
  const dateToStore = transactionDateISO || new Date().toISOString();
  const prevBalanceRow = await getAsync(
    `SELECT balance FROM partner_ledger WHERE partnerId = ? ORDER BY id DESC LIMIT 1`,
    [partnerId]
  );
  const prevBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  const currentDebit = debit || 0;
  const currentCredit = credit || 0;
  const newBalance = prevBalance + currentCredit - currentDebit;

  const result = await runAsync(
    `INSERT INTO partner_ledger (partnerId, transactionDate, description, debit, credit, balance, referenceType, referenceId) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [partnerId, dateToStore, description, currentDebit, currentCredit, newBalance, referenceType, referenceId]
  );
  return await getAsync("SELECT * FROM partner_ledger WHERE id = ?", [result.lastID]);
};

// --- Services ---
export const getAllServicesFromDb = async (): Promise<Service[]> => {
    await getDbInstance();
    return await allAsync(`SELECT * FROM services ORDER BY name ASC`);
};

export const addServiceToDb = async (service: Omit<Service, 'id'>): Promise<Service> => {
    await getDbInstance();
    const { name, description, price } = service;
    try {
        const result = await runAsync(
            `INSERT INTO services (name, description, price) VALUES (?, ?, ?)`,
            [name, description, price]
        );
        return await getAsync("SELECT * FROM services WHERE id = ?", [result.lastID]);
    } catch (err: any) {
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error('نام این خدمت تکراری است.');
        }
        throw new Error(`خطای پایگاه داده: ${err.message}`);
    }
};

export const updateServiceInDb = async (id: number, service: Omit<Service, 'id'>): Promise<Service> => {
    await getDbInstance();
    const { name, description, price } = service;
    try {
        await runAsync(
            `UPDATE services SET name = ?, description = ?, price = ? WHERE id = ?`,
            [name, description, price, id]
        );
        const updatedService = await getAsync("SELECT * FROM services WHERE id = ?", [id]);
        if (!updatedService) throw new Error("خدمت برای ویرایش یافت نشد.");
        return updatedService;
    } catch (err: any) {
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error('نام این خدمت تکراری است.');
        }
        throw new Error(`خطای پایگاه داده: ${err.message}`);
    }
};

export const deleteServiceFromDb = async (id: number): Promise<boolean> => {
    await getDbInstance();
    const result = await runAsync(`DELETE FROM services WHERE id = ?`, [id]);
    if (result.changes === 0) {
      throw new Error("خدمت برای حذف یافت نشد.");
    }
    return result.changes > 0;
};


// --- Categories ---
export const addCategoryToDb = async (name: string): Promise<any> => {
  await getDbInstance(); // Ensure DB is initialized before any operation
  try {
    const result = await runAsync(`INSERT INTO categories (name) VALUES (?)`, [name]);
    return await getAsync("SELECT * FROM categories WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('نام دسته‌بندی تکراری است.');
    }
    console.error('DB Error (addCategoryToDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllCategoriesFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`SELECT * FROM categories ORDER BY name ASC`);
  } catch (err: any) {
    console.error('DB Error (getAllCategoriesFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const updateCategoryInDb = async (id: number, name: string): Promise<any> => {
  await getDbInstance();
  try {
    const existing = await getAsync("SELECT id FROM categories WHERE id = ?", [id]);
    if (!existing) {
      throw new Error("دسته‌بندی برای بروزرسانی یافت نشد.");
    }
    await runAsync(`UPDATE categories SET name = ? WHERE id = ?`, [name, id]);
    return await getAsync("SELECT * FROM categories WHERE id = ?", [id]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('این نام دسته‌بندی قبلا ثبت شده است.');
    }
    console.error('DB Error (updateCategoryInDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const deleteCategoryFromDb = async (id: number): Promise<boolean> => {
  await getDbInstance();
  try {
    const result = await runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
    if (result.changes === 0) {
        // This check is a bit redundant if the calling function already checks for 404,
        // but good for direct DB function calls.
        throw new Error("دسته‌بندی برای حذف یافت نشد یا قبلا حذف شده است.");
    }
    return result.changes > 0;
  } catch (err: any) {
    console.error('DB Error (deleteCategoryFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};


// --- Products (Inventory) ---
export const addProductToDb = async (product: ProductPayload): Promise<any> => {
  await getDbInstance();
  const { name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, sku, barcode } = product as any;

  try {
    await execAsync("BEGIN TRANSACTION;");
    const result = await runAsync(
      `INSERT INTO products (name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, saleCount, sku, barcode)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, sku || null, barcode || null]
    );
    const newProductId = result.lastID;

    if (supplierId && purchasePrice > 0 && stock_quantity > 0) {
      const creditAmount = purchasePrice * stock_quantity;
      const description = `دریافت کالا: ${stock_quantity} عدد ${name} (شناسه محصول: ${newProductId}) به ارزش واحد ${purchasePrice.toLocaleString('fa-IR')}`;
      await addPartnerLedgerEntryInternal(supplierId, description, 0, creditAmount, new Date().toISOString(), 'product_purchase', newProductId);
    }

    await execAsync("COMMIT;");
    return await getAsync(
      `SELECT p.*, c.name as categoryName, pa.partnerName as supplierName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       LEFT JOIN partners pa ON p.supplierId = pa.id
       WHERE p.id = ?`,
      [newProductId]
    );
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    console.error('DB Error (addProductToDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllProductsFromDb = async (supplierIdFilter: number | null = null): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT p.id, p.name, p.purchasePrice, p.sellingPrice, p.stock_quantity, p.saleCount, p.date_added, p.sku, p.barcode,
           p.categoryId, c.name as categoryName,
           p.supplierId, pa.partnerName as supplierName
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    LEFT JOIN partners pa ON p.supplierId = pa.id
  `;
  const params: any[] = [];
  if (supplierIdFilter) {
    sql += " WHERE p.supplierId = ?";
    params.push(supplierIdFilter);
  }
  sql += " ORDER BY p.date_added DESC";
  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllProductsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const updateProductInDb = async (productId: number, productData: UpdateProductPayload): Promise<any> => {
    await getDbInstance();
    const { name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId } = productData;

    const product = await getAsync("SELECT * FROM products WHERE id = ?", [productId]);
    if (!product) {
        throw new Error("محصول برای بروزرسانی یافت نشد.");
    }

    // Build the update query dynamically
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    if (name !== undefined) { fieldsToUpdate.push("name = ?"); params.push(name); }
    if (purchasePrice !== undefined) { fieldsToUpdate.push("purchasePrice = ?"); params.push(purchasePrice); }
    if (sellingPrice !== undefined) { fieldsToUpdate.push("sellingPrice = ?"); params.push(sellingPrice); }
    if (stock_quantity !== undefined) { fieldsToUpdate.push("stock_quantity = ?"); params.push(stock_quantity); }
    if (categoryId !== undefined) { fieldsToUpdate.push("categoryId = ?"); params.push(categoryId); } // Handles null
    if (supplierId !== undefined) { fieldsToUpdate.push("supplierId = ?"); params.push(supplierId); } // Handles null
    if ((product as any).sku !== undefined) { fieldsToUpdate.push("sku = ?"); params.push((product as any).sku); }
    if ((product as any).barcode !== undefined) { fieldsToUpdate.push("barcode = ?"); params.push((product as any).barcode); }

    if (fieldsToUpdate.length === 0) {
        return product; // No changes, return current product data
    }

    params.push(productId);
    const sql = `UPDATE products SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;

    try {
        // For inventory products, direct ledger adjustment on simple edit is complex and often not standard.
        // Ledger entries are typically for acquisitions/disposals.
        // If purchase price or supplier changes AND stock_quantity changes, it could imply a new purchase or return.
        // For now, we just update the product details. Partner ledger adjustments would need more specific logic for stock changes.
        await runAsync(sql, params);
        return await getAsync(
         `SELECT p.*, c.name as categoryName, pa.partnerName as supplierName
          FROM products p
          LEFT JOIN categories c ON p.categoryId = c.id
          LEFT JOIN partners pa ON p.supplierId = pa.id
          WHERE p.id = ?`,
         [productId]
       );
    } catch (err: any) {
        console.error('DB Error (updateProductInDb):', err);
        throw new Error(`خطای پایگاه داده: ${err.message}`);
    }
};

export const deleteProductFromDb = async (productId: number): Promise<boolean> => {
    await getDbInstance();
    await execAsync("BEGIN TRANSACTION;");
    try {
        const product = await getAsync("SELECT * FROM products WHERE id = ?", [productId]);
        if (!product) {
            throw new Error("محصول برای حذف یافت نشد.");
        }

        const saleRecord = await getAsync(
            "SELECT id FROM sales_transactions WHERE itemType = 'inventory' AND itemId = ? LIMIT 1",
            [productId]
        );
        if (saleRecord) {
            throw new Error("امکان حذف محصول وجود ندارد زیرا قبلاً فروخته شده است.");
        }

        if (product.supplierId && product.purchasePrice > 0 && product.stock_quantity > 0) {
            const debitAmount = product.purchasePrice * product.stock_quantity;
            const description = `حذف/بازگشت کالا: ${product.stock_quantity} عدد ${product.name} (شناسه محصول: ${productId}) از انبار`;
            await addPartnerLedgerEntryInternal(product.supplierId, description, debitAmount, 0, new Date().toISOString(), 'product_return_on_delete', productId);
        }
        
        const result = await runAsync(`DELETE FROM products WHERE id = ?`, [productId]);
        
        await execAsync("COMMIT;");
        return result.changes > 0;
    } catch (err: any) {
        await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in deleteProductFromDb:", rbErr));
        console.error('DB Error (deleteProductFromDb):', err);
        throw err; // Re-throw the original error
    }
};

// --- Standalone Phones ---
export const addPhoneEntryToDb = async (phoneData: PhoneEntryPayload): Promise<any> => {
  await getDbInstance();
  const {
    model, color, storage, ram, imei, batteryHealth, condition,
    purchasePrice, salePrice, sellerName, purchaseDate,
    supplierId // saleDate will be null/undefined on initial registration
  } = phoneData;

  const registerDate = phoneData.registerDate || new Date().toISOString();
  const status = phoneData.status || "موجود در انبار";

  try {
    const existingPhone = await getAsync("SELECT id FROM phones WHERE imei = ?", [imei]);
    if (existingPhone) {
      throw new Error('شماره IMEI تکراری است.');
    }
    await execAsync("BEGIN TRANSACTION;");
    const result = await runAsync(
      `INSERT INTO phones (model, color, storage, ram, imei, batteryHealth, condition, purchasePrice, salePrice, sellerName, purchaseDate, saleDate, registerDate, status, notes, supplierId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        model, color, storage, ram, imei, batteryHealth, condition,
        purchasePrice, salePrice, sellerName, purchaseDate,
        null, // Explicitly set saleDate to null on initial registration
        registerDate, status, phoneData.notes, supplierId
      ]
    );
    const newPhoneId = result.lastID;

    if (supplierId && purchasePrice > 0) {
      const description = `دریافت گوشی: ${model} (IMEI: ${imei}, شناسه گوشی: ${newPhoneId}) به ارزش ${Number(purchasePrice).toLocaleString('fa-IR')}`;
      await addPartnerLedgerEntryInternal(supplierId, description, 0, purchasePrice, purchaseDate || new Date().toISOString(), 'phone_purchase', newPhoneId);
    }

    await execAsync("COMMIT;");
    return await getAsync(
      `SELECT ph.*, pa.partnerName as supplierName
       FROM phones ph
       LEFT JOIN partners pa ON ph.supplierId = pa.id
       WHERE ph.id = ?`, [newPhoneId]);
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addPhoneEntryToDb:", rbErr));
    console.error('DB Error (addPhoneEntryToDb):', err);
    if (err.message.includes('UNIQUE constraint failed: phones.imei') || err.message.includes('شماره IMEI تکراری است')) {
      throw new Error('شماره IMEI تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const updatePhoneEntryInDb = async (phoneId: number, phoneData: PhoneEntryUpdatePayload): Promise<any> => {
  await getDbInstance();
  const {
    model, color, storage, ram, imei, batteryHealth, condition,
    purchasePrice, salePrice, sellerName, purchaseDate, // purchaseDate can be Shamsi from DatePicker
    status, notes, supplierId
  } = phoneData;

  const existingPhone = await getAsync("SELECT * FROM phones WHERE id = ?", [phoneId]);
  if (!existingPhone) {
    throw new Error("گوشی برای بروزرسانی یافت نشد.");
  }

  if (imei && imei !== existingPhone.imei) {
    const imeiExists = await getAsync("SELECT id FROM phones WHERE imei = ? AND id != ?", [imei, phoneId]);
    if (imeiExists) {
      throw new Error('شماره IMEI جدید تکراری است.');
    }
  }
  
  await execAsync("BEGIN TRANSACTION;");
  try {
    // Handle ledger adjustments if purchasePrice or supplierId changes
    const newPurchasePrice = purchasePrice !== undefined && purchasePrice !== null && String(purchasePrice).trim() !== '' ? Number(purchasePrice) : existingPhone.purchasePrice;
    const newSupplierId = supplierId !== undefined && supplierId !== null && String(supplierId).trim() !== '' ? Number(supplierId) : existingPhone.supplierId;
    
    //let ledgerAdjusted = false; // This variable is not used after assignment
    if ( (newPurchasePrice !== existingPhone.purchasePrice || newSupplierId !== existingPhone.supplierId) && (existingPhone.supplierId && existingPhone.purchasePrice > 0) ) {
      // Reverse old ledger entry if original supplier and price existed
      const oldLedgerDesc = `اصلاح خرید گوشی: ${existingPhone.model} (IMEI: ${existingPhone.imei}, شناسه: ${phoneId}) - برگشت خرید قبلی`;
      await addPartnerLedgerEntryInternal(existingPhone.supplierId, oldLedgerDesc, existingPhone.purchasePrice, 0, new Date().toISOString(), 'phone_purchase_reversal_on_edit', phoneId);
      // ledgerAdjusted = true;
    }
    
    if ( (newPurchasePrice !== existingPhone.purchasePrice || newSupplierId !== existingPhone.supplierId) && (newSupplierId && newPurchasePrice > 0) ) {
      // Create new ledger entry if new supplier and price exist
      const newLedgerDesc = `اصلاح خرید گوشی: ${model || existingPhone.model} (IMEI: ${imei || existingPhone.imei}, شناسه: ${phoneId}) - ثبت خرید جدید`;
      const effectivePurchaseDate = purchaseDate ? fromShamsiStringToISO(purchaseDate) || new Date().toISOString() : existingPhone.purchaseDate || new Date().toISOString();
      await addPartnerLedgerEntryInternal(newSupplierId, newLedgerDesc, 0, newPurchasePrice, effectivePurchaseDate, 'phone_purchase_edit', phoneId);
      // ledgerAdjusted = true;
    }


    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    /**
     * Pushes an update for a specific column if the new value differs from the existing one. It
     * handles numeric strings, Jalali/Gregorian dates and empty/null values gracefully. In particular:
     *   - numeric strings are converted to numbers unless blank (then become null)
     *   - date strings containing a '/' are treated as Jalali and converted to ISO using fromShamsiStringToISO()
     *   - date strings without '/' are assumed to already be ISO and are left unchanged
     *   - undefined values do not trigger an update
     *   - explicit null values will set the column to null
     */
    const updateIfChanged = (
      field: string,
      newValue: any,
      existingValue: any,
      isNumericString = false,
      isDate = false
    ) => {
      let finalValue = newValue;
      if (isNumericString && typeof newValue === 'string') {
        finalValue = newValue.trim() === '' ? null : Number(newValue);
      } else if (isDate && typeof newValue === 'string') {
        // Only convert when the incoming value looks like a Jalali date (contains '/').
        // Otherwise, treat the string as an ISO date and leave it untouched. This prevents
        // ISO dates from being misinterpreted as Jalali and converted to far‑future years.
        finalValue = newValue.includes('/')
          ? fromShamsiStringToISO(newValue) || null
          : newValue;
      }
      // Only push update if value is defined and different from existing
      if (finalValue !== undefined && finalValue !== existingValue) {
        fieldsToUpdate.push(`${field} = ?`);
        // If not numeric/date and empty string, treat as null
        params.push(finalValue === '' && !isNumericString && !isDate ? null : finalValue);
      } else if (newValue === null && existingValue !== null) {
        // Explicit null request
        fieldsToUpdate.push(`${field} = ?`);
        params.push(null);
      }
    };
    
    updateIfChanged('model', model, existingPhone.model);
    updateIfChanged('color', color, existingPhone.color);
    updateIfChanged('storage', storage, existingPhone.storage);
    updateIfChanged('ram', ram, existingPhone.ram);
    updateIfChanged('imei', imei, existingPhone.imei);
    updateIfChanged('batteryHealth', batteryHealth, existingPhone.batteryHealth, true);
    updateIfChanged('condition', condition, existingPhone.condition);
    updateIfChanged('purchasePrice', purchasePrice, existingPhone.purchasePrice, true);
    updateIfChanged('salePrice', salePrice, existingPhone.salePrice, true);
    updateIfChanged('sellerName', sellerName, existingPhone.sellerName);
    updateIfChanged('purchaseDate', purchaseDate, existingPhone.purchaseDate, false, true);
    updateIfChanged('status', status, existingPhone.status);
    updateIfChanged('notes', notes, existingPhone.notes);
    updateIfChanged('supplierId', supplierId, existingPhone.supplierId, true);

    // Determine if the phone was previously sold and whether the new status transitions it into or out of a sold state.
    const wasSoldBefore = existingPhone.status === 'فروخته شده' || existingPhone.status === 'فروخته شده (قسطی)';
    // transitioningToSold: true => becoming sold, false => becoming non‑sold, null => no change or status not provided
    let transitioningToSold: boolean | null = null;
    if (status !== undefined && status !== null) {
      const newStatus = String(status);
      const isNowSold = newStatus === 'فروخته شده' || newStatus === 'فروخته شده (قسطی)';
      transitioningToSold = isNowSold;
      // If the new status is not a sold state, clear saleDate to avoid stale sale dates when a phone is returned
      if (!isNowSold) {
        fieldsToUpdate.push('saleDate = ?');
        params.push(null);
      }
    }

    // If the phone transitions from sold → non‑sold, record the return date in Shamsi. Conversely,
    // if it transitions back into a sold state, clear the return date. This avoids overwriting
    // purchaseDate when a phone is returned and ensures returnDate reflects the date of return.
    if (transitioningToSold !== null) {
      if (!transitioningToSold && wasSoldBefore) {
        fieldsToUpdate.push('returnDate = ?');
        params.push(moment().locale('fa').format('jYYYY/jMM/jDD'));
      } else if (transitioningToSold && existingPhone.returnDate) {
        fieldsToUpdate.push('returnDate = ?');
        params.push(null);
      }
    }

    if (fieldsToUpdate.length > 0) {
      params.push(phoneId);
      const sql = `UPDATE phones SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
      await runAsync(sql, params);
    }

    await execAsync("COMMIT;");
    return await getAsync(
      `SELECT ph.*, pa.partnerName as supplierName
       FROM phones ph
       LEFT JOIN partners pa ON ph.supplierId = pa.id
       WHERE ph.id = ?`, [phoneId]);

  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in updatePhoneEntryInDb:", rbErr));
    console.error('DB Error (updatePhoneEntryInDb):', err);
    if (err.message.includes('UNIQUE constraint failed: phones.imei') || err.message.includes('شماره IMEI جدید تکراری است')) {
      throw new Error('شماره IMEI جدید تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const deletePhoneEntryFromDb = async (phoneId: number): Promise<boolean> => {
  await getDbInstance();
  const phone = await getAsync("SELECT * FROM phones WHERE id = ?", [phoneId]);
  if (!phone) {
    throw new Error("گوشی برای حذف یافت نشد.");
  }

  // Check if phone is part of an installment sale (legacy + new items table)
  const installmentSale = await getAsync("SELECT id FROM installment_sales WHERE phoneId = ?", [phoneId]);
  const installmentSaleItem = await getAsync(
    "SELECT saleId as id FROM installment_sale_items WHERE itemType = 'phone' AND itemId = ? LIMIT 1",
    [phoneId]
  ).catch(() => null);
  const found = installmentSale || installmentSaleItem;
  if (found) {
    throw new Error(`امکان حذف گوشی وجود ندارد. این گوشی در فروش اقساطی شماره ${found.id} ثبت شده است.`);
  }
  
  // Check if phone is part of a regular sale
  const regularSale = await getAsync("SELECT id FROM sales_transactions WHERE itemType = 'phone' AND itemId = ?", [phoneId]);
  if (regularSale) {
    throw new Error(`امکان حذف گوشی وجود ندارد. این گوشی در فروش نقدی/اعتباری شماره ${regularSale.id} ثبت شده است.`);
  }


  await execAsync("BEGIN TRANSACTION;");
  try {
    // If phone was purchased from a supplier, reverse the ledger entry
    if (phone.supplierId && phone.purchasePrice > 0) {
      const description = `حذف گوشی: ${phone.model} (IMEI: ${phone.imei}, شناسه: ${phoneId}) - بازگشت مبلغ خرید اولیه`;
      await addPartnerLedgerEntryInternal(phone.supplierId, description, phone.purchasePrice, 0, new Date().toISOString(), 'phone_delete', phoneId);
    }

    const result = await runAsync(`DELETE FROM phones WHERE id = ?`, [phoneId]);
    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in deletePhoneEntryFromDb:", rbErr));
    console.error('DB Error (deletePhoneEntryFromDb):', err);
    throw err; 
  }
};

// --- Phone Models / Colors (API برای اتوکامپلیت) ---
export const getAllPhoneModelsFromDb = async (): Promise<string[]> => {
  await getDbInstance();
  const rows = await allAsync(`SELECT name FROM phone_models ORDER BY name COLLATE NOCASE ASC`);
  return (rows || []).map((r: any) => String(r.name));
};

export const addPhoneModelToDb = async (name: string): Promise<string[]> => {
  await getDbInstance();
  const n = String(name || '').trim();
  if (!n) throw new Error('نام مدل نامعتبر است.');
  await runAsync('INSERT OR IGNORE INTO phone_models (name) VALUES (?)', [n]);
  return getAllPhoneModelsFromDb();
};

export const getAllPhoneColorsFromDb = async (): Promise<string[]> => {
  await getDbInstance();
  const rows = await allAsync(`SELECT name FROM phone_colors ORDER BY name COLLATE NOCASE ASC`);
  return (rows || []).map((r: any) => String(r.name));
};

export const addPhoneColorToDb = async (name: string): Promise<string[]> => {
  await getDbInstance();
  const n = String(name || '').trim();
  if (!n) throw new Error('نام رنگ نامعتبر است.');
  await runAsync('INSERT OR IGNORE INTO phone_colors (name) VALUES (?)', [n]);
  return getAllPhoneColorsFromDb();
};


export const getAllPhoneEntriesFromDb = async (supplierIdFilter: number | null = null, statusFilter?: string, phoneId?: number): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT ph.*, pa.partnerName as supplierName, cu.fullName as buyerName
    FROM phones ph
    LEFT JOIN partners pa ON ph.supplierId = pa.id
    -- شناسایی خریدار آخر (در صورت وجود) از فروش اقساطی، تراکنش‌های قدیمی و فروش‌های جدید
    LEFT JOIN (
      SELECT phoneId, MAX(customerId) AS customerId
      FROM (
        SELECT phoneId, customerId FROM installment_sales
        UNION ALL
        SELECT itemId AS phoneId, customerId FROM sales_transactions WHERE itemType = 'phone'
        UNION ALL
        SELECT soi.itemId AS phoneId, so.customerId
          FROM sales_order_items soi
          JOIN sales_orders so ON so.id = soi.orderId
        WHERE soi.itemType = 'phone'
      )
      GROUP BY phoneId
    ) sale ON sale.phoneId = ph.id
    LEFT JOIN customers cu ON cu.id = sale.customerId
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (phoneId) { // If specific phoneId is requested
    conditions.push("ph.id = ?");
    params.push(phoneId);
  } else { // Apply filters if not fetching a specific phone
    if (supplierIdFilter) {
      conditions.push("ph.supplierId = ?");
      params.push(supplierIdFilter);
    }
    if (statusFilter) {
      // Allow multiple statuses separated by comma
      const statuses = String(statusFilter).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        conditions.push("ph.status = ?");
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        conditions.push(`ph.status IN (${statuses.map(_=>'?').join(',')})`);
        params.push(...statuses);
      }
    }
  }


  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  
  sql += " ORDER BY ph.registerDate DESC";
  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllPhoneEntriesFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};


// --- Sales ---
export const getSellableItemsFromDb = async (): Promise<{ phones: any[], inventory: any[], services: any[] }> => {
  await getDbInstance();
  try {
    const phones = await allAsync(`
      SELECT id, model, imei, salePrice as price, 1 as stock
      FROM phones
      WHERE status = 'موجود در انبار' AND salePrice IS NOT NULL AND salePrice > 0
    `);

    const inventory = await allAsync(`
      SELECT id, name, sellingPrice as price, stock_quantity as stock
      FROM products
      WHERE stock_quantity > 0 AND sellingPrice IS NOT NULL AND sellingPrice > 0
    `);

    const services = await allAsync(`
      SELECT id, name, price
      FROM services
      WHERE price IS NOT NULL
    `);

    return {
      phones: phones.map(p => ({
        ...p,
        type: 'phone',
        name: `${p.model} (IMEI: ${p.imei})`
      })),
      inventory: inventory.map(i => ({
        ...i,
        type: 'inventory'
      })),
      services: services.map(s => ({
        ...s,
        type: 'service'
      }))
    };
  } catch (err: any) {
    console.error('DB Error (getSellableItemsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllSalesTransactionsFromDb = async (customerIdFilter: number | null = null): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT st.*, c.fullName as customerFullName
    FROM sales_transactions st
    LEFT JOIN customers c ON st.customerId = c.id
  `;
  const params: any[] = [];
  if (customerIdFilter) {
    sql += " WHERE st.customerId = ?";
    params.push(customerIdFilter);
  }
  sql += " ORDER BY st.id DESC";

  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllSalesTransactionsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};
/* فهرست خلاصهٔ همهٔ سفارش‌های فروش برای صفحهٔ «فاکتورها» */
export const getAllSalesOrdersFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  return await allAsync(`
    SELECT
        so.id,
        so.transactionDate,
        so.grandTotal            AS totalPrice,
        c.fullName               AS customerFullName,
        COALESCE(
          (SELECT description
             FROM sales_order_items
            WHERE orderId = so.id
            LIMIT 1),
          '—'
        )                        AS itemName
    FROM   sales_orders  AS so
    LEFT  JOIN customers  AS c  ON c.id = so.customerId
    ORDER BY so.id DESC
  `);
};

export const addCustomerLedgerEntryToDb = async (customerId: number, entryData: LedgerEntryPayload): Promise<any> => {
  await getDbInstance();
  const { description, debit, credit, transactionDate } = entryData;
  return await addCustomerLedgerEntryInternal(customerId, description, debit, credit, transactionDate);
};


export const addCustomerLedgerEntryInternal = async ( // Made exportable if needed
  customerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string
): Promise<any> => {
  const dateToStore = transactionDateISO || new Date().toISOString();
  const prevBalanceRow = await getAsync(
    `SELECT balance FROM customer_ledger WHERE customerId = ? ORDER BY id DESC LIMIT 1`,
    [customerId]
  );
  const prevBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  const currentDebit = debit || 0;
  const currentCredit = credit || 0;
  const newBalance = prevBalance + currentDebit - currentCredit;

  const result = await runAsync(
    `INSERT INTO customer_ledger (customerId, transactionDate, description, debit, credit, balance) VALUES (?, ?, ?, ?, ?, ?)`,
    [customerId, dateToStore, description, currentDebit, currentCredit, newBalance]
  );
  return await getAsync("SELECT * FROM customer_ledger WHERE id = ?", [result.lastID]);
};

export const recordSaleTransactionInDb = async (saleData: SaleDataPayload): Promise<any> => {
  await getDbInstance();
  // transactionDate is expected as Shamsi 'YYYY/MM/DD' from frontend
  const { itemType, itemId, quantity, transactionDate: shamsiTransactionDate, customerId, notes, discount = 0, paymentMethod } = saleData; 
  
  // Convert Shamsi date to ISO YYYY-MM-DD for storage and for phone's saleDate
  const isoTransactionDate = moment(shamsiTransactionDate, 'jYYYY/jMM/jDD').format('YYYY-MM-DD');
  if (!moment(isoTransactionDate, 'YYYY-MM-DD', true).isValid()) {
    throw new Error('تاریخ تراکنش ارائه شده پس از تبدیل به میلادی، نامعتبر است.');
  }
  

  try {
    await execAsync("BEGIN TRANSACTION;");
    let itemName: string;
    let pricePerItem: number;
    let purchasePriceOfItem = 0; // For profit calculation

    if (itemType === 'phone') {
      if (quantity !== 1) throw new Error('تعداد برای فروش گوشی باید ۱ باشد.');
      const phone = await getAsync("SELECT model, imei, salePrice, purchasePrice, status FROM phones WHERE id = ?", [itemId]);
      if (!phone) throw new Error('گوشی مورد نظر برای فروش یافت نشد.');
      // گوشی باید یا در انبار موجود باشد یا به عنوان مرجوعی برگشته باشد (از فروش نقدی یا اقساطی)
      if (phone.status !== 'موجود در انبار' && phone.status !== 'مرجوعی' && phone.status !== 'مرجوعی اقساطی') {
        throw new Error(`گوشی "${phone.model} (IMEI: ${phone.imei})" در وضعیت "${phone.status}" قرار دارد و قابل فروش نیست.`);
      }
      if (phone.salePrice === null || typeof phone.salePrice !== 'number' || phone.salePrice <= 0) throw new Error(`قیمت فروش برای گوشی "${phone.model} (IMEI: ${phone.imei})" مشخص نشده یا نامعتبر است.`);

      itemName = `${phone.model} (IMEI: ${phone.imei})`;
      pricePerItem = phone.salePrice;
      purchasePriceOfItem = phone.purchasePrice;
      // هنگام فروش مجدد گوشی، وضعیت را به «فروخته شده» تغییر می‌دهیم و تاریخ فروش را ثبت می‌کنیم. همچنین اگر گوشی
      // قبلاً مرجوع شده باشد، تاریخ مرجوعی (returnDate) را پاک می‌کنیم تا در نمایش مجدد فروش، به اشتباه باقی نماند.
      await runAsync("UPDATE phones SET status = 'فروخته شده', saleDate = ?, returnDate = NULL WHERE id = ?", [isoTransactionDate, itemId]);
    } else if (itemType === 'inventory') {
      const product = await getAsync("SELECT name, sellingPrice, purchasePrice, stock_quantity FROM products WHERE id = ?", [itemId]);
      if (!product) throw new Error('کالای مورد نظر در انبار یافت نشد.');
      if (product.stock_quantity < quantity) throw new Error(`موجودی کالا (${product.name}: ${product.stock_quantity} عدد) برای فروش کافی نیست (درخواست: ${quantity} عدد).`);
      if (product.sellingPrice === null || typeof product.sellingPrice !== 'number' || product.sellingPrice <= 0) throw new Error(`قیمت فروش برای کالا "${product.name}" مشخص نشده یا نامعتبر است.`);

      itemName = product.name;
      pricePerItem = product.sellingPrice;
      purchasePriceOfItem = product.purchasePrice;
      await runAsync("UPDATE products SET stock_quantity = stock_quantity - ?, saleCount = saleCount + ? WHERE id = ?", [quantity, quantity, itemId]);
    } else if (itemType === 'service') {
        const service = await getAsync("SELECT name, price FROM services WHERE id = ?", [itemId]);
        if (!service) throw new Error('خدمت مورد نظر یافت نشد.');
        if (quantity !== 1) throw new Error('تعداد برای فروش خدمت باید ۱ باشد.');
        
        itemName = service.name;
        pricePerItem = service.price;
        // No stock update, no purchase price for services
    } else {
      throw new Error('نوع کالای نامعتبر برای فروش.');
    }

    const subTotal = quantity * pricePerItem;
    if (discount > subTotal) throw new Error('مبلغ تخفیف نمی‌تواند بیشتر از قیمت کل کالا باشد.');
    const totalPrice = subTotal - discount;
    if (totalPrice < 0) throw new Error('قیمت نهایی پس از تخفیف نمی‌تواند منفی باشد.');

    const saleResult = await runAsync(
      `INSERT INTO sales_transactions (transactionDate, itemType, itemId, itemName, quantity, pricePerItem, totalPrice, notes, customerId, discount, paymentMethod)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [isoTransactionDate, itemType, itemId, itemName, quantity, pricePerItem, totalPrice, notes, customerId, discount, paymentMethod]
    );

    if (customerId && paymentMethod === 'credit' && totalPrice > 0) {
      const ledgerDescription = `خرید اعتباری: ${itemName} (شناسه فروش: ${saleResult.lastID})`;
      // For customer ledger: debit means customer owes more (asset for company)
      await addCustomerLedgerEntryInternal(customerId, ledgerDescription, totalPrice, 0, new Date().toISOString());
    }

    await execAsync("COMMIT;");
    return await getAsync("SELECT * FROM sales_transactions WHERE id = ?", [saleResult.lastID]);
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    console.error('DB Error (recordSaleTransactionInDb):', err);
    throw err;
  }
};

// --- Customers ---
export const addCustomerToDb = async (customerData: CustomerPayload): Promise<any> => {
  await getDbInstance();
  const { fullName, phoneNumber, address, notes, telegramChatId } = customerData;
  try {
    const result = await runAsync(
      `INSERT INTO customers (fullName, phoneNumber, address, notes, telegramChatId) VALUES (?, ?, ?, ?, ?)`,
      [fullName, phoneNumber || null, address || null, notes || null, telegramChatId || null]
    );
    return await getAsync("SELECT * FROM customers WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: customers.phoneNumber')) {
      throw new Error('این شماره تماس قبلا برای مشتری دیگری ثبت شده است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllCustomersWithBalanceFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  return await allAsync(`
    SELECT c.*, COALESCE(cl.balance, 0) as currentBalance
    FROM customers c
    LEFT JOIN (
      SELECT customerId, balance
      FROM customer_ledger
      ORDER BY id DESC
    ) cl ON c.id = cl.customerId
    GROUP BY c.id
    ORDER BY c.fullName ASC
  `);
};

export const getCustomerByIdFromDb = async (customerId: number): Promise<any> => {
  await getDbInstance();
  const customer = await getAsync(`
    SELECT c.*, COALESCE(cl.balance, 0) as currentBalance
    FROM customers c
    LEFT JOIN (
      SELECT customerId, balance
      FROM customer_ledger
      WHERE customerId = ?
      ORDER BY id DESC
      LIMIT 1
    ) cl ON c.id = cl.customerId
    WHERE c.id = ?
  `, [customerId, customerId]);
  return customer;
};

export const updateCustomerInDb = async (customerId: number, customerData: CustomerPayload): Promise<any> => {
  await getDbInstance();
  const { fullName, phoneNumber, address, notes, telegramChatId } = customerData;
  try {
    await runAsync(
      `UPDATE customers SET fullName = ?, phoneNumber = ?, address = ?, notes = ?, telegramChatId = ? WHERE id = ?`,
      [fullName, phoneNumber || null, address || null, notes || null, telegramChatId || null, customerId]
    );
    return await getCustomerByIdFromDb(customerId);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: customers.phoneNumber')) {
      throw new Error('این شماره تماس قبلا برای مشتری دیگری ثبت شده است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

// Update only CRM tags for a customer. Tags are stored as a JSON string.
export const updateCustomerTagsInDb = async (customerId: number, tags: string[]): Promise<any> => {
  await getDbInstance();
  const clean = (tags || [])
    .map(t => String(t || '').trim())
    .filter(Boolean)
    .slice(0, 50);
  await runAsync(`UPDATE customers SET tags = ? WHERE id = ?`, [JSON.stringify(clean), customerId]);
  return await getCustomerByIdFromDb(customerId);
};

export const deleteCustomerFromDb = async (customerId: number): Promise<boolean> => {
  await getDbInstance();
  const result = await runAsync(`DELETE FROM customers WHERE id = ?`, [customerId]);
  return result.changes > 0;
};

export const getLedgerForCustomerFromDb = async (customerId: number): Promise<any[]> => {
  await getDbInstance();
  return await allAsync(
    `SELECT * FROM customer_ledger WHERE customerId = ? ORDER BY transactionDate ASC, id ASC`,
    [customerId]
  );
};


export type CustomerFollowupPayload = {
  note: string;
  nextFollowupDate?: string | null; // ISO
};

export const addCustomerFollowupToDb = async (
  customerId: number,
  payload: CustomerFollowupPayload,
  actor?: { userId?: number; username?: string }
): Promise<any> => {
  await getDbInstance();
  const note = String(payload.note || '').trim();
  if (!note) throw new Error('یادداشت پیگیری خالی است.');
  const nextDate = payload.nextFollowupDate || null;

  const result = await runAsync(
    `INSERT INTO customer_followups (customerId, createdByUserId, createdByUsername, note, nextFollowupDate, status)
     VALUES (?, ?, ?, ?, ?, 'open')`,
    [customerId, actor?.userId || null, actor?.username || null, note, nextDate]
  );
  return await getAsync(`SELECT * FROM customer_followups WHERE id = ?`, [result.lastID]);
};

export const listCustomerFollowupsFromDb = async (customerId: number): Promise<any[]> => {
  await getDbInstance();
  return await allAsync(
    `SELECT * FROM customer_followups WHERE customerId = ? ORDER BY createdAt DESC, id DESC`,
    [customerId]
  );
};

export const closeCustomerFollowupInDb = async (customerId: number, followupId: number): Promise<any> => {
  await getDbInstance();
  await runAsync(
    `UPDATE customer_followups SET status = 'closed' WHERE id = ? AND customerId = ?`,
    [followupId, customerId]
  );
  return await getAsync(`SELECT * FROM customer_followups WHERE id = ?`, [followupId]);
};


export const updateCustomerFollowupInDb = async (
  customerId: number,
  followupId: number,
  payload: { note?: string; nextFollowupDate?: string | null; status?: 'open'|'closed' }
): Promise<any> => {
  await getDbInstance();

  const updates: string[] = [];
  const params: any[] = [];

  if (payload.note != null) {
    const note = String(payload.note).trim();
    if (!note) throw new Error('یادداشت پیگیری خالی است.');
    updates.push("note = ?");
    params.push(note);
  }

  if (payload.nextFollowupDate !== undefined) {
    updates.push("nextFollowupDate = ?");
    params.push(payload.nextFollowupDate ?? null);
  }

  if (payload.status != null) {
    updates.push("status = ?");
    params.push(payload.status);
  }

  if (updates.length === 0) {
    return await getAsync(`SELECT * FROM customer_followups WHERE id = ? AND customerId = ?`, [followupId, customerId]);
  }

  params.push(followupId, customerId);

  await runAsync(
    `UPDATE customer_followups SET ${updates.join(', ')} WHERE id = ? AND customerId = ?`,
    params
  );

  return await getAsync(`SELECT * FROM customer_followups WHERE id = ? AND customerId = ?`, [followupId, customerId]);
};


export const setCustomerRiskOverrideInDb = async (customerId: number, risk: 'low'|'medium'|'high'|null): Promise<any> => {
  await getDbInstance();
  await runAsync(`UPDATE customers SET riskOverride = ? WHERE id = ?`, [risk, customerId]);
  return await getAsync(`SELECT * FROM customers WHERE id = ?`, [customerId]);
};



export type CustomerLedgerInsights = {
  customerId: number;
  currentBalance: number; // >0 بدهکار، <0 بستانکار
  totalDebit: number;
  totalCredit: number;
  lastPaymentDate: string | null; // ISO
  daysSinceLastPayment: number | null;
  overdueInstallmentsCount: number;
  overdueChecksCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  score: number; // 0..100 (خوش‌حسابی)
  suggestedActions: string[];
};

export const getCustomerLedgerInsightsFromDb = async (customerId: number): Promise<CustomerLedgerInsights> => {
  await getDbInstance();

  const totals = await getAsync(
    `SELECT 
        COALESCE(SUM(debit),0) AS totalDebit,
        COALESCE(SUM(credit),0) AS totalCredit,
        (SELECT balance FROM customer_ledger WHERE customerId = ? ORDER BY id DESC LIMIT 1) AS currentBalance
      FROM customer_ledger
     WHERE customerId = ?`,
    [customerId, customerId]
  );

  const lastPay = await getAsync(
    `SELECT transactionDate AS lastPaymentDate
       FROM customer_ledger
      WHERE customerId = ? AND credit > 0
      ORDER BY transactionDate DESC, id DESC
      LIMIT 1`,
    [customerId]
  );

  // Overdue installments / checks based on Jalali date string YYYY/MM/DD (lexicographic works)
  const todayJ = moment().locale('fa').format('jYYYY/jMM/jDD');

  const overdueInstallmentsRow = await getAsync(
    `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND ip.status != 'پرداخت شده'
        AND ip.dueDate < ?`,
    [customerId, todayJ]
  );

  const overdueChecksRow = await getAsync(
    `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM installment_checks ic
       JOIN installment_sales s ON s.id = ic.saleId
      WHERE s.customerId = ?
        AND ic.status != 'وصول شده'
        AND ic.dueDate < ?`,
    [customerId, todayJ]
  );

  const currentBalance = Number(totals?.currentBalance || 0);
  const totalDebit = Number(totals?.totalDebit || 0);
  const totalCredit = Number(totals?.totalCredit || 0);

  const lastPaymentDate = lastPay?.lastPaymentDate ? String(lastPay.lastPaymentDate) : null;

  let daysSinceLastPayment: number | null = null;
  if (lastPaymentDate) {
    const diff = moment().diff(moment(lastPaymentDate), 'days');
    daysSinceLastPayment = Number.isFinite(diff) ? diff : null;
  }

  const overdueInstallmentsCount = Number(overdueInstallmentsRow?.cnt || 0);
  const overdueChecksCount = Number(overdueChecksRow?.cnt || 0);

  // Risk heuristic (simple but useful)
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const overdueAny = overdueInstallmentsCount + overdueChecksCount;

  if (currentBalance > 0 && overdueAny >= 2) riskLevel = 'high';
  else if (currentBalance > 0 && overdueAny >= 1) riskLevel = 'medium';
  else if (currentBalance > 0 && (daysSinceLastPayment ?? 0) >= 30) riskLevel = 'medium';

  
  // Score (0..100) + suggested actions
  let score = 100;

  // debt penalty (only if debtor)
  if (currentBalance > 0) {
    // every 1,000,000 تومان debt => -10 (cap -40)
    const debtPenalty = Math.min(40, Math.floor(currentBalance / 1_000_000) * 10);
    score -= debtPenalty;
  }

  // overdue penalties
  score -= Math.min(30, overdueInstallmentsCount * 15);
  score -= Math.min(40, overdueChecksCount * 20);

  // inactivity penalty
  if ((daysSinceLastPayment ?? 0) >= 60) score -= 20;
  else if ((daysSinceLastPayment ?? 0) >= 30) score -= 10;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const suggestedActions: string[] = [];

  if (overdueAny > 0) {
    suggestedActions.push('یادآوری فوری بابت سررسیدهای گذشته');
  }
  if (currentBalance > 0 && score < 60) {
    suggestedActions.push('برای فروش جدید، پیش‌پرداخت/تسویه بگیر');
  } else if (currentBalance > 0 && score >= 60) {
    suggestedActions.push('پیگیری ملایم برای تسویه یا پرداخت بخشی از بدهی');
  }
  if ((daysSinceLastPayment ?? 0) >= 45 && currentBalance > 0) {
    suggestedActions.push('تماس پیگیری (بیش از ۴۵ روز از آخرین پرداخت)');
  }
  if (currentBalance <= 0 && overdueAny === 0) {
    suggestedActions.push('مشتری خوش‌حساب — امکان ارائه تخفیف/اعتبار');
  }

  // Risk level (derived from score + overdue)
  if (score <= 40 || (currentBalance > 0 && overdueAny >= 2)) riskLevel = 'high';
  else if (score <= 70 || (currentBalance > 0 && overdueAny >= 1)) riskLevel = 'medium';
  else riskLevel = 'low';

return {
    customerId,
    currentBalance,
    totalDebit,
    totalCredit,
    lastPaymentDate,
    daysSinceLastPayment,
    overdueInstallmentsCount,
    overdueChecksCount,
    riskLevel,
    score,
    suggestedActions,
  };
};

// --- Partners ---
export const addPartnerToDb = async (partnerData: PartnerPayload): Promise<any> => {
  await getDbInstance();
  const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes, telegramChatId } = partnerData;
  try {
    const result = await runAsync(
      `INSERT INTO partners (partnerName, partnerType, contactPerson, phoneNumber, email, address, notes, telegramChatId) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [partnerName, partnerType, contactPerson || null, phoneNumber || null, email || null, address || null, notes || null, telegramChatId || null]
    );
    return await getAsync("SELECT * FROM partners WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: partners.phoneNumber')) {
      throw new Error('این شماره تماس قبلا برای همکار دیگری ثبت شده است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllPartnersWithBalanceFromDb = async (partnerType?: string): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT p.*, COALESCE(pl.balance, 0) as currentBalance
    FROM partners p
    LEFT JOIN (
      SELECT partnerId, balance
      FROM partner_ledger
      ORDER BY id DESC
    ) pl ON p.id = pl.partnerId
    GROUP BY p.id
  `;
  const params: any[] = [];
  if (partnerType) {
    sql += " HAVING p.partnerType = ?";
    params.push(partnerType);
  }
  sql += " ORDER BY p.partnerName ASC";

  return await allAsync(sql, params);
};

export const getPartnerByIdFromDb = async (partnerId: number): Promise<any> => {
  await getDbInstance();
  return await getAsync(`
    SELECT p.*, COALESCE(pl.balance, 0) as currentBalance
    FROM partners p
    LEFT JOIN (
      SELECT partnerId, balance
      FROM partner_ledger
      WHERE partnerId = ?
      ORDER BY id DESC
      LIMIT 1
    ) pl ON p.id = pl.partnerId
    WHERE p.id = ?
  `, [partnerId, partnerId]);
};

export const updatePartnerInDb = async (partnerId: number, partnerData: PartnerPayload): Promise<any> => {
  await getDbInstance();
  const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes, telegramChatId } = partnerData;
   try {
    await runAsync(
      `UPDATE partners SET partnerName = ?, partnerType = ?, contactPerson = ?, phoneNumber = ?, email = ?, address = ?, notes = ?, telegramChatId = ? 
       WHERE id = ?`,
      [partnerName, partnerType, contactPerson || null, phoneNumber || null, email || null, address || null, notes || null, telegramChatId || null, partnerId]
    );
    return await getPartnerByIdFromDb(partnerId);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: partners.phoneNumber')) {
      throw new Error('این شماره تماس قبلا برای همکار دیگری ثبت شده است.');
    }
     if (err.message.includes('NOT NULL constraint failed: partners.partnerName') || err.message.includes('NOT NULL constraint failed: partners.partnerType')) {
      throw new Error('نام همکار و نوع همکار نمی‌توانند خالی باشند.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const deletePartnerFromDb = async (partnerId: number): Promise<boolean> => {
  await getDbInstance();
  const result = await runAsync(`DELETE FROM partners WHERE id = ?`, [partnerId]);
  return result.changes > 0;
};

export const addPartnerLedgerEntryToDb = async (partnerId: number, entryData: LedgerEntryPayload): Promise<any> => {
  await getDbInstance();
  const { description, debit, credit, transactionDate } = entryData;
  return await addPartnerLedgerEntryInternal(partnerId, description, debit, credit, transactionDate);
};

export const getLedgerForPartnerFromDb = async (partnerId: number): Promise<any[]> => {
  await getDbInstance();
  return await allAsync(
    `SELECT * FROM partner_ledger WHERE partnerId = ? ORDER BY transactionDate ASC, id ASC`,
    [partnerId]
  );
};

export const getPurchasedItemsFromPartnerDb = async (partnerId: number): Promise<any[]> => {
    await getDbInstance();
    const products = await allAsync(
      `SELECT id, name, purchasePrice, date_added as purchaseDate, 'product' as type 
       FROM products 
       WHERE supplierId = ?`, [partnerId]
    );
    const phones = await allAsync(
      `SELECT id, model as name, imei as identifier, purchasePrice, purchaseDate, 'phone' as type 
       FROM phones 
       WHERE supplierId = ?`, [partnerId]
    );
    return [...products, ...phones].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
};

// --- Reports ---
export const getSalesSummaryAndProfit = async (fromDateShamsi: string, toDateShamsi: string): Promise<FrontendSalesSummaryData> => {
  await getDbInstance();
  const fromDateISO = fromShamsiStringToISO(fromDateShamsi);
  const toDateISO = fromShamsiStringToISO(toDateShamsi);
  if (!fromDateISO || !toDateISO) throw new Error('فرمت تاریخ نامعتبر است.');

  // NOTE: سیستم فروش از P0 به بعد «فاکتور» (sales_orders) را به‌عنوان منبع اصلی فروش دارد.
  // برای سازگاری با داده‌های قدیمی، هنوز sales_transactions را هم در گزارش‌ها لحاظ می‌کنیم.

  // 1) درآمد (فاکتورهای جدید + تراکنش‌های قدیمی)
  const ordersAgg = await getAsync(
    `SELECT
        COALESCE(SUM(grandTotal), 0) as totalRevenue,
        COALESCE(COUNT(id), 0) as ordersCount
     FROM sales_orders
     WHERE transactionDate BETWEEN ? AND ?
       AND (status IS NULL OR status = 'active')`,
    [fromDateISO, toDateISO]
  );

  const legacyAgg = await getAsync(
    `SELECT
        COALESCE(SUM(totalPrice), 0) as totalRevenue,
        COALESCE(COUNT(id), 0) as txCount
     FROM sales_transactions
     WHERE transactionDate BETWEEN ? AND ?`,
    [fromDateISO, toDateISO]
  );

  const totalRevenue = Number(ordersAgg?.totalRevenue || 0) + Number(legacyAgg?.totalRevenue || 0);
  const totalTransactions = Number(ordersAgg?.ordersCount || 0) + Number(legacyAgg?.txCount || 0);

  // 2) COGS (فاکتورهای جدید + تراکنش‌های قدیمی)
  const ordersCogs = await getAsync(
    `SELECT COALESCE(SUM(
        CASE
          WHEN soi.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0) * soi.quantity
          WHEN soi.itemType = 'phone' THEN COALESCE(ph.purchasePrice, 0) * soi.quantity
          ELSE 0
        END
      ), 0) as cogs
     FROM sales_order_items soi
     JOIN sales_orders so ON so.id = soi.orderId
     LEFT JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
     LEFT JOIN phones   ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
     WHERE so.transactionDate BETWEEN ? AND ?
       AND (so.status IS NULL OR so.status = 'active')`,
    [fromDateISO, toDateISO]
  );

  const legacyCogs = await getAsync(
    `SELECT COALESCE(SUM(
        CASE
          WHEN st.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0) * st.quantity
          WHEN st.itemType = 'phone' THEN COALESCE(ph.purchasePrice, 0) * st.quantity
          ELSE 0
        END
      ), 0) as cogs
     FROM sales_transactions st
     LEFT JOIN products p ON st.itemType = 'inventory' AND st.itemId = p.id
     LEFT JOIN phones   ph ON st.itemType = 'phone' AND st.itemId = ph.id
     WHERE st.transactionDate BETWEEN ? AND ?`,
    [fromDateISO, toDateISO]
  );

  const totalCostOfGoodsSold = Number(ordersCogs?.cogs || 0) + Number(legacyCogs?.cogs || 0);
  const grossProfit = totalRevenue - totalCostOfGoodsSold;
  const averageSaleValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // 3) Daily sales (order grandTotal + legacy totalPrice)
  const dailySalesQuery = `
    SELECT date, SUM(amount) as totalSales
    FROM (
      SELECT transactionDate as date, grandTotal as amount
      FROM sales_orders
      WHERE transactionDate BETWEEN ? AND ?
        AND (status IS NULL OR status = 'active')
      UNION ALL
      SELECT transactionDate as date, totalPrice as amount
      FROM sales_transactions
      WHERE transactionDate BETWEEN ? AND ?
    )
    GROUP BY date
    ORDER BY date ASC
  `;
  const dailySales: DailySalesPoint[] = await allAsync(dailySalesQuery, [fromDateISO, toDateISO, fromDateISO, toDateISO]);

  // 4) Top selling items (by revenue) from unified line items
  const topItemsQuery = `
    WITH lines AS (
      SELECT itemId, itemType, itemName, quantity, totalPrice, transactionDate
      FROM sales_transactions
      WHERE transactionDate BETWEEN ? AND ?
      UNION ALL
      SELECT soi.itemId, soi.itemType, soi.description as itemName, soi.quantity, soi.totalPrice, so.transactionDate
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      WHERE so.transactionDate BETWEEN ? AND ?
        AND (so.status IS NULL OR so.status = 'active')
    )
    SELECT itemId, itemType, itemName,
           SUM(totalPrice) as totalRevenue,
           SUM(quantity) as quantitySold
    FROM lines
    GROUP BY itemId, itemType, itemName
    ORDER BY totalRevenue DESC
    LIMIT 20
  `;
  const topItemsRaw = await allAsync(topItemsQuery, [fromDateISO, toDateISO, fromDateISO, toDateISO]);
  const topSellingItems: TopSellingItem[] = (topItemsRaw || []).map((item: any) => ({
    id: item.itemId,
    itemType: item.itemType,
    itemName: item.itemName,
    totalRevenue: Number(item.totalRevenue || 0),
    quantitySold: Number(item.quantitySold || 0),
  }));

  return { totalRevenue, grossProfit, totalTransactions, averageSaleValue, dailySales, topSellingItems };
};

export const getDebtorsList = async (): Promise<FrontendDebtorReportItem[]> => {
  await getDbInstance();
  return await allAsync(`
    SELECT c.id, c.fullName, c.phoneNumber, cl.balance
    FROM customers c
    JOIN (
      SELECT customerId, balance, ROW_NUMBER() OVER (PARTITION BY customerId ORDER BY id DESC) as rn
      FROM customer_ledger
    ) cl ON c.id = cl.customerId AND cl.rn = 1
    WHERE cl.balance > 0
    ORDER BY cl.balance DESC
  `);
};

export const getCreditorsList = async (): Promise<FrontendCreditorReportItem[]> => {
  await getDbInstance();
  return await allAsync(`
    SELECT p.id, p.partnerName, p.partnerType, pl.balance
    FROM partners p
    JOIN (
      SELECT partnerId, balance, ROW_NUMBER() OVER (PARTITION BY partnerId ORDER BY id DESC) as rn
      FROM partner_ledger
    ) pl ON p.id = pl.partnerId AND pl.rn = 1
    WHERE pl.balance > 0 
    ORDER BY pl.balance DESC
  `);
};

export const getTopCustomersBySales = async (fromDateShamsi: string, toDateShamsi: string): Promise<FrontendTopCustomerReportItem[]> => {
  await getDbInstance();
  const fromDateISO = fromShamsiStringToISO(fromDateShamsi);
  const toDateISO = fromShamsiStringToISO(toDateShamsi);
  if (!fromDateISO || !toDateISO) throw new Error('فرمت تاریخ نامعتبر است.');
  // منبع اصلی: sales_orders (فاکتورها). برای داده‌های قدیمی، sales_transactions هم لحاظ می‌شود.
  const query = `
    SELECT x.customerId, c.fullName,
           SUM(x.amount) as totalSpent,
           COUNT(x.txId) as transactionCount
    FROM (
      SELECT so.customerId as customerId, so.grandTotal as amount, so.id as txId
      FROM sales_orders so
      WHERE so.transactionDate BETWEEN ? AND ?
        AND so.customerId IS NOT NULL
        AND (so.status IS NULL OR so.status = 'active')

      UNION ALL

      SELECT st.customerId as customerId, st.totalPrice as amount, st.id as txId
      FROM sales_transactions st
      WHERE st.transactionDate BETWEEN ? AND ?
        AND st.customerId IS NOT NULL
    ) x
    JOIN customers c ON c.id = x.customerId
    GROUP BY x.customerId, c.fullName
    ORDER BY totalSpent DESC
    LIMIT 20
  `;
  return await allAsync(query, [fromDateISO, toDateISO, fromDateISO, toDateISO]);
};

export const getTopSuppliersByPurchaseValue = async (fromDateISO: string, toDateISO: string): Promise<FrontendTopSupplierReportItem[]> => {
  await getDbInstance();
  // This query sums purchase prices from 'products' and 'phones' tables based on date_added/purchaseDate.
  // It's a simplified approach. A more accurate way would be to sum actual ledger entries (credits to supplier)
  // for purchases, but that requires ledger entries to consistently reference product/phone IDs.
  // The current ledger entry system for purchases is good, so we can leverage that.
  
  const query = `
    SELECT
        p.id as partnerId,
        p.partnerName,
        SUM(pl.credit) as totalPurchaseValue,
        COUNT(DISTINCT pl.id) as transactionCount -- Count ledger entries representing purchases
    FROM partners p
    JOIN partner_ledger pl ON p.id = pl.partnerId
    WHERE p.partnerType = 'Supplier'
      AND pl.credit > 0 -- Considering credit entries as value received from supplier
      AND (pl.referenceType = 'product_purchase' OR pl.referenceType = 'phone_purchase' OR pl.referenceType = 'product_purchase_edit' OR pl.referenceType = 'phone_purchase_edit')
      AND DATE(pl.transactionDate) BETWEEN DATE(?) AND DATE(?)
    GROUP BY p.id, p.partnerName
    ORDER BY totalPurchaseValue DESC
    LIMIT 20;
  `;
  return await allAsync(query, [fromDateISO, toDateISO]);
};

export const getPhoneSalesReport = async (fromDateISO: string, toDateISO: string): Promise<PhoneSaleProfitReportItem[]> => {
  await getDbInstance();
  // source A: sales_orders + sales_order_items (جدید)
  // source B: sales_transactions (قدیمی)
  const query = `
    SELECT
      txId as transactionId,
      transactionDate,
      customerFullName,
      phoneModel,
      imei,
      purchasePrice,
      totalPrice,
      profit
    FROM (
      SELECT
          so.id as txId,
          so.transactionDate,
          c.fullName as customerFullName,
          ph.model as phoneModel,
          ph.imei,
          ph.purchasePrice,
          soi.totalPrice as totalPrice,
          (soi.totalPrice - (COALESCE(ph.purchasePrice, 0) * COALESCE(soi.quantity, 1))) as profit
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
      LEFT JOIN customers c ON so.customerId = c.id
      WHERE so.transactionDate BETWEEN ? AND ?
        AND (so.status IS NULL OR so.status = 'active')

      UNION ALL

      SELECT
          st.id as txId,
          st.transactionDate,
          c.fullName as customerFullName,
          ph.model as phoneModel,
          ph.imei,
          ph.purchasePrice,
          st.totalPrice as totalPrice,
          (st.totalPrice - COALESCE(ph.purchasePrice, 0)) as profit
      FROM sales_transactions st
      JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
      LEFT JOIN customers c ON st.customerId = c.id
      WHERE st.transactionDate BETWEEN ? AND ?
    )
    ORDER BY transactionDate DESC
  `;
  return await allAsync(query, [fromDateISO, toDateISO, fromDateISO, toDateISO]);
};

export const getPhoneInstallmentSalesReport = async (fromDateISO: string, toDateISO: string): Promise<PhoneInstallmentSaleProfitReportItem[]> => {
    await getDbInstance();
    const query = `
        SELECT
            isale.id as saleId,
            isale.dateCreated,
            c.fullName as customerFullName,
            ph.model as phoneModel,
            ph.imei,
            ph.purchasePrice,
            isale.actualSalePrice,
            (isale.actualSalePrice - ph.purchasePrice) as totalProfit
        FROM installment_sales isale
        JOIN phones ph ON isale.phoneId = ph.id
        JOIN customers c ON isale.customerId = c.id
        WHERE DATE(isale.dateCreated) BETWEEN ? AND ?
        ORDER BY isale.dateCreated DESC;
    `;
    return await allAsync(query, [fromDateISO, toDateISO]);
};
// ---------- Invoice (تک فروش) ----------
export const getInvoiceDataById = async (
  saleId: number
): Promise<FrontendInvoiceData | null> => {
  await getDbInstance();

  const sale = await getAsync(
    `SELECT st.*, c.fullName  as customerFullName,
            c.phoneNumber    as customerPhone,
            c.address        as customerAddress
       FROM sales_transactions st
       LEFT JOIN customers c ON st.customerId = c.id
      WHERE st.id = ?`,
    [saleId]
  );
  if (!sale) return null;

  /* تنظیمات فروشگاه */
  const settings = await getAllSettingsAsObject();
  const businessDetails = {
    name: settings.store_name || "فروشگاه شما",
    addressLine1: settings.store_address_line1 || "",
    addressLine2: settings.store_address_line2 || "",
    cityStateZip: settings.store_city_state_zip || "",
    phone: settings.store_phone || "",
    email: settings.store_email || "",
    logoUrl: settings.store_logo_path ? `/uploads/${settings.store_logo_path}` : undefined,
  };

  /* مشخصات مشتری */
  const customerDetails = sale.customerId
    ? {
        id: sale.customerId,
        fullName: sale.customerFullName,
        phoneNumber: sale.customerPhone,
        address: sale.customerAddress,
      }
    : null;

  /* قلم فاکتور (totalPrice is net price for the line) */
  const lineItems = [
    {
      id: 1,
      description: sale.itemName,
      quantity: sale.quantity,
      unitPrice: sale.pricePerItem,
      totalPrice: sale.totalPrice, // Net price from DB: (qty * price) - discount
    },
  ];

  /* محاسبات برای خلاصه فاکتور */
  // Subtotal is the sum of gross prices (before discount)
  const subtotal       = sale.quantity * sale.pricePerItem;
  const discountAmount = sale.discount ?? 0;
  // Grand total is the final net price
  const grandTotal     = subtotal - discountAmount;

  // Sanity check: grandTotal should equal the net price from the database
  if (grandTotal !== sale.totalPrice) {
      console.warn(`Invoice ${sale.id} grandTotal mismatch! Calculated: ${grandTotal}, DB: ${sale.totalPrice}`);
  }


  return {
    businessDetails,
    customerDetails,
    invoiceMetadata: {
      invoiceNumber: String(sale.id),
      transactionDate: moment(sale.transactionDate, "YYYY-MM-DD")
        .locale("fa")
        .format("jYYYY/jMM/jDD"),
    },
    lineItems,
    financialSummary: { subtotal, discountAmount, grandTotal },
    notes: sale.notes,
  };
};


// ---------- Invoice (چند فروش در یک فاکتور) ----------
export const getInvoiceDataForSaleIds = async (
  saleIds: number[]
): Promise<FrontendInvoiceData | null> => {
  await getDbInstance();
  if (saleIds.length === 0) return null;

  const placeholders = saleIds.map(() => "?").join(",");
  const sales = await allAsync(
    `SELECT st.*, c.fullName  as customerFullName,
            c.phoneNumber    as customerPhone,
            c.address        as customerAddress
       FROM sales_transactions st
       LEFT JOIN customers c ON st.customerId = c.id
      WHERE st.id IN (${placeholders})
      ORDER BY st.id ASC`, // Consistent ordering
    saleIds
  );
  if (sales.length === 0) return null;

  /* تنظیمات فروشگاه */
  const settings = await getAllSettingsAsObject();
  const businessDetails = {
    name: settings.store_name || "فروشگاه شما",
    addressLine1: settings.store_address_line1 || "",
    cityStateZip: settings.store_city_state_zip || "",
    phone: settings.store_phone || "",
    email: settings.store_email || "",
    logoUrl: settings.store_logo_path ? `/uploads/${settings.store_logo_path}` : undefined,
  };

  /* مشخصات مشتری (از اولین فروش) */
  const firstSale = sales[0];
  const customerDetails = firstSale.customerId
    ? {
        id: firstSale.customerId,
        fullName: firstSale.customerFullName,
        phoneNumber: firstSale.customerPhone,
        address: firstSale.customerAddress,
      }
    : null;

  /* اقلام فاکتور (totalPrice is net price for the line) */
  const lineItems = sales.map((s, idx) => ({
    id: idx + 1,
    description: s.itemName,
    quantity: s.quantity,
    unitPrice: s.pricePerItem,
    totalPrice: s.totalPrice, // Net price from DB: (qty * price) - discount
  }));

  /* محاسبات برای خلاصه فاکتور */
  // Subtotal is the sum of gross prices (before discount)
  const subtotal = sales.reduce((sum, s) => sum + s.quantity * s.pricePerItem, 0);
  // Discount is the sum of all individual discounts
  const discountAmount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
  // Grand total is the final net price
  const grandTotal = subtotal - discountAmount;

  // Sanity check: grandTotal should equal the sum of net prices from the database
  const grandTotalCheck = sales.reduce((sum, s) => sum + s.totalPrice, 0);
  if (Math.abs(grandTotal - grandTotalCheck) > 0.001) { // Use tolerance for float comparison
      console.warn(`Invoice ${saleIds.join(',')} grandTotal mismatch! Calculated: ${grandTotal}, DB Sum: ${grandTotalCheck}`);
  }

  // Use notes from all sales, combined.
  const notes = sales.map(s => s.notes).filter(Boolean).join('\n---\n');

  return {
    businessDetails,
    customerDetails,
    invoiceMetadata: {
      invoiceNumber: saleIds.join(", "), // «مرجع» فاکتور
      transactionDate: moment(firstSale.transactionDate, "YYYY-MM-DD")
        .locale("fa")
        .format("jYYYY/jMM/jDD"),
    },
    lineItems,
    financialSummary: { subtotal, discountAmount, grandTotal },
    notes: notes,
  };
};


export async function createInvoice(invoiceData: any): Promise<number> {
  await getDbInstance(); // اطمینان از اتصال
  const subtotal = invoiceData.lineItems.reduce(
    (sum: number, item: any) => sum + (item.unitPrice || 0) * (item.quantity || 0),
    0
  );
  const discount = invoiceData.financialSummary?.discountAmount || 0;
  const grandTotal = subtotal - discount;

  const result = await runAsync(
    `INSERT INTO invoices 
      (invoiceNumber, customerId, date, subtotal, discountAmount, grandTotal, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      invoiceData.invoiceNumber || `INV-${Date.now()}`, // شماره فاکتور یکتا
      invoiceData.customerId || null,
      invoiceData.date,
      subtotal,
      discount,
      grandTotal,
      invoiceData.notes || '',
    ]
  );

  const invoiceId = result.lastID;

  for (const item of invoiceData.lineItems) {
    await runAsync(
      `INSERT INTO invoice_items 
        (invoiceId, description, quantity, unitPrice, totalPrice, itemType, itemId) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        item.description,
        item.quantity,
        item.unitPrice,
        (item.unitPrice || 0) * (item.quantity || 0),
        item.itemType || null,
        item.itemId || null
      ]
    );
  }

  return invoiceId;
}

// --- Settings ---
export const getAllSettingsAsObject = async (): Promise<Record<string, string>> => {
  await getDbInstance();
  const settingsArray = await allAsync("SELECT key, value FROM settings");
  return settingsArray.reduce((obj, item) => {
    obj[item.key] = item.value;
    return obj;
  }, {});
};

export const updateMultipleSettings = async (settings: SettingItem[]): Promise<void> => {
  await getDbInstance();
  await execAsync("BEGIN TRANSACTION;");
  try {
    for (const setting of settings) {
      await runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [setting.key, setting.value]
      );
    }
    await execAsync("COMMIT;");
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    throw new Error(`خطای پایگاه داده در به‌روزرسانی تنظیمات: ${err.message}`);
  }
};

export const updateSetting = async (key: string, value: string): Promise<void> => {
    await getDbInstance();
    await runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
};

// --- Users and Roles ---
export const getAllRoles = async (): Promise<FrontendRole[]> => {
  await getDbInstance();
  return await allAsync("SELECT * FROM roles ORDER BY name ASC");
};

export const addUserToDb = async (username: string, passwordPlain: string, roleId: number): Promise<Omit<UserForDb, 'passwordHash' | 'roleName'>> => {
  await getDbInstance();
  const existingUser = await getAsync("SELECT id FROM users WHERE username = ?", [username]);
  if (existingUser) throw new Error("نام کاربری قبلا استفاده شده است.");
  
  const passwordHash = await bcryptjs.hash(passwordPlain, 10);
  const result = await runAsync(
    "INSERT INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)",
    [username, passwordHash, roleId]
  );
  return { id: result.lastID, username, roleId, dateAdded: new Date().toISOString() };
};

export const updateUserInDb = async (userId: number, data: UserUpdatePayload): Promise<Omit<UserForDb, 'passwordHash'>> => {
  await getDbInstance();
  const user = await getAsync("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) throw new Error("کاربر یافت نشد.");
  if (user.username === 'admin' && data.roleId && (await getAsync("SELECT name FROM roles WHERE id = ?", [data.roleId]))?.name !== ADMIN_ROLE_NAME) {
      throw new Error("نقش کاربر مدیر اصلی (admin) قابل تغییر نیست مگر به نقش مدیر دیگری.");
  }

  const fieldsToUpdate: string[] = [];
  const params: any[] = [];

  if (data.roleId !== undefined) {
    fieldsToUpdate.push("roleId = ?");
    params.push(data.roleId);
  }

  if (fieldsToUpdate.length === 0) {
    const role = await getAsync("SELECT name FROM roles WHERE id = ?", [user.roleId]);
    return { id: user.id, username: user.username, roleId: user.roleId, roleName: role.name, dateAdded: user.dateAdded, avatarPath: user.avatarPath };
  }

  params.push(userId);
  await runAsync(`UPDATE users SET ${fieldsToUpdate.join(", ")} WHERE id = ?`, params);
  const updatedUser = await getAsync("SELECT id, username, roleId, dateAdded, avatarPath FROM users WHERE id = ?", [userId]);
  const role = await getAsync("SELECT name FROM roles WHERE id = ?", [updatedUser.roleId]);
  return { ...updatedUser, roleName: role.name };
};

export const deleteUserFromDb = async (userId: number): Promise<boolean> => {
  await getDbInstance();
  const user = await getAsync("SELECT username FROM users WHERE id = ?", [userId]);
  if (!user) throw new Error("کاربر یافت نشد.");
  if (user.username === 'admin') throw new Error("امکان حذف کاربر مدیر اصلی (admin) وجود ندارد.");
  
  const result = await runAsync("DELETE FROM users WHERE id = ?", [userId]);
  return result.changes > 0;
};

export const getAllUsersWithRoles = async (): Promise<FrontendUserForDisplay[]> => {
  await getDbInstance();
  const usersFromDb = await allAsync(`
    SELECT u.id, u.username, u.roleId, r.name as roleName, u.dateAdded, u.avatarPath
    FROM users u
    JOIN roles r ON u.roleId = r.id
    ORDER BY u.username ASC
  `);
  return usersFromDb.map(user => ({
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roleName,
      dateAdded: user.dateAdded,
      avatarUrl: user.avatarPath ? `/uploads/avatars/${user.avatarPath}` : null,
  }));
};

export const findUserByUsername = async (username: string): Promise<UserForDb | null> => {
  await getDbInstance();
  const userRow = await getAsync(
    `SELECT u.id, u.username, u.passwordHash, u.roleId, r.name as roleName, u.dateAdded, u.avatarPath
     FROM users u
     JOIN roles r ON u.roleId = r.id
     WHERE u.username = ?`, [username]
  );
  return userRow || null;
};

export const changePasswordInDb = async (userId: number, { oldPassword, newPassword }: ChangePasswordPayload): Promise<boolean> => {
    await getDbInstance();
    const user = await getAsync("SELECT passwordHash FROM users WHERE id = ?", [userId]);
    if (!user) throw new Error("کاربر یافت نشد.");

    const isMatch = await bcryptjs.compare(oldPassword, user.passwordHash);
    if (!isMatch) throw new Error("کلمه عبور فعلی نامعتبر است.");

    const newPasswordHash = await bcryptjs.hash(newPassword, 10);
    const result = await runAsync("UPDATE users SET passwordHash = ? WHERE id = ?", [newPasswordHash, userId]);
    return result.changes > 0;
};

export const resetUserPasswordInDb = async (userId: number, newPasswordPlain: string): Promise<boolean> => {
    await getDbInstance();
    const user = await getAsync("SELECT id, username FROM users WHERE id = ?", [userId]);
    if (!user) throw new Error("کاربر برای تغییر رمز عبور یافت نشد.");
   

    const newPasswordHash = await bcryptjs.hash(newPasswordPlain, 10);
    const result = await runAsync("UPDATE users SET passwordHash = ? WHERE id = ?", [newPasswordHash, userId]);
    return result.changes > 0;
};


export const updateAvatarPathInDb = async (userId: number, avatarPath: string): Promise<UserForDb> => {
    await getDbInstance();
    await runAsync("UPDATE users SET avatarPath = ? WHERE id = ?", [avatarPath, userId]);
    const updatedUser = await getAsync("SELECT * FROM users WHERE id = ?", [userId]);
    const role = await getAsync("SELECT name FROM roles WHERE id = ?", [updatedUser.roleId]);
    return { ...updatedUser, roleName: role.name };
};

/// --- Dashboard ---
export const getDashboardKPIs = async (): Promise<FrontendDashboardKPIs> => {
  await getDbInstance();

  // تاریخ‌ها با جلالی و مقایسه‌ی ایمن در SQLite
  const todayISO = moment().format('YYYY-MM-DD');
  const firstDayOfMonthISO = moment().startOf('jMonth').format('YYYY-MM-DD');
  const lastDayOfMonthISO  = moment().endOf('jMonth').format('YYYY-MM-DD');

  // فروش ماهانه: تراکنش‌های نقدی + سفارش‌ها
  // برای اطمینان از اینکه گوشی‌های مرجوعی از مبلغ کل کسر می‌شوند، تراکنش‌های مربوط به گوشی‌هایی که وضعیت‌شان
  // دیگر فروخته شده نیست را در محاسبه لحاظ نمی‌کنیم و از مبلغ فاکتورها، مجموع قیمت اقلام بازگشتی را کم می‌کنیم.
  const monthCash = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
        AND (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );
  const monthOrders = await getAsync(
    `SELECT COALESCE(SUM(
              so.grandTotal
              - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                ), 0)
            ),0) AS total
       FROM sales_orders so
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  // درآمد فروش نقدی گوشی ماه جاری: فقط فروش‌های نقدی گوشی‌ها
  // معیار: اقلام موبایل با وضعیت «فروخته شده»
  const monthCashOnly = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate) BETWEEN date(?) AND date(?)
        AND st.itemType = 'phone' AND ph.status = 'فروخته شده'`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  const monthOrdersCash = await getAsync(
    `SELECT COALESCE(SUM(soi.totalPrice),0) AS total
       FROM sales_orders so
       JOIN sales_order_items soi ON soi.orderId = so.id
       LEFT JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
        AND soi.itemType = 'phone' AND p2.status = 'فروخته شده'`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  // درآمد فروش اقساطی ماه جاری (جدول installment_sales)
  const monthInstallmentSales = await getAsync(
    `SELECT COALESCE(SUM(actualSalePrice),0) AS total
       FROM installment_sales
      WHERE date(dateCreated) BETWEEN date(?) AND date(?)`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );

  // درآمد فروش اقساطی از مسیر «sales_orders» (برای فروش‌های اقساطیِ لوازم/خدمات یا فروش‌های غیر-گوشی)
  // معیار: paymentMethod='installment'
  // و برای اقلام موبایل فقط اگر وضعیت «فروخته شده (قسطی)» باشد.
  const monthOrdersInstallment = await getAsync(
    `SELECT COALESCE(SUM(soi.totalPrice),0) AS total
       FROM sales_orders so
       JOIN sales_order_items soi ON soi.orderId = so.id
       LEFT JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
      WHERE date(so.transactionDate) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
        AND so.paymentMethod = 'installment'
        AND (soi.itemType <> 'phone' OR p2.status = 'فروخته شده (قسطی)')`,
    [firstDayOfMonthISO, lastDayOfMonthISO]
  );


  // فروش امروز: تراکنش‌های نقدی + سفارش‌ها با لحاظ کردن بازگشتی‌ها
  const todayCash = await getAsync(
    `SELECT COALESCE(SUM(st.totalPrice),0) AS total
       FROM sales_transactions st
       LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
      WHERE date(st.transactionDate)=date(?)
        AND (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))`,
    [todayISO]
  );
  const todayOrders = await getAsync(
    `SELECT COALESCE(SUM(
              so.grandTotal
              - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                ), 0)
            ),0) AS total
       FROM sales_orders so
      WHERE date(so.transactionDate)=date(?)
        AND (so.status IS NULL OR so.status = 'active')`,
    [todayISO]
  );

  // شمارش‌ها
  const activeProductsCountRes = await getAsync(
    "SELECT COALESCE(COUNT(id),0) AS count FROM products WHERE stock_quantity > 0"
  );
  const activePhonesCountRes = await getAsync(
    // در شمارش گوشی‌های فعال (قابل فروش) وضعیت‌های موجود در انبار و مرجوعی (اقساطی یا نقدی) را لحاظ می‌کنیم
    "SELECT COALESCE(COUNT(id),0) AS count FROM phones WHERE status IN ('موجود در انبار','مرجوعی','مرجوعی اقساطی')"
  );
  const totalCustomersCountRes = await getAsync(
    "SELECT COALESCE(COUNT(id),0) AS count FROM customers"
  );

  // مجموع کل تاریخ (نقد + اقساط + سفارش‌ها)
  const totalCashSalesRes        = await getAsync("SELECT COALESCE(SUM(totalPrice),0) AS total FROM sales_transactions");
  const totalInstallmentSalesRes = await getAsync("SELECT COALESCE(SUM(actualSalePrice),0) AS total FROM installment_sales");
  const totalOrdersRes           = await getAsync("SELECT COALESCE(SUM(grandTotal),0) AS total FROM sales_orders WHERE (status IS NULL OR status = 'active')");
  const totalSalesAllTime =
    (totalCashSalesRes?.total || 0) +
    (totalInstallmentSalesRes?.total || 0) +
    (totalOrdersRes?.total || 0);

  return {
    totalSalesMonth: (monthCash?.total || 0) + (monthOrders?.total || 0),
    revenueToday: (todayCash?.total || 0) + (todayOrders?.total || 0),

    // KPIهای اختصاصی داشبورد
    phoneSalesRevenueMonth: (monthCashOnly?.total || 0) + (monthOrdersCash?.total || 0),
    installmentSalesRevenueMonth: (monthInstallmentSales?.total || 0) + (monthOrdersInstallment?.total || 0),

    activeProductsCount: (activeProductsCountRes?.count || 0) + (activePhonesCountRes?.count || 0),
    totalCustomersCount: totalCustomersCountRes?.count || 0,
    totalSalesAllTime,
  };
};


export const getDashboardSalesChartData = async (period: string): Promise<FrontendSalesDataPoint[]> => {
  await getDbInstance();

  // بازه‌ها و فرمت گروه‌بندی
  const now = moment().locale('en');
  let start: moment.Moment;
  let fmt: '%Y-%m-%d' | '%Y-%m';
  let labelFn: (s: string) => string;

  if (period === 'weekly') {
    // برای نمودار هفتگی، ۷ روز اخیر را با فرمت شمسی (روز و ماه) نمایش می‌دهیم.
    // استفاده از فرمت تقویم جلالی به‌جای نام روز هفته باعث می‌شود برچسب‌ها یکتاتر باشند
    // و عدم نمایش داده که از تکرار نام روزها ناشی می‌شود، برطرف گردد.
    start = now.clone().startOf('day').subtract(6, 'days');
    fmt = '%Y-%m-%d';
    labelFn = (iso: string) => {
      // iso ورودی مانند 2025-10-07 را به شمسی تبدیل کرده و به صورت jMM/jDD برمی‌گردانیم
      return moment(iso).locale('fa').format('jMM/jDD');
    };
  } else if (period === 'yearly') {
    start = now.clone().startOf('month').subtract(11, 'months');
    fmt = '%Y-%m';
    labelFn = (ym: string) => moment(ym + '-01').locale('fa').format('jMMMM');
  } else {
    // monthly = 30 روز اخیر مثل fallback
    start = now.clone().startOf('day').subtract(29, 'days');
    fmt = '%Y-%m-%d';
    labelFn = (iso: string) => moment(iso).locale('fa').format('jMM/jDD');
  }

  const startISO = start.format('YYYY-MM-DD');
  const endISO   = now.clone().endOf('day').format('YYYY-MM-DD');

  // تجمیع از هر دو منبع: سفارش‌های جدید + تراکنش‌های قدیمی
  const rows = await allAsync(
    `
    SELECT strftime('${fmt}', t.transactionDate) AS date_group, SUM(t.amount) AS sales
      FROM (
        -- سفارش‌ها: مبلغ نهایی منهای مجموع مبلغ اقلام گوشی‌هایی که مرجوع شده‌اند
        SELECT so.transactionDate AS transactionDate,
               (so.grandTotal
                - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                   ), 0)
               ) AS amount
          FROM sales_orders so
         WHERE (so.status IS NULL OR so.status = 'active')
        UNION ALL
        -- تراکنش‌های تکی: فقط زمانی محسوب می‌شوند که گوشی همچنان فروخته شده باشد
        SELECT st.transactionDate AS transactionDate,
               st.totalPrice AS amount
          FROM sales_transactions st
          LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
         WHERE (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))
      ) t
     WHERE date(t.transactionDate) BETWEEN date(?) AND date(?)
     GROUP BY date_group
     ORDER BY date_group ASC
    `,
    [startISO, endISO]
  );

  // داده‌های موجود را در یک نقشه ذخیره کن تا بتوانیم بازهٔ کامل را پر کنیم
  const dataMap = new Map<string, number>();
  rows.forEach((r: any) => {
    dataMap.set(r.date_group, Number(r.sales) || 0);
  });

  // strftime pattern ها را به فرمت moment معادل تبدیل کن
  const groupFmt = fmt === '%Y-%m-%d' ? 'YYYY-MM-DD' : 'YYYY-MM';
  const result: FrontendSalesDataPoint[] = [];

  // بازهٔ تکرار: اگر بازه سالانه باشد گام ماهیانه می‌شود و در غیر این صورت روزانه
  const stepUnit = period === 'yearly' ? 'month' : 'day';
  let cursor = start.clone();
  // از زمان شروع تا پایان (امروز) پیمایش کن و برای هر بازه مقدار را از dataMap بگیر
  while (cursor.isSameOrBefore(now, stepUnit as any)) {
    const key = cursor.locale('en').format(groupFmt);
    const salesValue = dataMap.get(key) || 0;
    result.push({
      name: labelFn(key),
      sales: salesValue,
    });
    cursor.add(1, stepUnit as any);
  }
  return result;
};



export const getDashboardRecentActivities = async (): Promise<FrontendActivityItem[]> => {
    await getDbInstance();
    const sales = await allAsync(
        `SELECT st.id, st.itemName, st.totalPrice, st.transactionDate, c.fullName as customerName 
         FROM sales_transactions st 
         LEFT JOIN customers c ON st.customerId = c.id
         ORDER BY st.id DESC LIMIT 3`
    );
    const newProducts = await allAsync("SELECT id, name, date_added FROM products ORDER BY id DESC LIMIT 2");
    const newPhones = await allAsync("SELECT id, model, registerDate FROM phones ORDER BY id DESC LIMIT 2");

    const activities: FrontendActivityItem[] = [];
    sales.forEach(s => activities.push({
        id: `sale-${s.id}`,
        typeDescription: "فروش جدید",
        details: `${s.itemName} به ${s.customerName || 'مهمان'} به ارزش ${s.totalPrice.toLocaleString('fa-IR')} تومان`,
        timestamp: moment(s.transactionDate).toISOString(), 
        icon: "fa-solid fa-cash-register",
        color: "bg-green-500",
        link: `/invoices/${s.id}`
    }));
    newProducts.forEach(p => activities.push({
        id: `product-${p.id}`,
        typeDescription: "محصول جدید",
        details: `${p.name} اضافه شد`,
        timestamp: p.date_added,
        icon: "fa-solid fa-box",
        color: "bg-blue-500",
        link: `/products` 
    }));
     newPhones.forEach(ph => activities.push({
        id: `phone-${ph.id}`,
        typeDescription: "گوشی جدید",
        details: `${ph.model} اضافه شد`,
        timestamp: ph.registerDate,
        icon: "fa-solid fa-mobile-screen",
        color: "bg-purple-500",
        link: `/mobile-phones`
    }));

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
};


// ===================== Dashboard Layout (per-user) =====================
type DashboardLayoutsPayload = any;

export const getUserDashboardLayoutFromDb = async (userId: number): Promise<DashboardLayoutsPayload | null> => {
  await getDbInstance();
  const row = await getAsync<{ layoutJson: string }>(
    'SELECT layoutJson FROM user_dashboard_layouts WHERE userId = ?',
    [userId],
  );

  if (!row?.layoutJson) return null;

  try {
    return JSON.parse(row.layoutJson);
  } catch {
    return null;
  }
};

export const upsertUserDashboardLayoutInDb = async (userId: number, layouts: DashboardLayoutsPayload): Promise<void> => {
  await getDbInstance();
  const layoutJson = JSON.stringify(layouts ?? {});
  // Basic safety limit to avoid storing huge payloads
  if (layoutJson.length > 200_000) throw new Error('Layout payload is too large.');

  await runAsync(
    `INSERT INTO user_dashboard_layouts (userId, layoutJson, updatedAt)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
     ON CONFLICT(userId) DO UPDATE SET
       layoutJson = excluded.layoutJson,
       updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ','now','utc')`,
    [userId, layoutJson],
  );
};

export const deleteUserDashboardLayoutFromDb = async (userId: number): Promise<void> => {
  await getDbInstance();
  await runAsync('DELETE FROM user_dashboard_layouts WHERE userId = ?', [userId]);
};


// --- Installment Sales ---
export const addInstallmentSaleToDb = async (saleData: InstallmentSalePayload): Promise<any> => {
  await getDbInstance();
  const {
    customerId,
    phoneId,
    actualSalePrice,
    downPayment,
    numberOfInstallments,
    installmentAmount,
    installmentsStartDate,
    checks = [],
    notes,
  } = saleData as any;

  const saleType: 'installment' | 'check' = (saleData as any).saleType === 'check' ? 'check' : 'installment';

  // اقلام جدید (با سازگاری عقب‌رو)
  const phonesPayload: any[] = Array.isArray((saleData as any).phones) ? (saleData as any).phones : [];
  const accessoryPayload: any[] = Array.isArray((saleData as any).accessories) ? (saleData as any).accessories : [];
  const servicesPayload: any[] = Array.isArray((saleData as any).services) ? (saleData as any).services : [];
  const explicitPhoneIds: number[] = Array.isArray((saleData as any).phoneIds)
    ? (saleData as any).phoneIds.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n))
    : [];

  const phoneIds: number[] = Array.from(
    new Set<number>(
      [
        ...(Number.isFinite(Number(phoneId)) ? [Number(phoneId)] : []),
        ...phonesPayload.map((p: any) => Number(p.phoneId)).filter((n: any) => Number.isFinite(n)),
        ...explicitPhoneIds,
      ].filter((n: any) => Number.isFinite(n))
    )
  );

  const hasAnyItems = phoneIds.length > 0 || accessoryPayload.length > 0 || servicesPayload.length > 0;
  if (!hasAnyItems) throw new Error('حداقل یک قلم (موبایل/لوازم/خدمات) برای فروش اقساطی الزامی است.');

  const itemsSummaryParts: string[] = [];

  try {
    await execAsync('BEGIN TRANSACTION;');

    // 1) اعتبارسنجی و آماده‌سازی اقلام
    // Phones
    const saleDateISO = moment(installmentsStartDate, 'jYYYY/jMM/jDD').locale('en').format('YYYY-MM-DD');
    for (const pid of phoneIds) {
      const ph = await getAsync('SELECT id, model, imei, status, purchasePrice, salePrice FROM phones WHERE id = ?', [pid]);
      if (!ph) throw new Error('گوشی مورد نظر یافت نشد.');
      if (ph.status !== 'موجود در انبار' && ph.status !== 'مرجوعی' && ph.status !== 'مرجوعی اقساطی') {
        throw new Error('این گوشی قبلاً فروخته شده یا در دسترس نیست.');
      }
      itemsSummaryParts.push(`${ph.model}${ph.imei ? ` (${ph.imei})` : ''}`);
    }

    // Inventory (accessories)
    for (const a of accessoryPayload) {
      const productId = Number(a.productId);
      const qty = Math.max(1, Number(a.qty || a.quantity || 1));
      if (!Number.isFinite(productId)) throw new Error('کالای نامعتبر است.');
      const pr = await getAsync('SELECT id, name, stock_quantity, sellingPrice FROM products WHERE id = ?', [productId]);
      if (!pr) throw new Error('کالای مورد نظر یافت نشد.');
      if (Number(pr.stock_quantity) < qty) throw new Error(`موجودی کالای «${pr.name}» کافی نیست.`);
      itemsSummaryParts.push(`${pr.name} × ${qty}`);
    }

    // Services
    for (const s of servicesPayload) {
      const serviceId = Number(s.serviceId || s.id);
      const qty = Math.max(1, Number(s.qty || s.quantity || 1));
      if (!Number.isFinite(serviceId)) throw new Error('خدمت نامعتبر است.');
      const sv = await getAsync('SELECT id, name, price FROM services WHERE id = ?', [serviceId]);
      if (!sv) throw new Error('خدمت مورد نظر یافت نشد.');
      itemsSummaryParts.push(`${sv.name} × ${qty}`);
    }

    // 2) ایجاد رکورد فروش
    const metaJson = (saleData as any).meta ? JSON.stringify((saleData as any).meta) : ((saleData as any).metaJson ? String((saleData as any).metaJson) : null);
    const itemsSummary = itemsSummaryParts.join('، ');
    const mainPhoneId: number | null = phoneIds.length > 0 ? phoneIds[0] : null;
    const saleResult = await runAsync(
      `INSERT INTO installment_sales
        (customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, saleType, itemsSummary, metaJson, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        customerId,
        mainPhoneId,
        actualSalePrice,
        downPayment,
        Number(numberOfInstallments) || 0,
        Number(installmentAmount) || 0,
        installmentsStartDate,
        saleType,
        itemsSummary,
        metaJson,
        notes || null,
      ]
    );
    const saleId = saleResult.lastID;

    // 3) اقلام فروش
    // Phones
    for (const pid of phoneIds) {
      const ph = await getAsync('SELECT id, model, imei, purchasePrice, salePrice FROM phones WHERE id = ?', [pid]);
      const unit = Number(
        phonesPayload.find((x: any) => Number(x.phoneId) === pid)?.sellPrice ??
        ph?.salePrice ??
        0
      );
      const buy = Number(
        phonesPayload.find((x: any) => Number(x.phoneId) === pid)?.buyPrice ??
        ph?.purchasePrice ??
        0
      );
      const desc = `${ph?.model || 'موبایل'}${ph?.imei ? ` (IMEI: ${ph.imei})` : ''}`;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, 'phone', pid, desc, 1, unit, buy, unit]
      );
    }

    // Inventory
    for (const a of accessoryPayload) {
      const productId = Number(a.productId);
      const qty = Math.max(1, Number(a.qty || a.quantity || 1));
      const pr = await getAsync('SELECT id, name, sellingPrice FROM products WHERE id = ?', [productId]);
      const unit = Number(a.sellPrice ?? a.unitPrice ?? pr?.sellingPrice ?? 0);
      const buy = Number(a.buyPrice ?? 0);
      const desc = String(a.name || pr?.name || 'لوازم');
      const total = unit * qty;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, 'inventory', productId, desc, qty, unit, buy, total]
      );
      // کاهش موجودی
      await runAsync('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, productId]);
    }

    // Services
    for (const s of servicesPayload) {
      const serviceId = Number(s.serviceId || s.id);
      const qty = Math.max(1, Number(s.qty || s.quantity || 1));
      const sv = await getAsync('SELECT id, name, price FROM services WHERE id = ?', [serviceId]);
      const unit = Number(s.sellPrice ?? s.unitPrice ?? sv?.price ?? 0);
      const desc = String(s.name || sv?.name || 'خدمات');
      const total = unit * qty;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, 'service', serviceId, desc, qty, unit, 0, total]
      );
    }

    // 4) ایجاد اقساط
    const nInst = Number(numberOfInstallments) || 0;
    const instAmt = Number(installmentAmount) || 0;
    if (nInst > 0 && instAmt > 0) {
      let currentDueDate = moment(installmentsStartDate, 'jYYYY/jMM/jDD');
      for (let i = 0; i < nInst; i++) {
        await runAsync(
          `INSERT INTO installment_payments (saleId, installmentNumber, dueDate, amountDue) VALUES (?, ?, ?, ?)`,
          [saleId, i + 1, currentDueDate.format('jYYYY/jMM/jDD'), instAmt]
        );
        currentDueDate.add(1, 'jMonth');
      }
    }

    // 5) چک‌ها
    for (const check of checks) {
      await runAsync(
        `INSERT INTO installment_checks (saleId, checkNumber, bankName, dueDate, amount, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, check.checkNumber, check.bankName, check.dueDate, check.amount, normalizeCheckStatus((check as any).status ?? 'نزد فروشنده')]
      );
    }

    // 6) آپدیت وضعیت گوشی‌ها
    for (const pid of phoneIds) {
      await runAsync("UPDATE phones SET status = 'فروخته شده (قسطی)', saleDate = ? WHERE id = ?", [saleDateISO, pid]);
    }

    // 7) دفتر مشتری
    const totalDebt = Number(actualSalePrice) - Number(downPayment);
    if (totalDebt > 0) {
      const ledgerDescription = `خرید اقساطی (شناسه فروش: ${saleId})، موارد: ${itemsSummary || '—'}، مبلغ کل: ${Number(actualSalePrice).toLocaleString('fa-IR')}، پیش پرداخت: ${Number(downPayment).toLocaleString('fa-IR')}`;
      await addCustomerLedgerEntryInternal(customerId, ledgerDescription, totalDebt, 0, new Date().toISOString());
    } else if (Number(downPayment) > 0 && totalDebt <= 0) {
      const ledgerDescription = `خرید (شناسه فروش اقساطی: ${saleId})، پرداخت کامل`;
      await addCustomerLedgerEntryInternal(customerId, ledgerDescription, Number(actualSalePrice), Number(actualSalePrice), new Date().toISOString());
    }

    await execAsync('COMMIT;');
    return await getInstallmentSaleByIdFromDb(saleId);
  } catch (err: any) {
    await execAsync('ROLLBACK;');
    console.error('DB Error (addInstallmentSaleToDb):', err);
    throw err;
  }
};

/**
 * حذف فروش اقساطی از پایگاه داده.
 * این تابع همه اقساط و چک‌های مرتبط با فروش را حذف می‌کند
 * و وضعیت گوشی مرتبط را به «موجود در انبار» برمی‌گرداند و saleDate را خالی می‌کند.
 * @param saleId شناسه فروش اقساطی
 */
export const deleteInstallmentSaleFromDb = async (saleId: number): Promise<void> => {
  await getDbInstance();
  // پیدا کردن رکورد فروش
  const sale = await getAsync('SELECT * FROM installment_sales WHERE id = ?', [saleId]);
  if (!sale) throw new Error('فروش اقساطی یافت نشد.');
  try {
    await execAsync('BEGIN TRANSACTION;');

    // اقلام را بخوان (برای بازگردانی موجودی/وضعیت)
    const items: any[] = await allAsync('SELECT * FROM installment_sale_items WHERE saleId = ?', [saleId]).catch(() => []);
    const phoneIds: number[] = Array.from(
      new Set<number>(
        (items || [])
          .filter((it: any) => it.itemType === 'phone')
          .map((it: any) => Number(it.itemId))
          .filter((n: any) => Number.isFinite(n))
          .concat(Number.isFinite(Number(sale.phoneId)) ? [Number(sale.phoneId)] : [])
      )
    );

    // بازگردانی لوازم به موجودی
    for (const it of items || []) {
      if (it.itemType === 'inventory') {
        const pid = Number(it.itemId);
        const qty = Math.max(1, Number(it.quantity || 1));
        if (Number.isFinite(pid) && Number.isFinite(qty)) {
          await runAsync('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [qty, pid]);
        }
      }
    }

    // بازگرداندن وضعیت گوشی‌ها (اگر وجود داشته باشند)
    const returnDateShamsi = moment().locale('fa').format('jYYYY/jMM/jDD');
    for (const pid of phoneIds) {
      const phoneRow = await getAsync('SELECT purchaseDate FROM phones WHERE id = ?', [pid]);
      const existingPurchaseDate = phoneRow ? phoneRow.purchaseDate : null;
      await runAsync(
        "UPDATE phones SET status = 'مرجوعی اقساطی', saleDate = NULL, purchaseDate = ?, returnDate = ? WHERE id = ?",
        [existingPurchaseDate, returnDateShamsi, pid]
      );
    }

    // حذف اقساط
    await runAsync('DELETE FROM installment_payments WHERE saleId = ?', [saleId]);
    // حذف چک‌ها
    await runAsync('DELETE FROM installment_checks WHERE saleId = ?', [saleId]);
    // حذف اقلام
    await runAsync('DELETE FROM installment_sale_items WHERE saleId = ?', [saleId]).catch(() => {});
    // حذف خود فروش
    await runAsync('DELETE FROM installment_sales WHERE id = ?', [saleId]);
    await execAsync('COMMIT;');
  } catch (err) {
    await execAsync('ROLLBACK;');
    throw err;
  }
};

export const getAllInstallmentSalesFromDb = async (): Promise<FrontendInstallmentSale[]> => {
  await getDbInstance();

  const salesFromDb = await allAsync(`
    SELECT 
        isale.*, 
        c.fullName as customerFullName, 
        p.model as phoneModel, 
        p.imei as phoneImei,
        isale.actualSalePrice as totalInstallmentPrice
    FROM installment_sales isale
    JOIN customers c ON isale.customerId = c.id
    LEFT JOIN phones p ON isale.phoneId = p.id
    ORDER BY isale.dateCreated DESC
  `);

  const sales: FrontendInstallmentSale[] = [];

  for (const saleDb of salesFromDb) {
    const isCheckSale =
      saleDb.saleType === 'check' || Number(saleDb.numberOfInstallments || 0) === 0;

    let remainingAmount =
      Number(saleDb.totalInstallmentPrice || 0) - Number(saleDb.downPayment || 0);

    let nextDueDate: string | null = null;
    let overallStatus: FrontendInstallmentSale['overallStatus'] = 'در حال پرداخت';

    if (isCheckSale) {
      const checksRaw = await allAsync(
        'SELECT * FROM installment_checks WHERE saleId = ? ORDER BY dueDate ASC',
        [saleDb.id]
      );
      const checks = (checksRaw || []).map((c: any) => ({ ...c, status: normalizeCheckStatus(c.status) }));

      const paidByChecks = checks
        .filter((c: any) => c.status === 'نقد شد')
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

      remainingAmount = Math.max(0, remainingAmount - paidByChecks);

      const unsettled = checks.filter(
        (c: any) => c.status !== 'نقد شد' && c.status !== 'به مشتری برگشت داده شده'
      );

      nextDueDate = unsettled[0]?.dueDate ?? null;

      const hasBounced = checks.some((c: any) => c.status === 'برگشت خورد');
      const hasOverdue = unsettled.some((c: any) => {
        try {
          return moment(c.dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day');
        } catch {
          return false;
        }
      });

      overallStatus =
        remainingAmount === 0
          ? 'تکمیل شده'
          : hasBounced || hasOverdue
          ? 'معوق'
          : 'در حال پرداخت';
    } else {
      const payments = await allAsync(
        'SELECT * FROM installment_payments WHERE saleId = ? ORDER BY installmentNumber ASC',
        [saleDb.id]
      );

      let allPaid = payments.length > 0;
      let hasOverdue = false;

      for (const payment of payments) {
        if (payment.status !== 'پرداخت شده') {
          allPaid = false;
          if (!nextDueDate) nextDueDate = payment.dueDate;

          try {
            if (moment(payment.dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day')) {
              hasOverdue = true;
            }
          } catch {}
        }

        const sumResult = await getAsync(
          `SELECT SUM(amount_paid) as totalPaid FROM installment_transactions WHERE installment_payment_id = ?`,
          [payment.id]
        );
        const totalPaidForInstallment = sumResult.totalPaid || 0;
        remainingAmount -= totalPaidForInstallment;
      }

      remainingAmount = Math.max(0, remainingAmount);

      if (allPaid) overallStatus = 'تکمیل شده';
      else if (hasOverdue) overallStatus = 'معوق';
    }

    sales.push({
      ...saleDb,
      payments: [],
      checks: [],
      remainingAmount,
      nextDueDate,
      overallStatus,
    });
  }

  return sales;
};

// ===================== Installments DB section (FINAL) =====================

// مهم: moment از قبل در فایل شما استفاده شده. اگر import ندارید اضافه کنید:
// import moment from 'jalali-moment';

type OverallStatus = FrontendInstallmentSale["overallStatus"]; // همان تایپ شما

export const getInstallmentSaleByIdFromDb = async (
  saleId: number
): Promise<FrontendInstallmentSale | null> => {
  await getDbInstance();

  const saleDb = await getAsync(
    `
    SELECT 
        isale.*, 
        c.fullName as customerFullName, 
        p.model as phoneModel, 
        p.imei as phoneImei,
        isale.actualSalePrice as totalInstallmentPrice
    FROM installment_sales isale
    JOIN customers c ON isale.customerId = c.id
    LEFT JOIN phones p ON isale.phoneId = p.id
    WHERE isale.id = ?
  `,
    [saleId]
  );

  if (!saleDb) return null;

  // اقساط و چک‌ها
  const payments: any[] = await allAsync(
    "SELECT * FROM installment_payments WHERE saleId = ? ORDER BY installmentNumber ASC",
    [saleDb.id]
  );
  const checksRaw: any[] = await allAsync(
    "SELECT * FROM installment_checks WHERE saleId = ? ORDER BY dueDate ASC",
    [saleDb.id]
  );
  const checks = (checksRaw || []).map((c: any) => ({ ...c, status: normalizeCheckStatus(c.status) }));

  // اقلام (گوشی/لوازم/خدمات) - برای نمایش در جزئیات
  const items: any[] = await allAsync(
    `SELECT itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice
       FROM installment_sale_items
      WHERE saleId = ?
      ORDER BY id ASC`,
    [saleDb.id]
  ).catch(() => []);

  // ماندهٔ پایه = مجموع اقساط (بدون پیش‌پرداخت)
  let remainingAmount =
    Number(saleDb.totalInstallmentPrice || 0) - Number(saleDb.downPayment || 0);

  // برای تعیین وضعیت کلی
  let nextDueDate: string | null = null;
  let overallStatus: OverallStatus = "در حال پرداخت";
  let allPaid = payments.length > 0;
  let hasOverdue = false;

  // مجموع پرداختی واقعی (تراکنش‌ها) روی کل اقساط
  let totalPaidAcrossInstallments = 0;

  // تراکنش‌های هر قسط + محاسبات
  for (const p of payments) {
    // خواندن تراکنش‌های این قسط
    let txs: any[] = [];
    try {
      txs = await allAsync(
        `SELECT id, installment_payment_id, amount_paid, payment_date, notes
         FROM installment_transactions
         WHERE installment_payment_id = ?
         ORDER BY payment_date ASC, id ASC`,
        [p.id]
      );
    } catch (_e) {
      // اگر جدول وجود نداشت یا خطایی شد، نگذاریم کل تابع خطا بدهد
      txs = [];
    }

    // اتصال تاریخچه به آبجکت قسط برای نمایش در UI
    (p as any).transactions = txs;

    // جمع پرداختی همین قسط
    const paidForInstallment = txs.reduce(
      (s: number, t: any) => s + Number(t.amount_paid || 0),
      0
    );

    // فیلدهای کمکی برای UI
    (p as any).computedPaid = paidForInstallment;
    (p as any).computedRemaining = Math.max(
      0,
      Number(p.amountDue || 0) - paidForInstallment
    );

    // اثر در ماندهٔ کل
    totalPaidAcrossInstallments += paidForInstallment;
  }

  // کم کردن پرداخت‌های واقعی از ماندهٔ پایه
  remainingAmount = Math.max(0, remainingAmount - totalPaidAcrossInstallments);

  // تعیین وضعیت کلی و سررسید بعدی بر اساس «تسویه واقعی» هر قسط
  for (const p of payments) {
    const fullyPaid =
      Number((p as any).computedPaid || 0) >= Number(p.amountDue || 0);

    if (!fullyPaid) {
      allPaid = false;

      if (!nextDueDate) nextDueDate = p.dueDate;

      try {
        if (moment(p.dueDate, "jYYYY/jMM/jDD").isBefore(moment(), "day")) {
          hasOverdue = true;
        }
      } catch {
        // اگر فرمت تاریخ بد بود، نادیده بگیر
      }
    }
  }

  if (allPaid) overallStatus = "تکمیل شده";
  else if (hasOverdue) overallStatus = "معوق";


  const isCheckSale =
    saleDb.saleType === 'check' || Number(saleDb.numberOfInstallments || 0) === 0;

  if (isCheckSale) {
    const paidByChecks = checks
      .filter((c: any) => c.status === 'نقد شد')
      .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

    remainingAmount = Math.max(0, remainingAmount - paidByChecks);

    const unsettled = checks.filter(
      (c: any) => c.status !== 'نقد شد' && c.status !== 'به مشتری برگشت داده شده'
    );

    nextDueDate = unsettled[0]?.dueDate ?? null;

    const hasBounced = checks.some((c: any) => c.status === 'برگشت خورد');
    const hasOverdueChecks = unsettled.some((c: any) => {
      try {
        return moment(c.dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day');
      } catch {
        return false;
      }
    });

    overallStatus =
      remainingAmount === 0
        ? 'تکمیل شده'
        : hasBounced || hasOverdueChecks
        ? 'معوق'
        : 'در حال پرداخت';
  }


  return {
    ...saleDb,
    items,
    payments, // حاوی transactions/computedPaid/computedRemaining
    checks,
    remainingAmount,
    nextDueDate,
    overallStatus,
  };
};

export const updateInstallmentPaymentStatusInDb = async (
  paymentId: number,
  paid: boolean,
  paymentDateShamsi?: string
): Promise<boolean> => {
  await getDbInstance();
  const status = paid ? "پرداخت شده" : "پرداخت نشده";
  const paymentDate = paid && paymentDateShamsi ? paymentDateShamsi : null;

  const result = await runAsync(
    "UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?",
    [status, paymentDate, paymentId]
  );
  return result.changes > 0;
};

export const updateCheckStatusInDb = async (
  checkId: number,
  status: CheckStatus
): Promise<boolean> => {
  await getDbInstance();
  const result = await runAsync(
    "UPDATE installment_checks SET status = ? WHERE id = ?",
    [status, checkId]
  );
  return result.changes > 0;
};

export const getInstallmentPaymentDetailsForSms = async (
  paymentId: number
): Promise<any> => {
  await getDbInstance();
  // تاریخ‌ها در DB شمسی ذخیره شده‌اند؛ همان را می‌خوانیم.
  const query = `
        SELECT
            ip.id as paymentId,
            ip.dueDate,
            ip.amountDue,
            isale.id as saleId,
            isale.customerId as customerId,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_payments ip
        JOIN installment_sales isale ON ip.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ip.id = ?
    `;
  return await getAsync(query, [paymentId]);
};

/**
 * Fetch high-level information about an installment sale for sending a "fully settled" SMS.
 * Tokens typically include (customer name, saleId, total price).
 */
export const getInstallmentSaleDetailsForSms = async (saleId: number): Promise<any> => {
  await getDbInstance();
  const query = `
        SELECT
            isale.id as saleId,
            isale.actualSalePrice as totalPrice,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_sales isale
        JOIN customers c ON isale.customerId = c.id
        WHERE isale.id = ?
    `;
  return await getAsync(query, [saleId]);
};

/**
 * Fetch detailed information about a single installment check for sending SMS.
 * Returns the check number, due date, amount, and the customer's name and phone number.
 * This helper is analogous to getInstallmentPaymentDetailsForSms but for checks.
 *
 * @param checkId The primary key of the check in the installment_checks table
 */
export const getInstallmentCheckDetailsForSms = async (
  checkId: number
): Promise<any> => {
  await getDbInstance();
  const query = `
        SELECT
            ic.id as checkId,
            ic.checkNumber,
            ic.dueDate,
            ic.amount,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_checks ic
        JOIN installment_sales isale ON ic.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ic.id = ?
    `;
  return await getAsync(query, [checkId]);
};
// ===================== /Installments DB section =====================

// --- Smart Analysis (SQL-based) ---
export const getProfitabilityReportFromDb = async (): Promise<ProfitabilityAnalysisItem[]> => {
    await getDbInstance();
    const query = `
        WITH lines AS (
            -- Legacy lines
            SELECT itemId, itemType, itemName, quantity, totalPrice
            FROM sales_transactions

            UNION ALL

            -- New invoice lines
            SELECT soi.itemId, soi.itemType, soi.description as itemName, soi.quantity, soi.totalPrice
            FROM sales_order_items soi
            JOIN sales_orders so ON so.id = soi.orderId
            WHERE (so.status IS NULL OR so.status = 'active')
        )
        SELECT
            l.itemId,
            l.itemType,
            l.itemName,
            SUM(l.quantity) as totalQuantitySold,
            SUM(l.totalPrice) as totalRevenue,
            SUM(
                CASE
                    WHEN l.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0) * l.quantity
                    WHEN l.itemType = 'phone' THEN COALESCE(ph.purchasePrice, 0) * l.quantity
                    ELSE 0
                END
            ) as totalCost,
            (SUM(l.totalPrice) - SUM(
                CASE
                    WHEN l.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0) * l.quantity
                    WHEN l.itemType = 'phone' THEN COALESCE(ph.purchasePrice, 0) * l.quantity
                    ELSE 0
                END
            )) as grossProfit,
            CASE
                WHEN SUM(l.totalPrice) = 0 THEN 0
                ELSE ((SUM(l.totalPrice) - SUM(
                    CASE
                        WHEN l.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0) * l.quantity
                        WHEN l.itemType = 'phone' THEN COALESCE(ph.purchasePrice, 0) * l.quantity
                        ELSE 0
                    END
                )) * 100.0 / SUM(l.totalPrice))
            END as profitMargin
        FROM lines l
        LEFT JOIN products p ON l.itemType = 'inventory' AND l.itemId = p.id
        LEFT JOIN phones ph ON l.itemType = 'phone' AND l.itemId = ph.id
        GROUP BY l.itemId, l.itemType, l.itemName
        ORDER BY grossProfit DESC;
    `;
    const result: ProfitabilityAnalysisItem[] = await allAsync(query);
    return result.map(item => ({
        ...item,
        profitMargin: parseFloat(Number(item.profitMargin).toFixed(2))
    }));
};

export const getInventoryVelocityReportFromDb = async (): Promise<VelocityItem[]> => {
    await getDbInstance();
    const query = `
        WITH lines AS (
            SELECT itemId, itemType, quantity
            FROM sales_transactions
            WHERE itemType IN ('inventory','phone')
            UNION ALL
            SELECT soi.itemId, soi.itemType, soi.quantity
            FROM sales_order_items soi
            JOIN sales_orders so ON so.id = soi.orderId
            WHERE (so.status IS NULL OR so.status = 'active')
              AND soi.itemType IN ('inventory','phone')
        ),
        ItemSales AS (
            SELECT
                itemId,
                itemType,
                SUM(quantity) as totalQuantitySold
            FROM lines
            GROUP BY itemId, itemType
        ),
        AllItems AS (
            SELECT
                id as itemId,
                'inventory' as itemType,
                name as itemName,
                date_added as registrationDate
            FROM products
            UNION ALL
            SELECT
                id as itemId,
                'phone' as itemType,
                model || ' (IMEI: ' || imei || ')' as itemName,
                registerDate as registrationDate
            FROM phones
        )
        SELECT
            ai.itemId,
            ai.itemType,
            ai.itemName,
            (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) as salesPerDay,
            CASE
                WHEN (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) > 0.5 THEN 'پرفروش (داغ)'
                WHEN (COALESCE(s.totalQuantitySold, 0) > 0) OR ((julianday('now') - julianday(ai.registrationDate)) <= 60) THEN 'عادی'
                ELSE 'کم‌فروش (راکد)'
            END as classification
        FROM AllItems ai
        LEFT JOIN ItemSales s ON ai.itemId = s.itemId AND ai.itemType = s.itemType
        ORDER BY salesPerDay DESC;
    `;
    return await allAsync(query);
};

export const getPurchaseSuggestionsReportFromDb = async (): Promise<Omit<PurchaseSuggestionItem, 'suggestedPurchaseQuantity'>[]> => {
    await getDbInstance();
    const query = `
        WITH ItemVelocity AS (
            SELECT * FROM (
              SELECT
                  ai.itemId,
                  ai.itemType,
                  (COALESCE(s.totalQuantitySold, 0) * 1.0 / (MAX(1, (julianday('now') - julianday(ai.registrationDate))))) as salesPerDay
              FROM (
                SELECT id as itemId, 'inventory' as itemType, date_added as registrationDate FROM products
                UNION ALL
                SELECT id as itemId, 'phone' as itemType, registerDate as registrationDate FROM phones
              ) ai
              LEFT JOIN (
                WITH lines AS (
                    SELECT itemId, itemType, quantity
                    FROM sales_transactions
                    WHERE itemType IN ('inventory','phone')
                    UNION ALL
                    SELECT soi.itemId, soi.itemType, soi.quantity
                    FROM sales_order_items soi
                    JOIN sales_orders so ON so.id = soi.orderId
                    WHERE (so.status IS NULL OR so.status = 'active')
                      AND soi.itemType IN ('inventory','phone')
                )
                SELECT itemId, itemType, SUM(quantity) as totalQuantitySold
                FROM lines
                GROUP BY itemId, itemType
              ) s ON ai.itemId = s.itemId AND ai.itemType = s.itemType
            ) WHERE salesPerDay > 0
        ),
        StockLevels AS (
            SELECT id as itemId, 'inventory' as itemType, name as itemName, stock_quantity as currentStock FROM products WHERE stock_quantity > 0
            UNION ALL
            SELECT id as itemId, 'phone' as itemType, model || ' (IMEI: ' || imei || ')' as itemName, 1 as currentStock FROM phones WHERE status = 'موجود در انبار'
        )
        SELECT
            sl.itemId,
            iv.itemType,
            sl.itemName,
            sl.currentStock,
            iv.salesPerDay,
            (sl.currentStock / iv.salesPerDay) as daysOfStockLeft
        FROM StockLevels sl
        JOIN ItemVelocity iv ON sl.itemId = iv.itemId AND sl.itemType = iv.itemType
        WHERE (sl.currentStock / iv.salesPerDay) < 30 -- Reorder threshold: 30 days
        ORDER BY daysOfStockLeft ASC;
    `;
    return await allAsync(query);
};


// --- Repair Center ---
export const createRepairInDb = async (data: NewRepairData): Promise<any> => {
  await getDbInstance();
  const { customerId, deviceModel, deviceColor, serialNumber, problemDescription, estimatedCost } = data;
  const result = await runAsync(
    `INSERT INTO repairs (customerId, deviceModel, deviceColor, serialNumber, problemDescription, estimatedCost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customerId, deviceModel, deviceColor || null, serialNumber || null, problemDescription, estimatedCost || null, 'پذیرش شده']
  );
  return await getRepairByIdFromDb(result.lastID);
};

export const getAllRepairsFromDb = async (statusFilter?: string): Promise<FrontendRepair[]> => {
  await getDbInstance();
  let sql = `
    SELECT r.*, c.fullName as customerFullName, t.partnerName as technicianName
    FROM repairs r
    JOIN customers c ON r.customerId = c.id
    LEFT JOIN partners t ON r.technicianId = t.id
  `;
  const params = [];
  if (statusFilter) {
    sql += ' WHERE r.status = ?';
    params.push(statusFilter);
  }
  sql += ' ORDER BY r.dateReceived DESC';
  return await allAsync(sql, params);
};

export const getRepairByIdFromDb = async (repairId: number): Promise<any> => {
    await getDbInstance();
    const repair = await getAsync(
        `SELECT r.*, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber, t.partnerName as technicianName 
        FROM repairs r 
        JOIN customers c ON r.customerId = c.id 
        LEFT JOIN partners t ON r.technicianId = t.id
        WHERE r.id = ?`,
        [repairId]
    );
    if (!repair) return null;

    const parts = await allAsync(
        `SELECT rp.*, p.name as productName, p.sellingPrice as pricePerItem
         FROM repair_parts rp
         JOIN products p ON rp.productId = p.id
         WHERE rp.repairId = ?`,
        [repairId]
    );
    
    return { repair, parts };
};

export const updateRepairInDb = async (repairId: number, data: Partial<FrontendRepair>): Promise<any> => {
    await getDbInstance();
    const { status, technicianNotes, finalCost, technicianId, laborFee } = data;
    
    const existingRepair = await getAsync("SELECT * FROM repairs WHERE id = ?", [repairId]);
    if (!existingRepair) throw new Error("Repair not found");

    const fieldsToUpdate: string[] = [];
    const params: any[] = [];
    
    if (status) { fieldsToUpdate.push("status = ?"); params.push(status); }
    if (technicianNotes !== undefined) { fieldsToUpdate.push("technicianNotes = ?"); params.push(technicianNotes); }
    if (finalCost !== undefined) { fieldsToUpdate.push("finalCost = ?"); params.push(finalCost); }
    if (technicianId !== undefined) { fieldsToUpdate.push("technicianId = ?"); params.push(technicianId); }
    if (laborFee !== undefined) { fieldsToUpdate.push("laborFee = ?"); params.push(laborFee); }


    if (fieldsToUpdate.length === 0) return existingRepair;

    if (status === 'تحویل داده شده') {
        fieldsToUpdate.push("dateCompleted = ?");
        params.push(new Date().toISOString());
    }

    params.push(repairId);
    
    await runAsync(`UPDATE repairs SET ${fieldsToUpdate.join(', ')} WHERE id = ?`, params);
    return await getRepairByIdFromDb(repairId);
};

export const finalizeRepairInDb = async (repairId: number, data: FinalizeRepairPayload): Promise<any> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const repair = await getAsync("SELECT * FROM repairs WHERE id = ?", [repairId]);
    if (!repair) throw new Error("تعمیر برای نهایی‌سازی یافت نشد.");
    if (repair.status === 'تحویل داده شده') throw new Error("این تعمیر قبلا نهایی شده است.");
    if (!data.technicianId) throw new Error("قبل از نهایی‌سازی، باید یک تعمیرکار به این تعمیر اختصاص داده شود.");

    const newStatus = "تحویل داده شده";
    await runAsync(
      `UPDATE repairs SET status = ?, finalCost = ?, laborFee = ?, dateCompleted = ?, technicianId = ? WHERE id = ?`,
      [newStatus, data.finalCost, data.laborFee, new Date().toISOString(), data.technicianId, repairId]
    );

    // Debit customer account for the final cost
    if (data.finalCost > 0) {
      const customerLedgerDesc = `هزینه تعمیر دستگاه: ${repair.deviceModel} (شناسه تعمیر: ${repairId})`;
      await addCustomerLedgerEntryInternal(repair.customerId, customerLedgerDesc, data.finalCost, 0, new Date().toISOString());
    }

    // Credit technician's account for the labor fee
    if (data.laborFee > 0) {
      const techLedgerDesc = `اجرت تعمیر دستگاه: ${repair.deviceModel} (شناسه تعمیر: ${repairId})`;
      await addPartnerLedgerEntryInternal(data.technicianId, techLedgerDesc, 0, data.laborFee, new Date().toISOString(), 'repair_fee', repairId);
    }

    await execAsync("COMMIT;");
    return await getRepairByIdFromDb(repairId);
  } catch(err: any) {
    await execAsync("ROLLBACK;");
    console.error('DB Error (finalizeRepairInDb):', err);
    throw err;
  }
};


export const addPartToRepairInDb = async (repairId: number, productId: number, quantityUsed: number): Promise<RepairPart> => {
    await getDbInstance();
    await execAsync("BEGIN TRANSACTION;");
    try {
        const product = await getAsync("SELECT stock_quantity FROM products WHERE id = ?", [productId]);
        if (!product) throw new Error("محصول یافت نشد.");
        if (product.stock_quantity < quantityUsed) throw new Error("موجودی محصول در انبار کافی نیست.");

        await runAsync("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [quantityUsed, productId]);
        const result = await runAsync(
            `INSERT INTO repair_parts (repairId, productId, quantityUsed) VALUES (?, ?, ?)`,
            [repairId, productId, quantityUsed]
        );

        await execAsync("COMMIT;");
        return await getAsync("SELECT rp.*, p.name as productName, p.sellingPrice as pricePerItem FROM repair_parts rp JOIN products p ON rp.productId = p.id WHERE rp.id = ?", [result.lastID]);
    } catch (err: any) {
        await execAsync("ROLLBACK;");
        throw err;
    }
};

export const deletePartFromRepairInDb = async (partId: number): Promise<boolean> => {
    await getDbInstance();
    await execAsync("BEGIN TRANSACTION;");
    try {
        const part = await getAsync("SELECT productId, quantityUsed FROM repair_parts WHERE id = ?", [partId]);
        if (!part) throw new Error("قطعه مصرفی یافت نشد.");

        await runAsync("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [part.quantityUsed, part.productId]);
        const result = await runAsync("DELETE FROM repair_parts WHERE id = ?", [partId]);

        await execAsync("COMMIT;");
        return result.changes > 0;
    } catch (err: any) {
        await execAsync("ROLLBACK;");
        throw err;
    }
};

export const getRepairDetailsForSms = async (repairId: number): Promise<any> => {
    await getDbInstance();
    return await getAsync(
      `SELECT r.id, r.deviceModel, r.finalCost, r.estimatedCost, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber 
       FROM repairs r JOIN customers c ON r.customerId = c.id WHERE r.id = ?`,
      [repairId]
    );
};


export const getOverdueInstallmentsFromDb = async (): Promise<any[]> => {
    await getDbInstance();
    // This function fetches all unpaid installments. The caller will filter by date
    // as date logic in JS with moment.js is easier and more reliable than in SQLite.
    const query = `
        SELECT
            ip.id,
            ip.saleId,
            ip.dueDate,
            ip.amountDue,
            c.fullName as customerFullName
        FROM installment_payments ip
        JOIN installment_sales isale ON ip.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ip.status = 'پرداخت نشده'
        ORDER BY ip.dueDate ASC
    `;
    return await allAsync(query);
};

/**
 * Fetch all installment payments that are not yet paid along with customer and sale information.
 * The caller should perform any date filtering (e.g., differences of 7, 3, or 0 days) in JS.
 */
export const getPendingInstallmentPaymentsWithCustomer = async (): Promise<any[]> => {
    await getDbInstance();
    const query = `
        SELECT
            ip.id AS paymentId,
            ip.saleId,
            ip.dueDate,
            ip.amountDue,
            ip.status AS paymentStatus,
            isale.customerId,
            c.fullName AS customerFullName
        FROM installment_payments ip
        JOIN installment_sales isale ON ip.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ip.status != 'پرداخت شده'
        ORDER BY ip.dueDate ASC
    `;
    return await allAsync(query);
};

/**
 * Fetch all checks associated with installment sales that are still pending or in process (not settled).
 * The caller should perform any date filtering (e.g., 7, 3, or 0 days before due) in JS.
 */
export const getPendingInstallmentChecksWithCustomer = async (): Promise<any[]> => {
    await getDbInstance();
    const query = `
        SELECT
            ic.id AS checkId,
            ic.saleId,
            ic.checkNumber,
            ic.bankName,
            ic.dueDate,
            ic.amount,
            ic.status AS checkStatus,
            isale.customerId,
            c.fullName AS customerFullName
        FROM installment_checks ic
        JOIN installment_sales isale ON ic.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ic.status NOT IN ('نقد شد','برگشت خورد','به مشتری برگشت داده شده','وصول شده','برگشت خورده','باطل شده')
        ORDER BY ic.dueDate ASC
    `;
    return await allAsync(query);
};

export const getRepairsReadyForPickupFromDb = async (): Promise<any[]> => {
    await getDbInstance();
    const query = `
        SELECT
            r.id,
            r.deviceModel,
            r.finalCost,
            c.fullName as customerFullName
        FROM repairs r
        JOIN customers c on r.customerId = c.id
        WHERE r.status = 'آماده تحویل'
        ORDER BY r.dateCompleted DESC
    `;
    return await allAsync(query);
};
export const addInstallmentTransactionToDb = async (paymentId: number, amount: number, isoDate: string, notes?: string) => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const payment = await getAsync("SELECT * FROM installment_payments WHERE id = ?", [paymentId]);
    if (!payment) {
      throw new Error("قسط مورد نظر برای ثبت پرداخت یافت نشد.");
    }

    // 1. Insert the partial payment transaction
    const result = await runAsync(
      `INSERT INTO installment_transactions (installment_payment_id, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?)`,
      [paymentId, amount, isoDate, notes]
    );

    // 2. Get sum of all payments for this installment
    const sumResult = await getAsync(
      `SELECT SUM(amount_paid) as totalPaid FROM installment_transactions WHERE installment_payment_id = ?`,
      [paymentId]
    );
    const totalPaid = sumResult.totalPaid || 0;

    // 3. Update the parent installment's status based on the total paid amount
    let newStatus: InstallmentPaymentStatus = payment.status;
    if (totalPaid >= payment.amountDue) {
      newStatus = 'پرداخت شده';
    } else if (totalPaid > 0) {
      newStatus = 'پرداخت جزئی'; // New status for partially paid installments
    } else {
      newStatus = 'پرداخت نشده';
    }

    // Only update paymentDate if the status is changing to a form of paid
    const dateToUpdate = (newStatus === 'پرداخت شده' || newStatus === 'پرداخت جزئی') ? isoDate : null;

    await runAsync(
      `UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?`,
      [newStatus, dateToUpdate, paymentId]
    );

    await execAsync("COMMIT;");
    return await getAsync("SELECT * FROM installment_transactions WHERE id = ?", [result.lastID]);
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

// === Installment transactions: update + delete + status recalc ===
const _toNumber = (v: any) => Number(String(v ?? '0').replace(/[^\d.-]/g, '')) || 0;

export const getPaymentIdByTransactionIdFromDb = async (txId: number): Promise<number | null> => {
  await getDbInstance();
  const row = await getAsync(
    "SELECT installment_payment_id FROM installment_transactions WHERE id = ?",
    [txId]
  );
  return row ? (row.installment_payment_id as number) : null;
};

export const recalcInstallmentPaymentStatusInDb = async (paymentId: number): Promise<void> => {
  await getDbInstance();
  const p = await getAsync("SELECT id, amountDue FROM installment_payments WHERE id = ?", [paymentId]);
  if (!p) return;

  const rows = await allAsync(
    "SELECT amount_paid, payment_date FROM installment_transactions WHERE installment_payment_id = ? ORDER BY payment_date ASC, id ASC",
    [paymentId]
  );
  const totalPaid = rows.reduce((s: number, r: any) => s + _toNumber(r.amount_paid), 0);
  const amountDue = _toNumber(p.amountDue);

  // حالت سه‌گانه وضعیت
  let status: InstallmentPaymentStatus = 'پرداخت نشده';
  let paymentDate: string | null = null;

  if (totalPaid >= amountDue && amountDue > 0) {
    status = 'پرداخت شده';
    // در صورت تسویه کامل، تاریخ آخرین تراکنش را به‌عنوان paymentDate می‌گذاریم
    if (rows.length) paymentDate = rows[rows.length - 1].payment_date ?? null;
  } else if (totalPaid > 0) {
    status = 'پرداخت جزئی';
    paymentDate = null; // برای پرداخت جزئی تاریخ نهایی نگذار
  }

  await runAsync(
    "UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?",
    [status, paymentDate, paymentId]
  );
};

export const updateInstallmentTransactionInDb = async (txId: number, amount: number, isoDate: string, notes?: string) => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const paymentId = await getPaymentIdByTransactionIdFromDb(txId);
    if (!paymentId) throw new Error("تراکنش مورد نظر یافت نشد.");

    await runAsync(
      "UPDATE installment_transactions SET amount_paid = ?, payment_date = ?, notes = ? WHERE id = ?",
      [amount, isoDate, notes ?? null, txId]
    );

    await recalcInstallmentPaymentStatusInDb(paymentId);
    await execAsync("COMMIT;");
    return await getAsync("SELECT * FROM installment_transactions WHERE id = ?", [txId]);
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

export const deleteInstallmentTransactionFromDb = async (txId: number): Promise<boolean> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const paymentId = await getPaymentIdByTransactionIdFromDb(txId);
    if (!paymentId) throw new Error("تراکنش مورد نظر یافت نشد.");

    const result = await runAsync("DELETE FROM installment_transactions WHERE id = ?", [txId]);

    // نکتهٔ حیاتی: بعد از حذف، وضعیت قسط را بازمحاسبه کن
    await recalcInstallmentPaymentStatusInDb(paymentId);

    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

// === FTS5: Unified Search ===
const ensureFts5UnifiedSearch = async (): Promise<void> => {
  try {
    // 1) Virtual table + meta map
    await runAsync(`
	  	  CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
	        domain UNINDEXED,      -- 'product' | 'phone' | 'customer' | 'service' | 'invoice' | 'repair' | 'installment'
        entity_id UNINDEXED,   -- row id from base table
        title,                 -- title field for highlight
        content,               -- long text
        extra,                 -- sku/imei/phoneNumber...
        tokenize = "unicode61 remove_diacritics 2"
      );
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS search_meta (
        rowid INTEGER PRIMARY KEY,   -- rowid of search_index
        domain TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        UNIQUE(domain, entity_id)
      );
    `);

    // ---------- Products
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_products_ai_fts AFTER INSERT ON products BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('product', NEW.id,
                COALESCE(NEW.name,''),
                COALESCE(NEW.name,'') || ' ' || COALESCE((SELECT name FROM categories WHERE id = NEW.categoryId),''),
                '');
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'product', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_products_au_fts AFTER UPDATE ON products BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='product' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='product' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('product', NEW.id,
                COALESCE(NEW.name,''),
                COALESCE(NEW.name,'') || ' ' || COALESCE((SELECT name FROM categories WHERE id = NEW.categoryId),''),
                '');
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'product', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_products_ad_fts AFTER DELETE ON products BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='product' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='product' AND entity_id=OLD.id;
      END;
    `);

    // ---------- Phones
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_phones_ai_fts AFTER INSERT ON phones BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('phone', NEW.id,
                TRIM(COALESCE(NEW.model,'') || ' ' || COALESCE(NEW.storage,'') || ' ' || COALESCE(NEW.ram,'')),
                TRIM(COALESCE(NEW.color,'') || ' ' || COALESCE(NEW.condition,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.imei,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'phone', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_phones_au_fts AFTER UPDATE ON phones BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='phone' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='phone' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('phone', NEW.id,
                TRIM(COALESCE(NEW.model,'') || ' ' || COALESCE(NEW.storage,'') || ' ' || COALESCE(NEW.ram,'')),
                TRIM(COALESCE(NEW.color,'') || ' ' || COALESCE(NEW.condition,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.imei,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'phone', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_phones_ad_fts AFTER DELETE ON phones BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='phone' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='phone' AND entity_id=OLD.id;
      END;
    `);

    // ---------- Customers
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_customers_ai_fts AFTER INSERT ON customers BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('customer', NEW.id,
                COALESCE(NEW.fullName,''),
                TRIM(COALESCE(NEW.address,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.phoneNumber,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'customer', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_customers_au_fts AFTER UPDATE ON customers BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='customer' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='customer' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('customer', NEW.id,
                COALESCE(NEW.fullName,''),
                TRIM(COALESCE(NEW.address,'') || ' ' || COALESCE(NEW.notes,'')),
                COALESCE(NEW.phoneNumber,''));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'customer', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_customers_ad_fts AFTER DELETE ON customers BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='customer' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='customer' AND entity_id=OLD.id;
      END;
    `);

    // ---------- Services
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_services_ai_fts AFTER INSERT ON services BEGIN
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('service', NEW.id,
                COALESCE(NEW.name,''),
                COALESCE(NEW.description,''),
                CAST(COALESCE(NEW.price,0) AS TEXT));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'service', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_services_au_fts AFTER UPDATE ON services BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='service' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='service' AND entity_id=OLD.id;
        INSERT INTO search_index (domain, entity_id, title, content, extra)
        VALUES ('service', NEW.id,
                COALESCE(NEW.name,''),
                COALESCE(NEW.description,''),
                CAST(COALESCE(NEW.price,0) AS TEXT));
        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
        VALUES (last_insert_rowid(), 'service', NEW.id);
      END;
    `);

    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_services_ad_fts AFTER DELETE ON services BEGIN
        DELETE FROM search_index WHERE rowid IN (
          SELECT rowid FROM search_meta WHERE domain='service' AND entity_id=OLD.id
        );
        DELETE FROM search_meta WHERE domain='service' AND entity_id=OLD.id;
      END;
    `);

	    // ---------- Invoices (+ items)
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_ai_fts AFTER INSERT ON invoices BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'invoice', NEW.id,
	          TRIM(COALESCE(NEW.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = NEW.id),'')
	          ),
	          COALESCE(NEW.invoiceNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.id);
	      END;
	    `);

	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_au_fts AFTER UPDATE ON invoices BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'invoice', NEW.id,
	          TRIM(COALESCE(NEW.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = NEW.id),'')
	          ),
	          COALESCE(NEW.invoiceNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.id);
	      END;
	    `);

	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_ad_fts AFTER DELETE ON invoices BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id;
	      END;
	    `);

	    // هر تغییری در آیتم‌های فاکتور باید ورودی FTS فاکتور را بازسازی کند
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_ai_fts AFTER INSERT ON invoice_items BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=NEW.invoiceId
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=NEW.invoiceId;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        SELECT
	          'invoice', inv.id,
	          TRIM(COALESCE(inv.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(inv.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = inv.customerId),'') || ' ' ||
	            COALESCE(inv.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = inv.id),'')
	          ),
	          COALESCE(inv.invoiceNumber,'')
	        FROM invoices inv WHERE inv.id = NEW.invoiceId;
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.invoiceId);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_au_fts AFTER UPDATE ON invoice_items BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=NEW.invoiceId
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=NEW.invoiceId;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        SELECT
	          'invoice', inv.id,
	          TRIM(COALESCE(inv.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(inv.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = inv.customerId),'') || ' ' ||
	            COALESCE(inv.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = inv.id),'')
	          ),
	          COALESCE(inv.invoiceNumber,'')
	        FROM invoices inv WHERE inv.id = NEW.invoiceId;
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.invoiceId);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_ad_fts AFTER DELETE ON invoice_items BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.invoiceId
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.invoiceId;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        SELECT
	          'invoice', inv.id,
	          TRIM(COALESCE(inv.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(inv.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = inv.customerId),'') || ' ' ||
	            COALESCE(inv.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' ') FROM invoice_items WHERE invoiceId = inv.id),'')
	          ),
	          COALESCE(inv.invoiceNumber,'')
	        FROM invoices inv WHERE inv.id = OLD.invoiceId;
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', OLD.invoiceId);
	      END;
	    `);

	    // ---------- Repairs
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_ai_fts AFTER INSERT ON repairs BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'repair', NEW.id,
	          TRIM('تعمیر' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE(NEW.deviceModel,'')),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.problemDescription,'') || ' ' || COALESCE(NEW.technicianNotes,'') || ' ' || COALESCE(NEW.status,'')
	          ),
	          COALESCE(NEW.serialNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'repair', NEW.id);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_au_fts AFTER UPDATE ON repairs BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='repair' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='repair' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'repair', NEW.id,
	          TRIM('تعمیر' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE(NEW.deviceModel,'')),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.problemDescription,'') || ' ' || COALESCE(NEW.technicianNotes,'') || ' ' || COALESCE(NEW.status,'')
	          ),
	          COALESCE(NEW.serialNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'repair', NEW.id);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_ad_fts AFTER DELETE ON repairs BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='repair' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='repair' AND entity_id=OLD.id;
	      END;
	    `);

	    // ---------- Installment sales
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installment_sales_ai_fts AFTER INSERT ON installment_sales BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'installment', NEW.id,
	          TRIM('اقساط' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.itemsSummary,'') || ' ' || COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	          ),
	          COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'installment', NEW.id);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installment_sales_au_fts AFTER UPDATE ON installment_sales BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='installment' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='installment' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'installment', NEW.id,
	          TRIM('اقساط' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.itemsSummary,'') || ' ' || COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	          ),
	          COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'installment', NEW.id);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installment_sales_ad_fts AFTER DELETE ON installment_sales BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='installment' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='installment' AND entity_id=OLD.id;
	      END;
	    `);

	    // ---------- Invoices (and invoice_items to keep content fresh)
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_ai_fts AFTER INSERT ON invoices BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'invoice', NEW.id,
	          TRIM(COALESCE(NEW.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = NEW.id),'')
	          ),
	          COALESCE(NEW.invoiceNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.id);
	      END;
	    `);

	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_au_fts AFTER UPDATE ON invoices BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'invoice', NEW.id,
	          TRIM(COALESCE(NEW.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(NEW.id AS TEXT)),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.notes,'') || ' ' ||
	            COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = NEW.id),'')
	          ),
	          COALESCE(NEW.invoiceNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'invoice', NEW.id);
	      END;
	    `);

	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoices_ad_fts AFTER DELETE ON invoices BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='invoice' AND entity_id=OLD.id;
	      END;
	    `);

	    // invoice_items: any change should refresh its parent invoice record in FTS
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_ai_fts AFTER INSERT ON invoice_items BEGIN
	        UPDATE invoices SET notes = notes WHERE id = NEW.invoiceId;
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_au_fts AFTER UPDATE ON invoice_items BEGIN
	        UPDATE invoices SET notes = notes WHERE id = NEW.invoiceId;
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_invoice_items_ad_fts AFTER DELETE ON invoice_items BEGIN
	        UPDATE invoices SET notes = notes WHERE id = OLD.invoiceId;
	      END;
	    `);

	    // ---------- Repairs
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_ai_fts AFTER INSERT ON repairs BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'repair', NEW.id,
	          TRIM('تعمیر' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE(NEW.deviceModel,'')),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.problemDescription,'') || ' ' || COALESCE(NEW.technicianNotes,'')
	          ),
	          COALESCE(NEW.serialNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'repair', NEW.id);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_au_fts AFTER UPDATE ON repairs BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='repair' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='repair' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'repair', NEW.id,
	          TRIM('تعمیر' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE(NEW.deviceModel,'')),
	          TRIM(
	            COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'') || ' ' ||
	            COALESCE(NEW.problemDescription,'') || ' ' || COALESCE(NEW.technicianNotes,'')
	          ),
	          COALESCE(NEW.serialNumber,'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'repair', NEW.id);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_repairs_ad_fts AFTER DELETE ON repairs BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='repair' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='repair' AND entity_id=OLD.id;
	      END;
	    `);

	    // ---------- Installment sales
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installments_ai_fts AFTER INSERT ON installment_sales BEGIN
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'installment', NEW.id,
	          TRIM('فروش اقساطی' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'')),
	          TRIM(COALESCE(NEW.itemsSummary,'') || ' ' || COALESCE(NEW.notes,'') || ' ' || COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')),
	          COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'installment', NEW.id);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installments_au_fts AFTER UPDATE ON installment_sales BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='installment' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='installment' AND entity_id=OLD.id;
	        INSERT INTO search_index (domain, entity_id, title, content, extra)
	        VALUES (
	          'installment', NEW.id,
	          TRIM('فروش اقساطی' || ' #' || CAST(NEW.id AS TEXT) || ' ' || COALESCE((SELECT fullName FROM customers WHERE id = NEW.customerId),'')),
	          TRIM(COALESCE(NEW.itemsSummary,'') || ' ' || COALESCE(NEW.notes,'') || ' ' || COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')),
	          COALESCE((SELECT imei FROM phones WHERE id = NEW.phoneId),'')
	        );
	        INSERT OR REPLACE INTO search_meta(rowid, domain, entity_id)
	        VALUES (last_insert_rowid(), 'installment', NEW.id);
	      END;
	    `);
	    await runAsync(`
	      CREATE TRIGGER IF NOT EXISTS trg_installments_ad_fts AFTER DELETE ON installment_sales BEGIN
	        DELETE FROM search_index WHERE rowid IN (
	          SELECT rowid FROM search_meta WHERE domain='installment' AND entity_id=OLD.id
	        );
	        DELETE FROM search_meta WHERE domain='installment' AND entity_id=OLD.id;
	      END;
	    `);

  } catch (e: any) {
    if (String(e?.message || '').includes('no such module: fts5')) {
      console.warn('⚠️ FTS5 در بیلد فعلی SQLite فعال نیست. unified search غیرفعال می‌ماند.');
    } else {
      throw e;
    }
  }
};
const rebuildSearchIndexInternal = async (): Promise<void> => {
  await runAsync('BEGIN;');
  try {
    await runAsync(`DELETE FROM search_index;`);
    await runAsync(`DELETE FROM search_meta;`);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'product', p.id,
             COALESCE(p.name,''),
             TRIM(COALESCE(p.name,'') || ' ' || COALESCE(c.name,'')),
             ''
      FROM products p LEFT JOIN categories c ON c.id = p.categoryId;
    `);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'phone', ph.id,
             TRIM(COALESCE(ph.model,'') || ' ' || COALESCE(ph.storage,'') || ' ' || COALESCE(ph.ram,'')),
             TRIM(COALESCE(ph.color,'') || ' ' || COALESCE(ph.condition,'') || ' ' || COALESCE(ph.notes,'')),
             COALESCE(ph.imei,'')
      FROM phones ph;
    `);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'customer', c.id,
             COALESCE(c.fullName,''),
             TRIM(COALESCE(c.address,'') || ' ' || COALESCE(c.notes,'')),
             COALESCE(c.phoneNumber,'')
      FROM customers c;
    `);

    await runAsync(`
      INSERT INTO search_index (domain, entity_id, title, content, extra)
      SELECT 'service', s.id,
             COALESCE(s.name,''),
             COALESCE(s.description,''),
             CAST(COALESCE(s.price,0) AS TEXT)
      FROM services s;
    `);

	  // invoices (+ items)
	  await runAsync(`
	    INSERT INTO search_index (domain, entity_id, title, content, extra)
	    SELECT 'invoice', i.id,
	           TRIM(COALESCE(i.invoiceNumber,'') || ' ' || 'فاکتور' || ' #' || CAST(i.id AS TEXT)),
	           TRIM(
	             COALESCE((SELECT fullName FROM customers WHERE id = i.customerId),'') || ' ' ||
	             COALESCE(i.notes,'') || ' ' ||
	             COALESCE((SELECT group_concat(description, ' • ') FROM invoice_items WHERE invoiceId = i.id),'')
	           ),
	           COALESCE(i.invoiceNumber,'')
	    FROM invoices i;
	  `);

	  // repairs
	  await runAsync(`
	    INSERT INTO search_index (domain, entity_id, title, content, extra)
	    SELECT 'repair', r.id,
	           TRIM('تعمیر' || ' #' || CAST(r.id AS TEXT) || ' ' || COALESCE(r.deviceModel,'')),
	           TRIM(
	             COALESCE((SELECT fullName FROM customers WHERE id = r.customerId),'') || ' ' ||
	             COALESCE(r.problemDescription,'') || ' ' || COALESCE(r.technicianNotes,'')
	           ),
	           COALESCE(r.serialNumber,'')
	    FROM repairs r;
	  `);

	  // installment sales
	  await runAsync(`
	    INSERT INTO search_index (domain, entity_id, title, content, extra)
	    SELECT 'installment', ins.id,
	           TRIM('فروش اقساطی' || ' #' || CAST(ins.id AS TEXT) || ' ' || COALESCE((SELECT fullName FROM customers WHERE id = ins.customerId),'')),
	           TRIM(COALESCE(ins.itemsSummary,'') || ' ' || COALESCE(ins.notes,'') || ' ' || COALESCE((SELECT imei FROM phones WHERE id = ins.phoneId),'')),
	           COALESCE((SELECT imei FROM phones WHERE id = ins.phoneId),'')
	    FROM installment_sales ins;
	  `);

    await runAsync(`
      INSERT OR IGNORE INTO search_meta(rowid, domain, entity_id)
      SELECT rowid, domain, entity_id FROM search_index;
    `);

    await runAsync('COMMIT;');
  } catch (err) {
    await runAsync('ROLLBACK;');
    throw err;
  }
};

// اگر خالی بود، یکبار پرش کن
const initSearchIndexIfNeeded = async (): Promise<void> => {
  try {
    const row = await getAsync(`SELECT COUNT(*) AS c FROM search_index`, []);
    if (!row || !row.c) {
      await rebuildSearchIndexInternal();
      return;
    }

    // ارتقای نسخه: اگر داده‌های جدید (فاکتور/تعمیر/اقساط) داریم اما هنوز ایندکس نشده‌اند، یکبار ریبیلد کن.
    const hasNewDomains = await getAsync(
      `SELECT COUNT(*) AS c FROM search_index WHERE domain IN ('invoice','repair','installment')`,
      []
    );
    if (Number(hasNewDomains?.c || 0) > 0) return;

    const [inv, rep, ins] = await Promise.all([
      getAsync(`SELECT COUNT(*) AS c FROM invoices`, []),
      getAsync(`SELECT COUNT(*) AS c FROM repairs`, []),
      getAsync(`SELECT COUNT(*) AS c FROM installment_sales`, []),
    ]);

    const need = Number(inv?.c || 0) + Number(rep?.c || 0) + Number(ins?.c || 0);
    if (need > 0) {
      await rebuildSearchIndexInternal();
    }
  } catch (e: any) {
    // اگر search_index هنوز ساخته نشده بود، بی‌صدا رد می‌شویم
  }
};

// اگر دوست داری برای دیباگ از بیرون هم صدا بزنیش:
export const rebuildSearchIndex = async (): Promise<void> => {
  await ensureFts5UnifiedSearch();
  await rebuildSearchIndexInternal();
};



/* =======================================================================
   PARTNERS LEDGER — single source of truth (no duplicates)
   ======================================================================= */

/** Update a single partner ledger entry safely and recalc balances */
export const updatePartnerLedgerEntryInDb = async (
  partnerId: number,
  entryId: number,
  data: Partial<LedgerEntryPayload>
) => {
  await getDbInstance();
  const row = await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [entryId]);
  if (!row) throw new Error('رکورد دفتر یافت نشد');
  if (Number(row.partnerId) !== Number(partnerId)) throw new Error('عدم تطابق همکار');

  const rawDesc  = (data as any)?.description;
  const rawDebit = (data as any)?.debit;
  const rawCred  = (data as any)?.credit;
  const rawDate  = (data as any)?.transactionDate;

  const description     = (rawDesc  == null) ? row.description : String(rawDesc).trim();
  const debit           = (rawDebit == null || rawDebit === '') ? row.debit  : Number(rawDebit)  || 0;
  const credit          = (rawCred  == null || rawCred  === '') ? row.credit : Number(rawCred)   || 0;
  const transactionDate = (rawDate && !Number.isNaN(Date.parse(rawDate)))
                            ? new Date(rawDate).toISOString()
                            : row.transactionDate;

  // Exactly one of debit/credit must be > 0
  if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
    throw new Error('مبالغ نامعتبر: فقط یکی از بدهکار/بستانکار و حتماً مثبت');
  }

  await runAsync(
    `UPDATE partner_ledger
        SET description = ?, debit = ?, credit = ?, transactionDate = ?
      WHERE id = ?`,
    [description, debit, credit, transactionDate, entryId]
  );

  await recalcPartnerBalances(partnerId);
  return await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [entryId]);
};

/** Delete a partner ledger entry with ownership check and recalc */
export const deletePartnerLedgerEntryFromDb = async (
  partnerId: number,
  entryId: number
) => {
  await getDbInstance();
  const row = await getAsync(
    `SELECT id, partnerId FROM partner_ledger WHERE id = ?`,
    [entryId]
  );
  if (!row) throw new Error('رکورد دفتر یافت نشد');
  if (Number(row.partnerId) !== Number(partnerId)) throw new Error('عدم تطابق همکار');

  await runAsync(`DELETE FROM partner_ledger WHERE id = ?`, [entryId]);
  await recalcPartnerBalances(partnerId);
  return true;
};

/** Recalculate running balances for a partner's ledger */
export const recalcPartnerBalances = async (partnerId: number) => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT id, debit, credit, transactionDate
       FROM partner_ledger
      WHERE partnerId = ?
   ORDER BY datetime(transactionDate) ASC, id ASC`,
    [partnerId]
  );

  let balance = 0;
  await runAsync('BEGIN');
  try {
    for (const r of rows) {
      const d = Number(r.debit)  || 0;
      const c = Number(r.credit) || 0;
      balance = balance + d - c;
      await runAsync(`UPDATE partner_ledger SET balance = ? WHERE id = ?`, [balance, r.id]);
    }
    await runAsync('COMMIT');
  } catch (e) {
    await runAsync('ROLLBACK');
    throw e;
  }
};


/* =======================================================================
   CUSTOMERS LEDGER — single source of truth (no duplicates)
   ======================================================================= */

export const updateCustomerLedgerEntryInDb = async (
  customerId: number,
  entryId: number,
  data: Partial<LedgerEntryPayload>
) => {
  await getDbInstance();
  const row = await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [entryId]);
  if (!row) throw new Error('رکورد دفتر یافت نشد');
  if (Number(row.customerId) !== Number(customerId)) throw new Error('عدم تطابق مشتری');

  const rawDesc  = (data as any)?.description;
  const rawDebit = (data as any)?.debit;
  const rawCred  = (data as any)?.credit;
  const rawDate  = (data as any)?.transactionDate;

  const description     = (rawDesc  == null) ? row.description : String(rawDesc).trim();
  const debit           = (rawDebit == null || rawDebit === '') ? row.debit  : Number(rawDebit)  || 0;
  const credit          = (rawCred  == null || rawCred  === '') ? row.credit : Number(rawCred)   || 0;
  const transactionDate = (rawDate && !Number.isNaN(Date.parse(rawDate)))
                            ? new Date(rawDate).toISOString()
                            : row.transactionDate;

  if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0))
    throw new Error('مبالغ نامعتبر: فقط یکی از بدهکار/بستانکار و حتماً مثبت');

  await runAsync(
    `UPDATE customer_ledger
        SET description = ?, debit = ?, credit = ?, transactionDate = ?
      WHERE id = ?`,
    [description, debit, credit, transactionDate, entryId]
  );

  await recalcCustomerBalances(customerId);
  return await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [entryId]);
};

export const deleteCustomerLedgerEntryFromDb = async (
  customerId: number,
  entryId: number
) => {
  await getDbInstance();
  const row = await getAsync(
    `SELECT id, customerId FROM customer_ledger WHERE id = ?`,
    [entryId]
  );
  if (!row) throw new Error('رکورد دفتر یافت نشد');
  if (Number(row.customerId) !== Number(customerId)) throw new Error('عدم تطابق مشتری');

  await runAsync(`DELETE FROM customer_ledger WHERE id = ?`, [entryId]);
  await recalcCustomerBalances(customerId);
  return true;
};

export const recalcCustomerBalances = async (customerId: number) => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT id, debit, credit, transactionDate
       FROM customer_ledger
      WHERE customerId = ?
   ORDER BY datetime(transactionDate) ASC, id ASC`,
    [customerId]
  );

  let balance = 0;
  await runAsync('BEGIN');
  try {
    for (const r of rows) {
      balance = balance + (Number(r.debit) || 0) - (Number(r.credit) || 0);
      await runAsync(`UPDATE customer_ledger SET balance = ? WHERE id = ?`, [balance, r.id]);
    }
    // اگر ستون currentBalance در customers وجود دارد، همگام‌سازی شود (در نبود ستون، نادیده گرفته می‌شود)
    try {
      await runAsync(`UPDATE customers SET currentBalance = ? WHERE id = ?`, [balance, customerId]);
    } catch (_e) {}
    await runAsync('COMMIT');
  } catch (e) {
    await runAsync('ROLLBACK');
    throw e;
  }
};



// =====================================================
// P0 API Helpers: Inventory Adjustments / Purchases / Stock Counts
// =====================================================

export interface AdjustStockPayload {
  delta: number;           // positive => add, negative => reduce
  reason?: string;
  notes?: string;
  createdByUserId?: number;
}

export const adjustProductStockInDb = async (
  productId: number,
  payload: AdjustStockPayload
): Promise<{ productId: number; oldQuantity: number; newQuantity: number; delta: number }> => {
  await getDbInstance();
  const delta = Number(payload?.delta || 0);
  if (!Number.isFinite(delta) || delta === 0) throw new Error('مقدار تغییر موجودی معتبر نیست.');
  const reason = payload?.reason || 'اصلاح دستی موجودی';
  const notes = payload?.notes || '';
  const createdByUserId = payload?.createdByUserId ?? null;

  await execAsync('BEGIN TRANSACTION;');
  try {
    const pr = await getAsync(`SELECT stock_quantity FROM products WHERE id=?`, [productId]);
    if (!pr) throw new Error('محصول یافت نشد.');
    const oldQuantity = Number(pr.stock_quantity) || 0;
    const newQuantity = oldQuantity + delta;
    if (newQuantity < 0) throw new Error('موجودی پس از اصلاح نمی‌تواند منفی شود.');

    await runAsync(`UPDATE products SET stock_quantity=? WHERE id=?`, [newQuantity, productId]);
    await runAsync(
      `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
      [productId, oldQuantity, newQuantity, new Date().toISOString()]
    );
    await runAsync(
      `INSERT INTO inventory_adjustments (productId, delta, reason, notes, createdAt, createdByUserId) VALUES (?,?,?,?,?,?)`,
      [productId, delta, reason, notes, new Date().toISOString(), createdByUserId]
    );

    await execAsync('COMMIT;');
    return { productId, oldQuantity, newQuantity, delta };
  } catch (e) {
    await execAsync('ROLLBACK;');
    throw e;
  }
};

export interface PurchaseReceiptItemPayload {
  productId: number;
  quantity: number;
  unitCost: number;
}
export interface PurchaseReceiptPayload {
  supplierId?: number | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  items: PurchaseReceiptItemPayload[];
  createdByUserId?: number;
  purchaseDateISO?: string; // optional ISO datetime
}

export const createPurchaseReceiptInDb = async (payload: PurchaseReceiptPayload) => {
  await getDbInstance();
  if (!payload?.items?.length) throw new Error('لیست اقلام خرید خالی است.');
  const supplierId = payload.supplierId ?? null;
  const invoiceNumber = payload.invoiceNumber ?? null;
  const notes = payload.notes ?? '';
  const createdByUserId = payload.createdByUserId ?? null;
  const purchaseDate = payload.purchaseDateISO || new Date().toISOString();

  await execAsync('BEGIN TRANSACTION;');
  try {
    const ins = await runAsync(
      `INSERT INTO purchases (supplierId, invoiceNumber, notes, totalCost, purchaseDate, createdByUserId)
       VALUES (?,?,?,?,?,?)`,
      [supplierId, invoiceNumber, notes, 0, purchaseDate, createdByUserId]
    );
    const purchaseId = ins.lastID as number;

    let totalCost = 0;

    for (const it of payload.items) {
      const productId = Number(it.productId);
      const quantity = Math.floor(Number(it.quantity));
      const unitCost = Number(it.unitCost);

      if (!productId || quantity <= 0) throw new Error('آیتم خرید نامعتبر است.');
      if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error('قیمت خرید نامعتبر است.');

      const pr = await getAsync(`SELECT id, name, stock_quantity, purchasePrice FROM products WHERE id=?`, [productId]);
      if (!pr) throw new Error(`محصول با شناسه ${productId} یافت نشد.`);

      const oldQty = Number(pr.stock_quantity) || 0;
      const newQty = oldQty + quantity;

      // Weighted average for purchasePrice (optional)
      let newPurchasePrice = Number(pr.purchasePrice) || 0;
      if (unitCost > 0) {
        const oldValue = newPurchasePrice * oldQty;
        const addValue = unitCost * quantity;
        const denom = oldQty + quantity;
        newPurchasePrice = denom > 0 ? (oldValue + addValue) / denom : unitCost;
      }

      await runAsync(`UPDATE products SET stock_quantity=?, purchasePrice=? WHERE id=?`, [newQty, newPurchasePrice, productId]);
      await runAsync(
        `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
        [productId, oldQty, newQty, purchaseDate]
      );

      const lineTotal = unitCost * quantity;
      totalCost += lineTotal;

      await runAsync(
        `INSERT INTO purchase_items (purchaseId, productId, quantity, unitCost, lineTotal) VALUES (?,?,?,?,?)`,
        [purchaseId, productId, quantity, unitCost, lineTotal]
      );
    }

    await runAsync(`UPDATE purchases SET totalCost=? WHERE id=?`, [totalCost, purchaseId]);

    if (supplierId && totalCost > 0) {
      const desc = `ثبت خرید کالا (رسید انبار) شماره ${purchaseId}` + (invoiceNumber ? ` | فاکتور: ${invoiceNumber}` : '');
      // credit => بدهی به تامین‌کننده افزایش می‌یابد
      await addPartnerLedgerEntryInternal(Number(supplierId), desc, 0, totalCost, purchaseDate, 'product_purchase', purchaseId);
    }

    await execAsync('COMMIT;');

    return await getPurchaseByIdFromDb(purchaseId);
  } catch (e) {
    await execAsync('ROLLBACK;');
    throw e;
  }
};

export const getAllPurchasesFromDb = async () => {
  await getDbInstance();
  return await allAsync(
    `SELECT p.*, pa.partnerName as supplierName
       FROM purchases p
       LEFT JOIN partners pa ON pa.id = p.supplierId
   ORDER BY datetime(p.purchaseDate) DESC, p.id DESC`
  );
};

export const getPurchaseByIdFromDb = async (purchaseId: number) => {
  await getDbInstance();
  const purchase = await getAsync(
    `SELECT p.*, pa.partnerName as supplierName
       FROM purchases p
       LEFT JOIN partners pa ON pa.id = p.supplierId
      WHERE p.id = ?`,
    [purchaseId]
  );
  if (!purchase) return null;
  const items = await allAsync(
    `SELECT pi.*, pr.name as productName
       FROM purchase_items pi
       JOIN products pr ON pr.id = pi.productId
      WHERE pi.purchaseId = ?
      ORDER BY pi.id ASC`,
    [purchaseId]
  );
  return { ...purchase, items };
};

export interface StockCountCreatePayload {
  title: string;
  notes?: string;
  createdByUserId?: number;
}

export const createStockCountInDb = async (payload: StockCountCreatePayload) => {
  await getDbInstance();
  if (!payload?.title?.trim()) throw new Error('عنوان انبارگردانی الزامی است.');
  const ins = await runAsync(
    `INSERT INTO stock_counts (title, status, notes, createdAt, createdByUserId) VALUES (?,?,?,?,?)`,
    [payload.title.trim(), 'open', payload.notes || '', new Date().toISOString(), payload.createdByUserId ?? null]
  );
  return await getStockCountByIdFromDb(Number(ins.lastID));
};

export const getAllStockCountsFromDb = async () => {
  await getDbInstance();
  return await allAsync(`SELECT * FROM stock_counts ORDER BY datetime(createdAt) DESC, id DESC`);
};

export const getStockCountByIdFromDb = async (stockCountId: number) => {
  await getDbInstance();
  const sc = await getAsync(`SELECT * FROM stock_counts WHERE id = ?`, [stockCountId]);
  if (!sc) return null;
  const items = await allAsync(
    `SELECT sci.*, pr.name as productName
       FROM stock_count_items sci
       JOIN products pr ON pr.id = sci.productId
      WHERE sci.stockCountId = ?
      ORDER BY pr.name ASC`,
    [stockCountId]
  );
  return { ...sc, items };
};

export const upsertStockCountItemInDb = async (
  stockCountId: number,
  productId: number,
  countedQty: number
) => {
  await getDbInstance();
  const sc = await getAsync(`SELECT status FROM stock_counts WHERE id=?`, [stockCountId]);
  if (!sc) throw new Error('انبارگردانی یافت نشد.');
  if (String(sc.status) !== 'open') throw new Error('این انبارگردانی بسته شده است.');

  const pr = await getAsync(`SELECT stock_quantity FROM products WHERE id=?`, [productId]);
  if (!pr) throw new Error('محصول یافت نشد.');
  const expectedQty = Number(pr.stock_quantity) || 0;
  const cq = Math.floor(Number(countedQty));
  if (!Number.isFinite(cq) || cq < 0) throw new Error('مقدار شمارش‌شده نامعتبر است.');

  await runAsync(
    `INSERT INTO stock_count_items (stockCountId, productId, expectedQty, countedQty)
     VALUES (?,?,?,?)
     ON CONFLICT(stockCountId, productId) DO UPDATE SET countedQty=excluded.countedQty`,
    [stockCountId, productId, expectedQty, cq]
  );
  return true;
};

export const completeStockCountInDb = async (stockCountId: number, createdByUserId?: number) => {
  await getDbInstance();
  const sc = await getAsync(`SELECT * FROM stock_counts WHERE id=?`, [stockCountId]);
  if (!sc) throw new Error('انبارگردانی یافت نشد.');
  if (String(sc.status) !== 'open') throw new Error('این انبارگردانی قبلاً بسته شده است.');

  const items = await allAsync(`SELECT * FROM stock_count_items WHERE stockCountId=?`, [stockCountId]);
  await execAsync('BEGIN TRANSACTION;');
  try {
    for (const it of items) {
      const expectedQty = Number(it.expectedQty) || 0;
      const countedQty = Number(it.countedQty) || 0;
      const delta = countedQty - expectedQty;
      if (delta === 0) continue;

      const pr = await getAsync(`SELECT stock_quantity FROM products WHERE id=?`, [it.productId]);
      if (!pr) continue;
      const oldQty = Number(pr.stock_quantity) || 0;
      const newQty = oldQty + delta;
      if (newQty < 0) throw new Error('نتیجه موجودی منفی شد. عملیات متوقف شد.');

      await runAsync(`UPDATE products SET stock_quantity=? WHERE id=?`, [newQty, it.productId]);
      await runAsync(
        `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
        [it.productId, oldQty, newQty, new Date().toISOString()]
      );
      await runAsync(
        `INSERT INTO inventory_adjustments (productId, delta, reason, notes, createdAt, createdByUserId)
         VALUES (?,?,?,?,?,?)`,
        [it.productId, delta, `انبارگردانی #${stockCountId}`, `اصلاح موجودی از ${expectedQty} به ${countedQty}`, new Date().toISOString(), createdByUserId ?? null]
      );
    }

    await runAsync(`UPDATE stock_counts SET status='completed', completedAt=? WHERE id=?`, [new Date().toISOString(), stockCountId]);
    await execAsync('COMMIT;');
    return await getStockCountByIdFromDb(stockCountId);
  } catch (e) {
    await execAsync('ROLLBACK;');
    throw e;
  }
};


export const addAuditLogEntry = async (
  userId: number | null,
  entity: string,
  entityId: number,
  action: string,
  meta: any = null
) => {
  await getDbInstance();
  await runAsync(
    `INSERT INTO audit_logs (userId, entity, entityId, action, meta, createdAt)
     VALUES (?,?,?,?,?,?)`,
    [userId, entity, entityId, action, meta ? JSON.stringify(meta) : null, new Date().toISOString()]
  );
};


export const dismissNotificationForUserInDb = async (userId: number, notificationId: string): Promise<void> => {
  await getDbInstance();
  const nid = String(notificationId || '').trim();
  if (!nid) throw new Error('notificationId خالی است.');
  await runAsync(
    `INSERT OR IGNORE INTO dismissed_notifications (userId, notificationId) VALUES (?, ?)`,
    [userId, nid]
  );
};

export const listDismissedNotificationIdsForUserFromDb = async (userId: number): Promise<string[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT notificationId FROM dismissed_notifications WHERE userId = ?`,
    [userId]
  );
  return (rows || []).map((r: any) => String(r.notificationId));
};



export type ExpenseCategory = 'rent' | 'salary' | 'inventory' | 'overhead';

export type ExpensePayload = {
  expenseDate: string; // ISO
  category: ExpenseCategory;
  title: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
};

export const addExpenseToDb = async (payload: ExpensePayload, actor?: { userId?: number; username?: string }) => {
  await getDbInstance();
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('عنوان هزینه خالی است.');
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('مبلغ هزینه نامعتبر است.');
  const category = String(payload.category || '').trim() as any;
  const allowed: ExpenseCategory[] = ['rent','salary','inventory','overhead'];
  if (!allowed.includes(category)) throw new Error('دسته‌بندی هزینه نامعتبر است.');
  const expenseDate = String(payload.expenseDate || '').trim();
  if (!expenseDate) throw new Error('تاریخ هزینه خالی است.');

  const result = await runAsync(
    `INSERT INTO expenses (expenseDate, category, title, amount, vendor, notes, createdByUserId, createdByUsername)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expenseDate,
      category,
      title,
      Math.round(amount),
      payload.vendor ?? null,
      payload.notes ?? null,
      actor?.userId ?? null,
      actor?.username ?? null,
    ]
  );
  return await getAsync(`SELECT * FROM expenses WHERE id = ?`, [result.lastID]);
};

export const updateExpenseInDb = async (id: number, payload: Partial<ExpensePayload>) => {
  await getDbInstance();
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.title != null) {
    const t = String(payload.title || '').trim();
    if (!t) throw new Error('عنوان هزینه خالی است.');
    updates.push('title = ?');
    params.push(t);
  }
  if (payload.amount != null) {
    const a = Number(payload.amount);
    if (!Number.isFinite(a) || a <= 0) throw new Error('مبلغ هزینه نامعتبر است.');
    updates.push('amount = ?');
    params.push(Math.round(a));
  }
  if (payload.category != null) {
    const c = String(payload.category).trim() as any;
    const allowed: ExpenseCategory[] = ['rent','salary','inventory','overhead'];
    if (!allowed.includes(c)) throw new Error('دسته‌بندی هزینه نامعتبر است.');
    updates.push('category = ?');
    params.push(c);
  }
  if (payload.expenseDate != null) {
    const d = String(payload.expenseDate || '').trim();
    if (!d) throw new Error('تاریخ هزینه خالی است.');
    updates.push('expenseDate = ?');
    params.push(d);
  }
  if (payload.vendor !== undefined) {
    updates.push('vendor = ?');
    params.push(payload.vendor ?? null);
  }
  if (payload.notes !== undefined) {
    updates.push('notes = ?');
    params.push(payload.notes ?? null);
  }

  if (!updates.length) return await getAsync(`SELECT * FROM expenses WHERE id = ?`, [id]);

  params.push(id);
  await runAsync(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params);
  return await getAsync(`SELECT * FROM expenses WHERE id = ?`, [id]);
};

export const deleteExpenseFromDb = async (id: number) => {
  await getDbInstance();
  await runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
};

export const listExpensesFromDb = async (filters?: { from?: string; to?: string; category?: string }) => {
  await getDbInstance();
  const where: string[] = [];
  const params: any[] = [];
  if (filters?.from) { where.push('expenseDate >= ?'); params.push(filters.from); }
  if (filters?.to) { where.push('expenseDate <= ?'); params.push(filters.to); }
  if (filters?.category && filters.category !== 'all') { where.push('category = ?'); params.push(filters.category); }
  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  return await allAsync(
    `SELECT * FROM expenses ${whereSql} ORDER BY expenseDate DESC, id DESC LIMIT 2000`,
    params
  );
};

export const getExpensesSummaryFromDb = async (filters?: { from?: string; to?: string }) => {
  await getDbInstance();
  const where: string[] = [];
  const params: any[] = [];
  if (filters?.from) { where.push('expenseDate >= ?'); params.push(filters.from); }
  if (filters?.to) { where.push('expenseDate <= ?'); params.push(filters.to); }
  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  const rows = await allAsync(
    `SELECT category, SUM(amount) as total FROM expenses ${whereSql} GROUP BY category`,
    params
  );
  const totalRow = await getAsync(
    `SELECT SUM(amount) as total FROM expenses ${whereSql}`,
    params
  );
  return { byCategory: rows || [], total: Number(totalRow?.total || 0) };
};



export type RecurringExpensePayload = {
  title: string;
  category: ExpenseCategory;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  dayOfMonth: number; // 1..31
  nextRunDate: string; // YYYY-MM-DD
  isActive?: boolean;
};

export const addRecurringExpenseToDb = async (payload: RecurringExpensePayload, actor?: { userId?: number; username?: string }) => {
  await getDbInstance();
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('عنوان هزینه تکرارشونده خالی است.');
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('مبلغ نامعتبر است.');
  const category = String(payload.category || '').trim() as any;
  const allowed: ExpenseCategory[] = ['rent','salary','inventory','overhead'];
  if (!allowed.includes(category)) throw new Error('دسته‌بندی نامعتبر است.');
  const dayOfMonth = Math.floor(Number(payload.dayOfMonth));
  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) throw new Error('روز ماه نامعتبر است.');
  const nextRunDate = String(payload.nextRunDate || '').trim();
  if (!nextRunDate) throw new Error('nextRunDate خالی است.');

  const ins = await runAsync(
    `INSERT INTO recurring_expenses (title, category, amount, vendor, notes, dayOfMonth, nextRunDate, isActive, createdByUserId, createdByUsername)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      title, category, Math.round(amount),
      payload.vendor ?? null,
      payload.notes ?? null,
      dayOfMonth,
      nextRunDate,
      payload.isActive === false ? 0 : 1,
      actor?.userId ?? null,
      actor?.username ?? null,
    ]
  );

  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [ins.lastID]);
};

export const listRecurringExpensesFromDb = async () => {
  await getDbInstance();
  return await allAsync(`SELECT * FROM recurring_expenses ORDER BY isActive DESC, nextRunDate ASC, id DESC`, []);
};

export const updateRecurringExpenseInDb = async (id: number, payload: Partial<RecurringExpensePayload>) => {
  await getDbInstance();
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.title != null) {
    const t = String(payload.title || '').trim();
    if (!t) throw new Error('عنوان خالی است.');
    updates.push('title = ?'); params.push(t);
  }
  if (payload.amount != null) {
    const a = Number(payload.amount);
    if (!Number.isFinite(a) || a <= 0) throw new Error('مبلغ نامعتبر است.');
    updates.push('amount = ?'); params.push(Math.round(a));
  }
  if (payload.category != null) {
    const c = String(payload.category).trim() as any;
    const allowed: ExpenseCategory[] = ['rent','salary','inventory','overhead'];
    if (!allowed.includes(c)) throw new Error('دسته‌بندی نامعتبر است.');
    updates.push('category = ?'); params.push(c);
  }
  if (payload.vendor !== undefined) { updates.push('vendor = ?'); params.push(payload.vendor ?? null); }
  if (payload.notes !== undefined) { updates.push('notes = ?'); params.push(payload.notes ?? null); }
  if (payload.dayOfMonth != null) {
    const d = Math.floor(Number(payload.dayOfMonth));
    if (!d || d < 1 || d > 31) throw new Error('روز ماه نامعتبر است.');
    updates.push('dayOfMonth = ?'); params.push(d);
  }
  if (payload.nextRunDate != null) {
    const n = String(payload.nextRunDate || '').trim();
    if (!n) throw new Error('nextRunDate خالی است.');
    updates.push('nextRunDate = ?'); params.push(n);
  }
  if (payload.isActive != null) { updates.push('isActive = ?'); params.push(payload.isActive ? 1 : 0); }

  if (!updates.length) return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [id]);

  params.push(id);
  await runAsync(`UPDATE recurring_expenses SET ${updates.join(', ')} WHERE id = ?`, params);
  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [id]);
};

export const deleteRecurringExpenseFromDb = async (id: number) => {
  await getDbInstance();
  await runAsync(`DELETE FROM recurring_expenses WHERE id = ?`, [id]);
};

export const getRecurringExpenseByIdFromDb = async (id: number) => {
  await getDbInstance();
  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [id]);
};

export const advanceRecurringExpenseNextRunDateInDb = async (id: number, nextRunDate: string) => {
  await getDbInstance();
  await runAsync(`UPDATE recurring_expenses SET nextRunDate = ? WHERE id = ?`, [nextRunDate, id]);
};



export const markRecurringExpenseRunInDb = async (recurringExpenseId: number, runMonth: string) => {
  await getDbInstance();
  const m = String(runMonth || '').trim();
  if (!m) throw new Error('runMonth خالی است.');
  try {
    await runAsync(
      `INSERT INTO recurring_expense_runs (recurringExpenseId, runMonth) VALUES (?, ?)`,
      [recurringExpenseId, m]
    );
    return { inserted: true };
  } catch (e: any) {
    // SQLite unique constraint
    return { inserted: false };
  }
};



export const upsertDebtSnapshotInDb = async (snapshotDate: string, totalDebt: number) => {
  await getDbInstance();
  const d = String(snapshotDate || '').trim();
  if (!d) throw new Error('snapshotDate خالی است.');
  const v = Number(totalDebt || 0);
  await runAsync(
    `INSERT INTO debt_snapshots (snapshotDate, totalDebt) VALUES (?, ?)
     ON CONFLICT(snapshotDate) DO UPDATE SET totalDebt = excluded.totalDebt`,
    [d, v]
  );
};

export const listDebtSnapshotsFromDb = async (fromDate: string, toDate: string) => {
  await getDbInstance();
  return await allAsync(
    `SELECT snapshotDate, totalDebt FROM debt_snapshots
      WHERE snapshotDate >= ? AND snapshotDate <= ?
      ORDER BY snapshotDate ASC`,
    [fromDate, toDate]
  );
};



export const recordInventoryInDb = async (payload: {
  productId: number;
  entryType: 'in' | 'out';
  quantity: number;
  unitCost?: number;
  refType?: string;
  refId?: number;
  entryDate: string;
}) => {
  await getDbInstance();
  const q = Number(payload.quantity || 0);
  if (!Number.isFinite(q) || q <= 0) throw new Error('quantity نامعتبر');
  const uc = Number(payload.unitCost || 0);
  await runAsync(
    `INSERT INTO inventory_ledger (productId, entryType, quantity, unitCost, refType, refId, entryDate)
     VALUES (?,?,?,?,?,?,?)`,
    [
      payload.productId,
      payload.entryType,
      q,
      payload.entryType === 'in' ? uc : 0,
      payload.refType ?? null,
      payload.refId ?? null,
      payload.entryDate,
    ]
  );
};

export const computeFifoCogsForProduct = async (productId: number, soldQty: number) => {
  await getDbInstance();
  let remaining = Number(soldQty || 0);
  if (remaining <= 0) return { cogs: 0, consumed: [] as any[] };

  const ins = await allAsync(
    `SELECT id, quantity, unitCost FROM inventory_ledger
      WHERE productId = ? AND entryType = 'in'
      ORDER BY entryDate ASC, id ASC`,
    [productId]
  );

  const outs = await allAsync(
    `SELECT quantity FROM inventory_ledger
      WHERE productId = ? AND entryType = 'out'
      ORDER BY entryDate ASC, id ASC`,
    [productId]
  );
  const totalOut = (outs || []).reduce((s:any, r:any)=>s+Number(r.quantity||0),0);

  // available by FIFO layers
  let consumedOut = totalOut;
  let cogs = 0;
  const used:any[] = [];

  for (const row of ins || []) {
    let layerQty = Number(row.quantity || 0);
    if (consumedOut > 0) {
      const take = Math.min(layerQty, consumedOut);
      layerQty -= take;
      consumedOut -= take;
    }
    if (layerQty <= 0) continue;

    const takeForSale = Math.min(layerQty, remaining);
    if (takeForSale > 0) {
      cogs += takeForSale * Number(row.unitCost || 0);
      used.push({ inId: row.id, qty: takeForSale, unitCost: row.unitCost });
      remaining -= takeForSale;
    }
    if (remaining <= 0) break;
  }

  return { cogs, consumed: used, shortfall: remaining };
};



export const getInventoryFifoAgingForAllProducts = async () => {
  await getDbInstance();

  const products = await allAsync(`SELECT id, name FROM products ORDER BY name ASC`, []);
  const outRows = await allAsync(
    `SELECT productId, SUM(quantity) as outQty
       FROM inventory_ledger
      WHERE entryType = 'out'
      GROUP BY productId`,
    []
  );
  const outMap: Record<string, number> = {};
  (outRows || []).forEach((r: any) => { outMap[String(r.productId)] = Number(r.outQty || 0); });

  const inRows = await allAsync(
    `SELECT productId, entryDate, quantity, unitCost
       FROM inventory_ledger
      WHERE entryType = 'in'
      ORDER BY productId ASC, entryDate ASC, id ASC`,
    []
  );

  const layersByProduct: Record<string, any[]> = {};
  for (const r of inRows || []) {
    const pid = String(r.productId);
    if (!layersByProduct[pid]) layersByProduct[pid] = [];
    layersByProduct[pid].push({
      entryDate: String(r.entryDate),
      remaining: Number(r.quantity || 0),
      unitCost: Number(r.unitCost || 0),
    });
  }

  for (const pid of Object.keys(layersByProduct)) {
    let remainingOut = Number(outMap[pid] || 0);
    const layers = layersByProduct[pid];
    for (const L of layers) {
      if (remainingOut <= 0) break;
      const take = Math.min(L.remaining, remainingOut);
      L.remaining -= take;
      remainingOut -= take;
    }
    layersByProduct[pid] = layers.filter((l) => l.remaining > 0.0000001);
  }

  const now = moment();
  const result: any[] = [];
  for (const p of products || []) {
    const pid = String(p.id);
    const layers = layersByProduct[pid] || [];
    const totalQty = layers.reduce((s, l) => s + Number(l.remaining || 0), 0);
    const totalValue = layers.reduce((s, l) => s + Number(l.remaining || 0) * Number(l.unitCost || 0), 0);
    const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

    const aging = layers.map((l) => {
      const days = Math.max(0, now.diff(moment(l.entryDate), 'days'));
      return {
        entryDate: l.entryDate,
        remainingQty: l.remaining,
        unitCost: l.unitCost,
        value: Number(l.remaining) * Number(l.unitCost),
        ageDays: days,
      };
    });

    result.push({
      productId: p.id,
      name: p.name,
      onHandQty: totalQty,
      onHandValue: totalValue,
      avgCost,
      layers: aging,
    });
  }

  return result;
};

export const getMonthlyProfitByProductFifo = async (monthsBack: number = 6) => {
  await getDbInstance();
  const m = Math.max(1, Math.min(24, Math.floor(Number(monthsBack || 6))));
  const startMonth = moment().startOf('month').subtract(m - 1, 'month').format('YYYY-MM');

  const sales = await allAsync(
    `SELECT itemId as productId, itemName, SUM(quantity) as qty, SUM(totalPrice) as revenue,
            substr(transactionDate, 1, 7) as month
       FROM sales_transactions
      WHERE itemType = 'inventory'
        AND substr(transactionDate, 1, 7) >= ?
      GROUP BY itemId, itemName, substr(transactionDate, 1, 7)
      ORDER BY month ASC`,
    [startMonth]
  );

  const rows: any[] = [];
  for (const r of sales || []) {
    const pid = Number(r.productId);
    const qty = Number(r.qty || 0);
    const revenue = Number(r.revenue || 0);
    const month = String(r.month);

    const end = moment(month + '-01').endOf('month').toDate().toISOString();
    const prevEnd = moment(month + '-01').subtract(1, 'month').endOf('month').toDate().toISOString();

    const soldToEnd = await getAsync(
      `SELECT SUM(quantity) as q FROM inventory_ledger
        WHERE productId = ? AND entryType = 'out' AND entryDate <= ?`,
      [pid, end]
    );
    const soldToPrev = await getAsync(
      `SELECT SUM(quantity) as q FROM inventory_ledger
        WHERE productId = ? AND entryType = 'out' AND entryDate <= ?`,
      [pid, prevEnd]
    );

    const qtyToEnd = Number(soldToEnd?.q || 0);
    const qtyToPrev = Number(soldToPrev?.q || 0);

    const fifoEnd = await computeFifoCogsForProduct(pid, qtyToEnd);
    const fifoPrev = await computeFifoCogsForProduct(pid, qtyToPrev);

    const cogs = Number(fifoEnd.cogs || 0) - Number(fifoPrev.cogs || 0);
    const profit = revenue - cogs;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    rows.push({
      month,
      productId: pid,
      name: String(r.itemName),
      qty,
      revenue,
      cogs,
      profit,
      marginPct,
    });
  }

  return rows;
};



export const createInventoryAdjustmentInDb = async (payload: {
  productId: number;
  direction: 'in'|'out';
  quantity: number;
  unitCost?: number; // required for 'in'
  reason?: string;
  entryDate: string; // ISO
}) => {
  await getDbInstance();
  const pid = Number(payload.productId);
  const dir = payload.direction;
  const qty = Number(payload.quantity || 0);
  if (!pid) throw new Error('productId نامعتبر');
  if (dir !== 'in' && dir !== 'out') throw new Error('direction نامعتبر');
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('quantity نامعتبر');
  const unitCost = Number(payload.unitCost || 0);
  if (dir === 'in' && (!Number.isFinite(unitCost) || unitCost < 0)) throw new Error('unitCost نامعتبر');
  const entryDate = String(payload.entryDate || '').trim();
  if (!entryDate) throw new Error('entryDate خالی است.');

  const product = await getAsync(`SELECT id, stock_quantity FROM products WHERE id = ?`, [pid]);
  if (!product) throw new Error('محصول یافت نشد.');
  if (dir === 'out' && Number(product.stock_quantity || 0) < qty) throw new Error('موجودی برای تعدیل منفی کافی نیست.');

  await execAsync('BEGIN TRANSACTION;');
  try {
    const res = await runAsync(
      `INSERT INTO inventory_adjustments (productId, direction, quantity, unitCost, reason, entryDate)
       VALUES (?,?,?,?,?,?)`,
      [pid, dir, qty, dir === 'in' ? unitCost : 0, payload.reason ?? null, entryDate]
    );

    // stock update
    if (dir === 'in') {
      await runAsync(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`, [qty, pid]);
    } else {
      await runAsync(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`, [qty, pid]);
    }

    // ledger record
    await recordInventoryInDb({
      productId: pid,
      entryType: dir,
      quantity: qty,
      unitCost: dir === 'in' ? unitCost : 0,
      refType: 'adjust',
      refId: Number((res as any)?.lastID || 0),
      entryDate,
    });

    await execAsync('COMMIT;');
    return { id: Number((res as any)?.lastID || 0) };
  } catch (e) {
    await execAsync('ROLLBACK;');
    throw e;
  }
};

export const getInventoryAgingBucketsFromDb = async () => {
  const rows = await getInventoryFifoAgingForAllProducts();
  const buckets = { b0_30: 0, b31_90: 0, b91_180: 0, b181_plus: 0 };
  for (const r of rows || []) {
    for (const l of (r.layers || [])) {
      const v = Number(l.value || 0);
      const d = Number(l.ageDays || 0);
      if (d <= 30) buckets.b0_30 += v;
      else if (d <= 90) buckets.b31_90 += v;
      else if (d <= 180) buckets.b91_180 += v;
      else buckets.b181_plus += v;
    }
  }
  return buckets;
};

export const listSalesProfitRowsFifo = async (fromIso: string, toIso: string) => {
  await getDbInstance();
  // gather all ledger entries in time window, but FIFO needs history of ins/out before window too.
  // We'll build state from all IN up to toIso, then process OUT chronologically and capture those within window.
  const ins = await allAsync(
    `SELECT id, productId, entryDate, quantity, unitCost
       FROM inventory_ledger
      WHERE entryType = 'in' AND entryDate <= ?
      ORDER BY entryDate ASC, id ASC`,
    [toIso]
  );
  const outs = await allAsync(
    `SELECT id, productId, entryDate, quantity, refType, refId
       FROM inventory_ledger
      WHERE entryType = 'out' AND entryDate <= ?
      ORDER BY entryDate ASC, id ASC`,
    [toIso]
  );

  // layers per product
  const layers: Record<string, any[]> = {};
  for (const r of ins || []) {
    const pid = String(r.productId);
    if (!layers[pid]) layers[pid] = [];
    layers[pid].push({ remaining: Number(r.quantity||0), unitCost: Number(r.unitCost||0) });
  }

  // map sale revenue by sale row id (refId) from sales_transactions
  const saleRows = await allAsync(
    `SELECT id, transactionDate, itemId, itemName, quantity, totalPrice
       FROM sales_transactions
      WHERE itemType = 'inventory' AND transactionDate >= ? AND transactionDate <= ?`,
    [fromIso, toIso]
  );
  const saleMap: Record<string, any> = {};
  (saleRows || []).forEach((s:any)=>{ saleMap[String(s.id)] = s; });

  const results: any[] = [];

  for (const o of outs || []) {
    const pid = String(o.productId);
    let remainingOut = Number(o.quantity || 0);
    let cogs = 0;

    const L = layers[pid] || [];
    for (const layer of L) {
      if (remainingOut <= 0) break;
      const take = Math.min(layer.remaining, remainingOut);
      if (take > 0) {
        cogs += take * Number(layer.unitCost || 0);
        layer.remaining -= take;
        remainingOut -= take;
      }
    }
    // drop empty layers
    layers[pid] = (layers[pid] || []).filter((x:any)=>x.remaining > 0.0000001);

    // capture only sales within window
    if (String(o.refType) === 'sale' && o.refId && saleMap[String(o.refId)]) {
      const s = saleMap[String(o.refId)];
      const revenue = Number(s.totalPrice || 0);
      const profit = revenue - cogs;
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
      results.push({
        saleId: Number(s.id),
        date: String(s.transactionDate).slice(0,10),
        productId: Number(s.itemId),
        name: String(s.itemName),
        qty: Number(s.quantity || 0),
        revenue,
        cogs,
        profit,
        marginPct,
      });
    }
  }

  return results.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
};



export const getRealProfitPerProductFifo = async (fromIso: string, toIso: string) => {
  await getDbInstance();

  const from = String(fromIso);
  const to = String(toIso);

  // Sales (inventory only) within period
  const sales = await allAsync(
    `SELECT itemId as productId, itemName as name,
            SUM(quantity) as qty,
            SUM(totalPrice) as revenue
       FROM sales_transactions
      WHERE itemType = 'inventory'
        AND transactionDate >= ? AND transactionDate <= ?
      GROUP BY itemId, itemName
      ORDER BY revenue DESC`,
    [from, to]
  );

  // Total revenue for share calculation
  const totalRevenueRow = await getAsync(
    `SELECT SUM(totalPrice) as total
       FROM sales_transactions
      WHERE itemType = 'inventory'
        AND transactionDate >= ? AND transactionDate <= ?`,
    [from, to]
  );
  const totalRevenue = Number(totalRevenueRow?.total || 0);

  const rows: any[] = [];
  for (const r of sales || []) {
    const pid = Number(r.productId);
    const qty = Number(r.qty || 0);
    const revenue = Number(r.revenue || 0);

    // FIFO COGS for period using ledger outs
    const outToEnd = await getAsync(
      `SELECT SUM(quantity) as q
         FROM inventory_ledger
        WHERE productId = ?
          AND entryType = 'out'
          AND entryDate <= ?`,
      [pid, to]
    );
    const outBeforeFrom = await getAsync(
      `SELECT SUM(quantity) as q
         FROM inventory_ledger
        WHERE productId = ?
          AND entryType = 'out'
          AND entryDate < ?`,
      [pid, from]
    );

    const qtyToEnd = Number(outToEnd?.q || 0);
    const qtyToPrev = Number(outBeforeFrom?.q || 0);

    const fifoEnd = await computeFifoCogsForProduct(pid, qtyToEnd);
    const fifoPrev = await computeFifoCogsForProduct(pid, qtyToPrev);

    const cogs = Number(fifoEnd.cogs || 0) - Number(fifoPrev.cogs || 0);

    const profit = revenue - cogs;
    const avgBuyPrice = qty > 0 ? (cogs / qty) : 0;
    const avgSellPrice = qty > 0 ? (revenue / qty) : 0;
    const shareOfRevenue = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    rows.push({
      productId: pid,
      name: String(r.name),
      qty,
      revenue,
      cogs,
      profit,
      avgBuyPrice,
      avgSellPrice,
      shareOfRevenue,
      marginPct,
    });
  }

  return {
    from,
    to,
    totalRevenue,
    items: rows,
  };
};



// =====================================================
// Reports: Saved Filters & Scheduling (PageKit "CEO-level" polish)
// =====================================================

type SavedFilterRow = {
  id: number;
  userId: number;
  reportKey: string;
  name: string;
  filtersJson: string;
  createdAt: string;
  updatedAt: string;
};

const ensureReportSavedFiltersTable = async () => {
  await getDbInstance();
  await runAsync(`
    CREATE TABLE IF NOT EXISTS report_saved_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      reportKey TEXT NOT NULL,
      name TEXT NOT NULL,
      filtersJson TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      UNIQUE(userId, reportKey, name)
    );
  `);
};

export const listReportSavedFilters = async (userId: number, reportKey: string) => {
  await ensureReportSavedFiltersTable();
  return (await allAsync(
    `SELECT id, userId, reportKey, name, filtersJson, createdAt, updatedAt
     FROM report_saved_filters
     WHERE userId = ? AND reportKey = ?
     ORDER BY createdAt DESC`,
    [userId, reportKey]
  )) as SavedFilterRow[];
};

export const createOrReplaceReportSavedFilter = async (userId: number, reportKey: string, name: string, filters: any) => {
  await ensureReportSavedFiltersTable();
  const filtersJson = JSON.stringify(filters ?? {});
  // Upsert by UNIQUE(userId, reportKey, name)
  await runAsync(
    `INSERT INTO report_saved_filters (userId, reportKey, name, filtersJson)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userId, reportKey, name) DO UPDATE SET
       filtersJson = excluded.filtersJson,
       updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))`,
    [userId, reportKey, name, filtersJson]
  );
  const row = await getAsync(
    `SELECT id, userId, reportKey, name, filtersJson, createdAt, updatedAt
     FROM report_saved_filters
     WHERE userId = ? AND reportKey = ? AND name = ?`,
    [userId, reportKey, name]
  );
  return row as SavedFilterRow;
};

export const deleteReportSavedFilter = async (userId: number, id: number) => {
  await ensureReportSavedFiltersTable();
  await runAsync(`DELETE FROM report_saved_filters WHERE id = ? AND userId = ?`, [id, userId]);
  return { success: true };
};

// =====================================================
// Reports: New CFO/CEO-grade reports
// =====================================================

export type InventoryTurnoverReport = {
  periodDays: number;
  cogs: number;
  avgInventoryValue: number;
  inventoryTurnover: number;
  daysOfInventory: number;
};

export const getInventoryTurnoverReport = async (fromISO: string, toISO: string): Promise<InventoryTurnoverReport> => {
  await getDbInstance();

  // Period days (min 1)
  const periodDays = Math.max(1, Math.ceil((new Date(toISO).getTime() - new Date(fromISO).getTime()) / (1000 * 60 * 60 * 24)));

  // COGS from inventory_ledger out(sale) using unitCost when available
  const cogsRow: any = await getAsync(
    `SELECT SUM(CASE WHEN entryType='out' AND refType='sale' THEN quantity * COALESCE(unitCost,0) ELSE 0 END) as cogs
     FROM inventory_ledger
     WHERE entryDate BETWEEN ? AND ?`,
    [fromISO, toISO]
  );

  const cogs = Number(cogsRow?.cogs ?? 0);

  // Ending inventory value (current stock_quantity * purchasePrice)
  const endRow: any = await getAsync(
    `SELECT SUM(stock_quantity * purchasePrice) as invValue FROM products`,
    []
  );
  const endValue = Number(endRow?.invValue ?? 0);

  // Net movement in period to approximate start inventory
  const netRow: any = await getAsync(
    `SELECT
       SUM(CASE WHEN entryType='in' THEN quantity ELSE 0 END) as qtyIn,
       SUM(CASE WHEN entryType='out' THEN quantity ELSE 0 END) as qtyOut
     FROM inventory_ledger
     WHERE entryDate BETWEEN ? AND ?`,
    [fromISO, toISO]
  );

  const qtyIn = Number(netRow?.qtyIn ?? 0);
  const qtyOut = Number(netRow?.qtyOut ?? 0);

  // Approximate start inventory value using product purchasePrice and rolling back total net qty (coarse but useful)
  // start = end - in + out (value uses current purchasePrice as approximation)
  const approxStartRow: any = await getAsync(
    `SELECT SUM((stock_quantity - ? + ?) * purchasePrice) as startValue FROM products`,
    [qtyIn, qtyOut]
  );
  const startValue = Number(approxStartRow?.startValue ?? endValue);

  const avgInventoryValue = (startValue + endValue) / 2;
  const inventoryTurnover = avgInventoryValue > 0 ? (cogs / avgInventoryValue) : 0;
  const daysOfInventory = cogs > 0 ? (avgInventoryValue / cogs) * periodDays : 0;

  return { periodDays, cogs, avgInventoryValue, inventoryTurnover, daysOfInventory };
};

export type DeadStockItem = {
  productId: number;
  name: string;
  categoryName?: string | null;
  stock: number;
  purchasePrice: number;
  value: number;
  lastSaleDate?: string | null;
  daysSinceLastSale?: number | null;
};

export const getDeadStockReport = async (days: number): Promise<DeadStockItem[]> => {
  await getDbInstance();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // last sale date from inventory_ledger out(sale)
  const rows: any[] = await allAsync(
    `
    SELECT
      p.id as productId,
      p.name,
      c.name as categoryName,
      p.stock_quantity as stock,
      p.purchasePrice,
      (p.stock_quantity * p.purchasePrice) as value,
      (SELECT MAX(entryDate) FROM inventory_ledger il WHERE il.productId = p.id AND il.entryType='out' AND il.refType='sale') as lastSaleDate
    FROM products p
    LEFT JOIN categories c ON c.id = p.categoryId
    WHERE p.stock_quantity > 0
    `,
    []
  );

  return rows
    .map((r) => {
      const last = r.lastSaleDate ? new Date(r.lastSaleDate).getTime() : null;
      const diffDays = last ? Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24)) : null;
      return {
        productId: Number(r.productId),
        name: String(r.name),
        categoryName: r.categoryName ?? null,
        stock: Number(r.stock ?? 0),
        purchasePrice: Number(r.purchasePrice ?? 0),
        value: Number(r.value ?? 0),
        lastSaleDate: r.lastSaleDate ?? null,
        daysSinceLastSale: diffDays,
      } as DeadStockItem;
    })
    .filter((r) => !r.lastSaleDate || new Date(r.lastSaleDate).toISOString() < cutoff)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
};

export type AbcItem = {
  productId: number;
  name: string;
  categoryName?: string | null;
  sales: number;
  cogs: number;
  profit: number;
  share: number;
  cumShare: number;
  bucket: 'A' | 'B' | 'C';
};

export const getAbcReport = async (fromISO: string, toISO: string, metric: 'sales' | 'profit' = 'sales'): Promise<AbcItem[]> => {
  await getDbInstance();

  // Aggregate from sales_order_items (inventory only), join products purchasePrice for cogs approximation
  const rows: any[] = await allAsync(
    `
    SELECT
      p.id as productId,
      p.name,
      c.name as categoryName,
      SUM(soi.quantity * soi.unitPrice - COALESCE(soi.discountPerItem,0)) as sales,
      SUM(soi.quantity * COALESCE(p.purchasePrice,0)) as cogs
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.orderId
    JOIN products p ON p.id = soi.itemId
    LEFT JOIN categories c ON c.id = p.categoryId
    WHERE soi.itemType = 'inventory'
      AND so.transactionDate BETWEEN ? AND ?
    GROUP BY p.id, p.name, c.name
    `,
    [fromISO.slice(0,10), toISO.slice(0,10)]
  );

  const items = rows.map((r) => {
    const sales = Number(r.sales ?? 0);
    const cogs = Number(r.cogs ?? 0);
    const profit = sales - cogs;
    return {
      productId: Number(r.productId),
      name: String(r.name),
      categoryName: r.categoryName ?? null,
      sales,
      cogs,
      profit,
      share: 0,
      cumShare: 0,
      bucket: 'C' as const,
    };
  });

  const total = items.reduce((acc, it) => acc + (metric === 'sales' ? it.sales : it.profit), 0) || 1;

  items.sort((a, b) => (metric === 'sales' ? b.sales - a.sales : b.profit - a.profit));

  let cum = 0;
  for (const it of items) {
    const v = metric === 'sales' ? it.sales : it.profit;
    const share = v / total;
    cum += share;
    it.share = share;
    it.cumShare = cum;
    it.bucket = cum <= 0.8 ? 'A' : cum <= 0.95 ? 'B' : 'C';
  }

  return items;
};

export type AgingBucket = {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  amount: number;
};

export type AgingReceivableRow = {
  customerId: number;
  fullName: string;
  phoneNumber?: string | null;
  totalOutstanding: number;
  buckets: AgingBucket[];
};

export const getAgingReceivablesReport = async (): Promise<AgingReceivableRow[]> => {
  await getDbInstance();

  // Pull ledger entries per customer, then allocate outstanding using FIFO (oldest debits first, credits reduce)
  const customers: any[] = await allAsync(`SELECT id, fullName, phoneNumber FROM customers`, []);

  const results: AgingReceivableRow[] = [];
  for (const c of customers) {
    const rows: any[] = await allAsync(
      `SELECT transactionDate, description, debit, credit
       FROM customer_ledger
       WHERE customerId = ?
       ORDER BY transactionDate ASC, id ASC`,
      [c.id]
    );

    let creditPool = 0;
    const openDebits: { date: string; amount: number }[] = [];

    for (const r of rows) {
      const debit = Number(r.debit ?? 0);
      const credit = Number(r.credit ?? 0);
      if (credit > 0) creditPool += credit;

      if (debit > 0) {
        let remaining = debit;
        // Apply existing credit pool
        if (creditPool > 0) {
          const used = Math.min(creditPool, remaining);
          creditPool -= used;
          remaining -= used;
        }
        if (remaining > 0) openDebits.push({ date: String(r.transactionDate), amount: remaining });
      }

      // Extra credits can offset existing open debits (in case credits come later)
      while (creditPool > 0 && openDebits.length > 0) {
        const d = openDebits[0];
        const used = Math.min(creditPool, d.amount);
        creditPool -= used;
        d.amount -= used;
        if (d.amount <= 0.00001) openDebits.shift();
      }
    }

    const now = Date.now();
    const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    for (const d of openDebits) {
      const ageDays = Math.floor((now - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24));
      const b = ageDays <= 30 ? '0-30' : ageDays <= 60 ? '31-60' : ageDays <= 90 ? '61-90' : '90+';
      buckets[b] += d.amount;
    }

    const totalOutstanding = Object.values(buckets).reduce((a, b) => a + b, 0);

    if (totalOutstanding > 0.00001) {
      results.push({
        customerId: Number(c.id),
        fullName: String(c.fullName),
        phoneNumber: c.phoneNumber ?? null,
        totalOutstanding,
        buckets: (Object.keys(buckets) as any).map((k: any) => ({ bucket: k, amount: buckets[k] })) as AgingBucket[],
      });
    }
  }

  results.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  return results;
};

export type CashflowDay = {
  date: string; // YYYY-MM-DD
  inflow: number;
  outflow: number;
  net: number;
};

export type CashflowReport = {
  days: CashflowDay[];
  totals: { inflow: number; outflow: number; net: number };
  forecast: CashflowDay[];
};

export const getCashflowReport = async (fromISO: string, toISO: string, forecastDays: number = 30): Promise<CashflowReport> => {
  await getDbInstance();

  const from = fromISO.slice(0,10);
  const to = toISO.slice(0,10);

  // In some installs, not all modules/tables exist yet. Prefer returning an empty report
  // instead of throwing 500 for missing tables.
  const safeAll = async (sql: string, params: any[]) => {
    try {
      return await allAsync(sql, params);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('no such table')) return [] as any[];
      throw e;
    }
  };

  const hasColumn = async (table: string, col: string) => {
    try {
      const rows: any[] = await allAsync(`PRAGMA table_info(${table});`);
      return Array.isArray(rows) && rows.some((r: any) => String(r?.name) === col);
    } catch {
      return false;
    }
  };

  // Inflow: sales_orders (grandTotal) + installment_payments (paid amount)
  const salesRows: any[] = await safeAll(
    `SELECT transactionDate as date, SUM(grandTotal) as amount
     FROM sales_orders
     WHERE transactionDate BETWEEN ? AND ?
     GROUP BY transactionDate`,
    [from, to]
  );

  // NOTE: Some schemas use amountDue (and store paymentDate in Shamsi). We mainly want to avoid hard 500 errors.
  // If paymentDate is non-ISO in your DB, this will likely return 0 rows, but sales/expenses will still work.
  const instAmountCol = (await hasColumn('installment_payments', 'amount'))
    ? 'amount'
    : (await hasColumn('installment_payments', 'amountDue'))
      ? 'amountDue'
      : null;

  const instRows: any[] = instAmountCol
    ? await safeAll(
        `SELECT paymentDate as date, SUM(${instAmountCol}) as amount
         FROM installment_payments
         WHERE paymentDate IS NOT NULL
           AND (status='پرداخت شده' OR status='paid' OR status='Paid')
           AND paymentDate BETWEEN ? AND ?
         GROUP BY paymentDate`,
        [from, to]
      )
    : [];

  // Outflow: expenses + inventory_ledger in(purchase/adjust) cost
  const expRows: any[] = await safeAll(
    `SELECT substr(expenseDate,1,10) as date, SUM(amount) as amount
     FROM expenses
     WHERE substr(expenseDate,1,10) BETWEEN ? AND ?
     GROUP BY substr(expenseDate,1,10)`,
    [from, to]
  );

  const invInRows: any[] = await safeAll(
    `SELECT substr(entryDate,1,10) as date,
            SUM(CASE WHEN entryType='in' THEN quantity * COALESCE(unitCost,0) ELSE 0 END) as amount
     FROM inventory_ledger
     WHERE substr(entryDate,1,10) BETWEEN ? AND ?
     GROUP BY substr(entryDate,1,10)`,
    [from, to]
  );

  const map: Record<string, { inflow: number; outflow: number }> = {};
  const add = (date: string, inflow: number, outflow: number) => {
    const d = String(date).slice(0,10);
    if (!map[d]) map[d] = { inflow: 0, outflow: 0 };
    map[d].inflow += inflow;
    map[d].outflow += outflow;
  };

  for (const r of salesRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of instRows) add(r.date, Number(r.amount ?? 0), 0);
  for (const r of expRows) add(r.date, 0, Number(r.amount ?? 0));
  for (const r of invInRows) add(r.date, 0, Number(r.amount ?? 0));

  // Build date range days
  const days: CashflowDay[] = [];
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0,10);
    const inflow = map[key]?.inflow ?? 0;
    const outflow = map[key]?.outflow ?? 0;
    days.push({ date: key, inflow, outflow, net: inflow - outflow });
  }

  const totals = days.reduce((acc, x) => {
    acc.inflow += x.inflow;
    acc.outflow += x.outflow;
    acc.net += x.net;
    return acc;
  }, { inflow: 0, outflow: 0, net: 0 });

  // Forecast: simple moving average of last 30 days
  const tail = days.slice(-30);
  const avgIn = tail.length ? tail.reduce((a, x) => a + x.inflow, 0) / tail.length : 0;
  const avgOut = tail.length ? tail.reduce((a, x) => a + x.outflow, 0) / tail.length : 0;

  const forecast: CashflowDay[] = [];
  const lastDate = new Date((days[days.length - 1]?.date ?? to) + 'T00:00:00Z');
  for (let i = 1; i <= forecastDays; i++) {
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0,10);
    forecast.push({ date: key, inflow: avgIn, outflow: avgOut, net: avgIn - avgOut });
  }

  return { days, totals, forecast };
};
