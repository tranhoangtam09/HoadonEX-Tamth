import React, { useRef, useState } from 'react';
import { UploadCloud, FileCode, FileText, Image as ImageIcon, Zap, Loader2 } from 'lucide-react';
import { InvoiceItem } from '../types/invoice';
import { parseInvoiceXml } from '../utils/xmlParser';
import contentData from '../data/contentData.json';

interface FileUploadZoneProps {
  onInvoicesExtracted: (items: InvoiceItem[]) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
  setIsProcessing: (b: boolean) => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onInvoicesExtracted,
  onLoadSample,
  isProcessing,
  setIsProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; done: number } | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setUploadStats({ total: files.length, done: 0 });

    const newInvoices: InvoiceItem[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const fileUrl = URL.createObjectURL(file);

        if (file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml')) {
          const text = await file.text();
          const invoice = parseInvoiceXml(text, file.name);
          invoice.file_url = fileUrl;
          invoice.file_blob = file;
          newInvoices.push(invoice);
        } else if (file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf')) {
          // Xử lý PDF
          newInvoices.push({
            id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            file_id: file.name,
            source_file: file.name,
            source_type: 'PDF text',
            file_url: fileUrl,
            file_blob: file,
            mime_type: 'application/pdf',
            tax_code: '',
            seller_name: file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' '),
            template_symbol: '1',
            invoice_symbol: '',
            invoice_number: '',
            invoice_date: new Date().toLocaleDateString('vi-VN'),
            invoice_amount: 0,
            currency: 'VND',
            purpose: 'Chi phí mua hàng hóa / dịch vụ',
            debt_amount: 0,
            paid_date: new Date().toLocaleDateString('vi-VN'),
            paid_amount: 0,
            confidence: { seller_name: 0.8 },
            validation: { errors: [], warnings: ['Hóa đơn PDF cần đối chiếu số tiền và ngày'], valid: true },
          });
        } else {
          // Xử lý Ảnh
          newInvoices.push({
            id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            file_id: file.name,
            source_file: file.name,
            source_type: 'IMAGE OCR',
            file_url: fileUrl,
            file_blob: file,
            mime_type: file.type || 'image/jpeg',
            tax_code: '',
            seller_name: file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' '),
            template_symbol: '1',
            invoice_symbol: '',
            invoice_number: '',
            invoice_date: new Date().toLocaleDateString('vi-VN'),
            invoice_amount: 0,
            currency: 'VND',
            purpose: 'Chi phí mua hàng hóa / dịch vụ',
            debt_amount: 0,
            paid_date: new Date().toLocaleDateString('vi-VN'),
            paid_amount: 0,
            confidence: { seller_name: 0.8 },
            validation: { errors: [], warnings: ['Hóa đơn ảnh cần kiểm tra số liệu'], valid: true },
          });
        }
      } catch (err) {
        console.error('Error processing file:', file.name, err);
      }
      setUploadStats((prev) => (prev ? { ...prev, done: i + 1 } : null));
    }

    if (newInvoices.length > 0) {
      onInvoicesExtracted(newInvoices);
    }
    setIsProcessing(false);
    setUploadStats(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-6 transition-all text-center cursor-pointer ${
        isDragging
          ? 'border-blue-500 bg-blue-50/80 scale-[1.005]'
          : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/60 shadow-xs'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".pdf,.xml,.jpg,.jpeg,.png,application/pdf,application/xml,text/xml,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
        }}
      />

      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          ) : (
            <UploadCloud className="w-6 h-6 text-blue-600" />
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {isProcessing && uploadStats
              ? `Đang trích xuất hóa đơn: ${uploadStats.done} / ${uploadStats.total}...`
              : contentData.uploadSection.dropText}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {contentData.uploadSection.fileSupport}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <FileCode className="w-3.5 h-3.5" /> XML Gốc chuẩn TCT
          </span>
          <span className="flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            <FileText className="w-3.5 h-3.5" /> PDF Hóa đơn
          </span>
          <span className="flex items-center gap-1 font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            <ImageIcon className="w-3.5 h-3.5" /> Ảnh Scan/Chụp
          </span>
        </div>
      </div>
    </div>
  );
};
