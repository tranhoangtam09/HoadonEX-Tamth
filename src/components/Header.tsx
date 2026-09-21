import React from 'react';
import { FileSpreadsheet, Sparkles, Trash2, FolderSync, ShieldCheck } from 'lucide-react';
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
    <header className="bg-gradient-to-r from-[#0d274c] via-[#123b6d] to-[#184882] text-white border-b border-blue-900/50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-1 flex items-center justify-center shadow-inner">
              <img
                src={contentData.app.logo}
                alt="App Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback if SVG fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <FileSpreadsheet className="w-6 h-6 text-sky-300 hidden only:block" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  {contentData.app.title}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {contentData.app.version}
                </span>
              </div>
              <p className="text-xs text-sky-100/80 mt-0.5 line-clamp-1">
                {contentData.app.tagline}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={onOpenTemplateInfo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/10 hover:bg-white/15 border border-white/15 transition-colors cursor-pointer"
              title="Xem quy chuẩn mẫu Excel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chuẩn mẫu GN bù đắp</span>
            </button>

            <button
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-sm transition-all cursor-pointer hover:shadow-sky-500/25"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{contentData.actions.loadSample}</span>
            </button>

            {hasInvoices && (
              <button
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-200 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 transition-colors cursor-pointer"
                title="Xóa danh sách hiện tại"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>{contentData.actions.clearAll}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
