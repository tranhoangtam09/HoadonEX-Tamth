import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { PDFParse } from 'pdf-parse';
import { parseTextInvoice, sanitizePurpose, isInvalidPurposeText } from './src/utils/textParser';
import { normalizeDate, parseAmountNumber, cleanString, validateSingleInvoice } from './src/utils/validation';
import { InvoiceItem, InvoiceSourceType } from './src/types/invoice';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    app: 'Invoice Extractor V3',
    ai_available: Boolean(process.env.GEMINI_API_KEY),
  });
});

// In-memory tax code lookup cache to accelerate extraction
const taxCodeCache = new Map<string, string>();

async function lookupCompanyByTaxCode(taxCode: string): Promise<string | null> {
  const clean = (taxCode || '').replace(/[^0-9-]/g, '').trim();
  if (!/^\d{10}(-\d{3})?$/.test(clean)) return null;

  if (taxCodeCache.has(clean)) {
    return taxCodeCache.get(clean) || null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    const resp = await fetch(`https://api.vietqr.io/v2/business/${clean}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = (await resp.json()) as { code?: string; data?: { name?: string } };
      if (data && data.code === '00' && data.data && data.data.name) {
        const companyName = data.data.name.trim();
        taxCodeCache.set(clean, companyName);
        return companyName;
      }
    }
  } catch {
    // Timeout or network offline, gracefully continue without blocking
  }

  return null;
}

function isReliableSellerName(name?: string): boolean {
  if (!name || name.trim().length < 6) return false;
  const clean = name.trim();

  // Reject pure address lines
  if (
    /(?:phường|quận|huyện|thị\s*xã|thành\s*phố|tỉnh|kcn|khu\s*công\s*nghiệp)\s+[a-z0-9à-ỹ]/i.test(clean) &&
    !/(?:công\s*ty|tập\s*đoàn|chi\s*nhánh|doanh\s*nghiệp|hộ\s*kinh\s*doanh|trung\s*tâm|ngân\s*hàng)/i.test(clean)
  ) {
    return false;
  }
  if (/^(?:số|tầng|lầu|tòa\s*nhà|lô)\s+[0-9]+/i.test(clean)) {
    return false;
  }

  // Check for business entity keyword
  return /(?:CÔNG\s*TY|CONG\s*TY|CTY|TỔNG\s*CÔNG\s*TY|TONG\s*CONG\s*TY|TẬP\s*ĐOÀN|TAP\s*DOAN|CHI\s*NHÁNH|CHI\s*NHANH|DOANH\s*NGHIỆP|DOANH\s*NGHIEP|HỘ\s*KINH\s*DOANH|HO\s*KINH\s*DOANH|TRUNG\s*TÂM|TRUNG\s*TAM|HỢP\s*TÁC\s*XÃ|HOP\s*TAC\s*XA|NGÂN\s*HÀNG|NGAN\s*HANG|VIỆN|TRƯỜNG|BỆNH\s*VIỆN|CỬA\s*HÀNG|ĐẠI\s*LÝ|BAN\s*QUẢN\s*LÝ)/i.test(
    clean
  );
}

// Helper to query Gemini for invoice extraction with model fallback
async function extractWithGemini(
  base64Data: string,
  mimeType: string,
  fileName: string,
  extractedText?: string
) {
  const ai = getGeminiClient();
  if (!ai) return null;

  const prompt = `Bạn là chuyên gia kế toán Việt Nam chuyên bóc tách hóa đơn điện tử (theo Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC).
Hãy đọc kỹ tài liệu đính kèm (hóa đơn PDF hoặc hình ảnh) và trích xuất chính xác tuyệt đối các thông tin sau:
1. tax_code (Mã số thuế bên bán): 10 số hoặc 14 số (10 số - 3 số). Lưu ý: TUYỆT ĐỐI KHÔNG lấy nhầm MST của bên mua / khách hàng.
2. seller_name (Tên đơn vị phát hành / Đơn vị bán hàng / Người bán): Tên ĐẦY ĐỦ VÀ CHÍNH XÁC của công ty, doanh nghiệp hoặc hộ kinh doanh phát hành hóa đơn (ở phần Đơn vị bán hàng / Người bán / Bên bán).
- TUYỆT ĐỐI KHÔNG LẤY TÊN BÊN MUA HÀNG (Buyer/Khách hàng).
- TUYỆT ĐỐI KHÔNG LẤY ĐỊA CHỈ, SỐ ĐIỆN THOẠI HAY TÊN PHẦN MỀM HÓA ĐƠN (MISA, VNPT, Viettel Invoice, BKAV, v.v.).
- Nếu tên đơn vị bán trải dài trên 2 dòng (ví dụ CÔNG TY TNHH ... ở dòng 1 và TÊN THƯƠNG HIỆU ở dòng 2), hãy nối lại thành một dòng hoàn chỉnh.
3. template_symbol (Ký hiệu mẫu số): Thường là số 1, 2 hoặc chuỗi 1/001.
4. invoice_symbol (Ký hiệu hóa đơn): Dạng TT78 như 1C24TAA, 1C24TYY, C24TAA, 1K24TAA, AA/23E hoặc tương tự.
5. invoice_number (Số hóa đơn): BẮT BUỘC TRÍCH XUẤT. Tìm trường ghi Số / No. / Số HĐ / Inv No. Thường có từ 1 đến 8 chữ số (ví dụ: 00012345 hoặc 0001234 hoặc 12345). TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ TRỐNG.
6. invoice_date (Ngày hóa đơn): Định dạng dd/mm/yyyy (ví dụ: 15/03/2024).
7. invoice_amount (Tổng tiền thanh toán): Tổng số tiền thanh toán cuối cùng đã bao gồm thuế GTGT (dạng số nguyên hoặc thập phân, ví dụ: 15400000).
8. currency (Loại tiền): Thường là "VND".
9. purpose (Mặt hàng / Tên hàng hóa, dịch vụ / Mục đích chi tiêu):
- BẮT BUỘC trích xuất tên CỤ THỂ của các mặt hàng hoặc dịch vụ được mua bán trong bảng kê chi tiết hóa đơn (ví dụ: "Xăng RON 95-III", "Dịch vụ viễn thông di động", "Cước Internet cáp quang", "Tiền điện sinh hoạt", "Máy tính xách tay Dell", "Văn phòng phẩm: Giấy in A4", "Sữa tươi tiệt trùng Vinamilk", "Vé máy bay công tác", "Chi phí ăn uống tiếp khách", v.v.).
- Nếu có nhiều mặt hàng, hãy kết hợp 1 đến 3 tên mặt hàng chính (ví dụ: "Xăng RON 95-III, Dầu nhớt").
- TUYỆT ĐỐI KHÔNG TRẢ VỀ TIÊU ĐỀ CỘT NHƯ "ĐƠN VỊ", "ĐƠN VỊ TÍNH", "ĐVT", "SỐ LƯỢNG", "ĐƠN GIÁ", "THÀNH TIỀN", "TÊN HÀNG HÓA".
- NẾU KHÔNG THẤY TÊN CỤ THỂ, hãy suy luận theo ngành nghề của bên bán (xăng dầu, viễn thông, tiền điện, tiếp khách...).
${extractedText && extractedText.trim().length > 0 ? `\nVăn bản trích xuất từ tài liệu (để đối chiếu):\n${extractedText.slice(0, 3000)}\n` : ''}
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không có markdown backticks, chỉ JSON thuần) với định dạng:
{
  "tax_code": "...",
  "seller_name": "...",
  "template_symbol": "...",
  "invoice_symbol": "...",
  "invoice_number": "...",
  "invoice_date": "dd/mm/yyyy",
  "invoice_amount": 0,
  "currency": "VND",
  "purpose": "..."
}`;

  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

  // Models prioritized for reliability and speed: gemini-3.1-flash-lite has active quota
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'application/pdf',
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return parsed;
    } catch (err: unknown) {
      console.warn(`Gemini extraction with ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}

// Unified Invoice Extraction API
app.post('/api/extract-invoice', async (req, res) => {
  try {
    const { base64Data, mimeType, fileName, fastMode = true } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Missing base64Data' });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(fileName);

    let extractedText = '';

    // 1. If it's a PDF, extract text using PDFParse
    if (isPdf) {
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedText = result.text || '';
      } catch (pdfErr) {
        console.warn('PDFParse error for file:', fileName, pdfErr);
      }
    }

    // 2. If PDF has readable text (> 35 chars), run regex extractor
    if (extractedText.trim().length > 35) {
      const parsedItem = parseTextInvoice(extractedText, fileName, 'PDF text');

      // Check if authoritative tax registry can resolve seller name
      if (parsedItem.tax_code) {
        const verified = await lookupCompanyByTaxCode(parsedItem.tax_code);
        if (verified) {
          parsedItem.seller_name = verified;
          parsedItem.confidence.seller_name = 0.99;
        }
      }

      const hasTaxCode = Boolean(parsedItem.tax_code);
      const hasInvoiceNumber = Boolean(parsedItem.invoice_number);
      const hasAmount = parsedItem.invoice_amount !== '';
      const hasSeller = isReliableSellerName(parsedItem.seller_name);

      // Fast-path: Return immediately if ALL 4 critical accounting fields are reliably detected
      if (hasTaxCode && hasInvoiceNumber && hasSeller && hasAmount) {
        parsedItem.purpose = sanitizePurpose(parsedItem.purpose, parsedItem.seller_name, parsedItem.invoice_number);
        return res.json({
          success: true,
          method: 'pdf_text_parser',
          item: parsedItem,
        });
      }

      // If either invoice_number or seller_name is missing/suspicious, call Gemini AI to extract visually
      const aiData = await extractWithGemini(base64Data, 'application/pdf', fileName, extractedText);
      if (aiData) {
        // Merge AI data with regex data, prioritizing AI for missing or critical fields
        if (aiData.tax_code) {
          parsedItem.tax_code = String(aiData.tax_code).replace(/\s+/g, '');
          parsedItem.confidence.tax_code = 0.96;

          if (!isReliableSellerName(parsedItem.seller_name)) {
            const verified = await lookupCompanyByTaxCode(parsedItem.tax_code);
            if (verified) {
              parsedItem.seller_name = verified;
              parsedItem.confidence.seller_name = 0.99;
            }
          }
        }
        if (aiData.seller_name && (!isReliableSellerName(parsedItem.seller_name) || parsedItem.confidence.seller_name < 0.95)) {
          parsedItem.seller_name = cleanString(aiData.seller_name);
          parsedItem.confidence.seller_name = 0.96;
        }
        if (aiData.invoice_number) {
          const invNum = cleanString(aiData.invoice_number);
          parsedItem.invoice_number = invNum.length < 7 && /^\d+$/.test(invNum) ? invNum.padStart(7, '0') : invNum;
          parsedItem.confidence.invoice_number = 0.96;
        }
        if (aiData.invoice_symbol) {
          parsedItem.invoice_symbol = cleanString(aiData.invoice_symbol);
          parsedItem.confidence.invoice_symbol = 0.95;
        }
        if (aiData.template_symbol) {
          parsedItem.template_symbol = cleanString(aiData.template_symbol);
          parsedItem.confidence.template_symbol = 0.92;
        }
        if (aiData.invoice_date) {
          parsedItem.invoice_date = normalizeDate(aiData.invoice_date);
          parsedItem.confidence.invoice_date = 0.96;
        }
        if (aiData.invoice_amount) {
          const amt = parseAmountNumber(aiData.invoice_amount);
          if (typeof amt === 'number' && amt > 0) {
            parsedItem.invoice_amount = amt;
            parsedItem.debt_amount = amt;
            parsedItem.paid_amount = amt;
            parsedItem.confidence.invoice_amount = 0.96;
          }
        }
        if (aiData.purpose && !isInvalidPurposeText(aiData.purpose)) {
          parsedItem.purpose = sanitizePurpose(aiData.purpose, parsedItem.seller_name, parsedItem.invoice_number);
        } else {
          parsedItem.purpose = sanitizePurpose(parsedItem.purpose, parsedItem.seller_name, parsedItem.invoice_number);
        }

        parsedItem.validation = validateSingleInvoice(parsedItem);
      } else {
        parsedItem.purpose = sanitizePurpose(parsedItem.purpose, parsedItem.seller_name, parsedItem.invoice_number);
      }

      return res.json({
        success: true,
        method: aiData ? 'pdf_hybrid_ai' : 'pdf_text_parser',
        item: parsedItem,
      });
    }

    // 3. If PDF has NO text (scanned image) or if it's an Image file:
    if (isImage || (isPdf && extractedText.trim().length <= 35)) {
      const aiData = await extractWithGemini(base64Data, mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'), fileName, extractedText);
      if (aiData) {
        const amt = parseAmountNumber(aiData.invoice_amount);
        const invDate = normalizeDate(aiData.invoice_date);
        const invNum = cleanString(aiData.invoice_number);
        const rawTaxCode = cleanString(aiData.tax_code).replace(/\s+/g, '');

        let finalSellerName = cleanString(aiData.seller_name);
        if (rawTaxCode) {
          const verified = await lookupCompanyByTaxCode(rawTaxCode);
          if (verified) {
            finalSellerName = verified;
          }
        }

        const sourceType: InvoiceSourceType = isPdf ? 'PDF text' : 'IMAGE OCR';
        const item: InvoiceItem = {
          id: 'inv_' + Math.random().toString(36).substring(2, 9),
          file_id: 'file_' + Math.random().toString(36).substring(2, 9),
          source_file: fileName,
          source_type: sourceType,
          tax_code: rawTaxCode,
          seller_name: finalSellerName,
          template_symbol: cleanString(aiData.template_symbol),
          invoice_symbol: cleanString(aiData.invoice_symbol),
          invoice_number: invNum.length < 7 && /^\d+$/.test(invNum) ? invNum.padStart(7, '0') : invNum,
          invoice_date: invDate,
          invoice_amount: amt,
          currency: aiData.currency || 'VND',
          purpose: sanitizePurpose(cleanString(aiData.purpose), finalSellerName, invNum),
          debt_amount: amt,
          paid_date: invDate,
          paid_amount: amt,
          confidence: {
            tax_code: rawTaxCode ? 0.96 : 0,
            seller_name: finalSellerName ? 0.98 : 0,
            template_symbol: aiData.template_symbol ? 0.90 : 0,
            invoice_symbol: aiData.invoice_symbol ? 0.95 : 0,
            invoice_number: aiData.invoice_number ? 0.96 : 0,
            invoice_date: aiData.invoice_date ? 0.95 : 0,
            invoice_amount: amt !== '' ? 0.95 : 0,
            currency: 0.98,
            purpose: 0.90,
            debt_amount: amt !== '' ? 0.95 : 0,
            paid_date: invDate ? 0.95 : 0,
            paid_amount: amt !== '' ? 0.95 : 0,
          },
          validation: { errors: [], warnings: [], valid: true },
          _raw_text: JSON.stringify(aiData, null, 2),
        };

        item.validation = validateSingleInvoice(item);

        return res.json({
          success: true,
          method: 'gemini_multimodal_ocr',
          item,
        });
      }

      // If AI failed or not available, fallback to regex on filename/empty text
      const fallbackItem = parseTextInvoice(extractedText || fileName, fileName, isPdf ? 'PDF text' : 'IMAGE OCR');
      return res.json({
        success: true,
        method: 'local_fallback',
        item: fallbackItem,
      });
    }

    // Default fallback
    const fallbackItem = parseTextInvoice(extractedText, fileName, 'PDF text');
    return res.json({
      success: true,
      method: 'default',
      item: fallbackItem,
    });
  } catch (error: unknown) {
    console.error('Error in /api/extract-invoice:', error);
    return res.status(500).json({
      error: 'Failed to extract invoice',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Tax Code Official Registry Lookup API
app.get('/api/lookup-tax-code/:taxCode', async (req, res) => {
  const { taxCode } = req.params;
  const clean = (taxCode || '').replace(/[^0-9-]/g, '').trim();
  if (!/^\d{10}(-\d{3})?$/.test(clean)) {
    return res.status(400).json({ success: false, error: 'Mã số thuế không đúng định dạng (10 hoặc 14 ký tự)' });
  }

  const companyName = await lookupCompanyByTaxCode(clean);
  if (companyName) {
    return res.json({ success: true, taxCode: clean, companyName });
  }

  return res.status(404).json({ success: false, error: 'Chưa tra cứu được thông tin doanh nghiệp cho MST này' });
});

// Setup Vite development middleware or static serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Invoice Extractor V3 server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
});
