import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  FileText,
  FileCode,
  Image as ImageIcon,
  Copy,
  ExternalLink,
  Info,
} from 'lucide-react';
import { InvoiceItem, InvoiceFieldKey } from '../types/invoice';
import contentData from '../data/contentData.json';
import { getConfidenceBadge, parseAmountNumber } from '../utils/validation';

interface InvoiceInspectorProps {
  invoice: InvoiceItem | null;
  onUpdateInvoice: (updatedItem: InvoiceItem) => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export const InvoiceInspector: React.FC<InvoiceInspectorProps> = ({
  invoice,
  onUpdateInvoice,
  onNext,
  onPrev,
  currentIndex = 0,
  totalCount = 0,
}) => {
  const [formData, setFormData] = useState<Partial<InvoiceItem>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (invoice) {
      setFormData({ ...invoice });
      setSaveSuccess(false);
    }
  }, [invoice]);

  if (!invoice) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 shadow-xs">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700">Chưa chọn hóa đơn</h3>
        <p className="text-xs text-slate-500 mt-1">
          Bấm vào một dòng trong danh sách bên trên để đối chiếu file gốc và kiểm tra dữ liệu
        </p>
      </div>
    );
  }

  const handleChange = (field: InvoiceFieldKey, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'invoice_amount' || field === 'debt_amount' || field === 'paid_amount'
        ? parseAmountNumber(value)
        : value,
    }));
    setSaveSuccess(false);
  };

  const handleSyncDebtAndPaid = () => {
    setFormData((prev) => ({
      ...prev,
      debt_amount: prev.invoice_amount,
      paid_amount: prev.invoice_amount,
      paid_date: prev.invoice_date,
    }));
  };

  const handleSave = () => {
    if (!invoice) return;
    const updated: InvoiceItem = {
      ...invoice,
      ...formData,
    } as InvoiceItem;

    onUpdateInvoice(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const fieldsConfig: Array<{ key: Exclude<InvoiceFieldKey, 'stt'>; label: string; placeholder: string; colSpan?: string }> = [
    { key: 'tax_code', label: 'Mã số thuế bên bán (B)', placeholder: '0100109106' },
    { key: 'seller_name', label: 'Tên đơn vị phát hành (C)', placeholder: 'Công ty Cổ phần / TNHH...' },
    { key: 'template_symbol', label: 'Ký hiệu mẫu số (D)', placeholder: '1/001' },
    { key: 'invoice_symbol', label: 'Ký hiệu hóa đơn (E)', placeholder: '1C24TYY' },
    { key: 'invoice_number', label: 'Số hóa đơn (F)', placeholder: '0012345' },
    { key: 'invoice_date', label: 'Ngày hóa đơn (G)', placeholder: 'dd/mm/yyyy' },
    { key: 'invoice_amount', label: 'Số tiền hóa đơn (H)', placeholder: '0' },
    { key: 'currency', label: 'Loại tiền (I)', placeholder: 'VND' },
    { key: 'purpose', label: 'Mặt hàng / Mục đích (J)', placeholder: 'Chi phí mua sắm...', colSpan: 'sm:col-span-2' },
    { key: 'debt_amount', label: 'Số tiền nhận nợ (K)', placeholder: '0' },
    { key: 'paid_date', label: 'Ngày thanh toán (L)', placeholder: 'dd/mm/yyyy' },
    { key: 'paid_amount', label: 'Số tiền đã thanh toán (M)', placeholder: '0', colSpan: 'sm:col-span-2' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Header of Inspector */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#123b6d] text-white flex items-center justify-center font-bold text-xs">
            #{currentIndex + 1}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
              {invoice.source_file || 'Hóa đơn chưa đặt tên'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Nguồn: <span className="font-semibold text-slate-700">{invoice.source_type}</span> • Số hóa đơn: <span className="font-semibold text-blue-700 font-mono">{invoice.invoice_number || 'Chưa có'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onPrev && (
            <button
              onClick={onPrev}
              disabled={currentIndex <= 0}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              ← Trước
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              disabled={currentIndex >= totalCount - 1}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              Sau →
            </button>
          )}
        </div>
      </div>

      {/* Split-Screen: Preview Left (46%) + Form Right (54%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left Side: Original Preview */}
        <div className="lg:col-span-5 p-4 bg-slate-100/60 flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              👁 File gốc & Trích xuất
            </span>
            {invoice.file_url && (
              <a
                href={invoice.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Mở tab mới
              </a>
            )}
          </div>

          <div className="flex-1 bg-white rounded-xl border border-slate-300/80 shadow-inner overflow-hidden relative flex flex-col justify-center items-center min-h-[380px]">
            {invoice.mime_type?.includes('pdf') && invoice.file_url ? (
              <iframe
                src={invoice.file_url}
                title="Xem PDF hóa đơn"
                className="w-full h-full border-0 min-h-[420px]"
              />
            ) : invoice.mime_type?.startsWith('image/') && invoice.file_url ? (
              <div className="w-full h-full p-2 flex items-center justify-center bg-slate-900/5">
                <img
                  src={invoice.file_url}
                  alt="Ảnh hóa đơn"
                  className="max-h-[420px] max-w-full object-contain rounded shadow-xs"
                />
              </div>
            ) : invoice.source_type === 'XML' ? (
              <div className="w-full h-full p-3 font-mono text-[11px] text-slate-700 overflow-auto bg-slate-900 text-slate-200 rounded-lg max-h-[420px]">
                <div className="flex items-center gap-1 text-emerald-400 font-bold mb-2 pb-1 border-b border-slate-800">
                  <FileCode className="w-4 h-4" /> Dữ liệu XML Hóa đơn Điện tử
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed text-xs">
                  {invoice._raw_text || 'Dữ liệu XML chuẩn hóa'}
                </pre>
              </div>
            ) : (
              // Formatted text preview card
              <div className="w-full h-full p-4 overflow-auto bg-white flex flex-col justify-start">
                <div className="border-b border-slate-200 pb-3 mb-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Bản sao nội dung trích xuất</span>
                  <h4 className="text-sm font-bold text-blue-950 mt-0.5">{invoice.seller_name || 'HÓA ĐƠN ĐIỆN TỬ'}</h4>
                  <p className="text-xs text-slate-600">MST: {invoice.tax_code || '-'}</p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Mẫu số & Ký hiệu:</span>
                    <span className="font-mono font-medium">{invoice.template_symbol || '-'} / {invoice.invoice_symbol || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Số hóa đơn:</span>
                    <span className="font-mono font-bold text-blue-800">{invoice.invoice_number || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Ngày lập:</span>
                    <span className="font-mono font-medium">{invoice.invoice_date || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tổng tiền:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {invoice.invoice_amount ? `${Number(invoice.invoice_amount).toLocaleString('vi-VN')} VND` : '-'}
                    </span>
                  </div>
                  <div className="pt-2">
                    <span className="text-slate-500 text-[11px] block">Nội dung hàng hóa:</span>
                    <p className="text-slate-800 text-xs italic bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                      {invoice.purpose || 'Không có mô tả'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Fields Editor */}
        <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                ✏️ Đối chiếu & Chỉnh sửa từng trường
              </span>

              <button
                type="button"
                onClick={handleSyncDebtAndPaid}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                title="Gán tiền nhận nợ & đã thanh toán bằng số tiền hóa đơn"
              >
                <Copy className="w-3 h-3" />
                <span>{contentData.actions.quickFill}</span>
              </button>
            </div>

            {/* Validation & Duplicate Warnings */}
            {invoice.validation?.isDuplicate && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Phát hiện trùng lặp!</span> Hóa đơn này trùng MST, ký hiệu, số, ngày và số tiền với hóa đơn số{' '}
                  <span className="font-bold underline">
                    {(invoice.validation.duplicateWith || []).map((x) => x + 1).join(', ')}
                  </span>
                  . Vui lòng kiểm tra lại.
                </div>
              </div>
            )}

            {invoice.validation?.warnings && invoice.validation.warnings.length > 0 && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Cảnh báo:</span> {invoice.validation.warnings.join(' • ')}
                </div>
              </div>
            )}

            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {fieldsConfig.map(({ key, label, placeholder, colSpan }) => {
                const confScore = invoice.confidence?.[key] || 0;
                const badge = getConfidenceBadge(confScore);

                return (
                  <div key={key} className={`flex flex-col ${colSpan || ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        {label}
                      </label>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full border ${badge.badgeClass}`}
                        title={`Độ tin cậy OCR: ${badge.badgeText}`}
                      >
                        {badge.badgeText}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={String((formData as Record<string, unknown>)[key] ?? '')}
                      placeholder={placeholder}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-medium transition-all"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {saveSuccess ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu cập nhật thành công!
                </span>
              ) : (
                'Nhớ bấm lưu để cập nhật thông tin chuẩn xuất Excel'
              )}
            </span>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#123b6d] hover:bg-[#0f2f57] shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{contentData.actions.saveChanges}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
