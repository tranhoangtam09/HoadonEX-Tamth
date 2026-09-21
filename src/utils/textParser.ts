import { InvoiceItem, InvoiceSourceType } from '../types/invoice';
import { cleanString, normalizeDate, parseAmountNumber, validateSingleInvoice } from './validation';

function extractContext(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return cleanString(match[1]);
    }
  }
  return '';
}

export function parseTextInvoice(
  text: string,
  fileName: string,
  sourceType: InvoiceSourceType = 'PDF text'
): InvoiceItem {
  const safeText = text || '';

  const tax_code = extractContext(safeText, [
    /(?:M[ãa]\s*số\s*thuế|MST|Tax\s*code)\s*[:\-]?\s*([0-9]{10}(?:\s*-\s*[0-9]{3})?)/i,
    /\b([0-9]{10}(?:-[0-9]{3})?)\b/,
  ]);

  const invoice_number = extractContext(safeText, [
    /(?:Số\s*(?:hóa\s*đơn|HĐ|HD)|Invoice\s*(?:No|Number)|No\.?)[\s:.-]*([0-9]{1,20})/i,
    /Số\s*:\s*([0-9]{1,10})/i,
  ]);

  const rawDate = extractContext(safeText, [
    /(?:Ngày\s*(?:lập|hóa\s*đơn|ký)|Date|Invoice\s*date)[\s:.-]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/,
  ]);
  const invoice_date = normalizeDate(rawDate);

  const invoice_symbol = extractContext(safeText, [
    /(?:Ký\s*hiệu\s*(?:hóa\s*đơn|HĐ)|Invoice\s*symbol)[\s:.-]*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /Ký\s*hiệu\s*:\s*([A-Z0-9/]{2,15})/i,
  ]);

  const template_symbol = extractContext(safeText, [
    /(?:Ký\s*hiệu\s*mẫu\s*số|Mẫu\s*số|Template\s*symbol)[\s:.-]*([0-9./-]{3,20})/i,
  ]);

  const seller_name = extractContext(safeText, [
    /(?:Tên\s*(?:đơn\s*vị\s*bán|người\s*bán)|Đơn\s*vị\s*bán\s*hàng|Công\s*ty|Doanh\s*nghiệp|Seller\s*name?)[\s:.-]*([^\n\r]+)/i,
  ]);

  const rawCurrency = extractContext(safeText, [
    /(?:Loại\s*tiền|ĐVT\s*tiền|Currency)[\s:.-]*([A-ZĐVND]{3,5})/i,
  ]);
  const currency = rawCurrency || 'VND';

  const rawAmount = extractContext(safeText, [
    /(?:Tổng\s*(?:tiền\s*)?(?:thanh\s*toán|cộng)|Grand\s*total|Total\s*payment)[\s:.-]*([0-9][0-9.,\s]*)/i,
    /(?:Thành\s*tiền|Cộng\s*tiền\s*hàng)[\s:.-]*([0-9][0-9.,\s]*)/i,
  ]);
  const invoice_amount = parseAmountNumber(rawAmount);

  const purpose = extractContext(safeText, [
    /(?:Tên\s*hàng\s*hóa|Tên\s*HH|Hàng\s*hóa|Description|Diễn\s*giải|Nội\s*dung)[\s:.-]*([^\n\r]+)/i,
  ]);

  // Confidence calculations based on field presence & characteristics
  const confidence: Record<string, number> = {
    tax_code: tax_code ? (/^\d{10}(-\d{3})?$/.test(tax_code.replace(/\s+/g, '')) ? 0.98 : 0.85) : 0.0,
    seller_name: seller_name ? 0.92 : 0.0,
    template_symbol: template_symbol ? 0.90 : 0.0,
    invoice_symbol: invoice_symbol ? (invoice_symbol.length >= 3 ? 0.95 : 0.72) : 0.0,
    invoice_number: invoice_number ? (invoice_number.length >= 4 ? 0.96 : 0.75) : 0.0,
    invoice_date: invoice_date ? (/^\d{2}\/\d{2}\/\d{4}$/.test(invoice_date) ? 0.98 : 0.7) : 0.0,
    invoice_amount: invoice_amount !== '' ? 0.95 : 0.0,
    currency: 0.98,
    purpose: purpose ? 0.88 : 0.5,
    debt_amount: invoice_amount !== '' ? 0.95 : 0.0,
    paid_date: invoice_date ? 0.95 : 0.0,
    paid_amount: invoice_amount !== '' ? 0.95 : 0.0,
  };

  const item: InvoiceItem = {
    id: 'inv_' + Math.random().toString(36).substring(2, 9),
    file_id: 'file_' + Math.random().toString(36).substring(2, 9),
    source_file: fileName,
    source_type: sourceType,
    tax_code,
    seller_name,
    template_symbol,
    invoice_symbol,
    invoice_number,
    invoice_date,
    invoice_amount,
    currency,
    purpose: purpose || 'Chi phí theo hóa đơn số ' + (invoice_number || ''),
    debt_amount: invoice_amount,
    paid_date: invoice_date,
    paid_amount: invoice_amount,
    confidence,
    validation: { errors: [], warnings: [], valid: true },
    _raw_text: safeText.slice(0, 5000),
  };

  item.validation = validateSingleInvoice(item);
  return item;
}
