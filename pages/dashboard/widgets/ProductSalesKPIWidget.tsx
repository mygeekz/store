import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../../components/ShamsiDatePicker';
import { apiFetch } from '../../../utils/apiFetch';
import type { DashboardWidgetProps } from '../types';
import KPIWidget from './KPIWidget';

type RangeMode = 'weekly' | 'monthly' | 'custom';

const toJ = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');

export default function ProductSalesKPIWidget({ ctx, container }: DashboardWidgetProps) {
  const [mode, setMode] = useState<RangeMode>('monthly');

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const computed = useMemo(() => {
    const now = moment().locale('fa');
    if (mode === 'weekly') {
      const f = now.clone().startOf('week'); // jalali-moment respects locale week settings
      const t = now.clone().endOf('week');
      return { fromJ: f.format('jYYYY/jMM/jDD'), toJ: t.format('jYYYY/jMM/jDD') };
    }
    if (mode === 'monthly') {
      return { fromJ: now.clone().startOf('jMonth').format('jYYYY/jMM/jDD'), toJ: now.clone().endOf('jMonth').format('jYYYY/jMM/jDD') };
    }
    // custom
    const fromJ = fromDate ? toJ(fromDate) : now.clone().startOf('jMonth').format('jYYYY/jMM/jDD');
    const toJv = toDate ? toJ(toDate) : now.clone().endOf('jMonth').format('jYYYY/jMM/jDD');
    return { fromJ, toJ: toJv };
  }, [mode, fromDate, toDate]);

  const subtitle = useMemo(() => {
    const map: Record<RangeMode, string> = { weekly: 'هفتگی', monthly: 'ماهانه', custom: 'بازه دلخواه' };
    return `${map[mode]} • ${computed.fromJ} تا ${computed.toJ}`;
  }, [mode, computed.fromJ, computed.toJ]);

  useEffect(() => {
    if (!ctx.token) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/reports/product-sales?from=${encodeURIComponent(computed.fromJ)}&to=${encodeURIComponent(computed.toJ)}`);
        const js = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && js?.success !== false) {
          const v = Number(js?.data?.total ?? 0);
          setTotal(Number.isFinite(v) ? v : 0);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.token, computed.fromJ, computed.toJ]);

  // Compact controls for range selection
  const controls = (
    <div className="mt-3 flex flex-col gap-2" dir="rtl" data-rgl-no-drag>
      <div className="flex gap-2">
        {(['weekly','monthly','custom'] as RangeMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMode(m); }}
            className={[
              'px-2.5 py-1 rounded-lg text-[11px] border transition',
              mode === m ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20 hover:bg-white/15'
            ].join(' ')}
          >
            {m === 'weekly' ? 'هفتگی' : m === 'monthly' ? 'ماهانه' : 'دلخواه'}
          </button>
        ))}
      </div>

      {mode === 'custom' ? (
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <ShamsiDatePicker selectedDate={fromDate} onChange={setFromDate} placeholder="از تاریخ" />
          </div>
          <div className="flex-1">
            <ShamsiDatePicker selectedDate={toDate} onChange={setToDate} placeholder="تا تاریخ" />
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <KPIWidget
          ctx={{ ...ctx, productSalesLoading: loading, productSalesTotal: total } as any}
          container={container}
          title="فروش محصولات (بدون گوشی)"
          accent="amber"
          icon="fa-solid fa-box-open"
          subtitle={loading ? 'در حال محاسبه…' : subtitle}
          hint="فقط اقلام inventory"
          detailsTo="/reports/product-sales"
          detailsLabel="مشاهده گزارش"
          getValue={(c) => c.formatPrice((c as any).productSalesTotal ?? total)}
        />
      </div>
      <div className="px-1">
        {controls}
      </div>
    </div>
  );
}
