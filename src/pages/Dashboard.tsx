import {
  Users,
  Clock,
  CheckCircle,
  Activity,
  Stethoscope,
  Bell,
} from 'lucide-react';
import { useQueueStore } from '../store/useQueueStore';
import { useRoomStore } from '../store/useRoomStore';
import { usePetStore } from '../store/usePetStore';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { getTodayStats, appointments, getWaitingQueue } = useQueueStore();
  const { rooms } = useRoomStore();
  const { getPetById } = usePetStore();

  const stats = getTodayStats();
  const allWaiting = getWaitingQueue();
  const activeRooms = rooms.filter((r) => r.status !== 'offline');

  const statCards = [
    {
      label: '今日挂号',
      value: stats.total,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: '等待中',
      value: stats.waiting,
      icon: Clock,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
    },
    {
      label: '就诊中',
      value: stats.visiting,
      icon: Stethoscope,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
    },
    {
      label: '已完成',
      value: stats.completed,
      icon: CheckCircle,
      color: 'bg-slate-500',
      bgColor: 'bg-slate-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">首页仪表盘</h1>
          <p className="text-slate-500 mt-1">实时监控诊疗排号状态</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bgColor} rounded-2xl p-5 transition-transform hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-600 text-sm">{card.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-xl text-white`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              叫号大屏
            </h2>
            <span className="text-xs text-slate-400">实时更新</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRooms.map((room) => {
              const currentAppt = appointments.find(
                (a) => a.id === room.currentAppointmentId
              );
              const pet = currentAppt ? getPetById(currentAppt.petId) : null;
              const waitingCount = allWaiting.filter(
                (a) => a.roomId === room.id
              ).length;

              return (
                <div
                  key={room.id}
                  className={`rounded-xl p-5 border-2 transition-all ${
                    room.status === 'busy'
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800">{room.name}</h3>
                    <StatusBadge status={room.status} type="room" />
                  </div>

                  {currentAppt && pet ? (
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-3">
                        <span
                          className={`text-3xl font-bold ${
                            currentAppt.status === 'visiting'
                              ? 'text-emerald-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {currentAppt.queueNumber}
                        </span>
                        <span className="text-slate-600">{pet.name}</span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'} {pet.breed}
                      </p>
                      <p className="text-xs text-slate-400">
                        主治医生：{room.vetName}
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂未叫号</p>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      等待人数：<span className="font-medium text-slate-700">{waitingCount}</span> 位
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">等待队列</h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {allWaiting.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无等待患宠</p>
              </div>
            ) : (
              allWaiting.map((appt, index) => {
                const pet = getPetById(appt.petId);
                const room = rooms.find((r) => r.id === appt.roomId);

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
                        <span className="font-medium text-slate-800">
                          {pet?.name || '未知'}
                        </span>
                        <StatusBadge status={appt.status} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {room?.name} · {appt.queueNumber}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
