import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  CheckCircle2,
  FileText,
  FileCode,
  ExternalLink,
  Sparkles,
  Search,
} from 'lucide-react';
import { InvoiceItem } from '../types/invoice';
import { getConfidenceBadge, parseAmountNumber, normalizeDate } from '../utils/validation';
import { detectSmartPurposeFromSeller, sanitizePurpose } from '../utils/textParser';

interface InvoiceInspectorProps {
  invoice: InvoiceItem | null;
  onUpdateInvoice: (updatedItem: InvoiceItem) => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

const COMMON_PURPOSE_TAGS = [
  'Xăng dầu phục vụ KD',
  'Cước viễn thông & Internet',
  'Tiền điện sản xuất KD',
  'Tiếp khách, hội nghị',
  'Văn phòng phẩm, in ấn',
  'Thiết bị CNTT, máy tính',
  'Cước vận chuyển, đi lại',
  'Chi phí thuê mặt bằng',
];

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

  const handleInputChange = (field: keyof InvoiceItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSave = () => {
    const updated: InvoiceItem = {
      ...invoice,
      ...formData,
      tax_code: String(formData.tax_code || '').trim(),
      seller_name: String(formData.seller_name || '').trim(),
      template_symbol: String(formData.template_symbol || '').trim(),
      invoice_symbol: String(formData.invoice_symbol || '').trim(),
      invoice_number: String(formData.invoice_number || '').trim(),
      invoice_date: normalizeDate(formData.invoice_date || invoice.invoice_date),
      invoice_amount: formData.invoice_amount !== undefined ? parseAmountNumber(formData.invoice_amount) : invoice.invoice_amount,
      currency: formData.currency || 'VND',
      purpose: sanitizePurpose(formData.purpose, formData.seller_name, formData.invoice_number),
      debt_amount: formData.debt_amount !== undefined ? parseAmountNumber(formData.debt_amount) : formData.invoice_amount,
      paid_date: normalizeDate(formData.paid_date || formData.invoice_date),
      paid_amount: formData.paid_amount !== undefined ? parseAmountNumber(formData.paid_amount) : formData.invoice_amount,
    };
    onUpdateInvoice(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAutoSuggestPurpose = () => {
    const suggested = detectSmartPurposeFromSeller(formData.seller_name || invoice.seller_name);
    if (suggested) {
      handleInputChange('purpose', suggested);
    } else {
      handleInputChange('purpose', `Chi mua hàng hóa, dịch vụ từ ${formData.seller_name || 'đơn vị bán'}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Header with navigation */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            #{currentIndex + 1}
          </span>
          <div>
            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">
              {invoice.seller_name || invoice.source_file}
            </h4>
            <p className="text-[11px] text-slate-500">
              Nguồn: <span className="font-semibold text-slate-700">{invoice.source_type}</span> • Số HĐ: <span className="font-semibold font-mono text-blue-700">{invoice.invoice_number || '-'}</span> • Ngày: <span className="font-semibold font-mono text-slate-700">{invoice.invoice_date || '-'}</span>
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

      {/* Main Split Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left Side: Preview */}
        <div className="lg:col-span-5 p-4 bg-slate-100/60 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              👁 File gốc & Dữ liệu nguồn
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

          <div className="flex-1 bg-white rounded-xl border border-slate-300/80 overflow-hidden flex flex-col items-center justify-center p-2 min-h-[380px]">
            {invoice.mime_type?.includes('pdf') && invoice.file_url ? (
              <iframe
                src={invoice.file_url}
                title="Xem PDF hóa đơn"
                className="w-full h-full border-0 min-h-[420px]"
              />
            ) : invoice.mime_type?.startsWith('image/') && invoice.file_url ? (
              <img
                src={invoice.file_url}
                alt="Ảnh hóa đơn"
                className="max-h-[420px] max-w-full object-contain rounded"
              />
            ) : invoice.source_type === 'XML' ? (
              <div className="w-full h-full p-3 font-mono text-[11px] bg-slate-900 text-slate-200 rounded-lg max-h-[420px] overflow-auto">
                <div className="text-emerald-400 font-bold mb-2 pb-1 border-b border-slate-800 flex items-center gap-1">
                  <FileCode className="w-4 h-4" /> Dữ liệu XML Hóa đơn Điện tử
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed text-xs">
                  {invoice._raw_text || 'Dữ liệu XML chuẩn hóa'}
                </pre>
              </div>
            ) : (
              <div className="w-full h-full p-4 overflow-auto bg-white flex flex-col">
                <div className="border-b border-slate-200 pb-2 mb-3">
                  <h4 className="text-sm font-bold text-blue-950">{invoice.seller_name || 'HÓA ĐƠN'}</h4>
                  <p className="text-xs text-slate-600">MST: {invoice.tax_code || '-'}</p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Ký hiệu & Số:</span>
                    <span className="font-mono font-medium">{invoice.invoice_symbol || '-'} / {invoice.invoice_number || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Ngày hóa đơn:</span>
                    <span className="font-mono font-medium">{invoice.invoice_date || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tổng tiền:</span>
                    <span className="font-mono font-bold text-emerald-700">{invoice.invoice_amount ? `${Number(invoice.invoice_amount).toLocaleString('vi-VN')} VND` : '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Mục đích:</span>
                    <span className="font-medium text-slate-800 text-right max-w-[200px]">{invoice.purpose}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Editable Fields */}
        <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                ✏️ Thông tin hóa đơn theo mẫu Excel giải ngân
              </span>
              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu thành công
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* MST */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã số thuế bên bán (Cột B)
                </label>
                <input
                  type="text"
                  value={formData.tax_code || ''}
                  onChange={(e) => handleInputChange('tax_code', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="0101234567"
                />
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày hóa đơn (Cột G - dd/mm/yyyy)
                </label>
                <input
                  type="text"
                  value={formData.invoice_date || ''}
                  onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-semibold text-blue-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="dd/mm/yyyy"
                />
              </div>

              {/* Seller Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên đơn vị phát hành / người bán (Cột C)
                </label>
                <input
                  type="text"
                  value={formData.seller_name || ''}
                  onChange={(e) => handleInputChange('seller_name', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Công ty TNHH..."
                />
              </div>

              {/* Template & Symbol */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ký hiệu mẫu & Hóa đơn (Cột D & E)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.template_symbol || ''}
                    onChange={(e) => handleInputChange('template_symbol', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    placeholder="1"
                  />
                  <input
                    type="text"
                    value={formData.invoice_symbol || ''}
                    onChange={(e) => handleInputChange('invoice_symbol', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    placeholder="1C24TAA"
                  />
                </div>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số hóa đơn (Cột F)
                </label>
                <input
                  type="text"
                  value={formData.invoice_number || ''}
                  onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold text-blue-900 border border-slate-300 rounded-lg"
                  placeholder="0001234"
                />
              </div>

              {/* Invoice Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số tiền hóa đơn (Cột H)
                </label>
                <input
                  type="text"
                  value={formData.invoice_amount !== undefined ? formData.invoice_amount : ''}
                  onChange={(e) => handleInputChange('invoice_amount', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold text-emerald-700 border border-slate-300 rounded-lg"
                  placeholder="0"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Loại tiền (Cột I)
                </label>
                <input
                  type="text"
                  value={formData.currency || 'VND'}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  placeholder="VND"
                />
              </div>

              {/* Purpose / Column J */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mặt hàng / Mục đích chi tiêu (Cột J)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSuggestPurpose}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Gợi ý theo ĐV bán
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.purpose || ''}
                  onChange={(e) => handleInputChange('purpose', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Xăng dầu, cước viễn thông, thiết bị CNTT..."
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {COMMON_PURPOSE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInputChange('purpose', tag)}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              * Dữ liệu sẽ tự động chuẩn hóa khi lưu và xuất Excel
            </span>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi hóa đơn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
