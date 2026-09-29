/**
 * Bộ lọc và chuẩn hóa nội dung Mặt hàng / Mục đích chi tiêu (Cột J)
 */

// Các từ khóa rác thường bị nhầm từ tiêu đề cột của bảng chi tiết hàng hóa
const TABLE_HEADER_JUNK = [
  /^stt\b/i,
  /^số thứ tự\b/i,
  /^tên hàng hóa[,\s]*dịch vụ\b/i,
  /^tên hàng hóa\b/i,
  /^nội dung\b/i,
  /^diễn giải\b/i,
  /^đơn vị tính\b/i,
  /^đvt\b/i,
  /^số lượng\b/i,
  /^đơn giá\b/i,
  /^thành tiền\b/i,
  /^thuế suất\b/i,
  /^tiền thuế\b/i,
  /^cộng tiền hàng\b/i,
  /^tổng cộng\b/i,
];

// Danh mục nhận diện tự động mục đích chi theo tên bên bán
const SELLER_PURPOSE_RULES: Array<{ pattern: RegExp; purpose: string }> = [
  { pattern: /petrolimex|xăng dầu|pvoil|nhiên liệu|dầu khí/i, purpose: 'Chi mua xăng dầu, nhiên liệu phục vụ hoạt động KD' },
  { pattern: /viettel|vinaphone|vnpt|mobifone|fpt telecom|bưu chính|viễn thông/i, purpose: 'Cước dịch vụ viễn thông, internet và thông tin liên lạc' },
  { pattern: /điện lực|evn|công ty điện|tổng công ty điện/i, purpose: 'Thanh toán tiền điện phục vụ sản xuất kinh doanh' },
  { pattern: /cấp nước|nước sạch|sawaco|biwase/i, purpose: 'Thanh toán tiền nước sinh hoạt và sản xuất kinh doanh' },
  { pattern: /nhà hàng|ẩm thực|quán ăn|khách sạn|catering|tiếp khách/i, purpose: 'Chi phí tiếp khách, hội nghị công tác' },
  { pattern: /văn phòng phẩm|vpp|thiên long|hồng hà|giấy in/i, purpose: 'Chi mua văn phòng phẩm, vật tư văn phòng' },
  { pattern: /grab|be group|taxi|mai linh|vận tải|vận chuyển|giao hàng|express/i, purpose: 'Chi phí đi lại, cước vận chuyển hàng hóa & công tác' },
  { pattern: /máy tính|phần mềm|cntt|tin học|fpt|thế giới di động|phong vũ/i, purpose: 'Mua sắm thiết bị CNTT, máy móc thiết bị phục vụ văn phòng' },
  { pattern: /bảo hiểm|bảo việt|manulife|prudential|pvi/i, purpose: 'Chi phí mua bảo hiểm phục vụ hoạt động kinh doanh' },
  { pattern: /thuê nhà|thuê mặt bằng|bất động sản|văn phòng cho thuê/i, purpose: 'Chi phí thuê văn phòng, mặt bằng sản xuất kinh doanh' },
  { pattern: /quảng cáo|truyền thông|marketing|google|facebook|meta/i, purpose: 'Chi phí quảng cáo, tiếp thị và truyền thông' },
];

export function detectSmartPurposeFromSeller(sellerName?: string): string {
  if (!sellerName) return '';
  const s = sellerName.trim();
  for (const rule of SELLER_PURPOSE_RULES) {
    if (rule.pattern.test(s)) {
      return rule.purpose;
    }
  }
  return '';
}

export function sanitizePurpose(
  rawPurpose?: unknown,
  sellerName?: string,
  _invoiceNumber?: string
): string {
  let text = String(rawPurpose || '').trim();

  // Loại bỏ các tiền tố/hậu tố hoặc ký tự thừa
  text = text.replace(/^[;:\-–—\.\s]+|[;:\-–—\.\s]+$/g, '');

  // Kiểm tra xem text có phải là tiêu đề cột bảng không
  for (const junkRegex of TABLE_HEADER_JUNK) {
    if (junkRegex.test(text)) {
      text = '';
      break;
    }
  }

  // Nếu text quá ngắn hoặc chỉ chứa số/ký hiệu vô nghĩa
  if (text.length <= 2 || /^[\d\s\.,\-\/]+$/.test(text)) {
    text = '';
  }

  // Nếu không có nội dung mặt hàng, tự động gợi ý theo bên bán
  if (!text && sellerName) {
    const suggested = detectSmartPurposeFromSeller(sellerName);
    if (suggested) {
      return suggested;
    }
    return `Chi phí mua hàng hóa / dịch vụ từ ${sellerName}`;
  }

  return text || 'Mua hàng hóa, dịch vụ phục vụ SXKD';
}
