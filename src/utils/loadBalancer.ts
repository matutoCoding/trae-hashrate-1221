import { Room, Appointment, LoadBalanceInfo, BillingConfig, TransferSuggestion } from '../types';

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
  additionalWaitCount: number = 0
): number {
  const waitingList = appointments.filter(
    (a) => a.roomId === roomId && a.status === 'waiting'
  );
  const currentPatient = appointments.find(
    (a) => a.roomId === roomId && a.status === 'visiting'
  );

  const count = waitingList.length + additionalWaitCount + (currentPatient ? 0.5 : 0);
  return Math.round(count * config.avgVisitMinutes);
}

export function previewTransferImpact(
  appointmentId: string,
  fromRoomId: string,
  toRoomId: string,
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig
): {
  currentWaitMinutes: number;
  estimatedWaitMinutesAfter: number;
  improvementMinutes: number;
  fromRoomWaitAfter: number;
  toRoomWaitAfter: number;
  overallBalanceBefore: number;
  overallBalanceAfter: number;
} {
  const appointment = appointments.find((a) => a.id === appointmentId);
  const petName = appointment ? (appointments.find((p) => p.id === appointment.petId)?.id || '') : '';

  const currentWaitMinutes = estimateWaitTime(fromRoomId, appointments, config);

  const appointmentsAfterTransfer = appointments.map((a) =>
    a.id === appointmentId ? { ...a, roomId: toRoomId } : a
  );

  const toRoomWaitAfter = estimateWaitTime(toRoomId, appointmentsAfterTransfer, config);
  const fromRoomWaitAfter = estimateWaitTime(fromRoomId, appointmentsAfterTransfer, config);

  const estimatedWaitMinutesAfter = estimateWaitTime(toRoomId, appointmentsAfterTransfer, config);
  const improvementMinutes = currentWaitMinutes - estimatedWaitMinutesAfter;

  const loadInfosBefore = calculateLoadBalance(rooms, appointments, config);
  const loadInfosAfter = calculateLoadBalance(rooms, appointmentsAfterTransfer, config);

  const avgLoadBefore = loadInfosBefore.reduce((sum, l) => sum + l.loadRate, 0) / loadInfosBefore.length;
  const avgLoadAfter = loadInfosAfter.reduce((sum, l) => sum + l.loadRate, 0) / loadInfosAfter.length;

  const varianceBefore = loadInfosBefore.reduce((sum, l) => sum + Math.pow(l.loadRate - avgLoadBefore, 2), 0) / loadInfosBefore.length;
  const varianceAfter = loadInfosAfter.reduce((sum, l) => sum + Math.pow(l.loadRate - avgLoadAfter, 2), 0) / loadInfosAfter.length;

  const overallBalanceBefore = Math.sqrt(varianceBefore);
  const overallBalanceAfter = Math.sqrt(varianceAfter);

  return {
    currentWaitMinutes,
    estimatedWaitMinutesAfter,
    improvementMinutes,
    fromRoomWaitAfter,
    toRoomWaitAfter,
    overallBalanceBefore,
    overallBalanceAfter,
  };
}

export function generateBatchTransferSuggestions(
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig
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
      const waitingAppointments = appointments
        .filter((a) => a.roomId === busyRoom.roomId && a.status === 'waiting' && a.priorityLevel === 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
        const pet = appointments.find((p) => p.id === appt.petId);

        const impact = previewTransferImpact(
          appt.id,
          busyRoom.roomId,
          targetRoom.roomId,
          rooms,
          appointments,
          config
        );

        if (impact.improvementMinutes > 0) {
          suggestions.push({
            appointmentId: appt.id,
            queueNumber: appt.queueNumber,
            petName: pet?.id || '',
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
  config: BillingConfig
): { fromRoomId: string; toRoomId: string; appointmentId: string }[] {
  const suggestions = generateBatchTransferSuggestions(rooms, appointments, config);
  return suggestions.map((s) => ({
    fromRoomId: s.fromRoomId,
    toRoomId: s.toRoomId,
    appointmentId: s.appointmentId,
  }));
}
