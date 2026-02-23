import InventoryTurnoverReport from './pages/reports/InventoryTurnoverReport';
import DeadStockReport from './pages/reports/DeadStockReport';
import AbcAnalysisReport from './pages/reports/AbcAnalysisReport';
import AgingReceivablesReport from './pages/reports/AgingReceivablesReport';
import CashflowReport from './pages/reports/CashflowReport';
import ReportsLayout from './pages/ReportsLayout';
import PrintLayout from './pages/PrintLayout';
import PrintReportShell from './pages/PrintReportShell';
// App.tsx
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import PublicRoute from './components/PublicRoute';

import { StyleProvider } from './contexts/StyleContext';
import AppLoadingScreen from './components/AppLoadingScreen';
import PwaInstallOverlay from './components/PwaInstallOverlay';

// صفحات را Lazy می‌کنیم تا لود اولیه سبک شود
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const LoginPage = React.lazy(() => import('./pages/Login'));
const InstallApp = React.lazy(() => import('./pages/InstallApp'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

const Products = React.lazy(() => import('./pages/Products'));
const MobilePhones = React.lazy(() => import('./pages/MobilePhones'));

const SalesCartPage = React.lazy(() => import('./pages/SalesCartPage'));
const SalesHub = React.lazy(() => import('./pages/SalesHub'));

const InstallmentSalesPage = React.lazy(() => import('./pages/InstallmentSalesPage'));
const AddInstallmentSalePage = React.lazy(() => import('./pages/AddInstallmentSalePage'));
const InstallmentSaleDetailPage = React.lazy(() => import('./pages/InstallmentSaleDetailPage'));

const Customers = React.lazy(() => import('./pages/Customers'));
const CustomerDetailPage = React.lazy(() => import('./pages/CustomerDetail'));

const Partners = React.lazy(() => import('./pages/Partners'));
const PartnerDetail = React.lazy(() => import('./pages/PartnerDetail'));

const Repairs = React.lazy(() => import('./pages/Repairs'));
const AddRepair = React.lazy(() => import('./pages/AddRepair'));
const RepairDetail = React.lazy(() => import('./pages/RepairDetail'));
const RepairReceipt = React.lazy(() => import('./pages/RepairReceipt'));

const Services = React.lazy(() => import('./pages/Services'));

const Reports = React.lazy(() => import('./pages/Reports'));
const AnalyticsDashboard = React.lazy(() => import('./pages/reports/AnalyticsDashboard'));
const ProductProfitReal = React.lazy(() => import('./pages/reports/ProductProfitReal'));
const ExpensesPage = React.lazy(() => import('./pages/Expenses'));
const SalesReport = React.lazy(() => import('./pages/reports/SalesReport'));
const DebtorsReport = React.lazy(() => import('./pages/reports/DebtorsReport'));
const CreditorsReport = React.lazy(() => import('./pages/reports/CreditorsReport'));
const TopCustomersReport = React.lazy(() => import('./pages/reports/TopCustomersReport'));
const TopSuppliersReport = React.lazy(() => import('./pages/reports/TopSuppliersReport'));
const AnalysisHub = React.lazy(() => import('./pages/reports/AnalysisHub'));
const ProfitabilityReport = React.lazy(() => import('./pages/reports/ProfitabilityReport'));
const InventoryAnalysisReport = React.lazy(() => import('./pages/reports/InventoryAnalysisReport'));
const PurchaseSuggestionReport = React.lazy(() => import('./pages/reports/PurchaseSuggestionReport'));
const PhoneSalesReport = React.lazy(() => import('./pages/reports/PhoneSalesReport'));
const PhoneInstallmentSalesReport = React.lazy(() => import('./pages/reports/PhoneInstallmentSalesReport'));
const CompareSales = React.lazy(() => import('./pages/reports/CompareSales'));
const FinancialOverview = React.lazy(() => import('./pages/reports/FinancialOverview'));
const InstallmentsCalendar = React.lazy(() => import('./pages/reports/InstallmentsCalendar'));
const ProductSalesReport = React.lazy(() => import('./pages/reports/ProductSalesReport'));
const FollowupsReport = React.lazy(() => import('./pages/reports/FollowupsReport'));

const Invoices = React.lazy(() => import('./pages/Invoices'));
const InvoiceDetail = React.lazy(() => import('./pages/InvoiceDetail'));

const LabelPrint = React.lazy(() => import('./pages/tools/LabelPrint'));
const Purchases = React.lazy(() => import('./pages/Purchases'));
const StockCounts = React.lazy(() => import('./pages/StockCounts'));

const Settings = React.lazy(() => import('./pages/Settings'));
const Backups = React.lazy(() => import('./pages/settings/Backups'));
const StyleSettings = React.lazy(() => import('./pages/settings/StyleSettings'));

const NotFound = React.lazy(() => import('./pages/NotFound'));
const Forbidden = React.lazy(() => import('./pages/Forbidden'));
const NotificationsPage = React.lazy(() => import('./pages/Notifications'));
const OutboxPage = React.lazy(() => import('./pages/Outbox'));

// Phase 2: advanced report pages and audit log
const RfmReport = React.lazy(() => import('./pages/reports/RfmReport'));
const CohortReport = React.lazy(() => import('./pages/reports/CohortReport'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLog'));

const RouteFallback: React.FC = () => <AppLoadingScreen />;

const App: React.FC = () => {
  return (
    <StyleProvider>
      {/* 
        نمایش راهنمای نصب PWA روی موبایل.
        اگر مرورگر شرایط نصب را داشته باشد، دکمه نصب فعال می‌شود.
        برای iOS، راهنمای Add to Home Screen نمایش داده می‌شود.
      */}
      <PwaInstallOverlay />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        {/* Public (مثل لاگین) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/install" element={<InstallApp />} />
        </Route>

        {/* Protected (اپ اصلی) */}
        <Route element={<ProtectedRoute />}>
          {/* مسیرهای چاپ/PDF (بدون MainLayout) */}
          <Route path="/print" element={<PrintLayout />}>
            <Route path="reports/*" element={<PrintReportShell />} />
          </Route>

          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/403" element={<Forbidden />} />

            {/* کالا/فروش */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Warehouse','Salesperson','Technician','Marketer']} />}>
              <Route path="/products" element={<Products />} />
              <Route path="/mobile-phones" element={<MobilePhones />} />
            </Route>

            {/* فروش + فاکتور + اقساط */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Salesperson']} />}>
              <Route path="/sales" element={<SalesHub />} />
              <Route path="/sales/cash" element={<SalesCartPage />} />
              <Route path="/cart-sale" element={<SalesCartPage />} />
              <Route path="/installment-sales" element={<InstallmentSalesPage />} />
              <Route path="/installment-sales/new" element={<AddInstallmentSalePage />} />
              <Route path="/installment-sales/:id" element={<InstallmentSaleDetailPage />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:orderId" element={<InvoiceDetail />} />
            </Route>

            {/* مشتریان/همکاران */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Salesperson','Marketer']} />}>
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/partners/:id" element={<PartnerDetail />} />
            </Route>

            {/* تعمیرات/خدمات */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Technician']} />}>
              <Route path="/repairs" element={<Repairs />} />
              <Route path="/repairs/new" element={<AddRepair />} />
              <Route path="/repairs/:id" element={<RepairDetail />} />
              <Route path="/repairs/:id/receipt" element={<RepairReceipt />} />
              <Route path="/services" element={<Services />} />
            </Route>

            {/* ابزارها */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Warehouse']} />}>
              <Route path="/tools/labelprint" element={<LabelPrint />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/stock-counts" element={<StockCounts />} />
            </Route>

            {/* گزارش‌ها */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Salesperson','Marketer']} />}>
              <Route path="/expenses" element={<ExpensesPage />} />

              {/* Reports (premium layout wrapper) */}
              <Route path="/reports" element={<ReportsLayout />}>
                <Route index element={<Reports />} />
                <Route path="sales-summary" element={<SalesReport />} />
                <Route path="product-sales" element={<ProductSalesReport />} />
                <Route path="followups" element={<FollowupsReport />} />
                <Route path="debtors" element={<DebtorsReport />} />
                <Route path="creditors" element={<CreditorsReport />} />
                <Route path="top-customers" element={<TopCustomersReport />} />
                <Route path="top-suppliers" element={<TopSuppliersReport />} />
                <Route path="phone-sales" element={<PhoneSalesReport />} />
                <Route path="phone-installment-sales" element={<PhoneInstallmentSalesReport />} />
                <Route path="periodic-comparison" element={<CompareSales />} />
                <Route path="financial-overview" element={<FinancialOverview />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="product-profit-real" element={<ProductProfitReal />} />
                <Route path="installments-calendar" element={<InstallmentsCalendar />} />
                <Route path="rfm" element={<RfmReport />} />
                <Route path="cohort" element={<CohortReport />} />
                <Route path="inventory-turnover" element={<InventoryTurnoverReport />} />
                <Route path="dead-stock" element={<DeadStockReport />} />
                <Route path="abc" element={<AbcAnalysisReport />} />
                <Route path="aging-receivables" element={<AgingReceivablesReport />} />
                <Route path="cashflow" element={<CashflowReport />} />

                {/* analysis hub + children */}
                <Route path="analysis" element={<AnalysisHub />} />
                <Route path="analysis/profitability" element={<ProfitabilityReport />} />
                <Route path="analysis/inventory" element={<InventoryAnalysisReport />} />
                <Route path="analysis/suggestions" element={<PurchaseSuggestionReport />} />
              </Route>
            </Route>

            {/* Audit log */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager']} />}>
              <Route path="/audit-log" element={<AuditLogPage />} />
            </Route>

            {/* تنظیمات + نوتیفیکیشن‌ها */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/outbox" element={<OutboxPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/style" element={<StyleSettings />} /> {/* ← صفحه قلب استایل */}
            </Route>


            {/* 404 داخل لایهٔ اصلی */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        {/* اگر مسیر خارج از Protected خورد (نادر)، 404 ساده: */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </StyleProvider>
  );
};

export default App;
