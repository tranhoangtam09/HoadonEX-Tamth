import React from 'react';
import { X, ShieldCheck, FileSpreadsheet, Check } from 'lucide-react';
import contentData from '../data/contentData.json';

interface TemplateInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateInfoModal: React.FC<TemplateInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {contentData.excelMapping.title}
              </h3>
              <p className="text-xs text-slate-500">
                Sheet: <span className="font-semibold text-emerald-700 font-mono">{contentData.app.sheetName}</span>
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

        <div className="py-4 space-y-3.5 max-h-[65vh] overflow-y-auto">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Nguyên tắc bất biến:</span> {contentData.excelMapping.ruleNotice}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="py-2 px-3 font-semibold text-center w-16">Cột</th>
                  <th className="py-2 px-3 font-semibold">Tên cột trong bảng kê</th>
                  <th className="py-2 px-3 font-semibold">Mã trường dữ liệu</th>
                  <th className="py-2 px-3 font-semibold">Định dạng số</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contentData.excelMapping.columns.map((c) => {
                  const isNumber = ['invoice_amount', 'debt_amount', 'paid_amount'].includes(c.field);
                  const isText = ['tax_code', 'template_symbol', 'invoice_symbol', 'invoice_number', 'invoice_date', 'paid_date'].includes(c.field);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-1.5 px-3 text-center font-mono font-bold text-blue-900 bg-slate-50">
                        {c.id}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-slate-800">
                        {c.name}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500">
                        {c.field}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-[11px]">
                        {isNumber ? (
                          <span className="text-blue-600 font-semibold">#,##0 (Số tiền)</span>
                        ) : isText ? (
                          <span className="text-amber-700 font-medium">@ (Giữ số 0 đầu)</span>
                        ) : (
                          <span className="text-slate-500">General</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800">Tính năng bảo toàn công thức & cấu trúc:</h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
              <li>Dòng tổng cộng được tự động thiết lập công thức SUM(H3:H...), SUM(K3:K...), SUM(M3:M...)</li>
              <li>Ô mã số thuế (MST) và số hóa đơn giữ nguyên định dạng chuỗi (@) để không bị mất số 0 ở đầu (ví dụ: 0100109106, 0001234).</li>
              <li>Không làm thay đổi cấu trúc sheet, tên sheet hoặc các cell bị merge của mẫu gốc.</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#123b6d] hover:bg-[#0e2a4d] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
