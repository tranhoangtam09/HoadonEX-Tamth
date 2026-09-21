import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileCode2, FileText, Image as ImageIcon, Loader2, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Concurrency limit for parallel uploads
const PARALLEL_CONCURRENCY = 6;

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onInvoicesExtracted,
  onLoadSample,
  isProcessing,
  setIsProcessing,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [activeThreads, setActiveThreads] = useState<number>(0);
  const [isFastMode, setIsFastMode] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    if (files.length > 1000) {
      alert('Tối đa 1.000 file mỗi lần xử lý.');
      return;
    }

    const total = files.length;
    setTotalFiles(total);
    setCompletedCount(0);
    setProgressPercent(0);
    setIsProcessing(true);
    setProcessingStatus(`Khởi động động cơ đa luồng siêu tốc cho ${total} tệp...`);

    const extractedItems: InvoiceItem[] = [];
    const xmlFiles: File[] = [];
    const networkFiles: File[] = [];

    // Separate XML (instant client-side) from PDF/Images (server concurrent pool)
    for (const file of files) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (ext === '.xml') {
        xmlFiles.push(file);
      } else {
        networkFiles.push(file);
      }
    }

    let finished = 0;
    const updateProgress = (name: string, activeCount: number) => {
      finished++;
      setCompletedCount(finished);
      const pct = Math.min(100, Math.round((finished / total) * 100));
      setProgressPercent(pct);
      setActiveThreads(activeCount);
      setProcessingStatus(`[${finished}/${total}] Đang xử lý song song: ${name}`);
    };

    // 1. FAST-PATH: Parse all XML files in parallel locally (super-fast, < 0.1s)
    if (xmlFiles.length > 0) {
      setProcessingStatus(`⚡ Đang phân tích tức thì ${xmlFiles.length} tệp XML gốc...`);
      const xmlPromises = xmlFiles.map(async (file) => {
        try {
          const text = await file.text();
          const item = parseXmlInvoice(text, file.name);
          item.file_blob = file;
          item.mime_type = 'text/xml';
          item.file_url = URL.createObjectURL(file);
          extractedItems.push(item);
        } catch (err) {
          console.warn('Lỗi đọc XML:', file.name, err);
          const fallbackItem = parseTextInvoice('', file.name, 'XML');
          fallbackItem.validation.errors.push('Lỗi định dạng XML');
          fallbackItem.validation.valid = false;
          extractedItems.push(fallbackItem);
        } finally {
          updateProgress(file.name, 0);
        }
      });
      await Promise.all(xmlPromises);
    }

    // 2. PARALLEL CONCURRENT POOL for PDF / JPG / PNG (6 concurrent streams)
    if (networkFiles.length > 0) {
      let currentIndex = 0;
      let runningWorkers = 0;

      const runWorker = async (): Promise<void> => {
        while (currentIndex < networkFiles.length) {
          const index = currentIndex++;
          const file = networkFiles[index];
          const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
          const mimeType = file.type || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg');

          runningWorkers++;
          setActiveThreads(runningWorkers);

          try {
            const base64Data = await fileToBase64(file);

            const resp = await fetch('/api/extract-invoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                base64Data,
                fileName: file.name,
                mimeType,
                fastMode: isFastMode,
              }),
            });

            if (resp.ok) {
              const resData = await resp.json();
              if (resData.item) {
                const item: InvoiceItem = resData.item;
                item.file_blob = file;
                item.mime_type = mimeType;
                item.file_url = URL.createObjectURL(file);
                extractedItems.push(item);
                runningWorkers--;
                updateProgress(file.name, runningWorkers);
                continue;
              }
            }
          } catch (apiErr) {
            console.warn('Lỗi kết nối server, dùng bộ phân tích dự phòng:', apiErr);
          }

          // Fallback parser if network fails
          const fallbackItem = parseTextInvoice(file.name, file.name, ext === '.pdf' ? 'PDF text' : 'IMAGE OCR');
          fallbackItem.file_blob = file;
          fallbackItem.mime_type = mimeType;
          fallbackItem.file_url = URL.createObjectURL(file);
          extractedItems.push(fallbackItem);

          runningWorkers--;
          updateProgress(file.name, runningWorkers);
        }
      };

      // Launch concurrent workers
      const workersCount = Math.min(PARALLEL_CONCURRENCY, networkFiles.length);
      const workerPool = Array.from({ length: workersCount }, () => runWorker());
      await Promise.all(workerPool);
    }

    onInvoicesExtracted(extractedItems);
    setIsProcessing(false);
    setProcessingStatus('');
    setProgressPercent(100);
    setActiveThreads(0);
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
      {/* Header bar of upload zone with Turbo speed mode switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>{contentData.uploadSection.heading}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200/60">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              Tăng tốc đa luồng ({PARALLEL_CONCURRENCY} luồng)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{contentData.uploadSection.batchGuide}</p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setIsFastMode(!isFastMode)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isFastMode
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Chế độ siêu tốc tối ưu bóc tách ngay tức thì trong 10-30ms cho hóa đơn điện tử chuẩn"
          >
            <Zap className={`w-3.5 h-3.5 ${isFastMode ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
            <span>{isFastMode ? '⚡ Chế độ Siêu Tốc: BẬT' : 'Chế độ Chuẩn AI'}</span>
          </button>
        </div>
      </div>

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
          <div className="flex flex-col items-center py-4 w-full max-w-md mx-auto">
            <div className="relative mb-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 mb-1.5 px-1">
              <span className="flex items-center gap-1 text-blue-700">
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                Đang xử lý song song {activeThreads > 0 ? `(${activeThreads} luồng)` : ''}
              </span>
              <span className="font-bold text-slate-900">
                {completedCount} / {totalFiles} ({progressPercent}%)
              </span>
            </div>

            {/* High speed visual progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden p-0.5 mb-3">
              <div
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 h-full rounded-full transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-xs font-medium text-slate-800 truncate max-w-full px-2" title={processingStatus}>
              {processingStatus}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {contentData.uploadSection.fastModeActive}
            </p>
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
                XML (Tức thì ~1ms)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                <FileText className="w-3.5 h-3.5" />
                PDF scan & text (Song song)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                <ImageIcon className="w-3.5 h-3.5" />
                Ảnh JPG, PNG (AI Multimodal)
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                className="px-5 py-2.5 bg-[#123b6d] hover:bg-[#0f2f57] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <UploadCloud className="w-4 h-4" />
                Chọn tệp hóa đơn từ máy tính
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
