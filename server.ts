import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

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

// AI-Assisted Multimodal OCR endpoint for complex scans / photos
app.post('/api/ocr-extract', async (req, res) => {
  try {
    const { base64Data, mimeType, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Missing base64Data' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured. Falling back to local OCR parser.',
      });
    }

    const prompt = `Trích xuất thông tin hóa đơn điện tử hoặc hóa đơn bán hàng theo chuẩn kế toán Việt Nam từ tài liệu đính kèm.
Hãy trả về DUY NHẤT một JSON object hợp lệ (không bao bọc bằng markdown, chỉ JSON thuần túy) với các trường sau:
{
  "tax_code": "Mã số thuế bên bán (10 số hoặc 10-3 số)",
  "seller_name": "Tên đơn vị bán / phát hành",
  "template_symbol": "Ký hiệu mẫu số (ví dụ: 1/001, 1C24TAA)",
  "invoice_symbol": "Ký hiệu hóa đơn (ví dụ: 1C24TYY, C24TAA)",
  "invoice_number": "Số hóa đơn (ví dụ: 0012345)",
  "invoice_date": "Ngày hóa đơn định dạng dd/mm/yyyy",
  "invoice_amount": 0 (tổng tiền thanh toán bao gồm thuế, dạng số nguyên hoặc thập phân),
  "currency": "VND",
  "purpose": "Tóm tắt tên hàng hóa / dịch vụ hoặc mục đích chi",
  "confidence": {
    "tax_code": 0.95,
    "seller_name": 0.95,
    "template_symbol": 0.95,
    "invoice_symbol": 0.95,
    "invoice_number": 0.95,
    "invoice_date": 0.95,
    "invoice_amount": 0.95
  }
}`;

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {};
    }

    return res.json({
      success: true,
      data: parsedData,
      source_file: fileName,
    });
  } catch (error: unknown) {
    console.error('Error in /api/ocr-extract:', error);
    return res.status(500).json({
      error: 'Failed to extract invoice via AI',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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
