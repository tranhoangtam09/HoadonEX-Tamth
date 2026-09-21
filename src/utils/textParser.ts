import { InvoiceItem, InvoiceSourceType } from '../types/invoice';
import { cleanString, normalizeDate, parseAmountNumber, validateSingleInvoice } from './validation';

/**
 * Kiểm tra xem một chuỗi có phải là tiêu đề cột bảng hoặc từ khóa rác không phải tên hàng hóa
 */
export function isInvalidPurposeText(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;

  const lower = trimmed.toLowerCase();

  // Tiêu đề cột bảng hóa đơn (STT, Đơn vị, Đơn vị tính, Số lượng, Đơn giá, Thành tiền...)
  if (/^(?:đơn\s*vị(?:\s*tính)?|dvt|đvt|stt|số\s*thứ\s*tự|số\s*lượng|đơn\s*giá|thành\s*tiền|tiền\s*hàng|cộng\s*tiền\s*hàng|thuế\s*suất|tiền\s*thuế|tổng\s*cộng(?:[\s\w]+)?|tên\s*hàng\s*hóa(?:,\s*dịch\s*vụ)?|hàng\s*hóa(?:,\s*dịch\s*vụ)?|quy\s*cách|chất\s*lượng|mã\s*(?:hàng|số|sp|hh)?|ghi\s*chú|unit|quantity|qty|price|amount|total|description|item|no\.?)$/i.test(lower)) {
    return true;
  }

  // Kết hợp của 2 tiêu đề cột liên tiếp trên 1 dòng
  if (/^(?:đơn\s*vị|đvt|stt|số\s*lượng|đơn\s*giá|thành\s*tiền)[\s\:\-\/]+(?:đơn\s*vị|đvt|stt|số\s*lượng|đơn\s*giá|thành\s*tiền|tính|vnd|đồng)/i.test(lower)) {
    return true;
  }

  // Toàn số, ký tự đặc biệt, ngày tháng hoặc tỷ lệ phần trăm
  if (/^[\d\s\.,\-\:\/\%\(\)\#\*\+\=]+$/.test(lower)) {
    return true;
  }

  // Đơn vị đo lường đơn lẻ (Lít, Cái, Chiếc, Mét...)
  if (/^(?:cái|chiếc|bộ|tháng|lít|lit|hộp|hop|gói|goi|kg|kilogram|cuộn|chai|thùng|thung|m|m2|m3|lần|ngày|chuyến|suất|đĩa|tờ|quyển|vé|km|giờ|ca)$/i.test(lower)) {
    return true;
  }

  return false;
}

/**
 * Tự động suy luận mục đích / mặt hàng chi tiêu thông minh dựa trên tên đơn vị bán hoặc số hóa đơn
 */
export function detectSmartPurposeFromSeller(sellerName?: string, invoiceNumber?: string): string {
  const safeName = (sellerName || '').toLowerCase();

  // Nhận diện theo ngành nghề
  if (/(?:xăng|dầu|petrolimex|pvoil|petro|nhiên\s*liệu|mipec)/i.test(safeName)) {
    return 'Xăng dầu, nhiên liệu phục vụ công tác';
  }
  if (/(?:điện\s*lực|evn|tổng\s*công\s*ty\s*điện|chi\s*nhánh\s*điện|điện\s*năng)/i.test(safeName)) {
    return 'Tiền điện sinh hoạt / sản xuất kinh doanh';
  }
  if (/(?:viễn\s*thông|viettel|vnpt|fpt\s*telecom|mobifone|vinaphone|internet|bưu\s*chính|cáp\s*quang)/i.test(safeName)) {
    return 'Cước dịch vụ viễn thông, Internet';
  }
  if (/(?:grab|be\s*group|mai\s*linh|vinasun|taxi|vận\s*tải|chở\s*khách|xe\s*khách)/i.test(safeName)) {
    return 'Chi phí di chuyển, đi lại công tác';
  }
  if (/(?:cấp\s*nước|nước\s*sạch|sawaco|hawaco|nước\s*sinh\s*hoạt)/i.test(safeName)) {
    return 'Tiền nước sinh hoạt cơ quan';
  }
  if (/(?:khách\s*sạn|hotel|resort|homestay|lưu\s*trú|nhà\s*nghỉ)/i.test(safeName)) {
    return 'Chi phí lưu trú, tiền phòng công tác';
  }
  if (/(?:nhà\s*hàng|quán\s*ăn|ẩm\s*thực|buffet|cà\s*phê|cafe|coffee|golden\s*gate|redsun)/i.test(safeName)) {
    return 'Chi phí tiếp khách, ăn uống hội nghị';
  }
  if (/(?:vinamilk|th\s*true|bách\s*hóa|winmart|co\.?opmart|big\s*c|go!|siêu\s*thị)/i.test(safeName)) {
    return 'Mua sắm thực phẩm, nước uống, nhu yếu phẩm';
  }
  if (/(?:thế\s*giới\s*di\s*động|fpt\s*shop|phong\s*vũ|điện\s*máy|laptop|máy\s*tính)/i.test(safeName)) {
    return 'Thiết bị máy tính, linh kiện văn phòng';
  }
  if (/(?:misa|bkav|fast|bravo|phần\s*mềm|tin\s*học|software|chữ\s*ký\s*số)/i.test(safeName)) {
    return 'Phí bản quyền phần mềm, dịch vụ CNTT';
  }
  if (/(?:văn\s*phòng\s*phẩm|hồng\s*hà|bến\s*nghé|thiên\s*long|giấy\s*in)/i.test(safeName)) {
    return 'Văn phòng phẩm, đồ dùng làm việc';
  }
  if (/(?:vietnam\s*airlines|vietjet|bamboo|hàng\s*không|vé\s*máy\s*bay)/i.test(safeName)) {
    return 'Vé máy bay công tác';
  }
  if (/(?:bảo\s*dưỡng|sửa\s*chữa|garage|auto|phụ\s*tùng)/i.test(safeName)) {
    return 'Chi phí sửa chữa, bảo dưỡng thiết bị/xe';
  }

  if (invoiceNumber && String(invoiceNumber).trim()) {
    return `Chi phí theo hóa đơn số ${invoiceNumber}`;
  }

  return 'Chi phí thanh toán bù đắp';
}

/**
 * Chuẩn hóa và làm sạch trường Mục đích / Mặt hàng
 */
export function sanitizePurpose(rawPurpose?: string, sellerName?: string, invoiceNumber?: string): string {
  if (!rawPurpose || isInvalidPurposeText(rawPurpose)) {
    return detectSmartPurposeFromSeller(sellerName, invoiceNumber);
  }

  let cleaned = rawPurpose
    .replace(/^(?:Tên\s*hàng\s*hóa(?:,\s*dịch\s*vụ)?|Description|Diễn\s*giải|Nội\s*dung|Mặt\s*hàng|Tên\s*HH)\s*[:\-]\s*/i, '')
    .trim();

  // Loại bỏ nếu còn dính header
  if (isInvalidPurposeText(cleaned)) {
    return detectSmartPurposeFromSeller(sellerName, invoiceNumber);
  }

  return cleaned;
}

/**
 * Trích xuất danh mục hàng hóa / mục đích chi tiêu từ toàn văn bản hóa đơn
 */
export function extractGoodsAndPurpose(
  safeText: string,
  lines: string[],
  sellerName?: string,
  invoiceNumber?: string
): string {
  // Chiến lược 1: Tìm dòng mô tả rõ ràng như "Dịch vụ: ...", "Nội dung: ...", "Gói cước: ..."
  const explicitPatterns = [
    /(?:Dịch\s*vụ|Cước\s*dịch\s*vụ|Gói\s*cước|Mặt\s*hàng|Lý\s*do\s*chi|Nội\s*dung\s*chi)\s*[:\-]\s*([A-Za-zÀ-ỹĐđ0-9\s\+\-\/\#\.\,\(\)\:\%]{4,120})/i,
    /(?:Diễn\s*giải|Nội\s*dung)\s*[:\-]\s*([A-Za-zÀ-ỹĐđ0-9\s\+\-\/\#\.\,\(\)\:\%]{4,120})/i,
  ];

  for (const pat of explicitPatterns) {
    const m = safeText.match(pat);
    if (m && m[1]) {
      const candidate = cleanString(m[1]);
      if (!isInvalidPurposeText(candidate)) {
        return candidate;
      }
    }
  }

  // Chiến lược 2: Trích xuất các dòng hàng trong bảng hóa đơn giữa Header và Footer
  const tableHeaderIdx = lines.findIndex((l) =>
    /(?:Tên\s*hàng\s*hóa|Tên\s*hàng|Hàng\s*hóa,\s*dịch\s*vụ|THHDVu|Diễn\s*giải|Nội\s*dung\s*hàng\s*hóa|Description)/i.test(l)
  );

  const tableEndIdx = lines.findIndex(
    (l, idx) =>
      idx > tableHeaderIdx &&
      /(?:Cộng\s*tiền\s*hàng|Tổng\s*tiền\s*hàng|Cộng\s*tiền|Tiền\s*hàng|Thuế\s*suất\s*GTGT|Tiền\s*thuế|Tổng\s*cộng\s*tiền|Bằng\s*chữ)/i.test(l)
  );

  if (tableHeaderIdx !== -1) {
    const maxScanIdx = tableEndIdx !== -1 ? tableEndIdx : Math.min(lines.length, tableHeaderIdx + 15);
    const tableLines = lines.slice(tableHeaderIdx + 1, maxScanIdx);
    const collectedItems: string[] = [];

    for (const line of tableLines) {
      if (isInvalidPurposeText(line)) continue;

      // Nhận diện dòng có số thứ tự đầu dòng: "1 Cước Internet FPT..." hoặc "1. Xăng RON 95..."
      const numberedMatch = line.match(
        /^(?:[0-9]{1,2}|[ivx]+)[\.\s\-]+([A-Za-zÀ-ỹĐđ0-9\s\+\-\/\#\.\,\(\)\:\%]{3,80}?)(?:\s+(?:cái|chiếc|bộ|tháng|lít|lit|hộp|gói|kg|cuộn|chai|thùng|m|m2|m3|lần|ngày|chuyến|suất|\d+[\.,]\d+|\d+)\b|$)/i
      );

      if (numberedMatch && numberedMatch[1]) {
        const item = cleanString(numberedMatch[1]);
        if (!isInvalidPurposeText(item) && !collectedItems.includes(item)) {
          collectedItems.push(item);
          if (collectedItems.length >= 3) break;
          continue;
        }
      }

      // Nhận diện dòng chữ có độ dài phù hợp và chứa tiếng Việt có nghĩa
      const stripped = line.replace(/^\d+[\.\s\-]+/, '').replace(/\s+(?:\d+[\.,]?\d*|\d+%)\s*$/g, '').trim();
      if (
        stripped.length >= 4 &&
        stripped.length <= 90 &&
        !isInvalidPurposeText(stripped) &&
        /[a-zA-Zà-ỹÀ-Ỹ]{3,}/.test(stripped) &&
        !collectedItems.includes(stripped)
      ) {
        collectedItems.push(stripped);
        if (collectedItems.length >= 3) break;
      }
    }

    if (collectedItems.length > 0) {
      return collectedItems.join(', ');
    }
  }

  // Chiến lược 3: Quét các từ khóa mặt hàng phổ biến trong toàn văn bản
  const keywordPatterns = [
    /Xăng\s*(?:RON\s*95(?:-[I|V]+)?|E5\s*RON\s*92|Dầu\s*DO[^\n\r,;]{0,30})/i,
    /Cước\s*(?:dịch\s*vụ\s*)?(?:viễn\s*thông|Internet|thuê\s*bao|di\s*động)[^\n\r,;]{0,40}/i,
    /Tiền\s*điện\s*(?:sinh\s*hoạt|sản\s*xuất|kinh\s*doanh|tháng[^\n\r,;]{0,20})/i,
    /Tiền\s*nước\s*(?:sinh\s*hoạt|tháng[^\n\r,;]{0,20})/i,
    /Vé\s*máy\s*bay[^\n\r,;]{0,40}/i,
    /Dịch\s*vụ\s*(?:phần\s*mềm|lưu\s*trữ|bảo\s*trì|tư\s*vấn|vận\s*chuyển)[^\n\r,;]{0,40}/i,
    /Phí\s*(?:vận\s*chuyển|chuyển\s*phát|giao\s*hàng|quản\s*lý)[^\n\r,;]{0,30}/i,
    /Văn\s*phòng\s*phẩm[^\n\r,;]{0,40}/i,
  ];

  for (const pat of keywordPatterns) {
    const kwMatch = safeText.match(pat);
    if (kwMatch && kwMatch[0]) {
      const kw = cleanString(kwMatch[0]);
      if (!isInvalidPurposeText(kw)) {
        return kw;
      }
    }
  }

  // Chiến lược 4: Suy luận thông minh từ tên đơn vị bán hoặc số hóa đơn
  return detectSmartPurposeFromSeller(sellerName, invoiceNumber);
}

export function parseTextInvoice(
  text: string,
  fileName: string,
  sourceType: InvoiceSourceType = 'PDF text'
): InvoiceItem {
  const safeText = text || '';
  const lines = safeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Helper to pre-clean spaced digits (e.g. "0 1 0 0 1 0 9 1 0 6" -> "0100109106")
  const preprocessedText = safeText.replace(/\b(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\b/g, '$1$2$3$4$5$6$7$8$9$10');

  // Identify where Buyer section begins so we NEVER accidentally capture buyer's information or tax code
  const buyerBoundaryRegex = /(?:Họ\s*(?:và\s*)?tên\s*người\s*mua|Tên\s*người\s*mua|Người\s*mua\s*hàng|Người\s*mua|Đơn\s*vị\s*mua\s*hàng|Tên\s*đơn\s*vị\s*mua(?:\s*hàng)?|Đơn\s*vị\s*mua|Bên\s*mua\s*hàng|Bên\s*mua|Tên\s*khách\s*hàng|Khách\s*hàng(?:\s*\(Customer\))?|Buyer(?:\s*name)?|Customer(?:\s*name)?|Client|Người\s*nhận\s*hàng)/i;
  const buyerMatch = preprocessedText.match(buyerBoundaryRegex);
  const buyerIdx = buyerMatch?.index ?? -1;
  const sellerZone = buyerIdx > 40 ? preprocessedText.slice(0, buyerIdx) : preprocessedText.slice(0, Math.min(3000, preprocessedText.length));
  const sellerLines = sellerZone.split(/\r?\n/).map((l) => cleanString(l)).filter((l) => l.length > 0);

  // 1. MÃ SỐ THUẾ BÊN BÁN (Seller Tax Code)
  let tax_code = '';
  // Try seller-specific tax code labels first in sellerZone
  const sellerTaxPatterns = [
    /(?:M[ãa]\s*s[ốo]\s*thu[ếe]\s*(?:người\s*bán|đơn\s*vị\s*bán|bên\s*bán)|Ma\s*so\s*thue\s*(?:nguoi\s*ban|don\s*vi\s*ban|ben\s*ban)|Seller\s*(?:tax\s*code|MST))\s*(?:\([^\)]*\)|\/[^\:]*)?\s*[:\-]?\s*([0-9]{10}(?:\s*-\s*[0-9]{3})?)/i,
    /(?:M[ãa]\s*s[ốo]\s*thu[ếe]|Ma\s*so\s*thue|MST|Tax\s*code)\s*(?:\([^\)]*\)|\/[^\:]*)?\s*[:\-]?\s*([0-9]{10}(?:\s*-\s*[0-9]{3})?)/i,
    /M\.S\.T\s*(?:\([^\)]*\))?\s*[:\-]?\s*([0-9]{10}(?:\s*-\s*[0-9]{3})?)/i,
  ];

  for (const pattern of sellerTaxPatterns) {
    const match = sellerZone.match(pattern);
    if (match && match[1]) {
      tax_code = match[1].replace(/\s+/g, '');
      break;
    }
  }

  // If still empty in sellerZone, search for standalone 10-digit tax code in sellerZone
  if (!tax_code) {
    const allMstMatches = Array.from(sellerZone.matchAll(/\b([0-9]{10}(?:-[0-9]{3})?)\b/g));
    if (allMstMatches.length > 0) {
      tax_code = allMstMatches[0][1].replace(/\s+/g, '');
    }
  }

  // If still empty, search in entire text
  if (!tax_code) {
    for (const pattern of sellerTaxPatterns) {
      const match = preprocessedText.match(pattern);
      if (match && match[1]) {
        tax_code = match[1].replace(/\s+/g, '');
        break;
      }
    }
  }

  // ----------------------------------------------------
  // 2. TÊN ĐƠN VỊ PHÁT HÀNH / ĐƠN VỊ BÁN HÀNG (Seller Name)
  // ----------------------------------------------------
  let seller_name = '';

  // Filter out addresses, invoice titles, government departments, software footers
  const isInvalidSellerName = (name: string): boolean => {
    if (!name || name.length < 4) return true;
    // Reject invoice titles & types
    if (/^(?:hóa\s*đơn|hoa\s*don|phiếu\s*xuất|bảng\s*kê|giấy\s*báo|mẫu\s*số|ký\s*hiệu|chứng\s*từ|bản\s*thể\s*hiện|tra\s*cứu)/i.test(name)) return true;
    // Reject state motto & government bodies
    if (/^(?:cộng\s*hòa|độc\s*lập|bộ\s*tài\s*chính|tổng\s*cục\s*thuế|cục\s*thuế|chi\s*cục\s*thuế)/i.test(name)) return true;
    // Reject e-invoice software solutions & footers
    if (/(?:phần\s*mềm\s*hóa\s*đơn|meinvoice|vnpt\s*invoice|viettel\s*invoice|s-invoice|bkav\s*ehoadon|cyberbill|easyinvoice|m-invoice|đơn\s*vị\s*cung\s*cấp\s*giải\s*pháp|tra\s*cứu\s*tại\s*website)/i.test(name)) return true;
    // Reject contact / financial / address fields
    if (/^(?:địa\s*chỉ|dia\s*chi|đ\/c|điện\s*thoại|dien\s*thoai|tel|email|website|fax|stk|tài\s*khoản|số\s*tài\s*khoản|mã\s*số\s*thuế|mst|hình\s*thức\s*thanh\s*toán)\s*[:\-]/i.test(name)) return true;
    // Reject pure address lines (e.g. "Số 123 Đường Nguyễn Trãi, Phường 2, Quận 5...")
    if (/(?:phường|quận|huyện|thị\s*xã|thành\s*phố|tỉnh|kcn|khu\s*công\s*nghiệp)\s+[a-z0-9à-ỹ]/i.test(name) && !/(?:công\s*ty|tập\s*đoàn|chi\s*nhánh|doanh\s*nghiệp|hộ\s*kinh\s*doanh|trung\s*tâm|ngân\s*hàng)/i.test(name)) {
      return true;
    }
    // Reject lines starting with street number (address line)
    if (/^(?:số|tầng|lầu|tòa\s*nhà|lô|kios)\s+[0-9]+/i.test(name) && !/(?:công\s*ty|chi\s*nhánh)/i.test(name)) {
      return true;
    }
    return false;
  };

  // Strong business entity indicators in Vietnam
  const hasBusinessKeyword = (name: string): boolean => {
    return /(?:CÔNG\s*TY|CONG\s*TY|CTY|TỔNG\s*CÔNG\s*TY|TONG\s*CONG\s*TY|TẬP\s*ĐOÀN|TAP\s*DOAN|CHI\s*NHÁNH|CHI\s*NHANH|DOANH\s*NGHIỆP|DOANH\s*NGHIEP|HỘ\s*KINH\s*DOANH|HO\s*KINH\s*DOANH|TRUNG\s*TÂM|TRUNG\s*TAM|HỢP\s*TÁC\s*XÃ|HOP\s*TAC\s*XA|NGÂN\s*HÀNG|NGAN\s*HANG|VIỆN|TRƯỜNG|BỆNH\s*VIỆN|CỬA\s*HÀNG|ĐẠI\s*LÝ|BAN\s*QUẢN\s*LÝ)/i.test(name);
  };

  // Helper to merge multiline company names (e.g. line 1: CÔNG TY TNHH..., line 2: THƯƠNG MẠI XYZ)
  const getFullCompanyName = (lines: string[], startIdx: number): string => {
    let name = cleanString(lines[startIdx]);
    if (startIdx + 1 < lines.length) {
      const next = cleanString(lines[startIdx + 1]);
      if (
        next &&
        next.length >= 3 &&
        !isInvalidSellerName(next) &&
        !hasBusinessKeyword(next) &&
        !/^(?:Mã\s*số\s*thuế|MST|Địa\s*chỉ|Điện\s*thoại|Website|Số\s*tài\s*khoản|STK|Ký\s*hiệu|Số|Họ\s*tên|Người\s*mua)/i.test(next)
      ) {
        // Only append if it looks like a continuation of the name (uppercase or words)
        if (/^[A-ZÀ-Ỵ0-9\s&.,\-_/()]+$/.test(next) || next.length < 50) {
          name = `${name} ${next}`.trim();
        }
      }
    }
    return name;
  };

  // Strategy A: Explicit Seller Label in sellerZone
  const sellerLabelRegex = /(?:Tên\s*(?:đơn\s*vị\s*bán(?:\s*hàng)?|người\s*bán(?:\s*hàng)?|đơn\s*vị\s*phát\s*hành|bên\s*bán|doanh\s*nghiệp\s*bán|nhà\s*cung\s*cấp)|Đơn\s*vị\s*bán\s*(?:hàng)?|Đơn\s*vị\s*bán|Người\s*bán\s*(?:hàng)?|Người\s*bán|Bên\s*bán\s*(?:hàng)?|Bên\s*bán|Đơn\s*vị\s*phát\s*hành|Tổ\s*chức\s*phát\s*hành|Nhà\s*cung\s*cấp|Doanh\s*nghiệp\s*bán|Seller(?:\s*name)?|Supplier)\s*(?:\([^\)]*\))?\s*[:\-\/]/i;

  for (let i = 0; i < sellerLines.length; i++) {
    const line = sellerLines[i];
    const match = line.match(sellerLabelRegex);
    if (match) {
      const labelEnd = (match.index ?? 0) + match[0].length;
      let afterLabel = cleanString(line.slice(labelEnd));
      afterLabel = afterLabel.split(/(?:Mã số thuế|Ma so thue|MST|Địa chỉ|Dia chi|Điện thoại|Dien thoai|Website|STK):/i)[0].trim();

      if (afterLabel && afterLabel.length >= 4 && !isInvalidSellerName(afterLabel)) {
        seller_name = afterLabel;
        break;
      }

      // If empty on same line or just placeholder tag, look at next line
      if (i + 1 < sellerLines.length) {
        const candidate = getFullCompanyName(sellerLines, i + 1);
        if (candidate && !isInvalidSellerName(candidate)) {
          seller_name = candidate;
          break;
        }
      }
    }
  }

  // Strategy B: Use Seller Tax Code (MST) Anchor in sellerLines
  // In Vietnamese invoices, seller name is ALWAYS right above the seller's MST and Address
  if (!seller_name && tax_code) {
    const mstLineIdx = sellerLines.findIndex((l) => l.replace(/\s+/g, '').includes(tax_code));
    if (mstLineIdx > 0) {
      // Look upwards up to 4 lines above the MST
      for (let offset = 1; offset <= Math.min(4, mstLineIdx); offset++) {
        const candidateLineIdx = mstLineIdx - offset;
        const prevLine = cleanString(sellerLines[candidateLineIdx]);
        if (hasBusinessKeyword(prevLine) && !isInvalidSellerName(prevLine)) {
          seller_name = getFullCompanyName(sellerLines, candidateLineIdx);
          break;
        }
      }
      // If still no business keyword found, find the first line above MST that is not an address/contact
      if (!seller_name) {
        for (let offset = 1; offset <= Math.min(3, mstLineIdx); offset++) {
          const prevLine = cleanString(sellerLines[mstLineIdx - offset]);
          if (!isInvalidSellerName(prevLine) && prevLine.length >= 6 && !/^(?:Địa\s*chỉ|Điện\s*thoại|Tel|Email|STK|Website)/i.test(prevLine)) {
            seller_name = prevLine;
            break;
          }
        }
      }
    }
  }

  // Strategy C: Scan from the very top of sellerLines for company name
  if (!seller_name) {
    for (let i = 0; i < Math.min(12, sellerLines.length); i++) {
      const line = cleanString(sellerLines[i]);
      if (hasBusinessKeyword(line) && !isInvalidSellerName(line)) {
        seller_name = getFullCompanyName(sellerLines, i);
        break;
      }
    }
  }

  // 3. KÝ HIỆU HÓA ĐƠN & MẪU SỐ (Invoice Symbol & Template Symbol)
  let invoice_symbol = '';
  let template_symbol = '';

  // Look for label "Ký hiệu: 1C24TAA" or "Serial: C24TAA"
  const symbolPatterns = [
    /(?:K[ýy]\s*hi[ệe]u\s*(?:h[óo]a\s*[đd][ơo]n|H[ĐD])?|Invoice\s*symbol|Serial\s*(?:No)?\.?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9./-]{2,15})/i,
    /K[ýy]\s*hi[ệe]u\s*:\s*([A-Z0-9/]{2,15})/i,
  ];

  for (const pattern of symbolPatterns) {
    const match = safeText.match(pattern);
    if (match && match[1]) {
      invoice_symbol = cleanString(match[1]);
      break;
    }
  }

  // If invoice symbol not found, look for TT78 pattern: 1C24TAA or C24TAA or 1K24TYY
  if (!invoice_symbol) {
    const tt78Match = safeText.match(/\b([1-6][CK][2-9][0-9][A-Z]{2,3})\b/i);
    if (tt78Match) {
      invoice_symbol = tt78Match[1].toUpperCase();
    } else {
      const tt78Short = safeText.match(/\b([CK][2-9][0-9][A-Z]{2,3})\b/i);
      if (tt78Short) {
        invoice_symbol = tt78Short[1].toUpperCase();
      }
    }
  }

  // Template symbol (Mẫu số)
  const templatePatterns = [
    /(?:K[ýy]\s*hi[ệe]u\s*m[ẫa]u\s*s[ốo]|M[ẫa]u\s*s[ốo]|Template\s*(?:symbol|code)?|Form\s*No\.?)\s*[:\-]?\s*([0-9A-Z./-]{1,15})/i,
  ];

  for (const pattern of templatePatterns) {
    const match = safeText.match(pattern);
    if (match && match[1]) {
      template_symbol = cleanString(match[1]);
      break;
    }
  }

  // If template_symbol is empty but invoice_symbol is TT78 (e.g. 1C24TAA)
  if (!template_symbol && invoice_symbol && /^[1-6][CK]/i.test(invoice_symbol)) {
    template_symbol = invoice_symbol.charAt(0);
  }

  // ----------------------------------------------------
  // 4. SỐ HÓA ĐƠN (Invoice Number)
  // ----------------------------------------------------
  let invoice_number = '';

  const numberPatterns = [
    // Số / No.: 0001234 or Số / No: 0001234 or Số(No): 0001234 or Số (No.): 0001234
    /(?:S[ốo]\s*(?:[\/\(]\s*No\.?\s*[\)]?|\(No\.?\))\s*[:\.\-#/]?|\bNo\.?\s*[:\.\-#/]?)\s*([0-9]{1,8})\b/i,
    // Số hóa đơn: 0001234 or Số HĐ: 0001234 or Số chứng từ: 0001234
    /(?:S[ốo]\s*(?:h[óo]a\s*[đd][ơo]n|H[ĐD]|ch[ứu]ng\s*t[ừu]))\s*[:\.\-#/]?\s*([0-9]{1,8})\b/i,
    // Invoice No / Number / Inv. No: 0001234
    /(?:Invoice\s*(?:No|Number|Num)|Inv\.?\s*(?:No|Number)?)\s*[:\.\-#/]?\s*([0-9]{1,8})\b/i,
    // Số: 0001234 (must not be followed by date slash)
    /(?:^|[^\w])S[ốo]\s*[:\.\-#/]\s*([0-9]{1,8})\b/i,
    // Multiline: Số or Số / No. on one line, and number on next line
    /(?:S[ốo]\s*(?:[\/\(]\s*No\.?\s*[\)]?|\(No\.?\)|h[óo]a\s*[đd][ơo]n|H[ĐD])?)\s*[:\.\-#/]?\s*\r?\n\s*([0-9]{1,8})\b/i,
    // Spaced out digits: Số: 0 0 0 1 2 3 4
    /(?:S[ốo](?:\s*[\/\(]\s*No\.?\s*[\)]?)?|No\.?)\s*[:\.\-#/]?\s*((?:[0-9]\s+){3,7}[0-9])/i,
  ];

  for (const pattern of numberPatterns) {
    const match = safeText.match(pattern);
    if (match && match[1]) {
      const rawNum = match[1].replace(/\s+/g, '');
      if (rawNum.length >= 1 && rawNum.length <= 8) {
        // Pad with leading zeros to 7 digits if standard numeric format
        invoice_number = rawNum.length < 7 ? rawNum.padStart(7, '0') : rawNum;
        break;
      }
    }
  }

  // Fallback: If invoice symbol (e.g. 1C24TAA) was found, look right after it for invoice number
  if (!invoice_number && invoice_symbol) {
    const symbolIdx = safeText.indexOf(invoice_symbol);
    if (symbolIdx !== -1) {
      const windowAfter = safeText.slice(symbolIdx, symbolIdx + 120);
      const windowMatch = windowAfter.match(/(?:S[ốo](?:\s*[\/\(]\s*No\.?\s*[\)]?)?|No\.?)?\s*[:\.\-#/]?\s*([0-9]{1,8})\b/i);
      if (windowMatch && windowMatch[1]) {
        const raw = windowMatch[1].replace(/\s+/g, '');
        if (raw.length >= 1 && raw.length <= 8) {
          invoice_number = raw.length < 7 ? raw.padStart(7, '0') : raw;
        }
      }
    }
  }

  // 5. NGÀY HÓA ĐƠN (Invoice Date)
  let rawDate = '';
  // Check Vietnamese "Ngày 15 tháng 03 năm 2024" or "Ngay 15 thang 03 nam 2024"
  const vnDateMatch = safeText.match(/(?:Ngày|Ngay)\s*(\d{1,2})\s*(?:tháng|thang)\s*(\d{1,2})\s*(?:năm|nam)\s*(\d{4})/i);
  if (vnDateMatch) {
    const d = vnDateMatch[1].padStart(2, '0');
    const m = vnDateMatch[2].padStart(2, '0');
    const y = vnDateMatch[3];
    rawDate = `${d}/${m}/${y}`;
  } else {
    const datePatterns = [
      /(?:Ng[àa]y\s*(?:l[ậa]p|h[óo]a\s*[đd][ơo]n|k[ýy])|Date|Invoice\s*date)\s*[:\.\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/,
      /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/,
    ];
    for (const pattern of datePatterns) {
      const match = safeText.match(pattern);
      if (match && match[1]) {
        rawDate = match[1];
        break;
      }
    }
  }
  const invoice_date = normalizeDate(rawDate);

  // 6. LOẠI TIỀN (Currency)
  const currencyMatch = safeText.match(/(?:Lo[ạa]i\s*ti[ềe]n|ĐVT\s*ti[ềe]n|Currency)\s*[:\-]?\s*([A-Z]{3})/i);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() : 'VND';

  // 7. SỐ TIỀN THANH TOÁN (Invoice Amount)
  let rawAmount = '';
  const amountPatterns = [
    /(?:T[ổo]ng\s*(?:c[ộo]ng\s*)?(?:ti[ềe]n\s*)?thanh\s*to[áa]n|T[ổo]ng\s*s[ốo]\s*ti[ềe]n\s*thanh\s*to[áa]n|C[ộo]ng\s*ti[ềe]n\s*thanh\s*to[áa]n|S[ốo]\s*ti[ềe]n\s*vi[ếe]t\s*b[ằa]ng\s*s[ốo]|Total\s*(?:payment|amount)?|Grand\s*total)\s*[:\-]?\s*([0-9][0-9.,\s]*)/i,
    /(?:T[ổo]ng\s*ti[ềe]n\s*h[àa]ng|C[ộo]ng\s*ti[ềe]n\s*h[àa]ng|T[ổo]ng\s*ti[ềe]n|T[ổo]ng\s*c[ộo]ng|Th[àa]nh\s*ti[ềe]n)\s*[:\-]?\s*([0-9][0-9.,\s]*)/i,
    /([0-9]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*(?:đồng|dong|VNĐ|VND)\b/i,
    /(?:Thanh\s*to[áa]n|S[ốo]\s*ti[ềe]n)\s*[:\-]?\s*([0-9]{1,3}(?:[.,]\d{3})+)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = safeText.match(pattern);
    if (match && match[1]) {
      const parsed = parseAmountNumber(match[1]);
      if (typeof parsed === 'number' && parsed > 0) {
        rawAmount = String(parsed);
        break;
      }
    }
  }
  const invoice_amount = parseAmountNumber(rawAmount);

  // 8. MỤC ĐÍCH / TÊN HÀNG HÓA (Đã qua bộ lọc chống dính tiêu đề bảng và bóc tách chính xác)
  const purpose = extractGoodsAndPurpose(safeText, lines, seller_name, invoice_number);

  // Confidence calculations based on field presence & characteristics
  const confidence: Record<string, number> = {
    tax_code: tax_code ? (/^\d{10}(-\d{3})?$/.test(tax_code) ? 0.96 : 0.82) : 0.0,
    seller_name: seller_name ? 0.94 : 0.0,
    template_symbol: template_symbol ? 0.90 : 0.0,
    invoice_symbol: invoice_symbol ? (invoice_symbol.length >= 3 ? 0.95 : 0.75) : 0.0,
    invoice_number: invoice_number ? (invoice_number.length >= 4 ? 0.96 : 0.75) : 0.0,
    invoice_date: invoice_date ? (/^\d{2}\/\d{2}\/\d{4}$/.test(invoice_date) ? 0.98 : 0.7) : 0.0,
    invoice_amount: invoice_amount !== '' ? 0.95 : 0.0,
    currency: 0.98,
    purpose: purpose ? 0.92 : 0.5,
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
    purpose: sanitizePurpose(purpose, seller_name, invoice_number),
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
