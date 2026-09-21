import { InvoiceItem, InvoiceValidation } from '../types/invoice';

export function cleanString(s: unknown): string {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

export function normalizeDate(val: unknown): string {
  const s = cleanString(val).replace(/[-.]/g, '/');
  // Match yyyy/mm/dd
  const ymd = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (ymd) {
    const day = String(parseInt(ymd[3], 10)).padStart(2, '0');
    const month = String(parseInt(ymd[2], 10)).padStart(2, '0');
    const year = ymd[1];
    return `${day}/${month}/${year}`;
  }
  // Match dd/mm/yyyy or d/m/yyyy
  const dmy = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const day = String(parseInt(dmy[1], 10)).padStart(2, '0');
    const month = String(parseInt(dmy[2], 10)).padStart(2, '0');
    const year = dmy[3];
    return `${day}/${month}/${year}`;
  }
  return s;
}

export function parseAmountNumber(val: unknown): number | '' {
  if (val === '' || val === null || val === undefined) return '';
  if (typeof val === 'number') return isNaN(val) ? '' : val;

  let s = String(val).trim().replace(/\s+/g, '');
  // Remove currency symbols or non-numeric chars except . , -
  s = s.replace(/[^0-9,.-]/g, '');
  if (!s) return '';

  if (s.includes(',') && s.includes('.')) {
    // Determine which is decimal and which is thousands
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    // If 3 digits after comma, it's likely thousands separator: 12,500,000
    const parts = s.split(',');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(',', '.');
    }
  } else if (s.includes('.')) {
    // If dot followed by 3 digits (e.g. 15.000.000 or 15.000), it's VN thousands separator
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  }

  const num = parseFloat(s);
  return isNaN(num) ? '' : num;
}

export function formatVND(val: number | string | undefined): string {
  if (val === '' || val === undefined || val === null) return '0 ₫';
  const num = typeof val === 'number' ? val : parseAmountNumber(val);
  if (num === '' || isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(num);
}

export function formatNumberVN(val: number | string | undefined): string {
  if (val === '' || val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseAmountNumber(val);
  if (num === '' || isNaN(num)) return '0';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);
}

export function validateSingleInvoice(item: Partial<InvoiceItem>): InvoiceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field warnings
  if (!cleanString(item.tax_code)) warnings.push('Thiếu Mã số thuế (Bên bán)');
  if (!cleanString(item.invoice_number)) warnings.push('Thiếu Số hóa đơn');
  if (!cleanString(item.invoice_date)) warnings.push('Thiếu Ngày hóa đơn');
  if (item.invoice_amount === '' || item.invoice_amount === undefined || item.invoice_amount === null) {
    warnings.push('Thiếu Số tiền hóa đơn');
  }

  // Tax code regex verification: 10 digits or 10-3 digits
  if (item.tax_code) {
    const rawMST = String(item.tax_code).replace(/\s+/g, '');
    if (!/^\d{10}(-\d{3})?$/.test(rawMST)) {
      warnings.push('Mã số thuế chưa đúng định dạng chuẩn (10 số hoặc 10-3 số)');
    }
  }

  // Date verification: dd/mm/yyyy
  if (item.invoice_date) {
    const dateStr = cleanString(item.invoice_date);
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      errors.push('Ngày hóa đơn không đúng định dạng dd/mm/yyyy');
    } else {
      const [d, m, y] = dateStr.split('/').map(Number);
      if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2099) {
        errors.push('Ngày hóa đơn không hợp lệ');
      }
    }
  }

  // Check numeric amounts
  const amountFields: Array<{ key: 'invoice_amount' | 'debt_amount' | 'paid_amount'; label: string }> = [
    { key: 'invoice_amount', label: 'Số tiền hóa đơn' },
    { key: 'debt_amount', label: 'Số tiền nhận nợ' },
    { key: 'paid_amount', label: 'Số tiền đã thanh toán' },
  ];

  for (const { key, label } of amountFields) {
    const raw = item[key];
    if (raw !== '' && raw !== undefined && raw !== null) {
      const val = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (isNaN(val)) {
        errors.push(`${label} không phải giá trị số`);
      } else if (val < 0) {
        errors.push(`${label} không được là số âm`);
      }
    }
  }

  return {
    errors,
    warnings,
    valid: errors.length === 0,
  };
}

export function getDuplicateKey(item: Partial<InvoiceItem>): string {
  const mst = cleanString(item.tax_code).toLowerCase().replace(/\s+/g, '');
  const sym = cleanString(item.invoice_symbol).toLowerCase().replace(/\s+/g, '');
  const num = cleanString(item.invoice_number).toLowerCase().replace(/\s+/g, '');
  const date = cleanString(item.invoice_date).toLowerCase().replace(/\s+/g, '');
  const amt = item.invoice_amount !== '' && item.invoice_amount !== undefined ? Number(item.invoice_amount) : '';

  if (!mst && !num && !date) return '';
  return `${mst}|${sym}|${num}|${date}|${amt}`;
}

export function reviewAllInvoices(items: InvoiceItem[]): {
  reviewedItems: InvoiceItem[];
  duplicatesCount: number;
  warningsCount: number;
  errorsCount: number;
} {
  const seen = new Map<string, number[]>();

  // Pass 1: validate and group duplicate keys
  items.forEach((item, index) => {
    item.validation = validateSingleInvoice(item);
    const key = getDuplicateKey(item);
    if (key && key !== '||||') {
      const list = seen.get(key) || [];
      list.push(index);
      seen.set(key, list);
    }
  });

  let duplicatesCount = 0;
  let warningsCount = 0;
  let errorsCount = 0;

  // Pass 2: mark duplicates
  items.forEach((item, index) => {
    const key = getDuplicateKey(item);
    if (key && (seen.get(key)?.length || 0) > 1) {
      const dupIndices = seen.get(key) || [];
      item.validation.isDuplicate = true;
      item.validation.duplicateWith = dupIndices.filter((i) => i !== index);
      duplicatesCount++;
    } else {
      item.validation.isDuplicate = false;
      item.validation.duplicateWith = [];
    }

    warningsCount += item.validation.warnings.length;
    errorsCount += item.validation.errors.length;
  });

  return {
    reviewedItems: [...items],
    duplicatesCount: Math.floor(duplicatesCount / 2),
    warningsCount,
    errorsCount,
  };
}

export function getConfidenceBadge(score: number): {
  badgeText: string;
  badgeClass: string;
  dotColor: string;
  level: 'high' | 'mid' | 'low';
} {
  const pct = Math.round(score * 100);
  if (pct >= 95) {
    return {
      badgeText: `${pct}%`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold',
      dotColor: 'bg-emerald-500',
      level: 'high',
    };
  }
  if (pct >= 80) {
    return {
      badgeText: `${pct}%`,
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold',
      dotColor: 'bg-amber-500',
      level: 'mid',
    };
  }
  return {
    badgeText: `${pct}%`,
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold',
    dotColor: 'bg-rose-500',
    level: 'low',
  };
}
