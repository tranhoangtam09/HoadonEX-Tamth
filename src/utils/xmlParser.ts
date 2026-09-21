import { InvoiceItem } from '../types/invoice';
import { cleanString, normalizeDate, parseAmountNumber, validateSingleInvoice } from './validation';

export function parseXmlInvoice(xmlString: string, fileName: string): InvoiceItem {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check parser error
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`File XML không hợp lệ: ${parserError.textContent?.slice(0, 100)}`);
  }

  // Helper to find element text by tag name (case-insensitive)
  const getTagValue = (...tagNames: string[]): string => {
    for (const tag of tagNames) {
      // Look direct and lowercase
      const elements = xmlDoc.getElementsByTagName(tag);
      if (elements.length > 0 && elements[0].textContent) {
        const val = cleanString(elements[0].textContent);
        if (val) return val;
      }
    }
    // Deep search if needed
    const allElements = xmlDoc.querySelectorAll('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const localName = (el.localName || el.nodeName).toLowerCase();
      for (const tag of tagNames) {
        if (localName === tag.toLowerCase() && el.textContent) {
          const val = cleanString(el.textContent);
          if (val) return val;
        }
      }
    }
    return '';
  };

  const tax_code = getTagValue('MST', 'MaSoThue', 'TaxCode', 'MSTNBan', 'SellerTaxCode');
  const seller_name = getTagValue('TenNNT', 'TenNguoiBan', 'SellerName', 'TenNBan', 'TenDonViBan');
  const invoice_number = getTagValue('SHDon', 'SoHoaDon', 'InvoiceNumber', 'SoHD');
  const invoice_symbol = getTagValue('KHHDon', 'KyHieuHoaDon', 'InvoiceSymbol', 'KyHieu');
  const template_symbol = getTagValue('KHMSHDon', 'KyHieuMauSo', 'TemplateSymbol', 'MauSo');
  const rawDate = getTagValue('NLap', 'NgayLap', 'InvoiceDate', 'NgayHD');
  const invoice_date = normalizeDate(rawDate);
  const currency = getTagValue('DVTTe', 'LoaiTien', 'Currency') || 'VND';
  const rawAmount = getTagValue('TgTTTBSo', 'TgTT', 'TongTienThanhToan', 'TotalAmount', 'TongCong');
  const invoice_amount = parseAmountNumber(rawAmount);

  // Goods name / purpose
  let purpose = getTagValue('TenHH', 'TenHangHoa', 'Description', 'DienGiai');
  if (!purpose) {
    // Attempt to gather item descriptions
    const items = xmlDoc.querySelectorAll('HHDVu, Item, ChiTiet');
    const descriptions: string[] = [];
    items.forEach((item) => {
      const nameEl = item.querySelector('THHDVu, TenHH, TenHangHoa, ItemName');
      if (nameEl?.textContent) descriptions.push(cleanString(nameEl.textContent));
    });
    if (descriptions.length > 0) {
      purpose = descriptions.slice(0, 3).join(', ');
    }
  }

  const confidence: Record<string, number> = {
    tax_code: tax_code ? 1.0 : 0.0,
    seller_name: seller_name ? 1.0 : 0.0,
    template_symbol: template_symbol ? 0.98 : 0.0,
    invoice_symbol: invoice_symbol ? 1.0 : 0.0,
    invoice_number: invoice_number ? 1.0 : 0.0,
    invoice_date: invoice_date ? 1.0 : 0.0,
    invoice_amount: invoice_amount !== '' ? 1.0 : 0.0,
    currency: 1.0,
    purpose: purpose ? 0.95 : 0.0,
    debt_amount: invoice_amount !== '' ? 1.0 : 0.0,
    paid_date: invoice_date ? 1.0 : 0.0,
    paid_amount: invoice_amount !== '' ? 1.0 : 0.0,
  };

  const itemData: InvoiceItem = {
    id: 'inv_' + Math.random().toString(36).substring(2, 9),
    file_id: 'xml_' + Math.random().toString(36).substring(2, 9),
    source_file: fileName,
    source_type: 'XML',
    tax_code,
    seller_name,
    template_symbol,
    invoice_symbol,
    invoice_number,
    invoice_date,
    invoice_amount,
    currency,
    purpose: purpose || 'Thanh toán theo hóa đơn số ' + (invoice_number || ''),
    debt_amount: invoice_amount,
    paid_date: invoice_date,
    paid_amount: invoice_amount,
    confidence,
    validation: { errors: [], warnings: [], valid: true },
    _raw_text: xmlString.slice(0, 5000),
  };

  itemData.validation = validateSingleInvoice(itemData);
  return itemData;
}
