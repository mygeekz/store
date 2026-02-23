import jsPDF from 'jspdf';
import 'jspdf-autotable';
import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import Notification from '../components/Notification';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import TableToolbar from '../components/TableToolbar';
import { useAuth } from '../contexts/AuthContext';
import type { NotificationMessage } from '../types';

type RecurringExpense = {
  id: number;
  title: string;
  category: 'rent'|'salary'|'inventory'|'overhead';
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  dayOfMonth: number;
  nextRunDate: string; // YYYY-MM-DD
  isActive: number;
  createdByUsername?: string | null;
};

type Expense = {
  id: number;
  expenseDate: string;
  category: 'rent'|'salary'|'inventory'|'overhead';
  title: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  createdByUsername?: string | null;
};

const categoryLabel = (c: Expense['category']) =>
  c === 'rent' ? 'اجاره' : c === 'salary' ? 'حقوق' : c === 'inventory' ? 'خرید کالا' : 'هزینه‌های جانبی';

export default function ExpensesPage() {
  const { token } = useAuth();

  const [fromDate, setFromDate] = useState<Date | null>(moment().startOf('month').toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().endOf('month').toDate());
  const [category, setCategory] = useState<'all'|Expense['category']>('all');

  
  const [query, setQuery] = useState('');

  const [items, setItems] = useState<Expense[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [isRecurringLoading, setIsRecurringLoading] = useState(false);
  const [editRecId, setEditRecId] = useState<number | null>(null);
  const [editRecForm, setEditRecForm] = useState<any>(null);


  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<{ expenseDate: Date | null; category: Expense['category']; title: string; amount: string; vendor: string; notes: string }>({
    expenseDate: new Date(),
    category: 'overhead',
    title: '',
    amount: '',
    vendor: '',
    notes: '',
  });

  
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => {
      const hay = [x.title, x.vendor, x.notes, categoryLabel(x.category), String(x.amount ?? ''), x.createdByUsername].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);



  const total = useMemo(() => items.reduce((s, x) => s + Number(x.amount || 0), 0), [items]);

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const qs = new URLSearchParams();
      if (fromDate) qs.set('from', moment(fromDate).startOf('day').toDate().toISOString());
      if (toDate) qs.set('to', moment(toDate).endOf('day').toDate().toISOString());
      qs.set('category', category);

      const res = await fetch(`/api/expenses?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت هزینه‌ها');
      setItems(js.data || []);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };


  const fetchRecurring = async () => {
    if (!token) return;
    setIsRecurringLoading(true);
    try {
      const res = await fetch('/api/recurring-expenses', { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت هزینه‌های تکرارشونده');
      setRecurring(js.data || []);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    } finally {
      setIsRecurringLoading(false);
    }
  };


  useEffect(() => { fetchData(); fetchRecurring(); /* eslint-disable-next-line */ }, [token]);

  
  const addRecurringExpense = async () => {
    if (!token) return;
    const title = recForm.title.trim();
    const amount = Number(recForm.amount);
    const dayOfMonth = Math.floor(Number(recForm.dayOfMonth));
    if (!title) return setNotification({ message: 'عنوان هزینه تکرارشونده را وارد کنید.', type: 'error' });
    if (!Number.isFinite(amount) || amount <= 0) return setNotification({ message: 'مبلغ نامعتبر است.', type: 'error' });
    if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) return setNotification({ message: 'روز ماه نامعتبر است.', type: 'error' });
    if (!recForm.nextRunDate) return setNotification({ message: 'تاریخ شروع را انتخاب کنید.', type: 'error' });

    try {
      const payload = {
        title,
        category: recForm.category,
        amount,
        vendor: recForm.vendor.trim() || null,
        notes: recForm.notes.trim() || null,
        dayOfMonth,
        nextRunDate: moment(recForm.nextRunDate).format('YYYY-MM-DD'),
        isActive: recForm.isActive,
      };
      const res = await fetch('/api/recurring-expenses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت هزینه تکرارشونده');
      setNotification({ message: 'هزینه تکرارشونده ثبت شد.', type: 'success' });
      setRecForm({ title: '', category: 'rent', amount: '', vendor: '', notes: '', dayOfMonth: '1', nextRunDate: moment().startOf('day').toDate(), isActive: true });
      fetchRecurring();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

  const runRecurring = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/recurring-expenses/${id}/run`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت هزینه این ماه');
      setNotification({ message: 'هزینه این ماه ثبت شد.', type: 'success' });
      fetchData();
      fetchRecurring();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

  const toggleRecurringActive = async (row: RecurringExpense) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/recurring-expenses/${row.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: Number(row.isActive) !== 1 }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تغییر وضعیت');
      setRecurring((prev) => prev.map((x) => (x.id === row.id ? js.data : x)));
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

  
  const startEditRecurring = (row: RecurringExpense) => {
    setEditRecId(row.id);
    setEditRecForm({
      title: row.title,
      category: row.category,
      amount: String(row.amount ?? ''),
      vendor: row.vendor ?? '',
      notes: row.notes ?? '',
      dayOfMonth: String(row.dayOfMonth ?? 1),
      nextRunDate: row.nextRunDate,
    });
  };

  const cancelEditRecurring = () => {
    setEditRecId(null);
    setEditRecForm(null);
  };

  const saveRecurringEdit = async (id: number) => {
    if (!token) return;
    try {
      const payload: any = {
        title: String(editRecForm?.title || '').trim(),
        category: editRecForm?.category,
        amount: Number(editRecForm?.amount),
        vendor: String(editRecForm?.vendor || '').trim() || null,
        notes: String(editRecForm?.notes || '').trim() || null,
        dayOfMonth: Math.floor(Number(editRecForm?.dayOfMonth)),
        nextRunDate: String(editRecForm?.nextRunDate || '').trim(),
      };
      if (!payload.title) throw new Error('عنوان خالی است.');
      if (!Number.isFinite(payload.amount) || payload.amount <= 0) throw new Error('مبلغ نامعتبر است.');
      if (!payload.dayOfMonth || payload.dayOfMonth < 1 || payload.dayOfMonth > 31) throw new Error('روز ماه نامعتبر است.');
      if (!payload.nextRunDate) throw new Error('سررسید بعدی خالی است.');

      const res = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ذخیره');
      setRecurring((prev) => prev.map((x) => (x.id === id ? js.data : x)));
      setNotification({ message: 'ذخیره شد.', type: 'success' });
      cancelEditRecurring();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const deleteRecurring = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/recurring-expenses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در حذف');
      setRecurring((prev) => prev.filter((x) => x.id !== id));
      setNotification({ message: 'حذف شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

const addExpense = async () => {
    if (!token) return;
    const title = form.title.trim();
    const amount = Number(form.amount);
    if (!title) return setNotification({ message: 'عنوان هزینه را وارد کنید.', type: 'error' });
    if (!Number.isFinite(amount) || amount <= 0) return setNotification({ message: 'مبلغ هزینه نامعتبر است.', type: 'error' });
    if (!form.expenseDate) return setNotification({ message: 'تاریخ هزینه را انتخاب کنید.', type: 'error' });

    try {
      const payload = {
        expenseDate: moment(form.expenseDate).endOf('day').toDate().toISOString(),
        category: form.category,
        title,
        amount,
        vendor: form.vendor.trim() || null,
        notes: form.notes.trim() || null,
      };
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت هزینه');
      setNotification({ message: 'هزینه ثبت شد.', type: 'success' });
      setForm({ expenseDate: new Date(), category: 'overhead', title: '', amount: '', vendor: '', notes: '' });
      fetchData();
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };

  const deleteExpense = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در حذف هزینه');
      setItems((prev) => prev.filter((x) => x.id !== id));
      setNotification({ message: 'حذف شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا', type: 'error' });
    }
  };


  const exportExcel = async () => {
    if (!token) return;
    const qs = new URLSearchParams();
    if (fromDate) qs.set('from', moment(fromDate).startOf('day').toDate().toISOString());
    if (toDate) qs.set('to', moment(toDate).endOf('day').toDate().toISOString());
    if (categoryFilter) qs.set('category', categoryFilter);
    const res = await fetch(`/api/exports/expenses.xlsx?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('خطا در دریافت فایل اکسل');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expenses_${moment().format('YYYY-MM-DD')}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const exportPdf = () => {
    const doc = new (jsPDF as any)({ orientation: 'landscape' });
    // @ts-ignore
    doc.text('گزارش هزینه‌ها', 10, 10);
    const body = filteredExpenses.map((r: any) => ([
      r.date, r.title, r.category, String(r.amount||0), r.description || ''
    ]));
    // @ts-ignore
    doc.autoTable({
      head: [['تاریخ','عنوان','دسته‌بندی','مبلغ','توضیحات']],
      body,
      startY: 16,
      styles: { fontSize: 8 },
    });
    doc.save(`expenses_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">ثبت هزینه‌ها</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">اجاره، حقوق، خرید کالا، هزینه‌های جانبی</div>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            جمع دوره: {total.toLocaleString('fa-IR')}
          </div>
        </div>

        {activeTab === 'list' ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
          <ShamsiDatePicker
            selectedDate={fromDate}
            onDateChange={setFromDate}
            placeholder="از تاریخ"
            inputClassName="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          />
          <ShamsiDatePicker
            selectedDate={toDate}
            onDateChange={setToDate}
            placeholder="تا تاریخ"
            inputClassName="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          >
            <option value="all">همه</option>
            <option value="rent">اجاره</option>
            <option value="salary">حقوق</option>
            <option value="inventory">خرید کالا</option>
            <option value="overhead">هزینه‌های جانبی</option>
          </select>

          <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm">
            اعمال فیلتر
          </button>

          <div className="md:col-span-3 text-xs text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-circle-info ml-1" />
            مبلغ به صورت عدد صحیح ذخیره می‌شود. (مطابق بقیه بخش‌های مالی سیستم)
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border bg-white/60 p-3 text-sm text-gray-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-gray-200">
          <div className="flex items-start gap-2">
            <i className="fa-solid fa-circle-info mt-0.5 text-emerald-600" />
            <div>
              <div className="font-semibold">هزینه‌های تکرارشونده</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">برای اجاره/حقوق ماهانه و هزینه‌های ثابت. سیستم هنگام سررسید در «نوتیفیکیشن‌ها» هشدار می‌دهد و شما با یک کلیک «ثبت هزینه این ماه» را انجام می‌دهید.</div>
            </div>
          </div>
        </div>
      )}
      </div>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      {activeTab === 'list' ? (
      <>

      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <i className="fa-solid fa-plus text-emerald-600" />
          افزودن هزینه
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
          <ShamsiDatePicker
            selectedDate={form.expenseDate}
            onDateChange={(d) => setForm((p) => ({ ...p, expenseDate: d }))}
            placeholder="تاریخ هزینه"
            inputClassName="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          />

          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as any }))}
            className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
          >
            <option value="rent">اجاره</option>
            <option value="salary">حقوق</option>
            <option value="inventory">خرید کالا</option>
            <option value="overhead">هزینه‌های جانبی</option>
          </select>

          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="md:col-span-2 px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            placeholder="عنوان (مثلاً اجاره بهمن)"
          />

          <input
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            placeholder="مبلغ"
          />

          <button onClick={addExpense} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
            ثبت
          </button>
        </div>

        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={form.vendor}
            onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
            className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            placeholder="طرف حساب / فروشنده (اختیاری)"
          />
          <input
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            placeholder="یادداشت (اختیاری)"
          />
        </div>
      </div>

      <TableToolbar
        title="هزینه‌ها"
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="جستجو در عنوان/طرف حساب/یادداشت…"
      />

      <div className="app-card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><Skeleton className="h-24 w-full" rounded="xl" /></div>
        ) : visibleItems.length === 0 ? (
          <div className="p-6"><EmptyState title="هزینه‌ای ثبت نشده است" description="با ثبت اولین هزینه، این بخش پر می‌شود." /></div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">دسته</th>
                  <th className="p-3">عنوان</th>
                  <th className="p-3">مبلغ</th>
                  <th className="p-3">ثبت‌کننده</th>
                  <th className="p-3">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((x) => (
                  <tr key={x.id} className="border-t border-gray-100 dark:border-slate-800">
                    <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-200">{moment(x.expenseDate).locale('fa').format('jYYYY/jMM/jDD')}</td>
                    <td className="p-3 whitespace-nowrap">{categoryLabel(x.category)}</td>
                    <td className="p-3">{x.title}{x.vendor ? <div className="text-xs text-gray-500 dark:text-gray-400">{x.vendor}</div> : null}</td>
                    <td className="p-3 whitespace-nowrap font-semibold">{Number(x.amount||0).toLocaleString('fa-IR')}</td>
                    <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-200">{x.createdByUsername || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      <button onClick={() => deleteExpense(x.id)} className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white">
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    
      
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <i className="fa-solid fa-arrows-rotate text-emerald-600" />
              مدیریت هزینه‌های تکرارشونده
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              سررسیدها در صفحه نوتیفیکیشن‌ها هشدار می‌شوند.
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
            <input
              value={recForm.title}
              onChange={(e) => setRecForm((p) => ({ ...p, title: e.target.value }))}
              className="md:col-span-2 px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              placeholder="عنوان (مثلاً اجاره ماهانه)"
            />

            <select
              value={recForm.category}
              onChange={(e) => setRecForm((p) => ({ ...p, category: e.target.value as any }))}
              className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            >
              <option value="rent">اجاره</option>
              <option value="salary">حقوق</option>
              <option value="inventory">خرید کالا</option>
              <option value="overhead">هزینه‌های جانبی</option>
            </select>

            <input
              value={recForm.amount}
              onChange={(e) => setRecForm((p) => ({ ...p, amount: e.target.value }))}
              className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              placeholder="مبلغ"
            />

            <input
              value={recForm.dayOfMonth}
              onChange={(e) => setRecForm((p) => ({ ...p, dayOfMonth: e.target.value }))}
              className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              placeholder="روز ماه (۱-۳۱)"
            />

            <ShamsiDatePicker
              selectedDate={recForm.nextRunDate}
              onDateChange={(d) => setRecForm((p) => ({ ...p, nextRunDate: d }))}
              placeholder="شروع (سررسید بعدی)"
              inputClassName="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            />

            <button onClick={addRecurringExpense} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
              افزودن
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={recForm.vendor}
              onChange={(e) => setRecForm((p) => ({ ...p, vendor: e.target.value }))}
              className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              placeholder="طرف حساب (اختیاری)"
            />
            <input
              value={recForm.notes}
              onChange={(e) => setRecForm((p) => ({ ...p, notes: e.target.value }))}
              className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              placeholder="یادداشت (اختیاری)"
            />
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={recForm.isActive} onChange={(e) => setRecForm((p) => ({ ...p, isActive: e.target.checked }))} />
            فعال باشد
          </div>
        </div>

        <TableToolbar
        title="هزینه‌ها"
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="جستجو در عنوان/طرف حساب/یادداشت…"
      />

      <div className="app-card overflow-hidden">
          {isRecurringLoading ? (
            <div className="p-6"><Skeleton className="h-24 w-full" rounded="xl" /></div>
          ) : recurring.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">هزینه تکرارشونده‌ای ثبت نشده است.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/70">
                  <tr className="text-right">
                    <th className="p-3">عنوان</th>
                    <th className="p-3">دسته</th>
                    <th className="p-3">مبلغ</th>
                    <th className="p-3">روز ماه</th>
                    <th className="p-3">سررسید بعدی</th>
                    <th className="p-3">وضعیت</th>
                    <th className="p-3">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {recurring.map((r) => {
                    const today = moment().format('YYYY-MM-DD');
                    const overdue = r.nextRunDate < today && Number(r.isActive) === 1;
                    return (
                      <tr key={r.id} className={`border-t border-gray-100 dark:border-slate-800 ${overdue ? 'bg-rose-50 dark:bg-rose-900/10' : ''}`}>
                        <td className="p-3">
                          {editRecId === r.id ? (
                          <input
                            value={editRecForm?.title || ''}
                            onChange={(e) => setEditRecForm((p: any) => ({ ...p, title: e.target.value }))}
                            className="w-full px-2 py-1 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
                          />
                        ) : (
                          <div className="font-semibold">{r.title}</div>
                        )}
                          {r.vendor ? <div className="text-xs text-gray-500 dark:text-gray-400">{r.vendor}</div> : null}
                        </td>
                        <td className="p-3 whitespace-nowrap">{editRecId === r.id ? (
                          <select
                            value={editRecForm?.category || r.category}
                            onChange={(e) => setEditRecForm((p: any) => ({ ...p, category: e.target.value }))}
                            className="px-2 py-1 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
                          >
                            <option value="rent">اجاره</option>
                            <option value="salary">حقوق</option>
                            <option value="inventory">خرید کالا</option>
                            <option value="overhead">هزینه‌های جانبی</option>
                          </select>
                        ) : (
                          categoryLabel(r.category as any)
                        )}</td>
                        <td className="p-3 whitespace-nowrap font-semibold">{editRecId === r.id ? (
                          <input
                            value={editRecForm?.amount || ''}
                            onChange={(e) => setEditRecForm((p: any) => ({ ...p, amount: e.target.value }))}
                            className="w-28 px-2 py-1 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
                          />
                        ) : (
                          Number(r.amount||0).toLocaleString('fa-IR')
                        )}</td>
                        <td className="p-3 whitespace-nowrap">{editRecId === r.id ? (
                          <input
                            value={editRecForm?.dayOfMonth || ''}
                            onChange={(e) => setEditRecForm((p: any) => ({ ...p, dayOfMonth: e.target.value }))}
                            className="w-20 px-2 py-1 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
                          />
                        ) : (
                          Number(r.dayOfMonth).toLocaleString('fa-IR')
                        )}</td>
                        <td className="p-3 whitespace-nowrap">{editRecId === r.id ? (
                          <input
                            value={editRecForm?.nextRunDate || r.nextRunDate}
                            onChange={(e) => setEditRecForm((p: any) => ({ ...p, nextRunDate: e.target.value }))}
                            className="w-32 px-2 py-1 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
                            placeholder="YYYY-MM-DD"
                          />
                        ) : (
                          r.nextRunDate
                        )}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-1 rounded-full ${Number(r.isActive) === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300'}`}>
                            {Number(r.isActive) === 1 ? 'فعال' : 'غیرفعال'}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => runRecurring(r.id)} className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white">
                              ثبت این ماه
                            </button>
                            <button
                              onClick={() => (editRecId === r.id ? cancelEditRecurring() : startEditRecurring(r))}
                              className="text-xs px-3 py-1.5 rounded-lg border bg-white/60 dark:bg-slate-900/40 dark:border-slate-700 hover:bg-white"
                            >
                              {editRecId === r.id ? 'لغو' : 'ویرایش'}
                            </button>
                            {editRecId === r.id ? (
                              <button
                                onClick={() => saveRecurringEdit(r.id)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                ذخیره
                              </button>
                            ) : null}

                            <button onClick={() => toggleRecurringActive(r)} className="text-xs px-3 py-1.5 rounded-lg border bg-white/60 dark:bg-slate-900/40 dark:border-slate-700 hover:bg-white">
                              {Number(r.isActive) === 1 ? 'غیرفعال' : 'فعال'}
                            </button>
                            <button onClick={() => deleteRecurring(r.id)} className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white">
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </>
      ) : null}
</div>
  );
}
