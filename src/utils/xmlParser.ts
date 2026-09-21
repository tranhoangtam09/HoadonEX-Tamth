import { InvoiceItem } from '../types/invoice';
import { cleanString, normalizeDate, parseAmountNumber, validateSingleInvoice } from './validation';
import { isInvalidPurposeText, sanitizePurpose } from './textParser';

export function parseXmlInvoice(xmlString: string, fileName: string): InvoiceItem {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check parser error
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`File XML không hợp lệ: ${parserError.textContent?.slice(0, 100)}`);
  }

  // Helper to find text inside a container element with localName matching
  const findInContainer = (container: Element | null, ...tagNames: string[]): string => {
    if (!container) return '';
    for (const tag of tagNames) {
      const children = container.querySelectorAll('*');
      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const name = (el.localName || el.nodeName).toLowerCase();
        if (name === tag.toLowerCase() && el.textContent) {
          const val = cleanString(el.textContent);
          if (val) return val;
        }
      }
    }
    return '';
  };

  // Helper to query element by tag names globally (case-insensitive & namespace-safe)
  const getGlobalTag = (...tagNames: string[]): string => {
    const all = xmlDoc.querySelectorAll('*');
    for (const tag of tagNames) {
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        const name = (el.localName || el.nodeName).toLowerCase();
        if (name === tag.toLowerCase() && el.textContent) {
          const val = cleanString(el.textContent);
          if (val) return val;
        }
      }
    }
    return '';
  };

  // Find Seller Section container (<NBan>, <Seller>, <SellerInfo>, <DonViBan>, <Com>)
  const allElements = xmlDoc.querySelectorAll('*');
  let sellerContainer: Element | null = null;
  for (let i = 0; i < allElements.length; i++) {
    const name = (allElements[i].localName || allElements[i].nodeName).toLowerCase();
    if (['nban', 'seller', 'sellerinfo', 'donviban', 'com'].includes(name)) {
      sellerContainer = allElements[i];
      break;
    }
  }

  // 1. Mã số thuế bên bán (Tax Code)
  let tax_code = '';
  if (sellerContainer) {
    tax_code = findInContainer(sellerContainer, 'MST', 'TaxCode', 'MaSoThue', 'SellerTaxCode');
  }
  if (!tax_code) {
    tax_code = getGlobalTag('MSTNBan', 'SellerTaxCode', 'ComTaxCode', 'NBanMST', 'MaSoThueNBan');
  }
  if (!tax_code) {
    // Fallback: search any MST that is not under NMua (Buyer)
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const name = (el.localName || el.nodeName).toLowerCase();
      if (['mst', 'taxcode', 'masothue'].includes(name)) {
        // Check if inside NMua / Buyer
        const parent = el.parentElement;
        const parentName = (parent?.localName || parent?.nodeName || '').toLowerCase();
        if (!['nmua', 'buyer', 'customer', 'khachhang'].includes(parentName)) {
          const val = cleanString(el.textContent);
          if (val && /^\d{10}(-\d{3})?$/.test(val.replace(/\s+/g, ''))) {
            tax_code = val;
            break;
          }
        }
      }
    }
  }
  tax_code = tax_code.replace(/\s+/g, '');

  // 2. Tên đơn vị phát hành / Đơn vị bán hàng / Người bán (Seller Name)
  let seller_name = '';
  if (sellerContainer) {
    seller_name = findInContainer(sellerContainer, 'Ten', 'TenNNT', 'TenNBan', 'Name', 'SellerName', 'TenDonViBan', 'TenNguoiBan', 'TenDonViPhatHanh', 'DonViBanHang', 'NguoiBanHang', 'ComName', 'SellerLegalName', 'TenDV', 'TenDoanhNghiep');
  }
  if (!seller_name) {
    seller_name = getGlobalTag('TenNBan', 'SellerLegalName', 'SellerName', 'TenDonViBan', 'ComName', 'TenNNT', 'TenNguoiBan', 'TenDonViPhatHanh', 'DonViBanHang', 'NguoiBanHang', 'TenDV', 'TenDoanhNghiep');
  }
  if (!seller_name) {
    // Fallback: check elements that contain 'Công ty' or 'Doanh nghiệp' or 'Tập đoàn'
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      const text = cleanString(el.textContent);
      const name = (el.localName || el.nodeName).toLowerCase();
      if (
        ['ten', 'name'].includes(name) &&
        /(?:Công\s*ty|TNHH|Cổ\s*phần|Doanh\s*nghiệp|Tập\s*đoàn|Tổng\s*công\s*ty|Chi\s*nhánh)/i.test(text)
      ) {
        // Make sure it's not buyer
        const parentName = (el.parentElement?.localName || el.parentElement?.nodeName || '').toLowerCase();
        if (!['nmua', 'buyer', 'customer'].includes(parentName)) {
          seller_name = text;
          break;
        }
      }
    }
  }

  // 3. Ký hiệu mẫu số (Template Symbol)
  let template_symbol = getGlobalTag(
    'KHMSHDon',
    'KyHieuMauSo',
    'TemplateSymbol',
    'MauSo',
    'Pattern',
    'InvTemplateCode',
    'InvoicePattern',
    'TemplateCode'
  );

  // 4. Ký hiệu hóa đơn (Invoice Symbol)
  let invoice_symbol = getGlobalTag(
    'KHHDon',
    'KyHieuHoaDon',
    'InvoiceSeries',
    'Serial',
    'KyHieu',
    'InvoiceSymbol',
    'SerialNo',
    'InvoiceSerial'
  );

  // If TT78 format: invoice_symbol like 1C24TAA
  if (invoice_symbol && !template_symbol) {
    // Under TT78, the first character of 1C24TAA is the template number (1 = GTGT, 2 = Bán hàng...)
    if (/^[1-6][CK][0-9]{2}[A-Z]{2,3}$/i.test(invoice_symbol)) {
      template_symbol = invoice_symbol.charAt(0);
    }
  }

  // 5. Số hóa đơn (Invoice Number)
  let invoice_number = getGlobalTag(
    'SHDon',
    'SoHoaDon',
    'InvoiceNo',
    'InvoiceNumber',
    'SoHD',
    'InvNum',
    'FNo',
    'InvNo',
    'SoHDon',
    'So',
    'Invoice_Number',
    'Number',
    'InvoiceSeriesNumber',
    'InvoiceSeq'
  );
  // Pad with leading zeros to at least 7 digits if it's purely numeric
  if (invoice_number && /^\d+$/.test(invoice_number)) {
    if (invoice_number.length < 7) {
      invoice_number = invoice_number.padStart(7, '0');
    }
  }

  // 6. Ngày hóa đơn (Invoice Date)
  const rawDate = getGlobalTag(
    'NLap',
    'NgayLap',
    'InvoiceDate',
    'IssueDate',
    'ArisingDate',
    'NgayHD',
    'SignedDate'
  );
  const invoice_date = normalizeDate(rawDate);

  // 7. Loại tiền (Currency)
  const currency = getGlobalTag('DVTTe', 'LoaiTien', 'Currency', 'CurrencyUnit') || 'VND';

  // 8. Số tiền thanh toán (Invoice Amount)
  let rawAmount = getGlobalTag(
    'TgTTTBSo',
    'TongTienThanhToan',
    'TotalAmount',
    'TotalPaymentAmount',
    'PaymentAmount',
    'TotalAmountWithVAT',
    'TgTT',
    'Amount',
    'TongCong'
  );
  let invoice_amount = parseAmountNumber(rawAmount);

  // If total amount not found, attempt sum of subtotal + VAT (TgTCThue + TgTThue)
  if (invoice_amount === '') {
    const subTotal = parseAmountNumber(getGlobalTag('TgTCThue', 'TotalAmountWithoutVAT', 'SubTotal'));
    const vatAmount = parseAmountNumber(getGlobalTag('TgTThue', 'TotalVATAmount', 'VATAmount'));
    if (typeof subTotal === 'number' && typeof vatAmount === 'number') {
      invoice_amount = subTotal + vatAmount;
    } else if (typeof subTotal === 'number') {
      invoice_amount = subTotal;
    }
  }

  // 9. Tên hàng hóa / mục đích chi (Purpose) - Quét chi tiết từng dòng hàng hóa trong bảng HHDVu
  let purpose = '';
  const itemRows = xmlDoc.querySelectorAll('HHDVu, Item, ChiTiet, Row, HHDVuChiTiet');
  const descriptions: string[] = [];

  itemRows.forEach((row) => {
    const nameEl = row.querySelector('THHDVu, TenHH, TenHangHoa, ItemName, Description');
    if (nameEl?.textContent) {
      const d = cleanString(nameEl.textContent);
      if (d && !isInvalidPurposeText(d) && !descriptions.includes(d)) {
        descriptions.push(d);
      }
    }
  });

  if (descriptions.length > 0) {
    purpose = descriptions.slice(0, 3).join(', ');
  } else {
    // Nếu không có bảng dòng hàng, tìm các thẻ diễn giải hoặc ghi chú toàn cục
    const candidateGlobal = getGlobalTag('THHDVu', 'TenHH', 'TenHangHoa', 'Description', 'DienGiai', 'GhiChu');
    if (candidateGlobal && !isInvalidPurposeText(candidateGlobal)) {
      purpose = candidateGlobal;
    }
  }

  // Chuẩn hóa và làm sạch chống dính chữ "ĐƠN VỊ"
  const finalPurpose = sanitizePurpose(purpose, seller_name, invoice_number);

  const confidence: Record<string, number> = {
    tax_code: tax_code ? 1.0 : 0.0,
    seller_name: seller_name ? 1.0 : 0.0,
    template_symbol: template_symbol ? 0.98 : 0.0,
    invoice_symbol: invoice_symbol ? 1.0 : 0.0,
    invoice_number: invoice_number ? 1.0 : 0.0,
    invoice_date: invoice_date ? 1.0 : 0.0,
    invoice_amount: invoice_amount !== '' ? 1.0 : 0.0,
    currency: 1.0,
    purpose: finalPurpose ? 0.96 : 0.0,
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
    purpose: finalPurpose,
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
