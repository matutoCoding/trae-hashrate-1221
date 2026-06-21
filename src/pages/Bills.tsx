import { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Printer,
  Clock,
  Link2,
  Stethoscope,
  ArrowRight,
  CreditCard,
  Wallet,
  User,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useBillingStore } from '../store/useBillingStore';
import { usePetStore } from '../store/usePetStore';
import { useMedicalRecordStore } from '../store/useMedicalRecordStore';
import StatusBadge from '../components/StatusBadge';
import { formatPrice, formatDateTime } from '../utils/billing';
import { BillStatus, PaymentMethod, paymentMethodConfig, RefundType, BillItemRefundInfo } from '../types';

export default function Bills() {
  const {
    bills,
    payBill,
    refundBill,
    getBillById,
    getPaymentRecordsByBillId,
    getRefundRecordsByBillId,
    getBillItemsRefundInfo,
    getItemRefundInfo,
  } = useBillingStore();
  const { getPetById } = usePetStore();
  const { getRecordByBillId } = useMedicalRecordStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [payOperator, setPayOperator] = useState('');
  const [payNote, setPayNote] = useState('');

  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundOperator, setRefundOperator] = useState('');
  const [refundType, setRefundType] = useState<RefundType>('custom');
  const [selectedRefundItems, setSelectedRefundItems] = useState<Map<string, number>>(new Map());
  const [itemsRefundInfo, setItemsRefundInfo] = useState<BillItemRefundInfo[]>([]);

  const filteredBills = bills
    .filter((bill) => {
      if (statusFilter !== 'all' && bill.status !== statusFilter) return false;

      if (searchKeyword) {
        const pet = getPetById(bill.petId);
        const keyword = searchKeyword.toLowerCase();
        return (
          pet?.name.toLowerCase().includes(keyword) ||
          pet?.ownerName.toLowerCase().includes(keyword) ||
          bill.id.toLowerCase().includes(keyword)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selectedBill = selectedBillId ? getBillById(selectedBillId) : null;
  const selectedPet = selectedBill ? getPetById(selectedBill.petId) : null;
  const paymentRecords = selectedBillId ? getPaymentRecordsByBillId(selectedBillId) : [];
  const refundRecords = selectedBillId ? getRefundRecordsByBillId(selectedBillId) : [];

  const handleOpenPayModal = (billId: string) => {
    const bill = getBillById(billId);
    if (!bill) return;
    setSelectedBillId(billId);
    setPayAmount((bill.totalAmount - bill.paidAmount).toFixed(2));
    setPayMethod('cash');
    setPayOperator('');
    setPayNote('');
    setShowPayModal(true);
  };

  const handlePay = () => {
    if (!selectedBillId) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效金额');
      return;
    }
    if (!payOperator.trim()) {
      alert('请输入操作员姓名');
      return;
    }
    payBill(selectedBillId, amount, payMethod, payOperator.trim(), payNote.trim() || undefined);
    setShowPayModal(false);
  };

  const handleOpenRefundModal = (billId: string) => {
    const bill = getBillById(billId);
    if (!bill) return;
    setSelectedBillId(billId);
    const refundableAmount = bill.paidAmount - bill.refundedAmount;
    setRefundAmount(refundableAmount.toFixed(2));
    setRefundMethod('cash');
    setRefundReason('');
    setRefundOperator('');
    setRefundType('custom');
    setSelectedRefundItems(new Map());
    setItemsRefundInfo(getBillItemsRefundInfo(billId));
    setShowRefundModal(true);
  };

  const calculateItemRefundAmount = () => {
    let total = 0;
    selectedRefundItems.forEach((qty, itemId) => {
      const item = itemsRefundInfo.find((i) => i.itemId === itemId);
      const billItem = selectedBill?.items.find((bi) => bi.id === itemId);
      if (item && billItem && qty > 0) {
        total += billItem.unitPrice * qty;
      }
    });
    return total;
  };

  const handleRefund = () => {
    if (!selectedBillId) return;
    const bill = getBillById(selectedBillId);
    if (!bill) return;

    if (!refundOperator.trim()) {
      alert('请输入操作员姓名');
      return;
    }
    if (!refundReason.trim()) {
      alert('请输入退款原因');
      return;
    }

    try {
      if (refundType === 'item') {
        if (selectedRefundItems.size === 0) {
          alert('请选择要退款的项目');
          return;
        }

        selectedRefundItems.forEach((qty, itemId) => {
          const item = itemsRefundInfo.find((i) => i.itemId === itemId);
          const billItem = bill.items.find((bi) => bi.id === itemId);
          if (!item || !billItem || qty <= 0) return;

          const itemRefundInfo = getItemRefundInfo(selectedBillId, itemId);
          const maxRefundQty = Math.floor(itemRefundInfo.remainingAmount / billItem.unitPrice);
          if (qty > maxRefundQty) {
            alert(`项目「${billItem.itemName}」最多可退 ${maxRefundQty} 份`);
            throw new Error('退款数量超过可退数量');
          }

          const amount = billItem.unitPrice * qty;
          refundBill(selectedBillId, amount, refundMethod, refundOperator.trim(), refundReason.trim(), {
            refundType: 'item',
            itemId,
            itemName: billItem.itemName,
          });
        });
      } else {
        const amount = parseFloat(refundAmount);
        const refundableAmount = bill.paidAmount - bill.refundedAmount;
        if (isNaN(amount) || amount <= 0) {
          alert('请输入有效金额');
          return;
        }
        if (amount > refundableAmount) {
          alert(`退款金额不能超过可退余额：¥${refundableAmount.toFixed(2)}`);
          return;
        }
        refundBill(selectedBillId, amount, refundMethod, refundOperator.trim(), refundReason.trim(), {
          refundType: 'custom',
        });
      }
      setShowRefundModal(false);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const getPrimaryPaymentMethod = (billId: string) => {
    const payments = getPaymentRecordsByBillId(billId);
    if (payments.length === 0) return null;
    return payments[payments.length - 1].method;
  };

  const totalPaidAmount = bills.reduce((sum, b) => sum + b.paidAmount, 0);
  const totalRefundedAmount = bills.reduce((sum, b) => sum + b.refundedAmount, 0);
  const unpaidCount = bills.filter((b) => b.status === 'unpaid').length;

  const simpleItems = selectedBill?.items.filter((item) => item.isSimple) || [];
  const complexItems = selectedBill?.items.filter((item) => !item.isSimple) || [];
  const simpleItemsSubtotal = simpleItems.reduce((sum, item) => sum + item.subtotal, 0);
  const complexItemsSubtotal = complexItems.reduce((sum, item) => sum + item.subtotal, 0);

  const remainingAmount = selectedBill
    ? Math.max(0, selectedBill.totalAmount - selectedBill.paidAmount + selectedBill.refundedAmount)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">账单管理</h1>
          <p className="text-slate-500 mt-1">查看和管理所有诊疗账单</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总账单数</p>
              <p className="text-2xl font-bold text-slate-800">{bills.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">待支付</p>
              <p className="text-2xl font-bold text-amber-600">{unpaidCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已收款</p>
              <p className="text-2xl font-bold text-emerald-600">{formatPrice(totalPaidAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已退款</p>
              <p className="text-2xl font-bold text-red-600">{formatPrice(totalRefundedAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            账单列表
          </h2>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索账单"
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BillStatus | 'all')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="all">全部状态</option>
              <option value="unpaid">待支付</option>
              <option value="paid">已支付</option>
              <option value="partially_refunded">部分退款</option>
              <option value="refunded">已退款</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">账单号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">患宠</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">项目数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">应付金额</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">已付金额</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">退款金额</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">支付方式</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">创建时间</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>暂无账单记录</p>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const pet = getPetById(bill.petId);
                  const primaryMethod = getPrimaryPaymentMethod(bill.id);

                  return (
                    <tr
                      key={bill.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-slate-700">
                          {bill.id.slice(0, 12)}...
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {pet?.species === 'dog'
                              ? '🐕'
                              : pet?.species === 'cat'
                                ? '🐱'
                                : '🐾'}
                          </span>
                          <div>
                            <p className="font-medium text-slate-800">{pet?.name}</p>
                            <p className="text-xs text-slate-500">{pet?.ownerName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600">{bill.items.length} 项</td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-700">
                          {formatPrice(bill.totalAmount)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-emerald-600">
                          {formatPrice(bill.paidAmount)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-red-500">
                          {bill.refundedAmount > 0 ? formatPrice(bill.refundedAmount) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {primaryMethod ? (
                          <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                            <span>{paymentMethodConfig[primaryMethod].icon}</span>
                            <span>{paymentMethodConfig[primaryMethod].label}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={bill.status} type="bill" />
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500">
                        {new Date(bill.createdAt).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedBillId(bill.id);
                              setShowDetail(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(bill.status === 'unpaid' ||
                            (bill.status === 'partially_refunded' &&
                              bill.paidAmount < bill.totalAmount)) && (
                            <button
                              onClick={() => handleOpenPayModal(bill.id)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="收款"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {(bill.status === 'paid' || bill.status === 'partially_refunded') &&
                            bill.paidAmount > bill.refundedAmount && (
                              <button
                                onClick={() => handleOpenRefundModal(bill.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="退款"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && selectedBill && selectedPet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-500" />
                  账单详情
                </h3>
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
                    {selectedPet.species === 'dog'
                      ? '🐕'
                      : selectedPet.species === 'cat'
                        ? '🐱'
                        : '🐾'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{selectedPet.name}</p>
                    <p className="text-sm text-slate-500">主人：{selectedPet.ownerName}</p>
                  </div>
                </div>
                <StatusBadge status={selectedBill.status} type="bill" />
              </div>

              {(() => {
                const record = getRecordByBillId(selectedBill.id);
                if (!record) return null;

                return (
                  <div className="space-y-2 p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-blue-500" />
                        <p className="text-sm font-medium text-blue-800">关联病历</p>
                      </div>
                      <button
                        onClick={() => {
                          alert(
                            `病历详情：\n诊断：${record.diagnosis}\n治疗：${record.treatment || '无'}\n备注：${record.notes || '无'}`
                          );
                        }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        查看病历
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Stethoscope className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-blue-600">诊断</p>
                          <p className="text-sm text-blue-800 font-medium">{record.diagnosis}</p>
                        </div>
                      </div>
                      {record.treatment && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-blue-600">治疗方案</p>
                            <p className="text-sm text-blue-700">{record.treatment}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">费用分解</p>

                {simpleItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      简单项目
                    </p>
                    {simpleItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl ml-3"
                      >
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{item.itemName}</p>
                          <p className="text-xs text-slate-500">
                            {formatPrice(item.unitPrice)} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-medium text-slate-700 text-sm">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs text-slate-500 ml-3">
                      <span>简单项目小计</span>
                      <span className="font-medium">{formatPrice(simpleItemsSubtotal)}</span>
                    </div>
                  </div>
                )}

                {complexItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      复杂项目
                    </p>
                    {complexItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl ml-3"
                      >
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{item.itemName}</p>
                          <p className="text-xs text-slate-500">
                            {formatPrice(item.unitPrice)} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-medium text-slate-700 text-sm">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs text-slate-500 ml-3">
                      <span>复杂项目小计</span>
                      <span className="font-medium">{formatPrice(complexItemsSubtotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">项目小计</span>
                  <span className="text-slate-700">{formatPrice(selectedBill.subtotal)}</span>
                </div>
                {selectedBill.basePriceAdjustment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600 flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4" />
                      起步价调整
                    </span>
                    <span className="text-amber-600">
                      +{formatPrice(selectedBill.basePriceAdjustment)}
                    </span>
                  </div>
                )}
                {selectedBill.ceilingPriceAdjustment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <ArrowDownRight className="w-4 h-4" />
                      封顶价优惠
                    </span>
                    <span className="text-emerald-600">
                      -{formatPrice(selectedBill.ceilingPriceAdjustment)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-800">应付金额</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatPrice(selectedBill.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">实付金额</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatPrice(selectedBill.paidAmount)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">退款金额</p>
                  <p className="text-lg font-bold text-red-500">
                    {formatPrice(selectedBill.refundedAmount)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">待付金额</p>
                  <p className="text-lg font-bold text-amber-600">
                    {formatPrice(remainingAmount)}
                  </p>
                </div>
              </div>

              {paymentRecords.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    支付记录
                  </p>
                  <div className="space-y-2">
                    {paymentRecords.map((record) => (
                      <div
                        key={record.id}
                        className="p-3 bg-emerald-50 rounded-xl border border-emerald-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {paymentMethodConfig[record.method].icon}
                              </span>
                              <span className="font-medium text-emerald-800 text-sm">
                                {paymentMethodConfig[record.method].label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-emerald-600 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {record.operator}
                              </span>
                              <span>·</span>
                              <span>{formatDateTime(record.createdAt)}</span>
                            </div>
                          </div>
                          <span className="font-bold text-emerald-600">
                            +{formatPrice(record.amount)}
                          </span>
                        </div>
                        {record.note && (
                          <div className="mt-2 pt-2 border-t border-emerald-100">
                            <p className="text-xs text-emerald-700 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              备注：{record.note}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {refundRecords.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-red-500" />
                    退款记录
                  </p>
                  <div className="space-y-2">
                    {refundRecords.map((record) => (
                      <div
                        key={record.id}
                        className="p-3 bg-red-50 rounded-xl border border-red-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {paymentMethodConfig[record.method].icon}
                              </span>
                              <span className="font-medium text-red-800 text-sm">
                                {paymentMethodConfig[record.method].label}
                              </span>
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                {record.refundType === 'item' ? '项目退款' : '自定义退款'}
                              </span>
                            </div>
                            {record.refundType === 'item' && record.itemName && (
                              <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                                <FileText className="w-3 h-3" />
                                <span>项目：{record.itemName}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-red-600 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {record.operator}
                              </span>
                              <span>·</span>
                              <span>{record.reason}</span>
                              <span>·</span>
                              <span>{formatDateTime(record.createdAt)}</span>
                            </div>
                          </div>
                          <span className="font-bold text-red-600">
                            -{formatPrice(record.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  <Printer className="w-4 h-4" />
                  打印
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  <Download className="w-4 h-4" />
                  导出
                </button>
                {(selectedBill.status === 'unpaid' ||
                  (selectedBill.status === 'partially_refunded' &&
                    selectedBill.paidAmount < selectedBill.totalAmount)) && (
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      handleOpenPayModal(selectedBill.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    收款
                  </button>
                )}
                {(selectedBill.status === 'paid' ||
                  selectedBill.status === 'partially_refunded') &&
                  selectedBill.paidAmount > selectedBill.refundedAmount && (
                    <button
                      onClick={() => {
                        setShowDetail(false);
                        handleOpenRefundModal(selectedBill.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      退款
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPayModal && selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  账单收款
                </h3>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-emerald-700">应付金额</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatPrice(selectedBill.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-emerald-700">已付金额</span>
                  <span className="font-medium text-emerald-600">
                    {formatPrice(selectedBill.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-200">
                  <span className="text-sm font-medium text-emerald-800">本次应收</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {formatPrice(selectedBill.totalAmount - selectedBill.paidAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">支付方式</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(paymentMethodConfig) as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPayMethod(method)}
                      className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center gap-1 ${
                        payMethod === method
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-2xl">{paymentMethodConfig[method].icon}</span>
                      <span className="text-xs text-slate-600">
                        {paymentMethodConfig[method].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">收款金额</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ¥
                  </span>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">操作员</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={payOperator}
                    onChange={(e) => setPayOperator(e.target.value)}
                    placeholder="请输入操作员姓名"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">备注（可选）</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="请输入备注信息"
                    rows={2}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handlePay}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
                >
                  确认收款
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-red-500" />
                  账单退款
                </h3>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 bg-red-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">已付金额</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatPrice(selectedBill.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-red-700">已退款</span>
                  <span className="font-medium text-red-600">
                    {formatPrice(selectedBill.refundedAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-red-200">
                  <span className="text-sm font-medium text-red-800">可退金额</span>
                  <span className="text-lg font-bold text-red-700">
                    {formatPrice(selectedBill.paidAmount - selectedBill.refundedAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">退款方式</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(paymentMethodConfig) as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setRefundMethod(method)}
                      className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center gap-1 ${
                        refundMethod === method
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-2xl">{paymentMethodConfig[method].icon}</span>
                      <span className="text-xs text-slate-600">
                        {paymentMethodConfig[method].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">退款类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRefundType('custom')}
                    className={`p-3 rounded-xl border-2 transition-colors flex items-center justify-center gap-2 ${
                      refundType === 'custom'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span className="text-sm font-medium">自定义金额</span>
                  </button>
                  <button
                    onClick={() => setRefundType('item')}
                    className={`p-3 rounded-xl border-2 transition-colors flex items-center justify-center gap-2 ${
                      refundType === 'item'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">按项目退款</span>
                  </button>
                </div>
              </div>

              {refundType === 'custom' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">退款金额</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      ¥
                    </span>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      step="0.01"
                      min="0"
                      max={selectedBill.paidAmount - selectedBill.refundedAmount}
                    />
                  </div>
                  <p className="text-xs text-slate-500">退款金额不能超过可退金额</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">选择退款项目</label>
                    <span className="text-sm font-semibold text-red-600">
                      预计退款：{formatPrice(calculateItemRefundAmount())}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-2">
                    {itemsRefundInfo.map((itemInfo) => {
                      const billItem = selectedBill.items.find((bi) => bi.id === itemInfo.itemId);
                      if (!billItem) return null;
                      const isSelected = selectedRefundItems.has(itemInfo.itemId);
                      const refundQty = selectedRefundItems.get(itemInfo.itemId) || 0;
                      const maxRefundQty = Math.floor(itemInfo.remainingAmount / billItem.unitPrice);

                      return (
                        <div
                          key={itemInfo.itemId}
                          className={`p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-red-300 bg-red-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSelected = new Map(selectedRefundItems);
                                if (e.target.checked) {
                                  newSelected.set(itemInfo.itemId, Math.min(1, maxRefundQty));
                                } else {
                                  newSelected.delete(itemInfo.itemId);
                                }
                                setSelectedRefundItems(newSelected);
                              }}
                              className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
                              disabled={itemInfo.refundableAmount <= 0}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-slate-800 text-sm truncate">
                                  {billItem.itemName}
                                </p>
                                {itemInfo.refundableAmount <= 0 && (
                                  <span className="text-xs text-slate-400">已全额退款</span>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-slate-500">
                                <div>
                                  <span className="text-slate-400">数量：</span>
                                  <span className="font-medium text-slate-700">{billItem.quantity}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400">单价：</span>
                                  <span className="font-medium text-slate-700">
                                    {formatPrice(billItem.unitPrice)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">原价：</span>
                                  <span className="font-medium text-slate-700">
                                    {formatPrice(billItem.subtotal)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">已退：</span>
                                  <span className="font-medium text-red-600">
                                    {formatPrice(itemInfo.refundedAmount)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">可退：</span>
                                  <span className="font-medium text-emerald-600">
                                    {formatPrice(itemInfo.refundableAmount)}
                                  </span>
                                </div>
                              </div>
                              {isSelected && maxRefundQty > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <label className="text-xs text-slate-500">退款数量：</label>
                                  <input
                                    type="number"
                                    value={refundQty}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      const clampedValue = Math.max(1, Math.min(value, maxRefundQty));
                                      const newSelected = new Map(selectedRefundItems);
                                      newSelected.set(itemInfo.itemId, clampedValue);
                                      setSelectedRefundItems(newSelected);
                                    }}
                                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                    min="1"
                                    max={maxRefundQty}
                                  />
                                  <span className="text-xs text-slate-400">
                                    (最多 {maxRefundQty} 份)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  退款原因 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="请输入退款原因"
                    rows={2}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">操作员</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={refundOperator}
                    onChange={(e) => setRefundOperator(e.target.value)}
                    placeholder="请输入操作员姓名"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleRefund}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                >
                  确认退款
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
