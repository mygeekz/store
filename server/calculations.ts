/*
 * Helper functions for unified calculation of sales orders and installments.
 *
 * The project previously duplicated logic for computing subtotals, discounts and taxes
 * directly inside the createSalesOrder function. To make the code easier to test and
 * maintain we extract these calculations into their own module. In the future the
 * same helpers can be reused by invoice generation or dashboard analytics.
 */

export interface CartLine {
  quantity: number;
  unitPrice: number;
  discountPerItem?: number;
}

export interface SalesSummary {
  subtotal: number;
  itemsDiscount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
}

/**
 * Compute the financial summary for a sales order.
 *
 * @param lines   The array of cart items; each item must define quantity and unitPrice. An optional per‑item discount may be supplied.
 * @param globalDiscount The global discount applied on the subtotal (before tax), e.g. 5000 means 5,000 toman discount. Use 0 for none.
 * @param taxPercentage  The tax rate in percent, e.g. 9 for a 9% VAT. Use 0 for none.
 * @returns An object containing subtotal, itemsDiscount, taxableAmount, taxAmount and grandTotal.
 */
export function calculateSalesSummary(
  lines: CartLine[],
  globalDiscount: number = 0,
  taxPercentage: number = 0
): SalesSummary {
  // Compute subtotal (sum of quantity * unitPrice)
  const subtotal = lines.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  // Sum of discounts applied to individual items
  const itemsDiscount = lines.reduce((sum, line) => {
    const d = Number(line.discountPerItem) || 0;
    return sum + d;
  }, 0);

  const totalDiscount = (Number(globalDiscount) || 0) + itemsDiscount;

  // Taxable base cannot go negative
  const taxableBase = Math.max(0, subtotal - totalDiscount);

  // Compute tax amount from percentage
  const taxAmount = taxableBase > 0 ? (taxableBase * (Number(taxPercentage) || 0)) / 100 : 0;

  const grandTotal = taxableBase + taxAmount;

  return {
    subtotal,
    itemsDiscount,
    taxableAmount: taxableBase,
    taxAmount,
    grandTotal,
  };
}

/**
 * Calculate the total price and remaining debt for an installment sale.
 *
 * In the current data model an installment sale sells exactly one phone and the
 * `actualSalePrice`, `downPayment`, `numberOfInstallments` and `installmentAmount` fields
 * are provided. The total price is the sum of the down payment and all future
 * instalment amounts. The remaining debt at the time of sale is simply the total
 * price minus the down payment. This helper is separated to make the logic
 * explicit and testable.
 */
export function calculateInstallmentTotals(
  actualSalePrice: number,
  downPayment: number,
  numberOfInstallments: number,
  installmentAmount: number
): { totalPrice: number; debt: number } {
  const totalPrice = (Number(numberOfInstallments) || 0) * (Number(installmentAmount) || 0) + (Number(downPayment) || 0);
  const debt = Math.max(0, totalPrice - (Number(downPayment) || 0));
  return { totalPrice, debt };
}

/**
 * Global-discount calculation: ignore any per-item discount fields and apply
 * a single discount number across the whole cart.
 */
export function calcTotalsGlobalDiscount(
  lines: { quantity: number; unitPrice: number }[],
  discountTotal: number,
  taxRate: number = 0
): { subtotal: number; discount: number; tax: number; payable: number } {
  const subtotal = (lines || []).reduce((s, l) => s + (Number(l.unitPrice) || 0) * (Number(l.quantity) || 0), 0);
  const cleanDiscount = Math.max(0, Math.min(Number(discountTotal) || 0, subtotal));
  const taxableBase = subtotal - cleanDiscount;
  const tax = Math.round(taxableBase * (Number(taxRate) || 0));
  const payable = taxableBase + tax;
  return { subtotal, discount: cleanDiscount, tax, payable };
}
