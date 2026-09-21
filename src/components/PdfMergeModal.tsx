import React from 'react';
import { X, FileDown, CheckCircle, Layers, FileText } from 'lucide-react';
import { MergedPdfResult } from '../utils/pdfMerger';

interface PdfMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: MergedPdfResult[];
}

export const PdfMergeModal: React.FC<PdfMergeModalProps> = ({
  isOpen,
  onClose,
  groups,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Gộp Hóa Đơn PDF (Tối đa 10 HĐ/nhóm)
              </h3>
              <p className="text-xs text-slate-500">
                Đã phân tách và gom nhóm theo đúng chuẩn giải ngân bù đắp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {groups.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-500">
              Không có hóa đơn nào để gộp. Vui lòng tải file PDF lên trước.
            </p>
          ) : (
            groups.map((g) => (
              <div
                key={g.groupIndex}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:bg-blue-50/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                      {g.filename}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Quy mô: <span className="font-semibold text-slate-700">{g.invoiceCount} hóa đơn</span> (Nhóm {g.groupIndex})
                    </p>
                  </div>
                </div>

                <a
                  href={g.downloadUrl}
                  download={g.filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#123b6d] hover:bg-[#0e2a4d] shadow-xs transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Tải file PDF</span>
                </a>
              </div>
            ))
          )}

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
            <p className="font-semibold mb-1">Ghi chú nghiệp vụ:</p>
            <p className="text-[11px] text-blue-700">
              Mỗi file PDF kết xuất chứa tối đa 10 hóa đơn kèm trang mục lục chuẩn hóa để nộp hồ sơ ngân hàng hoặc lưu trữ chứng từ thanh toán.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
