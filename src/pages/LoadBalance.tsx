import { useState, useMemo } from 'react';
import {
  BarChart3,
  ArrowRightLeft,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  MoveRight,
  Check,
  X,
  Play,
  Zap,
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  SquareCheckBig,
  Square,
} from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePetStore } from '../store/usePetStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  calculateLoadBalance,
  generateBatchTransferSuggestions,
  estimateWaitTime,
  previewTransferImpact,
  previewBatchTransferImpact,
} from '../utils/loadBalancer';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { TransferSuggestion, TriagePriority, TransferItem } from '../types';

export default function LoadBalance() {
  const { rooms, getRoomById } = useRoomStore();
  const {
    appointments,
    transferAppointment,
    batchTransfer,
    getWaitingQueue,
    getAppointmentById,
  } = useQueueStore();
  const { pets, getPetById } = usePetStore();
  const { billingConfig } = useSettingsStore();

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [selectedTransfers, setSelectedTransfers] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState(false);

  const loadInfos = calculateLoadBalance(rooms, appointments, billingConfig);
  const batchSuggestions = generateBatchTransferSuggestions(rooms, appointments, billingConfig, pets);

  const activeRooms = rooms.filter((r) => r.status !== 'offline');
  const avgLoad =
    loadInfos.reduce((sum, info) => sum + info.loadRate, 0) / Math.max(loadInfos.length, 1);

  const overallBalanceBefore = useMemo(() => {
    if (loadInfos.length === 0) return 0;
    const avg = loadInfos.reduce((sum, l) => sum + l.loadRate, 0) / loadInfos.length;
    const variance = loadInfos.reduce((sum, l) => sum + Math.pow(l.loadRate - avg, 2), 0) / loadInfos.length;
    return Math.sqrt(variance);
  }, [loadInfos]);

  const batchPreview = useMemo(() => {
    if (selectedTransfers.size === 0) return null;

    const selectedSuggestions = batchSuggestions.filter((s) => selectedTransfers.has(s.appointmentId));
    const transfers: TransferItem[] = selectedSuggestions.map((s) => ({
      appointmentId: s.appointmentId,
      fromRoomId: s.fromRoomId,
      toRoomId: s.toRoomId,
    }));

    return previewBatchTransferImpact(transfers, rooms, appointments, billingConfig, pets);
  }, [selectedTransfers, batchSuggestions, rooms, appointments, billingConfig, pets]);

  const overallBalanceAfter = batchPreview?.overallBalanceAfter ?? overallBalanceBefore;
  const totalImprovement = batchPreview?.totalImprovementMinutes ?? 0;

  const maxLoad = Math.max(...loadInfos.map((l) => l.loadRate), 0.1);

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

  const handleApplySuggestion = (suggestion: TransferSuggestion) => {
    if (
      confirm(
        `建议将 ${suggestion.queueNumber} 从 ${suggestion.fromRoomName} 调剂到 ${suggestion.toRoomName}，是否执行？`
      )
    ) {
      transferAppointment(suggestion.appointmentId, suggestion.toRoomId);
    }
  };

  const handleToggleTransfer = (appointmentId: string) => {
    const newSelected = new Set(selectedTransfers);
    if (newSelected.has(appointmentId)) {
      newSelected.delete(appointmentId);
    } else {
      newSelected.add(appointmentId);
    }
    setSelectedTransfers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransfers.size === batchSuggestions.length) {
      setSelectedTransfers(new Set());
    } else {
      setSelectedTransfers(new Set(batchSuggestions.map((s) => s.appointmentId)));
    }
  };

  const handleExecuteBatch = () => {
    if (selectedTransfers.size === 0) {
      alert('请先选择要调剂的患宠');
      return;
    }

    const transfers = Array.from(selectedTransfers).map((id) => {
      const suggestion = batchSuggestions.find((s) => s.appointmentId === id);
      return {
        appointmentId: id,
        fromRoomId: suggestion!.fromRoomId,
        toRoomId: suggestion!.toRoomId,
      };
    });

    if (
      confirm(
        `确认批量调剂 ${transfers.length} 位患宠？\n预计总等待时间改善 ${totalImprovement} 分钟`
      )
    ) {
      batchTransfer(transfers);
      setSelectedTransfers(new Set());
      setPreviewMode(false);
    }
  };

  const getLoadColor = (loadRate: number) => {
    if (loadRate > 0.7) return 'text-red-600';
    if (loadRate > 0.4) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getLoadBarColor = (loadRate: number) => {
    if (loadRate > 0.7) return 'bg-red-500';
    if (loadRate > 0.4) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-emerald-600" />
            调度监控台
          </h1>
          <p className="text-slate-500 mt-1">实时监控各诊室负载，智能调度均衡</p>
        </div>
        <div className="flex items-center gap-3">
          {batchSuggestions.length > 0 && (
            <button
              onClick={() => setShowBatchPanel(!showBatchPanel)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium ${
                showBatchPanel
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white text-amber-600 hover:bg-amber-50 shadow-sm'
              }`}
            >
              <Zap className="w-5 h-5" />
              批量调剂
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {batchSuggestions.length} 条建议
              </span>
            </button>
          )}
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
            <span className="text-sm text-slate-500">平均负载：</span>
            <span className="font-semibold text-emerald-600">
              {Math.round(avgLoad * 100)}%
            </span>
          </div>
        </div>
      </div>

      {showBatchPanel && batchSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                批量调剂建议
              </h2>
              <p className="text-sm text-amber-600 mt-1">
                系统检测到队列不均衡，以下调剂可显著改善整体等待时间
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  previewMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Play className="w-4 h-4" />
                {previewMode ? '隐藏预览' : '预览效果'}
              </button>
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-sm font-medium"
              >
                {selectedTransfers.size === batchSuggestions.length ? (
                  <SquareCheckBig className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedTransfers.size === batchSuggestions.length ? '取消全选' : '全选'}
              </button>
            </div>
          </div>

          {previewMode && selectedTransfers.size > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">调剂数量</div>
                  <div className="text-2xl font-bold text-slate-800">
                    {selectedTransfers.size} 位
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">总等待改善</div>
                  <div className="text-2xl font-bold text-emerald-600 flex items-center gap-1">
                    <TrendingDown className="w-5 h-5" />
                    {totalImprovement} 分钟
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">均衡度改善</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {((overallBalanceBefore - overallBalanceAfter) / overallBalanceBefore * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">涉及诊室</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(batchSuggestions.filter(s => selectedTransfers.has(s.appointmentId)).map(s => s.fromRoomId)).size +
                     new Set(batchSuggestions.filter(s => selectedTransfers.has(s.appointmentId)).map(s => s.toRoomId)).size} 间
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-blue-800 mb-1">排序规则说明</div>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">优先级：</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">急诊</span>
                        <span className="text-slate-400">&gt;</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">复诊</span>
                        <span className="text-slate-400">&gt;</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">普通</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">同级排序：</span>
                        <span>优先预约号，再按取号时间排序</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
            {batchSuggestions.map((suggestion, index) => {
              const isSelected = selectedTransfers.has(suggestion.appointmentId);
              const appt = getAppointmentById(suggestion.appointmentId);
              const pet = appt ? getPetById(appt.petId) : null;

              return (
                <div
                  key={suggestion.appointmentId}
                  className={`flex items-center justify-between bg-white rounded-xl p-4 transition-all ${
                    isSelected ? 'ring-2 ring-amber-400 bg-amber-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleTransfer(suggestion.appointmentId)}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-xs text-slate-400">从</div>
                        <div className="font-medium text-red-600">{suggestion.fromRoomName}</div>
                      </div>
                      <MoveRight className="w-5 h-5 text-slate-300" />
                      <div className="text-center">
                        <div className="text-xs text-slate-400">到</div>
                        <div className="font-medium text-emerald-600">{suggestion.toRoomName}</div>
                      </div>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-700">
                        {suggestion.queueNumber}
                      </span>
                      <span className="text-slate-500">{pet?.name}</span>
                      {appt && appt.priorityLevel > 0 && (
                        <PriorityBadge priority={appt.priority as TriagePriority} />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {previewMode && (
                      <div className="flex flex-col gap-2">
                        {(() => {
                          const previewItem = batchPreview?.items.find(
                            (item) => item.appointmentId === suggestion.appointmentId
                          );
                          if (previewItem) {
                            const isPositionWorse = previewItem.estimatedPositionAfter > previewItem.currentPosition;
                            return (
                              <>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-slate-500">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    {previewItem.currentWaitMinutes} 分钟
                                  </span>
                                  <span className="text-slate-600 font-mono">
                                    （第{previewItem.currentPosition}位）
                                  </span>
                                  <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                                  <span className={`font-medium ${isPositionWorse ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {previewItem.estimatedWaitMinutesAfter} 分钟
                                  </span>
                                  <span className={`font-mono ${isPositionWorse ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    （第{previewItem.estimatedPositionAfter}位）
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    previewItem.improvementMinutes >= 0
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {previewItem.improvementMinutes >= 0 ? (
                                      <>
                                        <TrendingDown className="w-3 h-3 inline mr-1" />
                                        -{previewItem.improvementMinutes} 分钟
                                      </>
                                    ) : (
                                      <>
                                        <TrendingUp className="w-3 h-3 inline mr-1" />
                                        +{Math.abs(previewItem.improvementMinutes)} 分钟
                                      </>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-400">
                                    当前：{previewItem.currentSortReason}
                                  </span>
                                  <span className="text-slate-300">|</span>
                                  <span className="text-slate-400">
                                    调剂后：{previewItem.sortReason}
                                  </span>
                                  {isPositionWorse && (
                                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                      <AlertCircle className="w-3 h-3" />
                                      位置靠后
                                    </span>
                                  )}
                                </div>
                              </>
                            );
                          }
                          return (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-500">
                                <Clock className="w-4 h-4 inline mr-1" />
                                {suggestion.currentWaitMinutes} 分钟
                              </span>
                              <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                              <span className="text-emerald-600 font-medium">
                                {suggestion.estimatedWaitMinutesAfter} 分钟
                              </span>
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                <TrendingDown className="w-3 h-3 inline mr-1" />
                                -{suggestion.improvementMinutes} 分钟
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <button
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      单独执行
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-amber-200">
            <div className="text-sm text-amber-700">
              已选择 <span className="font-bold">{selectedTransfers.size}</span> 项调剂
              {previewMode && selectedTransfers.size > 0 && (
                <span className="ml-2">
                  预计整体均衡度从 <span className="font-bold">{(overallBalanceBefore * 100).toFixed(1)}%</span> 改善到 <span className="font-bold text-emerald-600">{(overallBalanceAfter * 100).toFixed(1)}%</span>
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBatchPanel(false);
                  setSelectedTransfers(new Set());
                  setPreviewMode(false);
                }}
                className="px-5 py-2.5 text-slate-600 bg-white rounded-xl hover:bg-slate-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleExecuteBatch}
                disabled={selectedTransfers.size === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/30"
              >
                <Zap className="w-5 h-5" />
                一键批量调剂
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">队列均衡度</p>
              <p className={`text-2xl font-bold ${
                overallBalanceBefore < 0.1 ? 'text-emerald-600' :
                overallBalanceBefore < 0.2 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {(overallBalanceBefore * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          诊室负载监控
        </h2>

        <div className="space-y-5">
          {loadInfos.map((info) => {
            const room = getRoomById(info.roomId);
            if (!room) return null;

            const loadPercent = (info.loadRate / Math.max(maxLoad, 0.01)) * 100;
            const waitMinutes = estimateWaitTime(info.roomId, appointments, billingConfig);
            const waitingList = getWaitingQueue(info.roomId);

            return (
              <div key={info.roomId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      info.loadRate > 0.7 ? 'bg-red-100' :
                      info.loadRate > 0.4 ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                      {info.loadRate > 0.7 ? (
                        <ArrowUpFromLine className="w-6 h-6 text-red-600" />
                      ) : info.loadRate < 0.3 ? (
                        <ArrowDownToLine className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <BarChart3 className={`w-6 h-6 ${getLoadColor(info.loadRate)}`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-lg">{room.name}</span>
                        <StatusBadge status={room.status} type="room" />
                      </div>
                      <span className="text-sm text-slate-500">{room.vetName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">等待数</p>
                      <p className="font-semibold text-slate-700 text-lg">{info.waitingCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">预计等待</p>
                      <p className="font-semibold text-slate-700 text-lg">{waitMinutes} 分钟</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">负载率</p>
                      <p className={`font-bold text-lg ${getLoadColor(info.loadRate)}`}>
                        {Math.round(info.loadRate * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getLoadBarColor(info.loadRate)} rounded-full transition-all duration-500`}
                    style={{ width: `${loadPercent}%` }}
                  />
                </div>
                {waitingList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-16">
                    {waitingList.slice(0, 8).map((appt) => {
                      const pet = getPetById(appt.petId);
                      return (
                        <span
                          key={appt.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium ${
                            appt.priorityLevel > 0
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className="font-mono">{appt.queueNumber}</span>
                          <span className="truncate max-w-16">{pet?.name}</span>
                        </span>
                      );
                    })}
                    {waitingList.length > 8 && (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-500">
                        +{waitingList.length - 8} 位
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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

            {selectedAppointmentId && targetRoomId && (
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium">调剂预览</p>
                <div className="mt-2 text-sm text-blue-600">
                  {(() => {
                    const impact = previewTransferImpact(
                      selectedAppointmentId,
                      getAppointmentById(selectedAppointmentId)?.roomId || '',
                      targetRoomId,
                      rooms,
                      appointments,
                      billingConfig,
                      pets
                    );
                    const isPositionWorse = impact.estimatedPositionAfter > impact.currentPosition;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span>当前等待：{impact.currentWaitMinutes} 分钟</span>
                          <span className="font-mono">（第{impact.currentPosition}位）</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>预计等待：{impact.estimatedWaitMinutesAfter} 分钟</span>
                          <span className={`font-mono ${isPositionWorse ? 'text-amber-600' : ''}`}>
                            （第{impact.estimatedPositionAfter}位）
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-medium">
                            改善：{impact.improvementMinutes} 分钟
                          </span>
                          {isPositionWorse && (
                            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs">
                              <AlertCircle className="w-3 h-3" />
                              位置靠后
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-blue-500 pt-1 border-t border-blue-200">
                          <span>当前排序：{impact.currentSortReason}</span>
                          <span className="mx-2">|</span>
                          <span>调剂后排序：{impact.sortReason}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      waitingList.length === 0
                        ? 'bg-emerald-100 text-emerald-600'
                        : waitingList.length > 3
                        ? 'bg-red-100 text-red-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
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
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium ${
                              appt.priorityLevel > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            <span className="font-mono">{appt.queueNumber}</span>
                            <span className="truncate max-w-16">{pet?.name}</span>
                            {appt.priorityLevel > 0 && (
                              <span className="text-[10px] bg-white/50 px-1 rounded">
                                {appt.priority === 'emergency' ? '急' : '复'}
                              </span>
                            )}
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
