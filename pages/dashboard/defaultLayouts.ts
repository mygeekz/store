import type { WidgetId, SizePreset } from './registry';

export type DashboardLayoutV2 = {
  version: 2;
  order: WidgetId[];
  sizes: Record<string, SizePreset>;
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutV2 = {
  version: 2,
  order: [
    'kpi_sales_month',
    'kpi_cash_sales_month',
    'kpi_installment_sales_month',
    'kpi_product_sales_month',
    'kpi_revenue_today',
    'asset',
    'installment_calendar',
    'sales_chart',
    'kpi_products_count',
    'kpi_customers_count',
    'action_center',
    'recent_activities',
  ],
  sizes: {
    // KPI tiles
    kpi_sales_month: 'tile',
    kpi_cash_sales_month: 'tile',
    kpi_installment_sales_month: 'tile',
    kpi_product_sales_month: 'tile',
    kpi_revenue_today: 'tile',
    kpi_products_count: 'tile',
    kpi_customers_count: 'tile',

    // Main cards
    asset: 'wide',
    installment_calendar: 'wide',
    sales_chart: 'hero',
    action_center: 'tall',
    recent_activities: 'wide',
  },
};
