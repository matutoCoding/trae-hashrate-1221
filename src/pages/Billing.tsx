import { useState, useMemo } from 'react';
import {
  Calculator,
  Plus,
  Minus,
  Receipt,
  Tag,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useBillingStore } from '../store/useBillingStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePetStore } from '../store/usePetStore';
import { BillItem } from '../types';
import { formatPrice } from '../utils/billing';

interface SelectedItem {
  treatmentItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  isSimple: boolean;
}

export default function Billing() {
  const { treatmentItems, billingConfig } = useSettingsStore();
  const { calculatePreliminaryBill, createBill } = useBillingStore();
  const { appointments } = useQueueStore();
  const { getPetById, pets } = usePetStore();

  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const visitingAppointments = appointments.filter((a) => a.status === 'visiting');

  const calculation = useMemo(() => {
    const items: Omit<BillItem, 'id' | 'subtotal'>[] = selectedItems.map((item) => ({
      treatmentItemId: item.treatmentItemId,
      itemName: item.itemName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      isSimple: item.isSimple,
    }));
    return calculatePreliminaryBill(items);
  }, [selectedItems, calculatePreliminaryBill]);

  const simpleItems = treatmentItems.filter((item) => item.isSimple);
  const complexItems = treatmentItems.filter((item) => !item.isSimple);

  const addItem = (item: typeof treatmentItems[0]) => {
    const existing = selectedItems.find((i) => i.treatmentItemId === item.id);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.treatmentItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          treatmentItemId: item.id,
          itemName: item.name,
          unitPrice: item.basePrice,
          quantity: 1,
          isSimple: item.isSimple,
        },
      ]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setSelectedItems(
      selectedItems
        .map((i) =>
          i.treatmentItemId === itemId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.treatmentItemId !== itemId));
  };

  const handleCreateBill = () => {
    if (!selectedPetId) {
      alert('请选择患宠');
      return;
    }
    if (selectedItems.length === 0) {
      alert('请选择诊疗项目');
      return;
    }

    const items: Omit<BillItem, 'id' | 'subtotal'>[] = selectedItems.map((item) => ({
      treatmentItemId: item.treatmentItemId,
      itemName: item.itemName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      isSimple: item.isSimple,
    }));

    const bill = createBill(
      selectedAppointmentId || `manual-${Date.now()}`,
      selectedPetId,
      items
    );

    alert(`账单已生成！\n账单号：${bill.id}\n总金额：${formatPrice(bill.totalAmount)}`);
    setSelectedItems([]);
  };

  const selectedPet = getPetById(selectedPetId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">诊疗计费</h1>
          <p className="text-slate-500 mt-1">选择诊疗项目，自动计算费用</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-500" />
              选择患宠
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  当前就诊
                </label>
                <select
                  value={selectedAppointmentId}
                  onChange={(e) => {
                    const apptId = e.target.value;
                    setSelectedAppointmentId(apptId);
                    const appt = appointments.find((a) => a.id === apptId);
                    if (appt) {
                      setSelectedPetId(appt.petId);
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">选择就诊中的患宠</option>
                  {visitingAppointments.map((appt) => {
                    const pet = getPetById(appt.petId);
                    return (
                      <option key={appt.id} value={appt.id}>
                        {appt.queueNumber} - {pet?.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  或选择患宠
                </label>
                <select
                  value={selectedPetId}
                  onChange={(e) => {
                    setSelectedPetId(e.target.value);
                    setSelectedAppointmentId('');
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">选择患宠</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} - {pet.ownerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPet && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
                  {selectedPet.species === 'dog'
                    ? '🐕'
                    : selectedPet.species === 'cat'
                    ? '🐱'
                    : '🐾'}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{selectedPet.name}</p>
                  <p className="text-sm text-slate-500">
                    {selectedPet.breed || '未知品种'} · {selectedPet.age}岁 · 主人：{selectedPet.ownerName}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-500" />
                简单项目
              </h2>
              <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
                起步价 {formatPrice(billingConfig.basePrice)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {simpleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="p-4 border border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left group"
                >
                  <p className="font-medium text-slate-800 group-hover:text-emerald-700">
                    {item.name}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{item.category}</p>
                  <p className="text-emerald-600 font-semibold mt-2">
                    {formatPrice(item.basePrice)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-500" />
                复杂项目
              </h2>
              <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                封顶价 {formatPrice(billingConfig.ceilingPrice)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {complexItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="p-4 border border-slate-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                >
                  <p className="font-medium text-slate-800 group-hover:text-purple-700">
                    {item.name}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{item.category}</p>
                  <p className="text-purple-600 font-semibold mt-2">
                    {formatPrice(item.basePrice)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              费用明细
            </h2>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Calculator className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">请选择诊疗项目</p>
                </div>
              ) : (
                selectedItems.map((item) => (
                  <div
                    key={item.treatmentItemId}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {item.itemName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => updateQuantity(item.treatmentItemId, -1)}
                        className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.treatmentItemId, 1)}
                        className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">项目小计</span>
                <span className="text-slate-700">{formatPrice(calculation.subtotal)}</span>
              </div>

              {calculation.hasBasePriceAdjustment && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-amber-600 flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    起步价调整
                  </span>
                  <span className="text-amber-600 font-medium">
                    +{formatPrice(calculation.basePriceAdjustment)}
                  </span>
                </div>
              )}

              {calculation.hasCeilingPriceAdjustment && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-emerald-600 flex items-center gap-1">
                    <ArrowDownRight className="w-4 h-4" />
                    封顶价优惠
                  </span>
                  <span className="text-emerald-600 font-medium">
                    -{formatPrice(calculation.ceilingPriceAdjustment)}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-3 border-t border-slate-200">
                <span className="text-lg font-semibold text-slate-800">合计</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatPrice(calculation.totalAmount)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">
                计费规则：简单项目不足{formatPrice(billingConfig.basePrice)}按起步价收取；
                复杂项目超过{formatPrice(billingConfig.ceilingPrice)}按封顶价收取。
              </p>
            </div>

            <button
              onClick={handleCreateBill}
              disabled={selectedItems.length === 0 || !selectedPetId}
              className="w-full mt-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              生成账单
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
