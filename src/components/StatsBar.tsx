import React from 'react';
import { Files, ShieldCheck, AlertTriangle, Copy, Layers, Coins } from 'lucide-react';
import { formatNumberVN } from '../utils/validation';

interface StatsBarProps {
  totalCount: number;
  avgConfidence: number;
  warningsCount: number;
  duplicatesCount: number;
  groupsCount: number;
  totalAmount: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  totalCount,
  avgConfidence,
  warningsCount,
  duplicatesCount,
  groupsCount,
  totalAmount,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {/* 1. Total Invoices */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
          <Files className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Hóa đơn</div>
          <div className="text-lg font-extrabold text-slate-900 leading-tight">{totalCount}</div>
        </div>
      </div>

      {/* 2. Confidence */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Độ tin cậy TB</div>
          <div className="text-lg font-extrabold text-emerald-700 leading-tight">
            {totalCount > 0 ? `${avgConfidence}%` : '-'}
          </div>
        </div>
      </div>

      {/* 3. Warnings */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          warningsCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'
        }`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Cảnh báo</div>
          <div className={`text-lg font-extrabold leading-tight ${
            warningsCount > 0 ? 'text-amber-700' : 'text-slate-700'
          }`}>
            {warningsCount}
          </div>
        </div>
      </div>

      {/* 4. Duplicates */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          duplicatesCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-400'
        }`}>
          <Copy className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Trùng lặp</div>
          <div className={`text-lg font-extrabold leading-tight ${
            duplicatesCount > 0 ? 'text-rose-700' : 'text-slate-700'
          }`}>
            {duplicatesCount}
          </div>
        </div>
      </div>

      {/* 5. PDF Groups */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tập PDF (≤10)</div>
          <div className="text-lg font-extrabold text-sky-800 leading-tight">{groupsCount}</div>
        </div>
      </div>

      {/* 6. Total Amount */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
          <Coins className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">Tổng tiền (VND)</div>
          <div className="text-base font-extrabold text-slate-900 leading-tight truncate" title={formatNumberVN(totalAmount)}>
            {formatNumberVN(totalAmount)}
          </div>
        </div>
      </div>
    </div>
  );
};
