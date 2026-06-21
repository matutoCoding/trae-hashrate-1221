import { Room, Appointment, LoadBalanceInfo, BillingConfig, TransferSuggestion, TransferImpactPreview, BatchTransferImpactPreview, TransferItem, Pet } from '../types';

function sortAppointmentsByPriority(a: Appointment, b: Appointment): number {
  if (a.priorityLevel !== b.priorityLevel) {
    return b.priorityLevel - a.priorityLevel;
  }
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function getWaitingQueueSorted(roomId: string, appointments: Appointment[]): Appointment[] {
  return appointments
    .filter((a) => a.roomId === roomId && a.status === 'waiting')
    .sort(sortAppointmentsByPriority);
}

function getAppointmentPosition(
  appointmentId: string,
  roomId: string,
  appointments: Appointment[]
): number {
  const sortedQueue = getWaitingQueueSorted(roomId, appointments);
  const index = sortedQueue.findIndex((a) => a.id === appointmentId);
  return index === -1 ? -1 : index + 1;
}

export function calculateLoadBalance(
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig
): LoadBalanceInfo[] {
  const activeRooms = rooms.filter((r) => r.status !== 'offline');

  const maxQueueLength = Math.max(
    ...activeRooms.map(
      (room) =>
        appointments.filter(
          (a) => a.roomId === room.id && (a.status === 'waiting' || a.status === 'called' || a.status === 'visiting')
        ).length
    ),
    1
  );

  return activeRooms.map((room) => {
    const waitingList = appointments.filter(
      (a) => a.roomId === room.id && (a.status === 'waiting' || a.status === 'called')
    );
    const currentPatient = appointments.find(
      (a) => a.roomId === room.id && a.status === 'visiting'
    );
    const totalPatients = waitingList.length + (currentPatient ? 1 : 0);

    const loadRate = totalPatients / Math.max(maxQueueLength, 1);

    const estimatedWaitMinutes = room.status === 'offline'
      ? Infinity
      : (waitingList.length + (currentPatient ? 0.5 : 0)) * config.avgVisitMinutes;

    return {
      roomId: room.id,
      waitingCount: waitingList.length,
      loadRate: Math.min(loadRate, 1),
      estimatedWaitMinutes,
    };
  });
}

export function findLeastBusyRoom(
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig
): Room | null {
  const loadInfos = calculateLoadBalance(rooms, appointments, config);
  const sortedByLoad = [...loadInfos].sort((a, b) => {
    if (a.estimatedWaitMinutes !== b.estimatedWaitMinutes) {
      return a.estimatedWaitMinutes - b.estimatedWaitMinutes;
    }
    return a.loadRate - b.loadRate;
  });

  if (sortedByLoad.length === 0) return null;

  const leastBusy = sortedByLoad[0];
  return rooms.find((r) => r.id === leastBusy.roomId) || null;
}

export function estimateWaitTime(
  roomId: string,
  appointments: Appointment[],
  config: BillingConfig,
  additionalWaitCount?: number
): number;

export function estimateWaitTime(
  roomId: string,
  appointments: Appointment[],
  config: BillingConfig,
  appointmentId?: string
): number;

export function estimateWaitTime(
  roomId: string,
  appointments: Appointment[],
  config: BillingConfig,
  param: number | string = 0
): number {
  const currentPatient = appointments.find(
    (a) => a.roomId === roomId && a.status === 'visiting'
  );

  if (typeof param === 'number') {
    const waitingList = appointments.filter(
      (a) => a.roomId === roomId && a.status === 'waiting'
    );
    const count = waitingList.length + param + (currentPatient ? 0.5 : 0);
    return Math.round(count * config.avgVisitMinutes);
  }

  const appointmentId = param;
  const sortedQueue = getWaitingQueueSorted(roomId, appointments);
  const position = sortedQueue.findIndex((a) => a.id === appointmentId);

  if (position === -1) {
    const waitingList = appointments.filter(
      (a) => a.roomId === roomId && a.status === 'waiting'
    );
    return Math.round((waitingList.length + (currentPatient ? 0.5 : 0)) * config.avgVisitMinutes);
  }

  const count = position + (currentPatient ? 0.5 : 0);
  return Math.round(count * config.avgVisitMinutes);
}

export function previewTransferImpact(
  appointmentId: string,
  fromRoomId: string,
  toRoomId: string,
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig,
  pets: Pet[]
): TransferImpactPreview {
  const appointment = appointments.find((a) => a.id === appointmentId);
  const pet = pets.find((p) => p.id === appointment?.petId);
  const fromRoom = rooms.find((r) => r.id === fromRoomId);
  const toRoom = rooms.find((r) => r.id === toRoomId);

  const currentWaitMinutes = estimateWaitTime(fromRoomId, appointments, config, appointmentId);
  const currentPosition = getAppointmentPosition(appointmentId, fromRoomId, appointments);

  const appointmentsAfterTransfer = appointments.map((a) =>
    a.id === appointmentId ? { ...a, roomId: toRoomId } : a
  );

  const estimatedWaitMinutesAfter = estimateWaitTime(
    toRoomId,
    appointmentsAfterTransfer,
    config,
    appointmentId
  );
  const estimatedPositionAfter = getAppointmentPosition(
    appointmentId,
    toRoomId,
    appointmentsAfterTransfer
  );

  const improvementMinutes = currentWaitMinutes - estimatedWaitMinutesAfter;

  return {
    appointmentId,
    queueNumber: appointment?.queueNumber || '',
    petName: pet?.name || '',
    fromRoomId,
    fromRoomName: fromRoom?.name || '',
    toRoomId,
    toRoomName: toRoom?.name || '',
    currentWaitMinutes,
    estimatedWaitMinutesAfter,
    improvementMinutes,
    currentPosition,
    estimatedPositionAfter,
  };
}

export function previewBatchTransferImpact(
  transfers: TransferItem[],
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig,
  pets: Pet[]
): BatchTransferImpactPreview {
  const items: TransferImpactPreview[] = [];

  // 批量调剂计算逻辑：
  // 1. 第一步：一次性将所有调剂应用到临时数组中
  //    这样 tempAppointments 包含了所有调剂后的完整状态
  //    确保后续计算每只患宠位置时，其他已调剂的患宠也在目标队列中参与排序
  let tempAppointments = [...appointments];
  for (const transfer of transfers) {
    tempAppointments = tempAppointments.map((a) =>
      a.id === transfer.appointmentId ? { ...a, roomId: transfer.toRoomId } : a
    );
  }

  // 2. 第二步：基于包含所有调剂的 tempAppointments，逐个计算每只患宠的影响
  //    关键：使用 tempAppointments 计算时，所有同时调剂的患宠都已在目标队列中
  //    这样它们会互相影响排序，得到准确的最终位置和等待时间
  for (const transfer of transfers) {
    const appointment = appointments.find((a) => a.id === transfer.appointmentId);
    const pet = pets.find((p) => p.id === appointment?.petId);
    const fromRoom = rooms.find((r) => r.id === transfer.fromRoomId);
    const toRoom = rooms.find((r) => r.id === transfer.toRoomId);

    // 当前状态：基于原始 appointments 计算
    const currentWaitMinutes = estimateWaitTime(
      transfer.fromRoomId,
      appointments,
      config,
      transfer.appointmentId
    );
    const currentPosition = getAppointmentPosition(
      transfer.appointmentId,
      transfer.fromRoomId,
      appointments
    );

    // 调剂后状态：基于已应用所有调剂的 tempAppointments 计算
    // 此时其他同时调剂的患宠也已在目标队列中参与排序
    const estimatedWaitMinutesAfter = estimateWaitTime(
      transfer.toRoomId,
      tempAppointments,
      config,
      transfer.appointmentId
    );
    const estimatedPositionAfter = getAppointmentPosition(
      transfer.appointmentId,
      transfer.toRoomId,
      tempAppointments
    );

    const improvementMinutes = currentWaitMinutes - estimatedWaitMinutesAfter;

    items.push({
      appointmentId: transfer.appointmentId,
      queueNumber: appointment?.queueNumber || '',
      petName: pet?.name || '',
      fromRoomId: transfer.fromRoomId,
      fromRoomName: fromRoom?.name || '',
      toRoomId: transfer.toRoomId,
      toRoomName: toRoom?.name || '',
      currentWaitMinutes,
      estimatedWaitMinutesAfter,
      improvementMinutes,
      currentPosition,
      estimatedPositionAfter,
    });
  }

  const totalImprovementMinutes = items.reduce((sum, item) => sum + item.improvementMinutes, 0);

  const loadInfosBefore = calculateLoadBalance(rooms, appointments, config);
  const loadInfosAfter = calculateLoadBalance(rooms, tempAppointments, config);

  const avgLoadBefore = loadInfosBefore.reduce((sum, l) => sum + l.loadRate, 0) / loadInfosBefore.length;
  const avgLoadAfter = loadInfosAfter.reduce((sum, l) => sum + l.loadRate, 0) / loadInfosAfter.length;

  const varianceBefore = loadInfosBefore.reduce((sum, l) => sum + Math.pow(l.loadRate - avgLoadBefore, 2), 0) / loadInfosBefore.length;
  const varianceAfter = loadInfosAfter.reduce((sum, l) => sum + Math.pow(l.loadRate - avgLoadAfter, 2), 0) / loadInfosAfter.length;

  const overallBalanceBefore = Math.sqrt(varianceBefore);
  const overallBalanceAfter = Math.sqrt(varianceAfter);

  const balanceImprovementPercent = overallBalanceBefore > 0
    ? ((overallBalanceBefore - overallBalanceAfter) / overallBalanceBefore) * 100
    : 0;

  return {
    items,
    totalImprovementMinutes,
    overallBalanceBefore,
    overallBalanceAfter,
    balanceImprovementPercent,
  };
}

export function generateBatchTransferSuggestions(
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig,
  pets: Pet[]
): TransferSuggestion[] {
  const suggestions: TransferSuggestion[] = [];
  const loadInfos = calculateLoadBalance(rooms, appointments, config);

  const sortedByLoadDesc = [...loadInfos].sort((a, b) => b.loadRate - a.loadRate);
  const sortedByLoadAsc = [...loadInfos].sort((a, b) => a.loadRate - b.loadRate);

  const avgLoad = loadInfos.reduce((sum, l) => sum + l.loadRate, 0) / loadInfos.length;
  const loadThreshold = avgLoad * 1.5;

  const busyRooms = sortedByLoadDesc.filter((l) => l.loadRate > loadThreshold && l.waitingCount >= 2);
  const idleRooms = sortedByLoadAsc.filter((l) => l.loadRate < avgLoad * 0.7);

  if (busyRooms.length > 0 && idleRooms.length > 0) {
    for (const busyRoom of busyRooms) {
      const waitingAppointments = getWaitingQueueSorted(busyRoom.roomId, appointments)
        .filter((a) => a.priorityLevel === 0);

      const maxTransfer = Math.min(
        Math.ceil(busyRoom.waitingCount * 0.4),
        Math.max(1, busyRoom.waitingCount - 2)
      );

      const toTransfer = waitingAppointments.slice(0, maxTransfer);

      for (let i = 0; i < toTransfer.length; i++) {
        const appt = toTransfer[i];
        const targetRoom = idleRooms[i % idleRooms.length];
        const fromRoom = rooms.find((r) => r.id === busyRoom.roomId);
        const toRoom = rooms.find((r) => r.id === targetRoom.roomId);
        const pet = pets.find((p) => p.id === appt.petId);

        const impact = previewTransferImpact(
          appt.id,
          busyRoom.roomId,
          targetRoom.roomId,
          rooms,
          appointments,
          config,
          pets
        );

        if (impact.improvementMinutes > 0) {
          suggestions.push({
            appointmentId: appt.id,
            queueNumber: appt.queueNumber,
            petName: pet?.name || '',
            fromRoomId: busyRoom.roomId,
            fromRoomName: fromRoom?.name || '',
            toRoomId: targetRoom.roomId,
            toRoomName: toRoom?.name || '',
            currentWaitMinutes: impact.currentWaitMinutes,
            estimatedWaitMinutesAfter: impact.estimatedWaitMinutesAfter,
            improvementMinutes: impact.improvementMinutes,
          });
        }
      }
    }
  }

  return suggestions;
}

export function rebalanceAppointments(
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig,
  pets: Pet[]
): { fromRoomId: string; toRoomId: string; appointmentId: string }[] {
  const suggestions = generateBatchTransferSuggestions(rooms, appointments, config, pets);
  return suggestions.map((s) => ({
    fromRoomId: s.fromRoomId,
    toRoomId: s.toRoomId,
    appointmentId: s.appointmentId,
  }));
}
