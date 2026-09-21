export type InvoiceFieldKey =
  | 'stt'
  | 'tax_code'
  | 'seller_name'
  | 'template_symbol'
  | 'invoice_symbol'
  | 'invoice_number'
  | 'invoice_date'
  | 'invoice_amount'
  | 'currency'
  | 'purpose'
  | 'debt_amount'
  | 'paid_date'
  | 'paid_amount';

export type InvoiceSourceType = 'XML' | 'PDF text' | 'PDF OCR' | 'IMAGE OCR' | 'SAMPLE';

export interface InvoiceValidation {
  errors: string[];
  warnings: string[];
  valid: boolean;
  isDuplicate?: boolean;
  duplicateWith?: number[];
}

export interface InvoiceItem {
  id: string;
  stt?: number;
  file_id: string;
  source_file: string;
  source_type: InvoiceSourceType;
  file_url?: string;
  file_blob?: Blob;
  mime_type?: string;

  tax_code: string;
  seller_name: string;
  template_symbol: string;
  invoice_symbol: string;
  invoice_number: string;
  invoice_date: string;
  invoice_amount: number | string;
  currency: string;
  purpose: string;
  debt_amount: number | string;
  paid_date: string;
  paid_amount: number | string;

  confidence: Record<string, number>;
  validation: InvoiceValidation;
  _raw_text?: string;
  createdAt?: string;
}

export interface DuplicatePair {
  firstIndex: number;
  duplicateIndex: number;
  key: string;
}

export interface PdfMergedGroup {
  groupIndex: number;
  filename: string;
  invoiceCount: number;
  invoices: InvoiceItem[];
  downloadUrl?: string;
}

export interface ExcelExportOptions {
  fileName?: string;
  companyName?: string;
  preparedBy?: string;
  includeSummaryRows?: boolean;
}
