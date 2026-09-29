import React from 'react';
import { FileText, HelpCircle, Trash2, Database, Sparkles } from 'lucide-react';
import contentData from '../data/contentData.json';

interface HeaderProps {
  onLoadSample: () => void;
  onClearAll: () => void;
  hasInvoices: boolean;
  onOpenTemplateInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onClearAll,
  hasInvoices,
  onOpenTemplateInfo,
}) => {
  return (
    <header className="bg-[#0f2d52] text-white shadow-md border-b border-blue-900/60 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* App Title & Branding */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                {contentData.app.title}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-mono font-medium">
                  {contentData.app.version}
                </span>
              </h1>
            </div>
            <p className="text-xs text-blue-200/90 font-medium">
              {contentData.app.subtitle} • Giải ngân bù đắp VND
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={onOpenTemplateInfo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-800/80 hover:bg-blue-700 text-blue-100 border border-blue-600/40 transition-colors cursor-pointer"
            title="Xem quy tắc đối chiếu cột mẫu Excel chuẩn A-M"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-300" />
            <span>Mẫu Excel chuẩn</span>
          </button>

          {hasInvoices && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-900/40 hover:bg-rose-900/80 text-rose-200 border border-rose-700/50 transition-colors cursor-pointer"
              title="Xóa toàn bộ danh sách hóa đơn"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
