import { AppointmentStatus, RoomStatus, BillStatus } from '../types';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: AppointmentStatus | RoomStatus | BillStatus;
  type?: 'appointment' | 'room' | 'bill';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  waiting: { label: '等待中', className: 'bg-amber-100 text-amber-700' },
  called: { label: '已叫号', className: 'bg-blue-100 text-blue-700' },
  visiting: { label: '就诊中', className: 'bg-emerald-100 text-emerald-700' },
  completed: { label: '已完成', className: 'bg-slate-100 text-slate-600' },
  cancelled: { label: '已取消', className: 'bg-red-100 text-red-600' },
  idle: { label: '空闲', className: 'bg-emerald-100 text-emerald-700' },
  busy: { label: '繁忙', className: 'bg-amber-100 text-amber-700' },
  offline: { label: '离线', className: 'bg-slate-100 text-slate-500' },
  unpaid: { label: '待支付', className: 'bg-amber-100 text-amber-700' },
  paid: { label: '已支付', className: 'bg-emerald-100 text-emerald-700' },
  refunded: { label: '已退款', className: 'bg-slate-100 text-slate-600' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-60"></span>
      {config.label}
    </span>
  );
}
