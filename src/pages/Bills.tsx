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
} from 'lucide-react';
import { useBillingStore } from '../store/useBillingStore';
import { usePetStore } from '../store/usePetStore';
import { useMedicalRecordStore } from '../store/useMedicalRecordStore';
import StatusBadge from '../components/StatusBadge';
import { formatPrice } from '../utils/billing';
import { BillStatus } from '../types';

export default function Bills() {
  const { bills, payBill, refundBill, getBillById } = useBillingStore();
  const { getPetById } = usePetStore();
  const { getRecordByBillId } = useMedicalRecordStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredBills = bills.filter((bill) => {
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
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selectedBill = selectedBillId ? getBillById(selectedBillId) : null;
  const selectedPet = selectedBill ? getPetById(selectedBill.petId) : null;

  const handlePay = (billId: string) => {
    if (confirm('确认支付该账单？')) {
      payBill(billId);
    }
  };

  const handleRefund = (billId: string) => {
    if (confirm('确认退款该账单？')) {
      refundBill(billId);
    }
  };

  const totalAmount = bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const unpaidCount = bills.filter((b) => b.status === 'unpaid').length;

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
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已收款</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatPrice(totalAmount)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已退款</p>
              <p className="text-2xl font-bold text-slate-600">
                {bills.filter((b) => b.status === 'refunded').length}
              </p>
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
              <option value="refunded">已退款</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                  账单号
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                  患宠
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                  项目数
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                  金额
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                  状态
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                  创建时间
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>暂无账单记录</p>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const pet = getPetById(bill.petId);

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
                        <span className="font-semibold text-emerald-600">
                          {formatPrice(bill.totalAmount)}
                        </span>
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
                          {bill.status === 'unpaid' && (
                            <button
                              onClick={() => handlePay(bill.id)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="确认收款"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {bill.status === 'paid' && (
                            <button
                              onClick={() => handleRefund(bill.id)}
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
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
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
                          alert(`病历详情：\n诊断：${record.diagnosis}\n治疗：${record.treatment || '无'}\n备注：${record.notes || '无'}`);
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

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">诊疗项目</p>
                <div className="space-y-2">
                  {selectedBill.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{item.itemName}</p>
                        <p className="text-xs text-slate-500">
                          {formatPrice(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-medium text-slate-700">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">项目小计</span>
                  <span className="text-slate-700">
                    {formatPrice(selectedBill.subtotal)}
                  </span>
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

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  <Printer className="w-4 h-4" />
                  打印
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  <Download className="w-4 h-4" />
                  导出
                </button>
                {selectedBill.status === 'unpaid' && (
                  <button
                    onClick={() => {
                      handlePay(selectedBill.id);
                      setShowDetail(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    确认收款
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
