import { useState } from 'react';
import {
  Stethoscope,
  Play,
  CheckCircle,
  SkipForward,
  Clock,
  User,
  Phone,
  FileText,
  AlertTriangle,
  Pill,
  Syringe,
  Scissors,
  X,
  Plus,
} from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePetStore } from '../store/usePetStore';
import { useSettingsStore } from '../store/useSettingsStore';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { TreatmentItem, TriagePriority } from '../types';

const treatmentItemIconMap: Record<string, typeof Pill> = {
  medication: Pill,
  injection: Syringe,
  surgery: Scissors,
  exam: Stethoscope,
  other: FileText,
};

export default function Rooms() {
  const { rooms, getRoomById } = useRoomStore();
  const {
    callNext,
    startVisit,
    canCallNext,
    completeVisitWithData,
    getWaitingQueue,
    getCurrentAppointment,
    getAppointmentById,
  } = useQueueStore();
  const { getPetById } = usePetStore();
  const { treatmentItems } = useSettingsStore();

  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [selectedItems, setSelectedItems] = useState<Array<{ itemId: string; quantity: number }>>([]);

  const selectedRoom = getRoomById(selectedRoomId);
  const currentAppt = selectedRoomId ? getCurrentAppointment(selectedRoomId) : null;
  const waitingQueue = selectedRoomId ? getWaitingQueue(selectedRoomId) : [];
  const currentPet = currentAppt ? getPetById(currentAppt.petId) : null;
  const canCall = selectedRoomId ? canCallNext(selectedRoomId) : false;

  const activeRooms = rooms.filter((r) => r.status !== 'offline');

  const handleCallNext = () => {
    if (!selectedRoomId) return;
    if (!canCall) {
      alert('当前诊室有正在进行的接诊，请先完成后再叫下一位');
      return;
    }
    const result = callNext(selectedRoomId);
    if (!result) {
      alert('该诊室没有等待中的患宠');
    }
  };

  const handleStartVisit = () => {
    if (!currentAppt) return;
    startVisit(currentAppt.id);
  };

  const handleShowCompleteForm = () => {
    setShowCompleteForm(true);
    setDiagnosis('');
    setTreatmentPlan('');
    setSelectedItems([]);
  };

  const handleAddItem = (item: TreatmentItem) => {
    const existing = selectedItems.find((i) => i.itemId === item.id);
    if (existing) {
      setSelectedItems(selectedItems.map((i) =>
        i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { itemId: item.id, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.itemId !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setSelectedItems(selectedItems.map((i) =>
      i.itemId === itemId ? { ...i, quantity } : i
    ));
  };

  const handleComplete = async () => {
    if (!currentAppt) return;
    if (!diagnosis.trim()) {
      alert('请填写诊断结果');
      return;
    }

    const treatmentItemsWithDetails = selectedItems.map((si) => {
      const item = treatmentItems.find((ti) => ti.id === si.itemId);
      return {
        treatmentItemId: si.itemId,
        itemName: item?.name || '',
        quantity: si.quantity,
        unitPrice: item?.basePrice || 0,
        isSimple: item?.isSimple || false,
      };
    });

    try {
      const result = completeVisitWithData(currentAppt.id, {
        diagnosis: diagnosis.trim(),
        treatmentPlan: treatmentPlan.trim(),
        treatment: treatmentPlan.trim(),
        notes: '',
        treatmentItems: treatmentItemsWithDetails,
      });

      if (result) {
        alert(
          `接诊完成！\n\n病历已生成\n账单已创建（待支付）\n金额：¥${result.billAmount.toFixed(2)}`
        );
        setShowCompleteForm(false);
        setDiagnosis('');
        setTreatmentPlan('');
        setSelectedItems([]);
      }
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, si) => {
      const item = treatmentItems.find((ti) => ti.id === si.itemId);
      return sum + (item?.basePrice || 0) * si.quantity;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">诊室叫号</h1>
        <p className="text-slate-500 mt-1">多诊室并行叫号管理</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {activeRooms.map((room) => {
          const waitingCount = getWaitingQueue(room.id).length;
          const isSelected = room.id === selectedRoomId;
          const hasActiveVisit = !canCallNext(room.id);
          const currentApptForRoom = getCurrentAppointment(room.id);

          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center relative ${
                  isSelected ? 'bg-white/20' : 'bg-emerald-100'
                }`}
              >
                <Stethoscope
                  className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-emerald-600'}`}
                />
                {hasActiveVisit && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <div className="text-left">
                <p className={`font-medium ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {room.name}
                </p>
                <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                  {room.vetName} · 等待 {waitingCount} 位
                </p>
                {currentApptForRoom && (
                  <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                    当前：{currentApptForRoom.queueNumber}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedRoom && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-500" />
                {selectedRoom.name} - 当前叫号
              </h2>
              <StatusBadge status={selectedRoom.status} type="room" />
            </div>

            {currentAppt && currentPet ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-4 relative">
                    <span className="text-4xl">
                      {currentPet.species === 'dog'
                        ? '🐕'
                        : currentPet.species === 'cat'
                        ? '🐱'
                        : '🐾'}
                    </span>
                    {currentAppt.priorityLevel > 0 && (
                      <div className="absolute -top-2 -right-2">
                        <PriorityBadge priority={currentAppt.priority as TriagePriority} />
                      </div>
                    )}
                  </div>
                  <div className="text-5xl font-bold text-emerald-600 mb-2">
                    {currentAppt.queueNumber}
                  </div>
                  <p className="text-xl text-slate-700 font-medium">{currentPet.name}</p>
                  <p className="text-slate-500 mt-1">
                    {currentPet.breed || '未知品种'} · {currentPet.age}岁
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-sm">主人姓名</span>
                    </div>
                    <p className="font-medium text-slate-800">{currentPet.ownerName}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">联系电话</span>
                    </div>
                    <p className="font-medium text-slate-800">{currentPet.ownerPhone}</p>
                  </div>
                </div>

                {currentAppt.priorityLevel > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-sm text-amber-800 font-medium">
                        {currentAppt.priority === 'emergency' ? '急诊病例' : '复诊病例'}
                      </p>
                      <p className="text-xs text-amber-600">
                        {currentAppt.priority === 'emergency'
                          ? '已按急诊优先级插队安排'
                          : '已按复诊优先级安排'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">叫号状态</p>
                    <p className="text-xs text-blue-600">
                      {currentAppt.status === 'called'
                        ? '已叫号，等待患宠进入诊室'
                        : currentAppt.status === 'visiting'
                        ? '正在诊疗中'
                        : '等待中'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {currentAppt.status === 'called' && (
                    <button
                      onClick={handleStartVisit}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
                    >
                      <Play className="w-5 h-5" />
                      开始接诊
                    </button>
                  )}
                  {currentAppt.status === 'visiting' && (
                    <button
                      onClick={handleShowCompleteForm}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
                    >
                      <CheckCircle className="w-5 h-5" />
                      完成诊疗并录入
                    </button>
                  )}
                  <button
                    onClick={handleCallNext}
                    disabled={!canCall}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl transition-colors font-medium ${
                      canCall
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <SkipForward className="w-5 h-5" />
                    叫下一位
                    {!canCall && (
                      <span className="text-xs ml-1">(接诊中)</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-4">
                  <Stethoscope className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-lg text-slate-500 mb-6">暂未叫号</p>
                <button
                  onClick={handleCallNext}
                  disabled={waitingQueue.length === 0}
                  className="px-8 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  叫下一位
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              等待队列
              <span className="ml-auto px-2.5 py-0.5 bg-slate-100 text-slate-600 text-sm rounded-full">
                {waitingQueue.length} 位
              </span>
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {waitingQueue.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无等待患宠</p>
                </div>
              ) : (
                waitingQueue.map((appt, index) => {
                  const pet = getPetById(appt.petId);
                  const apptWithDetails = getAppointmentById(appt.id);

                  return (
                    <div
                      key={appt.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        appt.priorityLevel > 0
                          ? 'bg-amber-50 hover:bg-amber-100'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? 'bg-emerald-500 text-white'
                            : appt.priorityLevel > 0
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-slate-800">
                            {appt.queueNumber}
                          </span>
                          <span className="text-slate-600">{pet?.name}</span>
                          {appt.priorityLevel > 0 && (
                            <PriorityBadge priority={appt.priority as TriagePriority} />
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {pet?.breed || '未知品种'}
                        </p>
                      </div>
                      {apptWithDetails && (
                        <StatusBadge status={apptWithDetails.status} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showCompleteForm && currentAppt && currentPet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">完成接诊</h2>
                <p className="text-sm text-slate-500">
                  {currentAppt.queueNumber} - {currentPet.name}
                </p>
              </div>
              <button
                onClick={() => setShowCompleteForm(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  诊断结果 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="请输入诊断结果..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  治疗方案
                </label>
                <textarea
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="请输入治疗方案和医嘱..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  诊疗项目
                </label>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {treatmentItems.map((item) => {
                    const Icon = treatmentItemIconMap[item.category] || Pill;
                    const selected = selectedItems.find((si) => si.itemId === item.id);

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleAddItem(item)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          selected
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${selected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-medium ${selected ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {item.name}
                        </span>
                        <span className={`text-xs ${selected ? 'text-emerald-600' : 'text-slate-500'}`}>
                          ¥{item.basePrice.toFixed(2)}
                        </span>
                        {selected && (
                          <span className="text-xs font-bold text-emerald-600">
                            × {selected.quantity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedItems.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700">已选项目</span>
                      <span className="text-sm font-bold text-slate-800">
                        小计：¥{calculateSubtotal().toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedItems.map((si) => {
                        const item = treatmentItems.find((ti) => ti.id === si.itemId);
                        if (!item) return null;

                        return (
                          <div
                            key={si.itemId}
                            className="flex items-center justify-between bg-white rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{item.name}</span>
                              <span className="text-sm text-slate-500">¥{item.basePrice.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQuantity(si.itemId, si.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-medium">{si.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(si.itemId, si.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                              >
                                +
                              </button>
                              <span className="w-20 text-right font-medium text-slate-800">
                                ¥{(item.basePrice * si.quantity).toFixed(2)}
                              </span>
                              <button
                                onClick={() => handleRemoveItem(si.itemId)}
                                className="p-1 hover:bg-red-100 rounded text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-500">预计费用：</span>
                <span className="text-2xl font-bold text-emerald-600 ml-2">
                  ¥{calculateSubtotal().toFixed(2)}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteForm(false)}
                  className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!diagnosis.trim()}
                  className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  确认完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
