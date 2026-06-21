import { TriagePriority, triagePriorityConfig } from '../types';
import { cn } from '../lib/utils';
import { AlertTriangle, RefreshCw, Circle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TriagePriority;
  showReason?: boolean;
}

const iconMap = {
  emergency: AlertTriangle,
  followup: RefreshCw,
  normal: Circle,
};

export default function PriorityBadge({ priority, showReason = false }: PriorityBadgeProps) {
  const config = triagePriorityConfig[priority];
  const Icon = iconMap[priority];

  const colorClasses: Record<TriagePriority, string> = {
    emergency: 'bg-red-100 text-red-700 border-red-200',
    followup: 'bg-blue-100 text-blue-700 border-blue-200',
    normal: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const reasonText: Record<TriagePriority, string> = {
    emergency: '急诊优先处理',
    followup: '复诊优先处理',
    normal: '按取号顺序',
  };

  return (
    <div className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
          colorClasses[priority]
        )}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
      {showReason && priority !== 'normal' && (
        <span className="text-xs text-slate-400 ml-1">({reasonText[priority]})</span>
      )}
    </div>
  );
}
