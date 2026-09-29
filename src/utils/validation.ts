import { InvoiceItem, InvoiceValidation } from '../types/invoice';

export function cleanString(s: unknown): string {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

export function normalizeDate(val: unknown): string {
  if (!val) return '';
  const raw = cleanString(val);

  // Match: Ngày 15 tháng 03 năm 2024 or Ngày 15 Tháng 3 Năm 2024
  const vnTextMatch = raw.match(/ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i);
  if (vnTextMatch) {
    const day = String(parseInt(vnTextMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(vnTextMatch[2], 10)).padStart(2, '0');
    const year = vnTextMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Strip timestamps like T14:30:00 or 14:30:00
  const dateOnly = raw.replace(/[T\s].*$/, '');
  const s = dateOnly.replace(/[-.]/g, '/');

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

  // If there's any 8 digit like 20240315 or 15032024
  const eightDigits = raw.match(/\b(202\d)(0[1-9]|1[0-2])([0-2]\d|3[01])\b/);
  if (eightDigits) {
    return `${eightDigits[3]}/${eightDigits[2]}/${eightDigits[1]}`;
  }

  return raw;
}

/**
 * Trích xuất timestamp từ chuỗi ngày tháng hóa đơn để phục vụ sắp xếp theo trình tự thời gian
 */
export function parseDateToTimestamp(val: unknown): number {
  if (val === null || val === undefined || val === '') return Number.MAX_SAFE_INTEGER;
  const raw = cleanString(val);
  if (!raw) return Number.MAX_SAFE_INTEGER;

  // Pattern: "ngày 15 tháng 03 năm 2024" hoặc "ngày 15 Tháng 3 Năm 2024"
  const vnMatch = raw.match(/ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10);
    const year = parseInt(vnMatch[3], 10);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }

  // Loại bỏ phần giờ nếu có: T14:30:00 hoặc 14:30:00
  const dateOnly = raw.replace(/[T\s].*$/, '').trim();

  // Pattern: dd/mm/yyyy hoặc dd-mm-yyyy hoặc dd.mm.yyyy
  const dmyMatch = dateOnly.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }

  // Pattern: yyyy/mm/dd hoặc yyyy-mm-dd hoặc yyyy.mm.dd
  const ymdMatch = dateOnly.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }

  // Pattern: 8 chữ số YYYYMMDD (ví dụ: 20240315)
  const yyyymmdd = dateOnly.match(/^(20\d{2})(0[1-9]|1[0-2])([0-2]\d|3[01])$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10);
    const day = parseInt(yyyymmdd[3], 10);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }

  // Pattern: 8 chữ số DDMMYYYY (ví dụ: 15032024)
  const ddmmyyyy = dateOnly.match(/^([0-2]\d|3[01])(0[1-9]|1[0-2])(20\d{2})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }

  const parsed = Date.parse(dateOnly);
  if (!isNaN(parsed)) return parsed;

  return Number.MAX_SAFE_INTEGER;
}

/**
 * Sắp xếp danh sách hóa đơn theo thứ tự ngày trên hóa đơn (mặc định 'asc': từ ngày cũ nhất đến mới nhất).
 * Khi trùng ngày: sắp xếp theo số hóa đơn (dạng số), ký hiệu, và mã số thuế.
 */
export function sortInvoicesByDate(
  items: InvoiceItem[],
  order: 'asc' | 'desc' = 'asc'
): InvoiceItem[] {
  return [...items].sort((a, b) => {
    const timeA = parseDateToTimestamp(a.invoice_date);
    const timeB = parseDateToTimestamp(b.invoice_date);

    // Hóa đơn thiếu ngày hoặc không nhận diện được ngày sẽ đặt ở cuối danh sách
    if (timeA === Number.MAX_SAFE_INTEGER && timeB === Number.MAX_SAFE_INTEGER) {
      return String(a.invoice_number || '').localeCompare(String(b.invoice_number || ''), undefined, { numeric: true });
    }
    if (timeA === Number.MAX_SAFE_INTEGER) return 1;
    if (timeB === Number.MAX_SAFE_INTEGER) return -1;

    const diff = timeA - timeB;
    if (diff !== 0) {
      return order === 'asc' ? diff : -diff;
    }

    // Tiêu chí phụ 1: Số hóa đơn (so sánh dạng số tự nhiên)
    const numCompare = String(a.invoice_number || '').localeCompare(String(b.invoice_number || ''), undefined, { numeric: true });
    if (numCompare !== 0) return numCompare;

    // Tiêu chí phụ 2: Ký hiệu hóa đơn
    const symCompare = String(a.invoice_symbol || '').localeCompare(String(b.invoice_symbol || ''));
    if (symCompare !== 0) return symCompare;

    // Tiêu chí phụ 3: Mã số thuế bên bán
    return String(a.tax_code || '').localeCompare(String(b.tax_code || ''));
  });
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
