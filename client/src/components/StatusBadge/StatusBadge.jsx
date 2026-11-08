import React from 'react';
import {
  AlertOctagon,
  Activity,
  Loader2,
  CheckCircle2,
  MinusCircle,
} from 'lucide-react';

const STATUS_CONFIG = {
  failed: {
    label: 'Failed',
    bg: 'bg-rose-950/80',
    border: 'border-rose-700',
    text: 'text-rose-200',
    iconColor: 'text-rose-400',
    Icon: AlertOctagon,
  },
  in_use: {
    label: 'In Use',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-700',
    text: 'text-emerald-200',
    iconColor: 'text-emerald-400',
    Icon: Activity,
  },
  provisioning: {
    label: 'Provisioning',
    bg: 'bg-sky-950/80',
    border: 'border-sky-700',
    text: 'text-sky-200',
    iconColor: 'text-sky-400',
    Icon: Loader2,
    spin: true,
  },
  ready: {
    label: 'Ready',
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    text: 'text-slate-300',
    iconColor: 'text-slate-400',
    Icon: CheckCircle2,
  },
  deprovisioned: {
    label: 'Deprovisioned',
    bg: 'bg-zinc-900',
    border: 'border-zinc-800',
    text: 'text-zinc-400',
    iconColor: 'text-zinc-500',
    Icon: MinusCircle,
  },
};

export const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ready;
  const { label, bg, border, text, iconColor, Icon, spin } = config;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${bg} ${border} ${text} select-none`}
    >
      <Icon className={`w-3.5 h-3.5 ${iconColor} ${spin ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
