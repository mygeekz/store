import React from 'react';
import type { CartItem, CartAction } from '../types';
import PriceInput from './PriceInput';
import { parseToman, formatToman } from '../utils/money';

interface CartTableProps {
  items: CartItem[];
  dispatch: React.Dispatch<CartAction>;
}

const CartTable: React.FC<CartTableProps> = ({ items, dispatch }) => {
  if (items.length === 0) {
    return <div className="text-center p-4 text-gray-500">سبد خرید خالی است.</div>;
  }

  const handleQuantityChange = (cartItemId: string, quantityStr: string) => {
    const q = parseInt(quantityStr, 10);
    if (Number.isFinite(q) && q > 0) {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { cartItemId, quantity: q } });
    }
  };

  // تخفیف ردیف = عدد ثابت برای کل ردیف (کپ تا سقف جمع ردیف)
  const handleDiscountChange = (cartItemId: string, discountStr: string, item: CartItem) => {
    const lineSubtotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
    const raw = parseToman(discountStr);
    const capped = Math.max(0, Math.min(raw, lineSubtotal));
    dispatch({ type: 'UPDATE_ITEM_DISCOUNT', payload: { cartItemId, discount: capped } });
  };

  const handleRemoveItem = (cartItemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { cartItemId } });
  };

  return (
    <div className="overflow-x-auto">
      {/* Desktop: Table */}
      <table className="hidden md:table w-full text-sm text-right">
        <thead className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200 sticky top-0 z-10">
          <tr>
            <th className="p-2 font-semibold">کالا</th>
            <th className="p-2 font-semibold">تعداد</th>
            <th className="p-2 font-semibold">قیمت واحد</th>
            <th className="p-2 font-semibold">تخفیف ردیف (تومان)</th>
            <th className="p-2 font-semibold">جمع ردیف</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item) => {
            const qty = Number(item.quantity) || 0;
            const unit = Number(item.unitPrice) || 0;
            const lineSubtotal = qty * unit;
            const rowDiscount = Math.max(0, Math.min(Number(item.discountPerItem) || 0, lineSubtotal));
            const lineNet = Math.max(0, lineSubtotal - rowDiscount);

            return (
              <tr key={item.cartItemId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-2 font-medium text-gray-800 dark:text-gray-200">{item.name}</td>

                <td className="p-2 w-24">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.cartItemId, e.target.value)}
                    className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-center bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500"
                    min={1}
                    max={Number.isFinite(item.stock as number) ? (item.stock as number) : undefined}
                  />
                </td>

                <td className="p-2 whitespace-nowrap text-gray-800 dark:text-gray-200">
                  {formatToman(unit)}
                </td>

                <td className="p-2 w-36">
                  <PriceInput
                    value={rowDiscount}
                    onChange={(e) => handleDiscountChange(item.cartItemId, e.target.value, item)}
                    className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </td>

                <td className="p-2 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200">
                  {formatToman(lineNet)}
                </td>

                <td className="p-2 text-center">
                  <button
                    onClick={() => handleRemoveItem(item.cartItemId)}
                    className="px-2 py-1.5 rounded-md text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    title="حذف"
                  >
                    <i className="fas fa-times-circle" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3 p-1">
        {items.map((item) => {
          const qty = Number(item.quantity) || 0;
          const unit = Number(item.unitPrice) || 0;
          const lineSubtotal = qty * unit;
          const rowDiscount = Math.max(0, Math.min(Number(item.discountPerItem) || 0, lineSubtotal));
          const lineNet = Math.max(0, lineSubtotal - rowDiscount);

          return (
            <div key={item.cartItemId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight flex-1">{item.name}</div>
                <button
                  onClick={() => handleRemoveItem(item.cartItemId)}
                  className="w-8 h-8 rounded-lg text-rose-600 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20"
                >
                  <i className="fas fa-trash-alt text-xs" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">تعداد:</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.cartItemId, e.target.value)}
                    className="w-full p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-center bg-gray-50 dark:bg-gray-900 text-sm"
                    min={1}
                    max={Number.isFinite(item.stock as number) ? (item.stock as number) : undefined}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">تخفیف (ت):</label>
                  <PriceInput
                    value={rowDiscount}
                    onChange={(e) => handleDiscountChange(item.cartItemId, e.target.value, item)}
                    className="w-full p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-left bg-gray-50 dark:bg-gray-900 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                <div className="text-[11px] text-gray-500">قیمت واحد: {formatToman(unit)}</div>
                <div className="text-sm font-black text-primary">{formatToman(lineNet)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CartTable;
