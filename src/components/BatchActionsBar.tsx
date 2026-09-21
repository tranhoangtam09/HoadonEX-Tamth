import React from 'react';
import { CheckCheck, Layers, FileSpreadsheet, Trash2, Loader2, Sparkles } from 'lucide-react';
import contentData from '../data/contentData.json';

interface BatchActionsBarProps {
  invoiceCount: number;
  onReview: () => void;
  onStandardizePurposes?: () => void;
  onMerge: () => void;
  onExportExcel: () => void;
  onClearAll: () => void;
  isMerging: boolean;
  isExporting: boolean;
}

export const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
  invoiceCount,
  onReview,
  onStandardizePurposes,
  onMerge,
  onExportExcel,
  onClearAll,
  isMerging,
  isExporting,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📋 Danh sách hóa đơn kết xuất</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold">
            {invoiceCount}
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Bấm để chọn và đối chiếu dữ liệu từng hóa đơn với chứng từ gốc
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        {/* Review Data Button */}
        <button
          onClick={onReview}
          disabled={invoiceCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
          title="Kiểm tra lại định dạng MST, ngày, số tiền và phát hiện trùng lặp"
        >
          <CheckCheck className="w-4 h-4 text-slate-600" />
          <span>{contentData.actions.reviewData}</span>
        </button>

        {/* Standardize Goods / Purpose Button */}
        {onStandardizePurposes && (
          <button
            onClick={onStandardizePurposes}
            disabled={invoiceCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-40 transition-colors cursor-pointer"
            title="Tự động chuẩn hóa và làm sạch toàn bộ cột Mặt hàng / Mục đích (J) theo nội dung hóa đơn và bên bán"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Chuẩn hóa mặt hàng</span>
          </button>
        )}

        {/* Clear All Invoices Button */}
        <button
          onClick={onClearAll}
          disabled={invoiceCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Xóa toàn bộ danh sách hóa đơn đang hiển thị"
        >
          <Trash2 className="w-4 h-4 text-rose-600" />
          <span>Xóa danh sách</span>
        </button>

        {/* Merge PDF Button */}
        <button
          onClick={onMerge}
          disabled={invoiceCount === 0 || isMerging}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#123b6d] hover:bg-[#0e2c54] disabled:opacity-40 shadow-xs transition-colors cursor-pointer"
          title="Gộp các file hóa đơn thành từng tập PDF tối đa 10 hóa đơn"
        >
          {isMerging ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Layers className="w-4 h-4 text-sky-300" />
          )}
          <span>{contentData.actions.mergePdf}</span>
        </button>

        {/* Export Excel Button */}
        <button
          onClick={onExportExcel}
          disabled={invoiceCount === 0 || isExporting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 shadow-sm transition-all cursor-pointer hover:shadow-emerald-700/20"
          title="Tạo file Excel bảng kê GN bù đắp theo đúng cấu trúc mẫu chuẩn"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
          )}
          <span>{contentData.actions.exportExcel}</span>
        </button>
      </div>
    </div>
  );
};
