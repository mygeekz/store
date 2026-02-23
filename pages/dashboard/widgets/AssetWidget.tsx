import React from 'react';
import type { DashboardWidgetProps } from '../types';

export default function AssetWidget({ ctx, container }: DashboardWidgetProps) {
  const compact = container.width > 0 && container.width < 360;

  const titleSize = compact ? 'text-xs' : 'text-sm/6';
  const valueSize = compact ? 'text-xl' : 'text-3xl';
  const iconSize = compact ? 'text-lg' : 'text-2xl';
  const pad = compact ? 'p-4' : 'p-6';

  return (
    <div className={`relative overflow-hidden rounded-2xl ${pad} bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg animate-gradient h-full`}>
      <div
        className="pointer-events-none absolute -inset-2 opacity-50 animate-shine"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.25) 50%, rgba(255,255,255,0) 100%)',
          transform: 'skewX(-20deg)',
        }}
      />
      <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-white/10" />

      <div className="relative flex items-center justify-between h-full">
        <div className="min-w-0">
          <div className={`${titleSize} opacity-90 mb-1`}>دارایی (کالاهای موجود)</div>

          <div className={`${valueSize} font-extrabold tracking-tight truncate`}>
            {ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetValue)}
          </div>

          <div className="mt-2 text-[11px] opacity-95 space-x-2 space-x-reverse">
            <span>گوشی: {ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetBreakdown.phonesValue)}</span>
            <span className="mx-2">•</span>
            <span>محصولات: {ctx.assetLoading ? '—' : ctx.formatPrice(ctx.assetBreakdown.productsValue)}</span>
          </div>

          <div className="mt-1 text-[11px] opacity-90">
            مجموع اقلام: {ctx.assetLoading ? '—' : ctx.formatNumber(ctx.assetBreakdown.itemsCount)}
          </div>
        </div>

        <div className={`flex-shrink-0 ${compact ? 'w-11 h-11' : 'w-14 h-14'} rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur`}>
          <i className={`fa-solid fa-vault ${iconSize}`} />
        </div>
      </div>
    </div>
  );
}
