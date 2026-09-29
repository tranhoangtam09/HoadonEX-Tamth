import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  invoiceCount: number;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  invoiceCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">
            Xác nhận xóa toàn bộ danh sách?
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Hành động này sẽ xóa toàn bộ <strong className="text-slate-800">{invoiceCount} hóa đơn</strong> đang được tải và xử lý trong phiên làm việc hiện tại.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xác nhận xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
