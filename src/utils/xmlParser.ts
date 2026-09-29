import { InvoiceItem } from '../types/invoice';
import { normalizeDate, parseAmountNumber } from './validation';
import { sanitizePurpose, detectSmartPurposeFromSeller } from './textParser';

/**
 * Trích xuất hóa đơn từ file XML chuẩn hóa đơn điện tử Việt Nam (NĐ 123 / TT 78)
 */
export function parseInvoiceXml(xmlContent: string, fileName: string): InvoiceItem {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');

  const getText = (selector: string): string => {
    // Thử truy vấn querySelector
    try {
      const el = xmlDoc.querySelector(selector);
      if (el && el.textContent) return el.textContent.trim();
    } catch {
      // Fallback
    }
    // Thử getElementsByTagName (bỏ namespace)
    const tagName = selector.split('>').pop()?.trim() || selector;
    const elements = xmlDoc.getElementsByTagName(tagName);
    if (elements && elements.length > 0 && elements[0].textContent) {
      return elements[0].textContent.trim();
    }
    return '';
  };

  // 1. Mã số thuế bên bán
  const taxCode =
    getText('NBan > MST') ||
    getText('Seller > TaxCode') ||
    getText('SellerTaxCode') ||
    getText('MSTNBan') ||
    getText('MST') ||
    '';

  // 2. Tên đơn vị bán
  const sellerName =
    getText('NBan > Ten') ||
    getText('Seller > Name') ||
    getText('SellerName') ||
    getText('TenNBan') ||
    '';

  // 3. Ký hiệu mẫu số
  const templateSymbol =
    getText('TTChung > KHMSHDon') ||
    getText('InvoiceTemplate') ||
    getText('KHMauHDon') ||
    getText('MauSo') ||
    '1';

  // 4. Ký hiệu hóa đơn
  const invoiceSymbol =
    getText('TTChung > KHHDon') ||
    getText('InvoiceSeries') ||
    getText('KyHieu') ||
    '';

  // 5. Số hóa đơn
  let invoiceNumber =
    getText('TTChung > SHDon') ||
    getText('InvoiceNumber') ||
    getText('SoHDon') ||
    getText('SHD') ||
    '';
  if (invoiceNumber) {
    invoiceNumber = invoiceNumber.replace(/\D/g, '').padStart(7, '0').slice(-8);
  }

  // 6. Ngày hóa đơn
  const rawDate =
    getText('TTChung > NLap') ||
    getText('InvoiceDate') ||
    getText('NgayLap') ||
    getText('SigningDate') ||
    getText('NgayKy') ||
    '';
  const invoiceDate = normalizeDate(rawDate);

  // 7. Số tiền
  const rawAmount =
    getText('TToan > TGTTTBSo') ||
    getText('TotalAmount') ||
    getText('TongTienThanhToan') ||
    getText('TGiaTri') ||
    getText('TgTTTBSo') ||
    '';
  const invoiceAmount = parseAmountNumber(rawAmount) || 0;

  // 8. Loại tiền
  const currency =
    getText('TTChung > DVTTe') ||
    getText('CurrencyCode') ||
    getText('LoaiTien') ||
    'VND';

  // 9. Mặt hàng / Hàng hóa dịch vụ
  let purpose = '';
  // Duyệt các dòng hàng hóa chi tiết
  const itemNames: string[] = [];
  const itemNodes = xmlDoc.getElementsByTagName('HHDVu');
  for (let i = 0; i < itemNodes.length; i++) {
    const node = itemNodes[i];
    const nameEl = node.getElementsByTagName('THHDVu')[0] || node.getElementsByTagName('ItemName')[0];
    if (nameEl && nameEl.textContent) {
      const name = nameEl.textContent.trim();
      if (name && !itemNames.includes(name)) {
        itemNames.push(name);
      }
    }
  }

  if (itemNames.length > 0) {
    purpose = itemNames.slice(0, 3).join(', ') + (itemNames.length > 3 ? '...' : '');
  }

  if (!purpose) {
    purpose =
      getText('THHDVu') ||
      getText('ItemName') ||
      getText('TenHang') ||
      detectSmartPurposeFromSeller(sellerName);
  }

  purpose = sanitizePurpose(purpose, sellerName, invoiceNumber);

  return {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    file_id: fileName,
    source_file: fileName,
    source_type: 'XML',
    mime_type: 'application/xml',
    tax_code: taxCode,
    seller_name: sellerName,
    template_symbol: templateSymbol,
    invoice_symbol: invoiceSymbol,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    invoice_amount: invoiceAmount,
    currency,
    purpose,
    debt_amount: invoiceAmount,
    paid_date: invoiceDate,
    paid_amount: invoiceAmount,
    confidence: {
      tax_code: taxCode ? 0.99 : 0,
      seller_name: sellerName ? 0.99 : 0,
      invoice_number: invoiceNumber ? 0.99 : 0,
      invoice_date: invoiceDate ? 0.99 : 0,
      invoice_amount: invoiceAmount ? 0.99 : 0,
      purpose: purpose ? 0.95 : 0,
    },
    validation: {
      errors: [],
      warnings: [],
      valid: true,
    },
    _raw_text: xmlContent,
  };
}
