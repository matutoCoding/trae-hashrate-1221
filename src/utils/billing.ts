import { BillItem, BillingConfig, BillingBreakdown } from '../types';

export interface BillingCalculation {
  items: BillItem[];
  subtotal: number;
  basePriceAdjustment: number;
  ceilingPriceAdjustment: number;
  totalAmount: number;
  hasBasePriceAdjustment: boolean;
  hasCeilingPriceAdjustment: boolean;
  breakdown: BillingBreakdown;
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

  const simpleItems = billItems.filter((item) => item.isSimple);
  const complexItems = billItems.filter((item) => !item.isSimple);

  const simpleItemsSubtotal = simpleItems.reduce((sum, item) => sum + item.subtotal, 0);
  const complexItemsSubtotal = complexItems.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotal = simpleItemsSubtotal + complexItemsSubtotal;

  const hasSimpleItems = simpleItems.length > 0;
  const hasComplexItems = complexItems.length > 0;
  const hasMixedItems = hasSimpleItems && hasComplexItems;

  let basePriceAdjustment = 0;
  let ceilingPriceAdjustment = 0;
  let totalAmount = subtotal;
  let adjustmentReason = '';

  if (hasComplexItems) {
    if (hasMixedItems) {
      adjustmentReason = '混合项目：复杂项目部分封顶，简单项目按原价';
      totalAmount = Math.min(complexItemsSubtotal, config.ceilingPrice) + simpleItemsSubtotal;
      if (complexItemsSubtotal > config.ceilingPrice) {
        ceilingPriceAdjustment = complexItemsSubtotal - config.ceilingPrice;
      }
    } else {
      adjustmentReason = '仅复杂项目：全额适用封顶价';
      if (subtotal > config.ceilingPrice) {
        ceilingPriceAdjustment = subtotal - config.ceilingPrice;
        totalAmount = config.ceilingPrice;
      }
    }
  } else if (hasSimpleItems) {
    adjustmentReason = '仅简单项目：全额适用起步价';
    if (subtotal < config.basePrice) {
      basePriceAdjustment = config.basePrice - subtotal;
      totalAmount = config.basePrice;
    }
  }

  const simpleBasePriceApplied = hasSimpleItems && !hasComplexItems && simpleItemsSubtotal < config.basePrice;
  const complexCeilingApplied = hasComplexItems && complexItemsSubtotal > config.ceilingPrice;
  const simpleFinalAmount = simpleBasePriceApplied ? config.basePrice : simpleItemsSubtotal;
  const complexFinalAmount = complexCeilingApplied ? config.ceilingPrice : complexItemsSubtotal;

  const breakdown: BillingBreakdown = {
    simpleItems,
    complexItems,
    simpleItemsSubtotal,
    complexItemsSubtotal,
    basePrice: config.basePrice,
    ceilingPrice: config.ceilingPrice,
    simpleBasePriceApplied,
    complexCeilingApplied,
    simpleFinalAmount,
    complexFinalAmount,
    basePriceAdjustment,
    ceilingPriceAdjustment,
    totalAmount,
    hasBasePriceAdjustment: basePriceAdjustment > 0,
    hasCeilingPriceAdjustment: ceilingPriceAdjustment > 0,
    hasMixedItems,
    adjustmentReason,
  };

  return {
    items: billItems,
    subtotal,
    basePriceAdjustment,
    ceilingPriceAdjustment,
    totalAmount,
    hasBasePriceAdjustment: basePriceAdjustment > 0,
    hasCeilingPriceAdjustment: ceilingPriceAdjustment > 0,
    breakdown,
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

