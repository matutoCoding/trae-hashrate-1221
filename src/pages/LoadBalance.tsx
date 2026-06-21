import { useState } from 'react';
import {
  BarChart3,
  ArrowRightLeft,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  MoveRight,
} from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePetStore } from '../store/usePetStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  calculateLoadBalance,
  rebalanceAppointments,
  estimateWaitTime,
} from '../utils/loadBalancer';
import StatusBadge from '../components/StatusBadge';

export default function LoadBalance() {
  const { rooms, getRoomById } = useRoomStore();
  const { appointments, transferAppointment, getWaitingQueue, getAppointmentById } =
    useQueueStore();
  const { getPetById } = usePetStore();
  const { billingConfig } = useSettingsStore();

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<string>('');

  const loadInfos = calculateLoadBalance(rooms, appointments, billingConfig);
  const suggestions = rebalanceAppointments(rooms, appointments, billingConfig);

  const activeRooms = rooms.filter((r) => r.status !== 'offline');
  const avgLoad =
    loadInfos.reduce((sum, info) => sum + info.loadRate, 0) / Math.max(loadInfos.length, 1);

  const handleTransfer = () => {
    if (!selectedAppointmentId || !targetRoomId) return;

    const appt = getAppointmentById(selectedAppointmentId);
    const targetRoom = getRoomById(targetRoomId);

    if (
      confirm(
        `确认将 ${appt?.queueNumber} 调剂到 ${targetRoom?.name}？`
      )
    ) {
      transferAppointment(selectedAppointmentId, targetRoomId);
      setSelectedAppointmentId(null);
      setTargetRoomId('');
    }
  };

  const handleApplySuggestion = (suggestion: {
    fromRoomId: string;
    toRoomId: string;
    appointmentId: string;
  }) => {
    const fromRoom = getRoomById(suggestion.fromRoomId);
    const toRoom = getRoomById(suggestion.toRoomId);
    const appt = getAppointmentById(suggestion.appointmentId);

    if (
      confirm(
        `建议将 ${appt?.queueNumber} 从 ${fromRoom?.name} 调剂到 ${toRoom?.name}，是否执行？`
      )
    ) {
      transferAppointment(suggestion.appointmentId, suggestion.toRoomId);
    }
  };

  const maxLoad = Math.max(...loadInfos.map((l) => l.loadRate), 0.1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">负载监控</h1>
          <p className="text-slate-500 mt-1">实时监控各诊室负载，智能调度均衡</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
            <span className="text-sm text-slate-500">平均负载：</span>
            <span className="font-semibold text-emerald-600">
              {Math.round(avgLoad * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总等待数</p>
              <p className="text-2xl font-bold text-slate-800">
                {loadInfos.reduce((sum, l) => sum + l.waitingCount, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">最长等待</p>
              <p className="text-2xl font-bold text-slate-800">
                {Math.max(...loadInfos.map((l) => l.estimatedWaitMinutes), 0)} 分钟
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">活跃诊室</p>
              <p className="text-2xl font-bold text-slate-800">
                {activeRooms.length} 间
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          诊室负载对比
        </h2>

        <div className="space-y-5">
          {loadInfos.map((info) => {
            const room = getRoomById(info.roomId);
            if (!room) return null;

            const loadPercent = (info.loadRate / Math.max(maxLoad, 0.01)) * 100;
            const waitMinutes = estimateWaitTime(info.roomId, appointments, billingConfig);

            const barColor =
              info.loadRate > 0.7
                ? 'bg-red-500'
                : info.loadRate > 0.4
                ? 'bg-amber-500'
                : 'bg-emerald-500';

            return (
              <div key={info.roomId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800">{room.name}</span>
                    <StatusBadge status={room.status} type="room" />
                    <span className="text-xs text-slate-500">{room.vetName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      等待 <span className="font-medium text-slate-700">{info.waitingCount}</span> 位
                    </span>
                    <span className="text-slate-500">
                      预计等待{' '}
                      <span className="font-medium text-slate-700">{waitMinutes} 分钟</span>
                    </span>
                    <span
                      className={`font-bold ${
                        info.loadRate > 0.7
                          ? 'text-red-600'
                          : info.loadRate > 0.4
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {Math.round(info.loadRate * 100)}%
                    </span>
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${loadPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            智能调剂建议
          </h2>

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const fromRoom = getRoomById(suggestion.fromRoomId);
              const toRoom = getRoomById(suggestion.toRoomId);
              const appt = getAppointmentById(suggestion.appointmentId);
              const pet = appt ? getPetById(appt.petId) : null;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white rounded-xl p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{fromRoom?.name}</span>
                      <MoveRight className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-emerald-600">{toRoom?.name}</span>
                    </div>
                    <span className="text-slate-400">|</span>
                    <div>
                      <span className="font-mono font-medium text-slate-700">
                        {appt?.queueNumber}
                      </span>
                      <span className="text-slate-500 ml-2">{pet?.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    执行调剂
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-500" />
            手动调剂
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                选择患宠
              </label>
              <select
                value={selectedAppointmentId || ''}
                onChange={(e) => setSelectedAppointmentId(e.target.value || null)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="">请选择等待中的患宠</option>
                {appointments
                  .filter((a) => a.status === 'waiting')
                  .map((appt) => {
                    const pet = getPetById(appt.petId);
                    const room = getRoomById(appt.roomId);
                    return (
                      <option key={appt.id} value={appt.id}>
                        {appt.queueNumber} - {pet?.name} ({room?.name})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                目标诊室
              </label>
              <select
                value={targetRoomId}
                onChange={(e) => setTargetRoomId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="">请选择目标诊室</option>
                {activeRooms
                  .filter((r) => r.id !== getAppointmentById(selectedAppointmentId || '')?.roomId)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - {room.vetName} (等待{' '}
                      {getWaitingQueue(room.id).length} 位)
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={handleTransfer}
              disabled={!selectedAppointmentId || !targetRoomId}
              className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认调剂
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">各诊室等待明细</h2>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activeRooms.map((room) => {
              const waitingList = getWaitingQueue(room.id);

              return (
                <div key={room.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-800">{room.name}</span>
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                      {waitingList.length} 位等待
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {waitingList.length === 0 ? (
                      <span className="text-xs text-slate-400">暂无等待</span>
                    ) : (
                      waitingList.map((appt) => {
                        const pet = getPetById(appt.petId);
                        return (
                          <span
                            key={appt.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg"
                          >
                            <span className="font-mono font-medium">{appt.queueNumber}</span>
                            <span className="text-emerald-600">{pet?.name}</span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
