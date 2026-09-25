'use client';

import React from 'react';
import { SyncStatus } from '@/types';
import { CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function SyncStatusBadge({ status, onRetry, isRetrying }: SyncStatusBadgeProps) {
  if (status === 'SYNCED') {
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>SYNCED</span>
      </span>
    );
  }

  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-2.5 h-2.5 animate-spin" />
        <span>PENDING</span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center space-x-1.5">
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        <span>FAILED</span>
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="p-1 text-[#888888] hover:text-white transition-colors"
          title="Retry Sync"
        >
          <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
