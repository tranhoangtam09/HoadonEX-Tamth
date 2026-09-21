import React from 'react';
import { Files, ShieldAlert, CopyCheck, Layers, BadgeDollarSign, Activity } from 'lucide-react';
import contentData from '../data/contentData.json';
import { formatVND } from '../utils/validation';

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
  const getConfidenceBadgeColor = (val: number) => {
    if (val >= 95) return 'text-emerald-700 bg-emerald-100/70 border-emerald-300';
    if (val >= 80) return 'text-amber-700 bg-amber-100/70 border-amber-300';
    return 'text-rose-700 bg-rose-100/70 border-rose-300';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total Invoices */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-medium">{contentData.stats.totalInvoices}</span>
          <Files className="w-4 h-4 text-blue-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{totalCount}</span>
          <span className="text-xs text-slate-500 font-medium">HĐ</span>
        </div>
      </div>

      {/* Avg Confidence */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-medium">{contentData.stats.avgConfidence}</span>
          <Activity className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {totalCount > 0 ? `${avgConfidence}%` : '-'}
          </span>
          {totalCount > 0 && (
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${getConfidenceBadgeColor(
                avgConfidence
              )}`}
            >
              {avgConfidence >= 95 ? 'Tốt' : avgConfidence >= 80 ? 'Ổn' : 'Thấp'}
            </span>
          )}
        </div>
      </div>

      {/* Warnings */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-medium">{contentData.stats.warnings}</span>
          <ShieldAlert
            className={`w-4 h-4 ${warningsCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-extrabold tracking-tight ${
              warningsCount > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {warningsCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">mục</span>
        </div>
      </div>

      {/* Duplicates */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-medium">{contentData.stats.duplicates}</span>
          <CopyCheck
            className={`w-4 h-4 ${duplicatesCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-extrabold tracking-tight ${
              duplicatesCount > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {duplicatesCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">cặp trùng</span>
        </div>
      </div>

      {/* PDF Groups */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-medium">{contentData.stats.pdfGroups}</span>
          <Layers className="w-4 h-4 text-sky-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{groupsCount}</span>
          <span className="text-xs text-slate-500 font-medium">tập PDF</span>
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-medium">Tổng giá trị</span>
          <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="mt-2">
          <span
            className="text-base font-extrabold text-slate-900 truncate block tracking-tight"
            title={formatVND(totalAmount)}
          >
            {formatVND(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};
