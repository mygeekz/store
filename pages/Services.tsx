// src/pages/ServicesPage.tsx
import React, { useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { Service, NewServiceData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import PriceInput from '../components/PriceInput';
import TableToolbar from '../components/TableToolbar';
import ExportMenu from '../components/ExportMenu';
import ColumnPicker from '../components/ColumnPicker';
import { apiFetch } from '../utils/apiFetch';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useStyle } from '../contexts/StyleContext';

const columnHelper = createColumnHelper<Service>();

/* ---------- Small helpers ---------- */
const cleanNumber = (v: string | number | undefined) =>
  Number((v ?? '').toString().replaceAll(',', '').trim());

const formatPrice = (n: number) =>
  isFinite(n) && n > 0 ? n.toLocaleString('fa-IR') + ' تومان' : '—';

/* ---------- Editor (Redesigned) ---------- */
type ServiceEditorProps = {
  mode: 'add' | 'edit';
  value: Partial<NewServiceData & { id?: number }>;
  errors: Partial<Record<keyof NewServiceData, string>>;
  brand: string;
  submitting: boolean;
  onChange: (patch: Partial<NewServiceData>) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
};

const ServiceEditor: React.FC<ServiceEditorProps> = ({
  mode,
  value,
  errors,
  brand,
  submitting,
  onChange,
  onCancel,
  onSubmit,
}) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const pricePreview = formatPrice(cleanNumber(value.price || ''));

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
        const fake = new Event('submit', { bubbles: true, cancelable: true });
        // @ts-ignore
        e.currentTarget?.dispatchEvent?.(fake);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const inputBase =
    'w-full rounded-lg border bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0';
  const labelBase = 'text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-1';
  const helpBase = 'text-xs mt-1';
  const errCls = 'ring-red-400 border-red-500';
  const okRing = 'focus:ring-[color:var(--brand)]';
  const iconWrap =
    'inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200';

  return (
    <form onSubmit={onSubmit} className="space-y-5 min-w-0">
      {/* Title badge */}
      <div className="flex items-center gap-2 -mt-1">
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{ backgroundColor: brand + '1a', color: brand }}>
          <i className="fa-solid fa-wrench" />
          {mode === 'add' ? 'افزودن خدمت جدید' : 'ویرایش خدمت'}
        </span>
      </div>

      {/* Name */}
      <div className="min-w-0">
        <label className={labelBase}>
          <span className={iconWrap}><i className="fa-solid fa-signature" /></span>
          نام خدمت
          <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameRef}
          type="text"
          value={value.name || ''}
          onChange={e => onChange({ name: e.target.value })}
          className={`${inputBase} ${okRing} ${errors.name ? errCls : ''}`}
          placeholder="مثلاً: تعویض گلس، نصب برنامه، انتقال اطلاعات…"
        />
        <p className={`${helpBase} ${errors.name ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {errors.name ? errors.name : 'نامی واضح و کوتاه وارد کنید.'}
        </p>
      </div>

      {/* Description */}
      <div className="min-w-0">
        <label className={labelBase}>
          <span className={iconWrap}><i className="fa-solid fa-align-right" /></span>
          توضیحات (اختیاری)
        </label>
        <textarea
          rows={3}
          value={value.description || ''}
          onChange={e => onChange({ description: e.target.value })}
          className={`${inputBase} ${okRing}`}
          placeholder="شرح مختصر خدمت برای کاربر و فاکتور…"
          maxLength={400}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            می‌توانید تا ۴۰۰ کاراکتر توضیح اضافه کنید.
          </p>
          <span className="text-[11px] text-gray-400 mt-1">
            {(value.description?.length || 0)} / 400
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="min-w-0">
        <label className={labelBase}>
          <span className={iconWrap}><i className="fa-solid fa-tags" /></span>
          قیمت (تومان)
          <span className="text-red-500">*</span>
        </label>
        <PriceInput
          name="price"
          value={String(value.price || '')}
          onChange={(e: any) => onChange({ price: e.target.value })}
          className={`${inputBase} text-left ${okRing} ${errors.price ? errCls : ''}`}
          placeholder="مثلاً: ۲۵۰۰۰۰"
        />
        <div className="flex items-center justify-between">
          <p className={`${helpBase} ${errors.price ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {errors.price ? errors.price : 'قیمت باید عددی مثبت باشد.'}
          </p>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            پیش‌نمایش: <span style={{ color: brand }}>{pricePreview}</span>
          </span>
        </div>
      </div>

      {/* Sticky actions — بدون منفی‌مارجین تا اسکرول افقی ایجاد نشود */}
      <div className="sticky bottom-0 px-5 py-3 border-t dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-b-xl">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            انصراف (Esc)
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
            style={{ backgroundColor: brand }}
          >
            {submitting ? 'در حال ذخیره…' : 'ذخیره (Ctrl/⌘ + Enter)'}
          </button>
        </div>
      </div>
    </form>
  );
};

/* ---------- Page ---------- */
const ServicesPage: React.FC = () => {
  const { token, currentUser } = useAuth();
  const navigate = useNavigate();
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentService, setCurrentService] = useState<Partial<NewServiceData & { id?: number }>>({});
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewServiceData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<Service | null>(null);

  // filters
  const [query, setQuery] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('services.columns') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem('services.columns', JSON.stringify(columnVisibility)); } catch {}
  }, [columnVisibility]);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/services');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست خدمات');
      setServices(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchServices();
    else setIsLoading(false);
  }, [token]);

  const openModal = (mode: 'add' | 'edit', service: Service | null = null) => {
    setModalMode(mode);
    setFormErrors({});
    if (mode === 'edit' && service) {
      setCurrentService({ id: service.id, name: service.name, description: service.description || '', price: String(service.price) });
    } else {
      setCurrentService({ name: '', description: '', price: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentService({});
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewServiceData, string>> = {};
    if (!currentService.name?.trim()) errors.name = 'نام خدمت الزامی است.';
    const priceNum = cleanNumber(currentService.price);
    if (isNaN(priceNum) || priceNum <= 0) errors.price = 'قیمت باید عددی مثبت باشد.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setNotification(null);

    const url = modalMode === 'add' ? '/api/services' : `/api/services/${currentService.id}`;
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    const payload = {
      name: currentService.name || '',
      description: currentService.description || '',
      price: cleanNumber(currentService.price),
    };

    try {
      const response = await apiFetch(url, { method, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ذخیره');

      setNotification({ type: 'success', text: result.message || 'با موفقیت ذخیره شد.' });
      closeModal();
      fetchServices();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Sell
  const handleQuickSell = (svc: Service) => {
    const sellable = {
      id: svc.id,
      type: 'service' as const,
      name: svc.name,
      price: Number(svc.price) || 0,
      stock: Infinity,
    };
    navigate('/sales', { state: { prefillItem: sellable } });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        String(s.price).includes(q)
    );
  }, [services, query]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'نام خدمت',
        cell: info => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('description', {
        header: 'توضیحات',
        cell: info => info.getValue() || '—',
      }),
      columnHelper.accessor('price', {
        header: 'قیمت',
        cell: info => <span className="whitespace-nowrap">{formatPrice(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: 'quick',
        header: 'فروش سریع',
        cell: ({ row }) => (
          <button
            onClick={() => handleQuickSell(row.original)}
            className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
            title="افزودن به سبد خرید"
          >
            <i className="fas fa-shopping-cart" />
          </button>
        ),
      }),
      ...(currentUser?.roleName === 'Admin'
        ? [
            columnHelper.display({
              id: 'actions',
              header: 'عملیات',
              cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => openModal('edit', row.original)}
                    className="p-1.5 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    title="ویرایش"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    onClick={() => setItemToDelete(row.original)}
                    className="p-1.5 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
                    title="حذف"
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ),
            }),
          ]
        : []),
    ],
    [currentUser]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const exportBase = `services-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filtered.map((s) => ({
    name: s.name,
    price: s.price ?? 0,
    description: s.description ?? '',
    createdAt: (s as any)?.createdAt ?? '',
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportBase}.xlsx`,
      exportRows,
      [
        { header: 'نام خدمت', key: 'name' },
        { header: 'قیمت', key: 'price' },
        { header: 'توضیحات', key: 'description' },
        { header: 'تاریخ', key: 'createdAt' },
      ],
      'Services',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportBase}.pdf`,
      title: 'لیست خدمات',
      head: ['نام خدمت', 'قیمت', 'توضیحات'],
      body: exportRows.map((r) => [
        String(r.name ?? ''),
        String(Number(r.price ?? 0).toLocaleString('fa-IR')),
        String(r.description ?? ''),
      ]),
    });
  };

  return (
    // در اندازه‌های کوچک، از حداکثر عرض مناسب و حاشیه‌های افقی برای بدنه‌ی صفحه استفاده می‌کنیم تا صفحه واکنش‌گرا شود
    <div className="space-y-6 text-right max-w-7xl mx-auto px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="app-card p-4 md:p-6">
        <TableToolbar
          title="مدیریت خدمات"
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="جستجو در نام/توضیحات…"
          actions={
            <>
              <ExportMenu
                className="whitespace-nowrap"
                items={[
                  { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filtered.length === 0 },
                  { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filtered.length === 0 },
                ]}
              />
              <ColumnPicker table={table} storageKey="services.columns" />
              {currentUser?.roleName === 'Admin' && (
                <button
                  type="button"
                  onClick={() => openModal('add')}
                  className="h-10 px-4 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-700 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="fa-solid fa-plus" />
                  افزودن خدمت
                </button>
              )}
            </>
          }
        />

        {isLoading ? (
          <div className="p-6"><Skeleton className="h-28 w-full" rounded="xl" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState title="خدمتی یافت نشد" description="جستجو را تغییر دهید یا یک خدمت جدید اضافه کنید." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(h => (
                      <th key={h.id} className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {table.getRowModel().rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {r.getVisibleCells().map(c => (
                      <td key={c.id} className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redesigned Modal */}
      {isModalOpen && (
        <Modal
          title={modalMode === 'add' ? 'افزودن خدمت' : 'ویرایش خدمت'}
          onClose={closeModal}
          widthClass="max-w-2xl"
        >
          <ServiceEditor
            mode={modalMode}
            value={currentService}
            errors={formErrors}
            brand={brand}
            submitting={isSubmitting}
            onChange={patch => setCurrentService(prev => ({ ...prev, ...patch }))}
            onCancel={closeModal}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}

      {/* Delete Modal */}
      {itemToDelete && (
        <Modal title={`تایید حذف "${itemToDelete.name}"`} onClose={() => setItemToDelete(null)}>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            آیا از حذف این خدمت مطمئن هستید؟ این عمل قابل بازگشت نیست.
          </p>
          <div className="flex justify-end gap-3 pt-3">
            <button onClick={() => setItemToDelete(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">
              انصراف
            </button>
            <button
              onClick={async () => {
                try {
                  setIsSubmitting(true);
                  const res = await apiFetch(`/api/services/${itemToDelete.id}`, { method: 'DELETE' });
                  const json = await res.json();
                  if (!res.ok || !json.success) throw new Error(json.message);
                  setNotification({ type: 'success', text: json.message || 'حذف شد.' });
                  setItemToDelete(null);
                  fetchServices();
                } catch (e: any) {
                  setNotification({ type: 'error', text: e.message });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-60"
              style={{ backgroundColor: 'hsl(0 80% 50%)' }}
            >
              {isSubmitting ? 'در حال حذف…' : 'تایید و حذف'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ServicesPage;
