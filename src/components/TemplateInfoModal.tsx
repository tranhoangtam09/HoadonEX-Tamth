import React from 'react';
import { HelpCircle, X, CheckCircle2 } from 'lucide-react';
import contentData from '../data/contentData.json';

interface TemplateInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateInfoModal: React.FC<TemplateInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#0f2d52] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{contentData.excelMapping.title}</h3>
              <p className="text-[11px] text-blue-200">
                13 Cột Chuẩn Mẫu Bảng Kê Giải Ngân Bù Đắp (A → M)
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

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            <span className="font-bold">Quy tắc vàng:</span> {contentData.excelMapping.ruleNotice}
            <div className="mt-1 font-semibold text-blue-700">
              * Dữ liệu khi xuất Excel sẽ luôn được tự động sắp xếp theo thứ tự ngày trên hóa đơn (từ ngày cũ đến ngày mới).
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center w-12">Cột</th>
                  <th className="p-2.5">Tên trường thông tin</th>
                  <th className="p-2.5">Quy cách định dạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {contentData.excelMapping.columns.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center font-bold font-mono text-blue-900 bg-slate-50/50">
                      {col.id}
                    </td>
                    <td className="p-2.5 font-medium text-slate-800">{col.name}</td>
                    <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                      {col.id === 'A' && 'Số nguyên 1..N (theo thứ tự ngày)'}
                      {['B', 'D', 'E', 'F', 'G', 'L'].includes(col.id) && 'Văn bản (Text @), canh giữa'}
                      {['C', 'J'].includes(col.id) && 'Văn bản, canh trái'}
                      {col.id === 'I' && 'Văn bản (VND), canh giữa'}
                      {['H', 'K', 'M'].includes(col.id) && 'Số tiền (#,##0), canh phải'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
