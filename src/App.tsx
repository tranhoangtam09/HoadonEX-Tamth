import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { FileUploadZone } from './components/FileUploadZone';
import { BatchActionsBar } from './components/BatchActionsBar';
import { InvoiceTable } from './components/InvoiceTable';
import { InvoiceInspector } from './components/InvoiceInspector';
import { PdfMergeModal } from './components/PdfMergeModal';
import { TemplateInfoModal } from './components/TemplateInfoModal';
import { ConfirmClearModal } from './components/ConfirmClearModal';
import { InvoiceItem } from './types/invoice';
import { SAMPLE_INVOICES } from './data/sampleInvoices';
import contentData from './data/contentData.json';
import { reviewAllInvoices } from './utils/validation';
import { exportInvoicesToExcel } from './utils/excelExporter';
import { mergeInvoicesToPdfGroups, MergedPdfResult } from './utils/pdfMerger';
import { sanitizePurpose } from './utils/textParser';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function App() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [pdfGroups, setPdfGroups] = useState<MergedPdfResult[]>([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Review & statistics calculation
  const stats = useMemo(() => {
    let totalAmt = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let warnCount = 0;
    let dupCount = 0;

    invoices.forEach((inv) => {
      if (inv.invoice_amount) {
        totalAmt += Number(inv.invoice_amount) || 0;
      }
      const scores = Object.values(inv.confidence || {}).filter((v) => v > 0);
      scores.forEach((s) => {
        totalScore += s;
        scoreCount++;
      });
      warnCount += inv.validation?.warnings?.length || 0;
      if (inv.validation?.isDuplicate) {
        dupCount++;
      }
    });

    const avgConf = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) : 0;
    const groupsCount = Math.ceil(invoices.length / 10) || 0;

    return {
      totalCount: invoices.length,
      avgConfidence: avgConf,
      warningsCount: warnCount,
      duplicatesCount: Math.floor(dupCount / 2) || (dupCount > 0 ? 1 : 0),
      groupsCount,
      totalAmount: totalAmt,
    };
  }, [invoices]);

  // Load sample invoices
  const handleLoadSample = () => {
    if (SAMPLE_INVOICES.length === 0) {
      showToast('Dữ liệu hóa đơn mẫu đã được gỡ bỏ khỏi hệ thống. Vui lòng tải lên hóa đơn thực tế của bạn.', 'info');
      return;
    }
    const { reviewedItems } = reviewAllInvoices(SAMPLE_INVOICES);
    setInvoices(reviewedItems);
    setSelectedIndex(0);
  };

  // Trigger modal to confirm clear all invoices
  const handleOpenClearModal = () => {
    if (invoices.length === 0) {
      showToast('Danh sách hóa đơn hiện đang trống', 'info');
      return;
    }
    setIsConfirmClearOpen(true);
  };

  // Confirmed clearing of invoices
  const handleConfirmClearAll = () => {
    setInvoices([]);
    setSelectedIndex(-1);
    setIsConfirmClearOpen(false);
    showToast('Đã xóa toàn bộ danh sách hóa đơn đang hiển thị', 'info');
  };

  // Add newly extracted invoices
  const handleInvoicesExtracted = (newItems: InvoiceItem[]) => {
    const cleanedNewItems = newItems.map((item) => ({
      ...item,
      purpose: sanitizePurpose(item.purpose, item.seller_name, item.invoice_number),
    }));
    const combined = [...invoices, ...cleanedNewItems];
    const { reviewedItems } = reviewAllInvoices(combined);
    setInvoices(reviewedItems);
    if (selectedIndex === -1 && reviewedItems.length > 0) {
      setSelectedIndex(0);
    }
    showToast(`Đã xử lý và kết xuất ${newItems.length} hóa đơn mới`, 'success');
  };

  // Standardize goods & purpose for all invoices
  const handleStandardizePurposes = () => {
    if (invoices.length === 0) return;
    const updated = invoices.map((inv) => ({
      ...inv,
      purpose: sanitizePurpose(inv.purpose, inv.seller_name, inv.invoice_number),
    }));
    const { reviewedItems } = reviewAllInvoices(updated);
    setInvoices(reviewedItems);
    showToast('Đã chuẩn hóa và làm sạch thông tin Mặt hàng / Mục đích cho tất cả hóa đơn', 'success');
  };

  // Select invoice row
  const handleSelectInvoice = (index: number) => {
    setSelectedIndex(index);
  };

  // Delete invoice
  const handleDeleteInvoice = (index: number) => {
    const updated = invoices.filter((_, idx) => idx !== index);
    const { reviewedItems } = reviewAllInvoices(updated);
    setInvoices(reviewedItems);
    if (selectedIndex >= updated.length) {
      setSelectedIndex(updated.length - 1);
    }
    showToast('Đã xóa hóa đơn khỏi danh sách', 'info');
  };

  // Update single invoice
  const handleUpdateInvoice = (updatedItem: InvoiceItem) => {
    const updated = [...invoices];
    updated[selectedIndex] = updatedItem;
    const { reviewedItems } = reviewAllInvoices(updated);
    setInvoices(reviewedItems);
    showToast('Đã cập nhật và chuẩn hóa dữ liệu hóa đơn', 'success');
  };

  // Run full validation & review
  const handleReviewData = () => {
    const { reviewedItems, duplicatesCount, warningsCount } = reviewAllInvoices(invoices);
    setInvoices(reviewedItems);
    showToast(
      `Kiểm tra hoàn tất: ${warningsCount} cảnh báo dữ liệu, ${duplicatesCount} cặp trùng lặp`,
      warningsCount > 0 || duplicatesCount > 0 ? 'warning' : 'success'
    );
  };

  // Merge PDFs in groups of 10
  const handleMergePdf = async () => {
    if (invoices.length === 0) return;
    setIsMerging(true);
    try {
      const results = await mergeInvoicesToPdfGroups(invoices, 10);
      setPdfGroups(results);
      setIsPdfModalOpen(true);
      showToast(`Đã gộp thành công ${results.length} tập PDF (tối đa 10 hóa đơn/nhóm)`, 'success');
    } catch (err: unknown) {
      console.error('Merge error:', err);
      showToast('Có lỗi khi gộp PDF: ' + (err instanceof Error ? err.message : 'Thử lại sau'), 'warning');
    } finally {
      setIsMerging(false);
    }
  };

  // Export Excel standard template
  const handleExportExcel = async () => {
    if (invoices.length === 0) return;
    setIsExporting(true);
    try {
      // Re-run review first
      const { reviewedItems } = reviewAllInvoices(invoices);
      setInvoices(reviewedItems);

      const result = await exportInvoicesToExcel(reviewedItems);
      // Trigger browser download
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Đã kết xuất thành công ${result.filename} (${result.count} hóa đơn)`, 'success');
    } catch (err: unknown) {
      console.error('Export Excel error:', err);
      showToast('Lỗi khi xuất file Excel: ' + (err instanceof Error ? err.message : 'Thử lại sau'), 'warning');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedInvoice = selectedIndex >= 0 && selectedIndex < invoices.length ? invoices[selectedIndex] : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900 selection:bg-blue-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toastMessage.type === 'warning'
                ? 'bg-amber-900 text-white border-amber-700'
                : 'bg-blue-950 text-white border-blue-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Info className="w-4 h-4 text-amber-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main App Header */}
      <Header
        onLoadSample={handleLoadSample}
        onClearAll={handleOpenClearModal}
        hasInvoices={invoices.length > 0}
        onOpenTemplateInfo={() => setIsTemplateModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4 flex-1">
        {/* Upload Zone */}
        <FileUploadZone
          onInvoicesExtracted={handleInvoicesExtracted}
          onLoadSample={handleLoadSample}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />

        {/* Real-time Statistics Bar */}
        <StatsBar
          totalCount={stats.totalCount}
          avgConfidence={stats.avgConfidence}
          warningsCount={stats.warningsCount}
          duplicatesCount={stats.duplicatesCount}
          groupsCount={stats.groupsCount}
          totalAmount={stats.totalAmount}
        />

        {/* Duplicate Warning Banner */}
        {stats.duplicatesCount > 0 && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Phát hiện <span className="font-bold">{stats.duplicatesCount} cặp hóa đơn trùng lặp</span> (cùng MST, ký hiệu, số, ngày và số tiền). Hãy đối chiếu danh sách bên dưới.
              </span>
            </div>
            <button
              onClick={handleReviewData}
              className="font-bold underline text-rose-900 hover:text-rose-700 cursor-pointer"
            >
              Kiểm tra chi tiết
            </button>
          </div>
        )}

        {/* Batch Actions Bar */}
        <BatchActionsBar
          invoiceCount={invoices.length}
          onReview={handleReviewData}
          onStandardizePurposes={handleStandardizePurposes}
          onMerge={handleMergePdf}
          onExportExcel={handleExportExcel}
          onClearAll={handleOpenClearModal}
          isMerging={isMerging}
          isExporting={isExporting}
        />

        {/* Invoice Data Table */}
        <InvoiceTable
          invoices={invoices}
          selectedIndex={selectedIndex}
          onSelectInvoice={handleSelectInvoice}
          onDeleteInvoice={handleDeleteInvoice}
          onClearAll={handleOpenClearModal}
        />

        {/* Side-by-side Inspection & Editing Workspace */}
        <section className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span>Màn hình đối chiếu file gốc & chỉnh sửa</span>
              {selectedInvoice && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold font-mono">
                  #{selectedIndex + 1}
                </span>
              )}
            </h3>
            <span className="text-xs text-slate-500">
              Độ tin cậy: <span className="text-emerald-700 font-semibold">≥95% Xanh</span> •{' '}
              <span className="text-amber-700 font-semibold">80-94% Vàng</span> •{' '}
              <span className="text-rose-700 font-semibold">&lt;80% Đỏ</span>
            </span>
          </div>

          <InvoiceInspector
            invoice={selectedInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            currentIndex={selectedIndex}
            totalCount={invoices.length}
            onNext={() => setSelectedIndex((prev) => Math.min(invoices.length - 1, prev + 1))}
            onPrev={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
          />
        </section>
      </main>

      {/* PDF Merge Groups Modal */}
      <PdfMergeModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        groups={pdfGroups}
      />

      {/* Template Info & Column Mapping Modal */}
      <TemplateInfoModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      {/* Confirm Clear Invoices Modal */}
      <ConfirmClearModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={handleConfirmClearAll}
        invoiceCount={invoices.length}
      />

      {/* App Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {contentData.app.title} v{contentData.app.version} — Chuẩn hóa hóa đơn điện tử & giải ngân bù đắp
          </span>
          <span className="font-mono text-slate-400">
            Nguyên tắc: DATA INTO TEMPLATE – NOT TEMPLATE INTO DATA
          </span>
        </div>
      </footer>
    </div>
  );
}
