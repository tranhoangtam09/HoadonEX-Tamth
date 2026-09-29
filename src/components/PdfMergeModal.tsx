import React from 'react';
import { Download, FileText, CheckCircle2, X, Layers } from 'lucide-react';
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

  const handleDownloadAll = () => {
    groups.forEach((g, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = g.downloadUrl;
        a.download = g.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, idx * 400);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 bg-[#0f2d52] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Các tập hóa đơn PDF đã gộp</h3>
              <p className="text-[11px] text-blue-200">
                Đã gộp thành {groups.length} nhóm (tối đa 10 hóa đơn/tập theo thứ tự ngày lập)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {groups.map((g) => (
            <div
              key={g.groupIndex}
              className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                  #{g.groupIndex + 1}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 font-mono">
                    {g.filename}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Số lượng: <span className="font-semibold text-slate-700">{g.invoiceCount} hóa đơn</span> (Có trang bìa danh mục)
                  </div>
                </div>
              </div>

              <a
                href={g.downloadUrl}
                download={g.filename}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về</span>
              </a>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Tổng cộng: {groups.reduce((acc, g) => acc + g.invoiceCount, 0)} hóa đơn
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            {groups.length > 1 && (
              <button
                onClick={handleDownloadAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải tất cả các nhóm</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
