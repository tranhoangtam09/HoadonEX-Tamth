import React, { useState } from 'react';
import { Search, AlertTriangle, XCircle, CheckCircle, Eye, Trash2, Copy, Filter } from 'lucide-react';
import { InvoiceItem } from '../types/invoice';
import { formatNumberVN, getConfidenceBadge } from '../utils/validation';
import { sanitizePurpose } from '../utils/textParser';

interface InvoiceTableProps {
  invoices: InvoiceItem[];
  selectedIndex: number;
  onSelectInvoice: (index: number) => void;
  onDeleteInvoice: (index: number) => void;
  onClearAll?: () => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  selectedIndex,
  onSelectInvoice,
  onDeleteInvoice,
  onClearAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'warning' | 'duplicate'>('all');

  const getAvgConfidence = (item: InvoiceItem): number => {
    const scores = Object.values(item.confidence || {}).filter((v) => v > 0);
    if (!scores.length) return 0;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
  };

  const filteredInvoices = invoices
    .map((inv, originalIndex) => ({ inv, originalIndex }))
    .filter(({ inv }) => {
      // Filter by text
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          inv.tax_code?.toLowerCase().includes(q) ||
          inv.seller_name?.toLowerCase().includes(q) ||
          inv.invoice_number?.toLowerCase().includes(q) ||
          inv.invoice_symbol?.toLowerCase().includes(q) ||
          inv.source_file?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Filter by status
      if (filterStatus === 'duplicate') return inv.validation?.isDuplicate;
      if (filterStatus === 'warning') return (inv.validation?.warnings?.length || 0) > 0;
      if (filterStatus === 'valid')
        return (
          inv.validation?.valid &&
          !inv.validation?.isDuplicate &&
          (inv.validation?.warnings?.length || 0) === 0
        );

      return true;
    });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo MST, tên đơn vị, số HĐ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-[#123b6d] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tất cả ({invoices.length})
          </button>
          <button
            onClick={() => setFilterStatus('valid')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'valid'
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            Hợp lệ
          </button>
          <button
            onClick={() => setFilterStatus('warning')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'warning'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            Cảnh báo
          </button>
          <button
            onClick={() => setFilterStatus('duplicate')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'duplicate'
                ? 'bg-rose-700 text-white'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            Trùng lặp
          </button>

          {onClearAll && invoices.length > 0 && (
            <button
              onClick={onClearAll}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title="Xóa toàn bộ danh sách hóa đơn đang hiển thị"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto min-h-[300px] max-h-[480px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#0f2d52] text-white sticky top-0 z-10 shadow-xs select-none">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-center w-12 border-b border-blue-900">STT</th>
              <th className="py-2.5 px-3 font-semibold border-b border-blue-900">Mã số thuế</th>
              <th className="py-2.5 px-3 font-semibold border-b border-blue-900 min-w-[200px]" title="Đơn vị bán hàng / người bán hàng / đơn vị phát hành hóa đơn">
                <div>Tên đơn vị phát hành</div>
                <div className="text-[10px] text-blue-200/90 font-normal leading-tight">Đơn vị bán / người bán</div>
              </th>
              <th className="py-2.5 px-3 font-semibold text-center border-b border-blue-900">Ký hiệu</th>
              <th className="py-2.5 px-3 font-semibold text-center border-b border-blue-900">Số HĐ</th>
              <th className="py-2.5 px-3 font-semibold text-center border-b border-blue-900">Ngày</th>
              <th className="py-2.5 px-3 font-semibold text-right border-b border-blue-900 min-w-[110px]">
                Số tiền (VND)
              </th>
              <th className="py-2.5 px-3 font-semibold border-b border-blue-900 min-w-[170px] max-w-[230px]" title="Mặt hàng / Mục đích chi tiêu (Cột J khi xuất Excel)">
                Mặt hàng / Mục đích (J)
              </th>
              <th className="py-2.5 px-3 font-semibold text-center border-b border-blue-900">Nguồn</th>
              <th className="py-2.5 px-3 font-semibold text-center border-b border-blue-900">Tin cậy</th>
              <th className="py-2.5 px-3 font-semibold text-center border-b border-blue-900">Kiểm tra</th>
              <th className="py-2.5 px-3 font-semibold text-center border-b border-blue-900 w-16">Xử lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-700">
                      {invoices.length === 0 ? 'Chưa có hóa đơn nào trong bảng kê' : 'Không tìm thấy hóa đơn phù hợp bộ lọc'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {invoices.length === 0
                        ? 'Hãy kéo thả hoặc chọn tệp hóa đơn (PDF, XML, JPG, PNG) ở khung phía trên để bắt đầu trích xuất'
                        : 'Thử tìm kiếm với từ khóa khác hoặc chuyển trạng thái hiển thị về "Tất cả"'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map(({ inv, originalIndex }) => {
                const isSelected = selectedIndex === originalIndex;
                const avgScore = getAvgConfidence(inv);
                const badge = getConfidenceBadge(avgScore / 100);
                const hasErrors = (inv.validation?.errors?.length || 0) > 0;
                const hasWarnings = (inv.validation?.warnings?.length || 0) > 0;
                const isDup = inv.validation?.isDuplicate;

                return (
                  <tr
                    key={inv.id || originalIndex}
                    onClick={() => onSelectInvoice(originalIndex)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-blue-50/90 font-medium'
                        : isDup
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* STT */}
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                      {originalIndex + 1}
                    </td>

                    {/* MST */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {inv.tax_code || <span className="text-rose-400 italic">Thiếu</span>}
                    </td>

                    {/* Seller Name */}
                    <td className="py-2.5 px-3 text-slate-800 line-clamp-1 max-w-[220px]" title={inv.seller_name}>
                      {inv.seller_name || <span className="text-slate-400 italic">Chưa xác định</span>}
                    </td>

                    {/* Invoice Symbol */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {inv.invoice_symbol || '-'}
                    </td>

                    {/* Invoice Number */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-900">
                      {inv.invoice_number || <span className="text-rose-400 italic">Thiếu</span>}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {inv.invoice_date || '-'}
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {inv.invoice_amount !== '' ? formatNumberVN(inv.invoice_amount) : '-'}
                    </td>

                    {/* Purpose / Goods (Column J) */}
                    <td className="py-2.5 px-3 max-w-[210px]" title={sanitizePurpose(inv.purpose, inv.seller_name, inv.invoice_number)}>
                      <div className="line-clamp-1 text-[11px] font-medium text-slate-800 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200">
                        {sanitizePurpose(inv.purpose, inv.seller_name, inv.invoice_number)}
                      </div>
                    </td>

                    {/* Source */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          inv.source_type === 'XML'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.source_type === 'PDF text'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {inv.source_type}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${badge.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}></span>
                        {badge.badgeText}
                      </span>
                    </td>

                    {/* Verification Status */}
                    <td className="py-2.5 px-3 text-center">
                      {hasErrors ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold" title={inv.validation.errors.join(', ')}>
                          <XCircle className="w-3.5 h-3.5" /> Lỗi
                        </span>
                      ) : isDup ? (
                        <span
                          className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-bold"
                          title={`Trùng với HĐ STT: ${(inv.validation.duplicateWith || []).map((x) => x + 1).join(', ')}`}
                        >
                          <Copy className="w-3 h-3" /> Trùng
                        </span>
                      ) : hasWarnings ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold" title={inv.validation.warnings.join(', ')}>
                          <AlertTriangle className="w-3.5 h-3.5" /> Cảnh báo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Chuẩn
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectInvoice(originalIndex)}
                          title="Đối chiếu & Chỉnh sửa"
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteInvoice(originalIndex)}
                          title="Xóa hóa đơn"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
