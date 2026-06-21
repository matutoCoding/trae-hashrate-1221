import { BillItem, BillingConfig } from '../types';

export interface BillingCalculation {
  items: BillItem[];
  subtotal: number;
  basePriceAdjustment: number;
  ceilingPriceAdjustment: number;
  totalAmount: number;
  hasBasePriceAdjustment: boolean;
  hasCeilingPriceAdjustment: boolean;
}

export function calculateBill(
  items: Omit<BillItem, 'id' | 'subtotal'>[],
  config: BillingConfig
): BillingCalculation {
  const billItems: BillItem[] = items.map((item, index) => ({
    ...item,
    id: `item-${index}-${Date.now()}`,
    subtotal: item.unitPrice * item.quantity,
  }));

  const subtotal = billItems.reduce((sum, item) => sum + item.subtotal, 0);

  const hasSimpleItems = billItems.some((item) => item.isSimple);
  const hasComplexItems = billItems.some((item) => !item.isSimple);

  let basePriceAdjustment = 0;
  let ceilingPriceAdjustment = 0;
  let totalAmount = subtotal;

  if (hasSimpleItems && subtotal < config.basePrice) {
    basePriceAdjustment = config.basePrice - subtotal;
    totalAmount = config.basePrice;
  }

  if (hasComplexItems && totalAmount > config.ceilingPrice) {
    ceilingPriceAdjustment = totalAmount - config.ceilingPrice;
    totalAmount = config.ceilingPrice;
  }

  return {
    items: billItems,
    subtotal,
    basePriceAdjustment,
    ceilingPriceAdjustment,
    totalAmount,
    hasBasePriceAdjustment: basePriceAdjustment > 0,
    hasCeilingPriceAdjustment: ceilingPriceAdjustment > 0,
  };
}

export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function getPriceTier(price: number, config: BillingConfig): 'base' | 'normal' | 'ceiling' {
  if (price <= config.basePrice) return 'base';
  if (price >= config.ceilingPrice) return 'ceiling';
  return 'normal';
}
