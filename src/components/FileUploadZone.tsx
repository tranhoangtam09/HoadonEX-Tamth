import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileCode2, FileText, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import contentData from '../data/contentData.json';
import { InvoiceItem } from '../types/invoice';
import { parseXmlInvoice } from '../utils/xmlParser';
import { parseTextInvoice } from '../utils/textParser';

interface FileUploadZoneProps {
  onInvoicesExtracted: (newItems: InvoiceItem[]) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onInvoicesExtracted,
  onLoadSample,
  isProcessing,
  setIsProcessing,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    if (files.length > 1000) {
      alert('Tối đa 1.000 file mỗi lần xử lý.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(`Đang đọc và chuẩn hóa ${files.length} hóa đơn...`);

    const extractedItems: InvoiceItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      setProcessingStatus(`[${i + 1}/${files.length}] Đang xử lý: ${file.name}`);

      try {
        if (ext === '.xml') {
          const text = await file.text();
          const item = parseXmlInvoice(text, file.name);
          item.file_blob = file;
          item.mime_type = 'text/xml';
          item.file_url = URL.createObjectURL(file);
          extractedItems.push(item);
        } else if (ext === '.pdf') {
          // Read text from PDF if possible or attempt binary text extraction
          const arrayBuffer = await file.arrayBuffer();
          const textDecoder = new TextDecoder('utf-8', { fatal: false });
          const rawBinaryText = textDecoder.decode(arrayBuffer);

          // Extract plain text parts from PDF stream
          let pdfText = '';
          const matches = rawBinaryText.match(/\(([^()]{3,})\)Tj/g) || [];
          if (matches.length > 5) {
            pdfText = matches.map((m) => m.slice(1, -3)).join(' ');
          } else {
            pdfText = rawBinaryText;
          }

          const item = parseTextInvoice(pdfText, file.name, 'PDF text');
          item.file_blob = file;
          item.mime_type = 'application/pdf';
          item.file_url = URL.createObjectURL(file);
          extractedItems.push(item);
        } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
          // For images, parse with OCR regex parser & store image preview
          const item = parseTextInvoice(file.name, file.name, 'IMAGE OCR');
          item.file_blob = file;
          item.mime_type = ext === '.png' ? 'image/png' : 'image/jpeg';
          item.file_url = URL.createObjectURL(file);
          extractedItems.push(item);
        }
      } catch (err: unknown) {
        console.warn(`Lỗi khi xử lý file ${file.name}:`, err);
        // Add fallback item with error marked
        const fallbackItem = parseTextInvoice('', file.name, 'PDF text');
        fallbackItem.validation.errors.push(
          `Không thể phân tích dữ liệu: ${err instanceof Error ? err.message : 'Lỗi định dạng'}`
        );
        fallbackItem.validation.valid = false;
        fallbackItem.file_blob = file;
        fallbackItem.file_url = URL.createObjectURL(file);
        extractedItems.push(fallbackItem);
      }
    }

    onInvoicesExtracted(extractedItems);
    setIsProcessing(false);
    setProcessingStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-blue-600 bg-blue-50/60 scale-[1.005]'
            : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xml,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-800">{processingStatus}</p>
            <p className="text-xs text-slate-500 mt-1">Đang bóc tách dữ liệu theo chuẩn Thông tư 78</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center mb-3 shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {contentData.uploadSection.dropText}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mt-1">
              {contentData.uploadSection.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FileCode2 className="w-3.5 h-3.5" />
                XML (TCT / Viettel / MISA...)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                <FileText className="w-3.5 h-3.5" />
                PDF scan & text
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                <ImageIcon className="w-3.5 h-3.5" />
                Ảnh JPG, PNG
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-[#123b6d] hover:bg-[#0f2f57] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Chọn tệp từ máy tính
              </button>

              <button
                type="button"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSample();
                }}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Nạp 12 mẫu kiểm thử
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
