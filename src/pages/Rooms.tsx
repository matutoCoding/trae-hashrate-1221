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
} from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePetStore } from '../store/usePetStore';
import StatusBadge from '../components/StatusBadge';

export default function Rooms() {
  const { rooms, getRoomById } = useRoomStore();
  const {
    callNext,
    startVisit,
    completeAppointment,
    getWaitingQueue,
    getCurrentAppointment,
    getAppointmentById,
  } = useQueueStore();
  const { getPetById } = usePetStore();

  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '');

  const selectedRoom = getRoomById(selectedRoomId);
  const currentAppt = selectedRoomId ? getCurrentAppointment(selectedRoomId) : null;
  const waitingQueue = selectedRoomId ? getWaitingQueue(selectedRoomId) : [];
  const currentPet = currentAppt ? getPetById(currentAppt.petId) : null;

  const activeRooms = rooms.filter((r) => r.status !== 'offline');

  const handleCallNext = () => {
    if (!selectedRoomId) return;
    const result = callNext(selectedRoomId);
    if (!result) {
      alert('该诊室没有等待中的患宠');
    }
  };

  const handleStartVisit = () => {
    if (!currentAppt) return;
    startVisit(currentAppt.id);
  };

  const handleComplete = () => {
    if (!currentAppt) return;
    if (confirm('确认完成本次诊疗？')) {
      completeAppointment(currentAppt.id);
    }
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
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-white/20' : 'bg-emerald-100'
                }`}
              >
                <Stethoscope
                  className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-emerald-600'}`}
                />
              </div>
              <div className="text-left">
                <p className={`font-medium ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {room.name}
                </p>
                <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                  {room.vetName} · 等待 {waitingCount} 位
                </p>
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
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-4">
                    <span className="text-4xl">
                      {currentPet.species === 'dog'
                        ? '🐕'
                        : currentPet.species === 'cat'
                        ? '🐱'
                        : '🐾'}
                    </span>
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

                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">叫号状态</p>
                    <p className="text-xs text-amber-600">
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
                      onClick={handleComplete}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
                    >
                      <CheckCircle className="w-5 h-5" />
                      完成诊疗
                    </button>
                  )}
                  <button
                    onClick={handleCallNext}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    <SkipForward className="w-5 h-5" />
                    叫下一位
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
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? 'bg-emerald-500 text-white'
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
    </div>
  );
}
