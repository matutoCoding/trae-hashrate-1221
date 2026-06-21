import { Room, Appointment, LoadBalanceInfo, BillingConfig } from '../types';

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

export function rebalanceAppointments(
  rooms: Room[],
  appointments: Appointment[],
  config: BillingConfig
): { fromRoomId: string; toRoomId: string; appointmentId: string }[] {
  const suggestions: { fromRoomId: string; toRoomId: string; appointmentId: string }[] = [];
  const loadInfos = calculateLoadBalance(rooms, appointments, config);

  const sortedByLoadDesc = [...loadInfos].sort((a, b) => b.loadRate - a.loadRate);
  const sortedByLoadAsc = [...loadInfos].sort((a, b) => a.loadRate - b.loadRate);

  if (sortedByLoadDesc.length >= 2) {
    const busiest = sortedByLoadDesc[0];
    const leastBusy = sortedByLoadAsc[0];

    if (busiest.loadRate - leastBusy.loadRate > 0.3 && busiest.waitingCount > 2) {
      const waitingAppointments = appointments
        .filter((a) => a.roomId === busiest.roomId && a.status === 'waiting')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (waitingAppointments.length > 0) {
        const lastAppointment = waitingAppointments[waitingAppointments.length - 1];
        suggestions.push({
          fromRoomId: busiest.roomId,
          toRoomId: leastBusy.roomId,
          appointmentId: lastAppointment.id,
        });
      }
    }
  }

  return suggestions;
}

export function estimateWaitTime(
  roomId: string,
  appointments: Appointment[],
  config: BillingConfig
): number {
  const waitingList = appointments.filter(
    (a) => a.roomId === roomId && a.status === 'waiting'
  );
  const currentPatient = appointments.find(
    (a) => a.roomId === roomId && a.status === 'visiting'
  );

  const count = waitingList.length + (currentPatient ? 0.5 : 0);
  return Math.round(count * config.avgVisitMinutes);
}
